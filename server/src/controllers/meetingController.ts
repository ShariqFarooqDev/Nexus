import { Response, NextFunction } from 'express';
import Meeting from '../models/Meeting.js';
import User from '../models/User.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { paginate, generateRoomId, addMinutes } from '../utils/helpers.js';
import { ApiError } from '../middleware/errorHandler.js';
import { sendMeetingInviteEmail } from '../services/emailService.js';
import { emitToUser } from '../config/socket.js';
import config from '../config/env.js';

export const createMeeting = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { title, description, participants, scheduledTime, duration, agenda } = req.body;

        // Check for scheduling conflicts
        const meetingStart = new Date(scheduledTime);
        const meetingEnd = addMinutes(meetingStart, duration);

        // Check organizer conflicts
        const organizerConflict = await Meeting.findOne({
            organizer: req.user!._id,
            status: { $in: ['scheduled', 'ongoing'] },
            $or: [
                {
                    scheduledTime: { $lte: meetingEnd },
                    $expr: {
                        $gte: [
                            { $add: ['$scheduledTime', { $multiply: ['$duration', 60000] }] },
                            meetingStart,
                        ],
                    },
                },
            ],
        });

        if (organizerConflict) {
            throw new ApiError('You have a scheduling conflict at this time', 400);
        }

        // Create meeting
        const roomId = generateRoomId();
        const meeting = await Meeting.create({
            title,
            description,
            organizer: req.user!._id,
            participants: participants.map((userId: string) => ({
                user: userId,
                status: 'pending',
            })),
            scheduledTime: meetingStart,
            duration,
            agenda,
            roomId,
            meetingLink: `${config.frontendUrl}/meeting/${roomId}`,
        });

        // Populate organizer and participants
        await meeting.populate([
            { path: 'organizer', select: 'profile.firstName profile.lastName email' },
            { path: 'participants.user', select: 'profile.firstName profile.lastName email' },
        ]);

        // Send invitations to participants
        const organizerName = `${req.user!.profile.firstName} ${req.user!.profile.lastName}`;

        for (const participant of meeting.participants) {
            const participantUser = participant.user as unknown as {
                _id: string;
                email: string;
                profile: { firstName: string; lastName: string };
            };

            // Send email notification
            try {
                await sendMeetingInviteEmail(
                    participantUser.email,
                    title,
                    organizerName,
                    meetingStart
                );
            } catch (emailError) {
                console.error('Failed to send meeting invite email:', emailError);
            }

            // Send real-time notification
            emitToUser(participantUser._id.toString(), 'meeting-invite', {
                meetingId: meeting._id,
                title,
                organizer: organizerName,
                scheduledTime: meetingStart,
            });
        }

        res.status(201).json({
            success: true,
            message: 'Meeting created successfully',
            data: meeting,
        });
    } catch (error) {
        next(error);
    }
};

export const getMeetings = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { status, upcoming, page = 1, limit = 10 } = req.query;
        const { skip, limit: pageLimit } = paginate(Number(page), Number(limit));

        // Build query - get meetings where user is organizer or participant
        const query: Record<string, unknown> = {
            $or: [
                { organizer: req.user!._id },
                { 'participants.user': req.user!._id },
            ],
        };

        if (status) {
            query.status = status;
        }

        if (upcoming === 'true') {
            query.scheduledTime = { $gte: new Date() };
            query.status = 'scheduled';
        }

        const [meetings, total] = await Promise.all([
            Meeting.find(query)
                .populate('organizer', 'profile.firstName profile.lastName profile.avatar')
                .populate('participants.user', 'profile.firstName profile.lastName profile.avatar')
                .skip(skip)
                .limit(pageLimit)
                .sort({ scheduledTime: 1 }),
            Meeting.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            data: meetings,
            pagination: {
                page: Number(page),
                limit: pageLimit,
                total,
                pages: Math.ceil(total / pageLimit),
            },
        });
    } catch (error) {
        next(error);
    }
};

