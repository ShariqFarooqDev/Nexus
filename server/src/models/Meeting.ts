import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMeeting extends Document {
    title: string;
    description: string;
    organizer: Types.ObjectId;
    participants: {
        user: Types.ObjectId;
        status: 'pending' | 'accepted' | 'rejected';
        respondedAt?: Date;
    }[];
    scheduledTime: Date;
    duration: number; // in minutes
    status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
    meetingLink?: string;
    roomId?: string;
    agenda?: string;
    notes?: string;
    isRecurring: boolean;
    recurringPattern?: {
        frequency: 'daily' | 'weekly' | 'monthly';
        endDate: Date;
    };
    reminders: {
        sent: boolean;
        scheduledFor: Date;
    }[];
    createdAt: Date;
    updatedAt: Date;
}

const meetingSchema = new Schema<IMeeting>(
    {
        title: {
            type: String,
            required: [true, 'Meeting title is required'],
            trim: true,
            maxlength: [100, 'Title cannot exceed 100 characters'],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Description cannot exceed 500 characters'],
        },
        organizer: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Organizer is required'],
        },
        participants: [
            {
                user: {
                    type: Schema.Types.ObjectId,
                    ref: 'User',
                    required: true,
                },
                status: {
                    type: String,
                    enum: ['pending', 'accepted', 'rejected'],
                    default: 'pending',
                },
                respondedAt: {
                    type: Date,
                },
            },
        ],
        scheduledTime: {
            type: Date,
            required: [true, 'Scheduled time is required'],
        },
        duration: {
            type: Number,
            required: [true, 'Duration is required'],
            min: [15, 'Meeting must be at least 15 minutes'],
            max: [480, 'Meeting cannot exceed 8 hours'],
        },
        status: {
            type: String,
            enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
            default: 'scheduled',
        },
        meetingLink: {
            type: String,
        },
        roomId: {
            type: String,
        },
        agenda: {
            type: String,
            maxlength: [2000, 'Agenda cannot exceed 2000 characters'],
        },
        notes: {
            type: String,
        },
        isRecurring: {
            type: Boolean,
            default: false,
        },
        recurringPattern: {
            frequency: {
                type: String,
                enum: ['daily', 'weekly', 'monthly'],
            },
            endDate: {
                type: Date,
            },
        },
        reminders: [
            {
                sent: {
                    type: Boolean,
                    default: false,
                },
                scheduledFor: {
                    type: Date,
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient queries
meetingSchema.index({ organizer: 1, scheduledTime: 1 });
meetingSchema.index({ 'participants.user': 1, scheduledTime: 1 });
meetingSchema.index({ status: 1 });
meetingSchema.index({ scheduledTime: 1 });

// Virtual for checking if meeting is upcoming
meetingSchema.virtual('isUpcoming').get(function () {
    return this.scheduledTime > new Date() && this.status === 'scheduled';
});

export default mongoose.model<IMeeting>('Meeting', meetingSchema);
