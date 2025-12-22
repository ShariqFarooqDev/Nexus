import { Router } from 'express';
import {
    createMeeting,
    getMeetings,
    getMeetingById,
    updateMeeting,
    respondToMeeting,
    cancelMeeting,
    getCalendarEvents,
} from '../controllers/meetingController.js';
import { protect } from '../middleware/authMiddleware.js';
import { meetingValidation, mongoIdValidation, paginationValidation } from '../middleware/validation.js';
import { validateRequest } from '../middleware/errorHandler.js';

const router = Router();

// All routes are protected
router.use(protect);

// Meeting routes
router.post('/', meetingValidation, validateRequest, createMeeting);
router.get('/', paginationValidation, validateRequest, getMeetings);
router.get('/calendar', getCalendarEvents);
router.get('/:id', mongoIdValidation('id'), validateRequest, getMeetingById);
router.put('/:id', mongoIdValidation('id'), validateRequest, updateMeeting);
router.post('/:id/respond', mongoIdValidation('id'), validateRequest, respondToMeeting);
router.delete('/:id', mongoIdValidation('id'), validateRequest, cancelMeeting);

export default router;
