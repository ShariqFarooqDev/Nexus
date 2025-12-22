import { Router } from 'express';
import {
    getProfile,
    updateProfile,
    getUserById,
    getUsers,
    updateAvatar,
    changePassword,
    toggleTwoFactor,
    deleteAccount,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { updateProfileValidation, mongoIdValidation, paginationValidation } from '../middleware/validation.js';
import { validateRequest } from '../middleware/errorHandler.js';

const router = Router();

// All routes are protected
router.use(protect);

// Profile routes
router.get('/me', getProfile);
router.put('/me', updateProfileValidation, validateRequest, updateProfile);
router.put('/me/avatar', updateAvatar);
router.put('/me/password', changePassword);
router.put('/me/2fa', toggleTwoFactor);
router.delete('/me', deleteAccount);

// User listing/viewing
router.get('/', paginationValidation, validateRequest, getUsers);
router.get('/:id', mongoIdValidation('id'), validateRequest, getUserById);

export default router;
