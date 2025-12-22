import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
    email: string;
    password: string;
    role: 'investor' | 'entrepreneur';
    profile: {
        firstName: string;
        lastName: string;
        bio: string;
        avatar: string;
        phone?: string;
        location?: string;
        linkedIn?: string;
        website?: string;
        // For Entrepreneurs
        startupName?: string;
        startupStage?: 'idea' | 'mvp' | 'growth' | 'scale';
        industry?: string;
        fundingGoal?: number;
        pitchDeck?: string;
        // For Investors
        investmentHistory?: string[];
        preferredIndustries?: string[];
        investmentRange?: {
            min: number;
            max: number;
        };
        portfolioCompanies?: string[];
    };
    balance: number;
    isVerified: boolean;
    isActive: boolean;
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;
    refreshToken?: string;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [8, 'Password must be at least 8 characters'],
            select: false,
        },
        role: {
            type: String,
            enum: ['investor', 'entrepreneur'],
            required: [true, 'Role is required'],
        },
        profile: {
            firstName: { type: String, required: true, trim: true },
            lastName: { type: String, required: true, trim: true },
            bio: { type: String, default: '' },
            avatar: { type: String, default: '' },
            phone: { type: String, default: '' },
            location: { type: String, default: '' },
            linkedIn: { type: String, default: '' },
            website: { type: String, default: '' },
            // Entrepreneur fields
            startupName: { type: String, default: '' },
            startupStage: { type: String, default: '' }, // Removed enum for flexibility
            industry: { type: String, default: '' },
            fundingGoal: { type: Number },
            pitchDeck: { type: String },
            // Investor fields
            investmentHistory: [{ type: String }],
            preferredIndustries: [{ type: String }],
            investmentRange: {
                min: { type: Number },
                max: { type: Number },
            },
            portfolioCompanies: [{ type: String }],
        },
        balance: {
            type: Number,
            default: 0,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        twoFactorEnabled: {
            type: Boolean,
            default: false,
        },
        twoFactorSecret: {
            type: String,
            select: false,
        },
        refreshToken: {
            type: String,
            select: false,
        },
        passwordResetToken: {
            type: String,
            select: false,
        },
        passwordResetExpires: {
            type: Date,
            select: false,
        },
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (
    candidatePassword: string
): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'profile.industry': 1 });

export default mongoose.model<IUser>('User', userSchema);