export const getMeetingById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;

        const meeting = await Meeting.findById(id)
            .populate('organizer', 'profile.firstName profile.lastName profile.avatar email')
            .populate('participants.user', 'profile.firstName profile.lastName profile.avatar email');

        if (!meeting) {
            throw new ApiError('Meeting not found', 404);
        }

        // Check if user is participant or organizer
        const isOrganizer = meeting.organizer._id.equals(req.user!._id);
        const isParticipant = meeting.participants.some(
            (p) => p.user._id.equals(req.user!._id)
        );

        if (!isOrganizer && !isParticipant) {
            throw new ApiError('Not authorized to view this meeting', 403);
        }

        res.status(200).json({
            success: true,
            data: meeting,
        });
    } catch (error) {
        next(error);
    }
};

export const updateMeeting = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const meeting = await Meeting.findById(id);
        if (!meeting) {
            throw new ApiError('Meeting not found', 404);
        }

        // Only organizer can update
        if (!meeting.organizer.equals(req.user!._id)) {
            throw new ApiError('Not authorized to update this meeting', 403);
        }

        // Can't update completed or cancelled meetings
        if (['completed', 'cancelled'].includes(meeting.status)) {
            throw new ApiError('Cannot update a completed or cancelled meeting', 400);
        }

        const updatedMeeting = await Meeting.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true }
        ).populate([
            { path: 'organizer', select: 'profile.firstName profile.lastName' },
            { path: 'participants.user', select: 'profile.firstName profile.lastName' },
        ]);

        res.status(200).json({
            success: true,
            message: 'Meeting updated successfully',
            data: updatedMeeting,
        });
    } catch (error) {
        next(error);
    }
};

export const respondToMeeting = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { response } = req.body; // 'accepted' or 'rejected'

        if (!['accepted', 'rejected'].includes(response)) {
            throw new ApiError('Invalid response', 400);
        }

        const meeting = await Meeting.findById(id);
        if (!meeting) {
            throw new ApiError('Meeting not found', 404);
        }

        // Find participant
        const participantIndex = meeting.participants.findIndex(
            (p) => p.user.equals(req.user!._id)
        );

        if (participantIndex === -1) {
            throw new ApiError('You are not invited to this meeting', 403);
        }

        // Update participant status
        meeting.participants[participantIndex].status = response;
        meeting.participants[participantIndex].respondedAt = new Date();
        await meeting.save();

        // Notify organizer
        emitToUser(meeting.organizer.toString(), 'meeting-response', {
            meetingId: meeting._id,
            participant: `${req.user!.profile.firstName} ${req.user!.profile.lastName}`,
            response,
        });

        res.status(200).json({
            success: true,
            message: `Meeting ${response}`,
        });
    } catch (error) {
        next(error);
    }
};

export const cancelMeeting = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;

        const meeting = await Meeting.findById(id);
        if (!meeting) {
            throw new ApiError('Meeting not found', 404);
        }

        // Only organizer can cancel
        if (!meeting.organizer.equals(req.user!._id)) {
            throw new ApiError('Not authorized to cancel this meeting', 403);
        }

        meeting.status = 'cancelled';
        await meeting.save();

        // Notify all participants
        for (const participant of meeting.participants) {
            emitToUser(participant.user.toString(), 'meeting-cancelled', {
                meetingId: meeting._id,
                title: meeting.title,
            });
        }

        res.status(200).json({
            success: true,
            message: 'Meeting cancelled successfully',
        });
    } catch (error) {
        next(error);
    }
};

export const getCalendarEvents = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { start, end } = req.query;

        if (!start || !end) {
            throw new ApiError('Start and end dates are required', 400);
        }

        const meetings = await Meeting.find({
            $or: [
                { organizer: req.user!._id },
                { 'participants.user': req.user!._id },
            ],
            scheduledTime: {
                $gte: new Date(start as string),
                $lte: new Date(end as string),
            },
            status: { $ne: 'cancelled' },
        })
            .populate('organizer', 'profile.firstName profile.lastName')
            .sort({ scheduledTime: 1 });

        // Format for calendar
        const events = meetings.map((meeting) => ({
            id: meeting._id,
            title: meeting.title,
            start: meeting.scheduledTime,
            end: addMinutes(meeting.scheduledTime, meeting.duration),
            status: meeting.status,
            roomId: meeting.roomId,
            meetingLink: meeting.meetingLink,
        }));

        res.status(200).json({
            success: true,
            data: events,
        });
    } catch (error) {
        next(error);
    }
};
