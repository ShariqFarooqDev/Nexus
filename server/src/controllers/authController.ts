import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import User from '../models/User.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.js';
import { generateOTP, hashToken, sanitizeUser } from '../utils/helpers.js';
import { sendOTPEmail, sendWelcomeEmail, sendPasswordResetEmail } from '../services/emailService.js';
import { ApiError } from '../middleware/errorHandler.js';
import config from '../config/env.js';

// Store OTPs temporarily (in production, use Redis)
const otpStore = new Map<string, { otp: string; expires: Date; verified?: boolean }>();

export const register = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { email, password, role, profile } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new ApiError('Email already registered', 400);
        }

        // Create user
        const user = await User.create({
            email,
            password,
            role,
            profile,
        });

        // Generate OTP for email verification
        const otp = generateOTP();
        otpStore.set(email, {
            otp,
            expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        });

        // Log OTP in development for testing
        console.log(`\n📧 OTP for ${email}: ${otp}\n`);

        // Send OTP email
        try {
            await sendOTPEmail(email, otp);
        } catch (emailError) {
            console.error('Failed to send OTP email:', emailError);
            // Continue without email - user can use console OTP for testing
        }

        // Generate tokens
        const tokens = generateTokens(user._id.toString(), user.role);

        // Save refresh token
        user.refreshToken = tokens.refreshToken;
        await user.save();

        res.status(201).json({
            success: true,
            message: 'Registration successful. Please verify your email.',
            data: {
                user: sanitizeUser(user.toObject()),
                ...tokens,
            },
        });
    } catch (error) {
        next(error);
    }
};

export const login = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Find user with password
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            throw new ApiError('Invalid credentials', 401);
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            throw new ApiError('Invalid credentials', 401);
        }

        // Check if user is active
        if (!user.isActive) {
            throw new ApiError('Account is deactivated', 401);
        }

        // Check if 2FA is enabled
        if (user.twoFactorEnabled) {
            const otp = generateOTP();
            otpStore.set(email, {
                otp,
                expires: new Date(Date.now() + 10 * 60 * 1000),
            });

            console.log(`\n📧 2FA OTP for ${email}: ${otp}\n`);

            try {
                await sendOTPEmail(email, otp);
            } catch (emailError) {
                console.error('Failed to send 2FA OTP:', emailError);
            }

            res.status(200).json({
                success: true,
                message: '2FA required. OTP sent to your email.',
                requiresTwoFactor: true,
            });
            return;
        }

        // Generate tokens
        const tokens = generateTokens(user._id.toString(), user.role);

        // Save refresh token
        user.refreshToken = tokens.refreshToken;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: sanitizeUser(user.toObject()),
                ...tokens,
            },
        });
    } catch (error) {
        next(error);
    }
};

export const verifyOTP = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { email, otp } = req.body;

        const storedOTP = otpStore.get(email);
        if (!storedOTP) {
            throw new ApiError('OTP expired or not found', 400);
        }

        if (storedOTP.expires < new Date()) {
            otpStore.delete(email);
            throw new ApiError('OTP expired', 400);
        }

        if (storedOTP.otp !== otp) {
            throw new ApiError('Invalid OTP', 400);
        }

        // Clear OTP
        otpStore.delete(email);

        // Find and update user
        const user = await User.findOne({ email });
        if (!user) {
            throw new ApiError('User not found', 404);
        }

        // Mark as verified
        user.isVerified = true;

        // Generate tokens
        const tokens = generateTokens(user._id.toString(), user.role);
        user.refreshToken = tokens.refreshToken;
        await user.save();

        // Send welcome email
        try {
            await sendWelcomeEmail(email, user.profile.firstName);
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
        }

        res.status(200).json({
            success: true,
            message: 'Email verified successfully',
            data: {
                user: sanitizeUser(user.toObject()),
                ...tokens,
            },
        });
    } catch (error) {
        next(error);
    }
};

export const resendOTP = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            throw new ApiError('User not found', 404);
        }

        // Generate new OTP
        const otp = generateOTP();
        otpStore.set(email, {
            otp,
            expires: new Date(Date.now() + 10 * 60 * 1000),
        });

        console.log(`\n📧 Resent OTP for ${email}: ${otp}\n`);

        try {
            await sendOTPEmail(email, otp);
        } catch (emailError) {
            console.error('Failed to send OTP:', emailError);
            // Don't throw in dev - allow console OTP
        }

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully',
        });
    } catch (error) {
        next(error);
    }
};

// Send OTP for email verification before registration
export const sendOTP = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { email } = req.body;

        // Check if email is already registered
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new ApiError('Email already registered', 400);
        }

        // Generate OTP
        const otp = generateOTP();
        otpStore.set(email, {
            otp,
            expires: new Date(Date.now() + 10 * 60 * 1000),
        });

        console.log(`\n📧 Pre-registration OTP for ${email}: ${otp}\n`);

        try {
            await sendOTPEmail(email, otp);
        } catch (emailError) {
            console.error('Failed to send OTP:', emailError);
        }

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully',
        });
    } catch (error) {
        next(error);
    }
};

// Verify OTP without completing registration (just mark email as verified)
export const verifyOTPOnly = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { email, otp } = req.body;

        const storedOTP = otpStore.get(email);
        if (!storedOTP) {
            throw new ApiError('OTP expired or not found', 400);
        }

        if (storedOTP.expires < new Date()) {
            otpStore.delete(email);
            throw new ApiError('OTP expired', 400);
        }

        if (storedOTP.otp !== otp) {
            throw new ApiError('Invalid OTP', 400);
        }

        // Mark email as verified in OTP store (will be used during registration)
        otpStore.set(email, { ...storedOTP, verified: true });

        res.status(200).json({
            success: true,
            message: 'Email verified successfully',
        });
    } catch (error) {
        next(error);
    }
};

export const refreshToken = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { refreshToken: token } = req.body;

        if (!token) {
            throw new ApiError('Refresh token is required', 400);
        }

        // Verify refresh token
        const decoded = verifyRefreshToken(token);

        // Find user
        const user = await User.findById(decoded.userId).select('+refreshToken');
        if (!user || user.refreshToken !== token) {
            throw new ApiError('Invalid refresh token', 401);
        }

        // Generate new tokens
        const tokens = generateTokens(user._id.toString(), user.role);
        user.refreshToken = tokens.refreshToken;
        await user.save();

        res.status(200).json({
            success: true,
            data: tokens,
        });
    } catch (error) {
        next(error);
    }
};

export const logout = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (req.user) {
            req.user.refreshToken = undefined;
            await req.user.save();
        }

        res.status(200).json({
            success: true,
            message: 'Logged out successfully',
        });
    } catch (error) {
        next(error);
    }
};

export const forgotPassword = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal if user exists
            res.status(200).json({
                success: true,
                message: 'If an account exists, a reset link will be sent',
            });
            return;
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.passwordResetToken = hashToken(resetToken);
        user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await user.save();

        // Send reset email
        const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;
        try {
            await sendPasswordResetEmail(email, resetUrl);
        } catch (emailError) {
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save();
            throw new ApiError('Failed to send reset email', 500);
        }

        res.status(200).json({
            success: true,
            message: 'Password reset email sent',
        });
    } catch (error) {
        next(error);
    }
};

export const resetPassword = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { token, password } = req.body;

        const hashedToken = hashToken(token);

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: new Date() },
        });

        if (!user) {
            throw new ApiError('Invalid or expired reset token', 400);
        }

        // Update password
        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password reset successful',
        });
    } catch (error) {
        next(error);
    }
};

export const getMe = async (
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
