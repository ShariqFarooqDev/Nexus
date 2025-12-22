import { Router } from 'express';
import {
    register,
    login,
    verifyOTP,
    resendOTP,
    sendOTP,
    verifyOTPOnly,
    refreshToken,
    logout,
    forgotPassword,
    resetPassword,
    getMe,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { registerValidation, loginValidation } from '../middleware/validation.js';
import { validateRequest } from '../middleware/errorHandler.js';

const router = Router();

// Public routes
router.post('/register', registerValidation, validateRequest, register);
router.post('/login', loginValidation, validateRequest, login);
router.post('/send-otp', sendOTP); // Send OTP before registration
router.post('/verify-otp', verifyOTP);
router.post('/verify-otp-only', verifyOTPOnly); // Verify OTP without completing registration
router.post('/resend-otp', resendOTP);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

export default router;
