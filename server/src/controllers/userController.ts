import { Response, NextFunction } from 'express';
import User from '../models/User.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { sanitizeUser, paginate } from '../utils/helpers.js';
import { ApiError } from '../middleware/errorHandler.js';

export const getProfile = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        res.status(200).json({
            success: true,
            data: sanitizeUser(req.user!.toObject()),
        });
    } catch (error) {
        next(error);
    }
};

export const updateProfile = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { profile } = req.body;

        // Merge existing profile with updates
        const updatedProfile = {
            ...req.user!.profile,
            ...profile,
        };

        const user = await User.findByIdAndUpdate(
            req.user!._id,
            { profile: updatedProfile },
            { new: true, runValidators: true }
        );

        if (!user) {
            throw new ApiError('User not found', 404);
        }

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: sanitizeUser(user.toObject()),
        });
    } catch (error) {
        next(error);
    }
};

export const getUserById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) {
            throw new ApiError('User not found', 404);
        }

        // Return limited info for other users
        res.status(200).json({
            success: true,
            data: {
                _id: user._id,
                role: user.role,
                profile: {
                    firstName: user.profile.firstName,
                    lastName: user.profile.lastName,
                    bio: user.profile.bio,
                    avatar: user.profile.avatar,
                    industry: user.profile.industry,
                    startupName: user.profile.startupName,
                    startupStage: user.profile.startupStage,
                    preferredIndustries: user.profile.preferredIndustries,
                },
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        next(error);
    }
};

export const getUsers = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const {
            role,
            industry,
            search,
            page = 1,
            limit = 10,
        } = req.query;

        const { skip, limit: pageLimit } = paginate(
            Number(page),
            Number(limit)
        );

        // Build query
        const query: Record<string, unknown> = { isActive: true };

        if (role && ['investor', 'entrepreneur'].includes(role as string)) {
            query.role = role;
        }

        if (industry) {
            query['profile.industry'] = industry;
        }

        if (search) {
            query.$or = [
                { 'profile.firstName': { $regex: search, $options: 'i' } },
                { 'profile.lastName': { $regex: search, $options: 'i' } },
                { 'profile.startupName': { $regex: search, $options: 'i' } },
                { 'profile.bio': { $regex: search, $options: 'i' } },
            ];
        }

        const [users, total] = await Promise.all([
            User.find(query)
                .select('profile role createdAt')
                .skip(skip)
                .limit(pageLimit)
                .sort({ createdAt: -1 }),
            User.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            data: users,
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

export const updateAvatar = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { avatar } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user!._id,
            { 'profile.avatar': avatar },
            { new: true }
        );

        if (!user) {
            throw new ApiError('User not found', 404);
        }

        res.status(200).json({
            success: true,
            message: 'Avatar updated successfully',
            data: { avatar: user.profile.avatar },
        });
    } catch (error) {
        next(error);
    }
};

export const changePassword = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Get user with password
        const user = await User.findById(req.user!._id).select('+password');
        if (!user) {
            throw new ApiError('User not found', 404);
        }

        // Check current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            throw new ApiError('Current password is incorrect', 400);
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password changed successfully',
        });
    } catch (error) {
        next(error);
    }
};

export const toggleTwoFactor = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { enabled } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user!._id,
            { twoFactorEnabled: enabled },
            { new: true }
        );

        if (!user) {
            throw new ApiError('User not found', 404);
        }

        res.status(200).json({
            success: true,
            message: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'}`,
            data: { twoFactorEnabled: user.twoFactorEnabled },
        });
    } catch (error) {
        next(error);
    }
};

export const deleteAccount = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Soft delete - just deactivate
        await User.findByIdAndUpdate(req.user!._id, { isActive: false });

        res.status(200).json({
            success: true,
            message: 'Account deactivated successfully',
        });
    } catch (error) {
        next(error);
    }
};
