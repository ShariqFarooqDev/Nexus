import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
    uploadDocument,
    getDocuments,
    getDocumentById,
    shareDocument,
    signDocument,
    updateDocumentStatus,
    deleteDocument,
} from '../controllers/documentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { documentValidation, mongoIdValidation, paginationValidation } from '../middleware/validation.js';
import { validateRequest } from '../middleware/errorHandler.js';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

const fileFilter = (
    req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
) => {
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif',
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});

// All routes are protected
router.use(protect);

// Document routes
router.post('/upload', upload.single('file'), documentValidation, validateRequest, uploadDocument);
router.get('/', paginationValidation, validateRequest, getDocuments);
router.get('/:id', mongoIdValidation('id'), validateRequest, getDocumentById);
router.post('/:id/share', mongoIdValidation('id'), validateRequest, shareDocument);
router.post('/:id/sign', mongoIdValidation('id'), validateRequest, signDocument);
router.put('/:id/status', mongoIdValidation('id'), validateRequest, updateDocumentStatus);
router.delete('/:id', mongoIdValidation('id'), validateRequest, deleteDocument);

export default router;
