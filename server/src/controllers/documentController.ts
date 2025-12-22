import { Response, NextFunction } from 'express';
import fs from 'fs';
import DocumentModel from '../models/Document.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { paginate } from '../utils/helpers.js';
import { ApiError } from '../middleware/errorHandler.js';
import { uploadFile, uploadSignature, deleteFile } from '../services/cloudinaryService.js';
import { emitToUser } from '../config/socket.js';

export const uploadDocument = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.file) {
            throw new ApiError('No file uploaded', 400);
        }

        const { title, description, category } = req.body;

        // Upload to Cloudinary
        const result = await uploadFile(req.file.path, {
            folder: 'nexus-documents',
            resourceType: 'raw',
        });

        // Clean up temp file
        fs.unlinkSync(req.file.path);

        // Create document record
        const document = await DocumentModel.create({
            title: title || req.file.originalname,
            description,
            fileUrl: result.secure_url,
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            uploadedBy: req.user!._id,
            metadata: {
                category,
                pages: result.pages,
            },
        });

        await document.populate('uploadedBy', 'profile.firstName profile.lastName');

        res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
            data: document,
        });
    } catch (error) {
        // Clean up temp file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        next(error);
    }
};

export const getDocuments = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { status, category, page = 1, limit = 10 } = req.query;
        const { skip, limit: pageLimit } = paginate(Number(page), Number(limit));

        // Get documents user owns or has access to
        const query: Record<string, unknown> = {
            $or: [
                { uploadedBy: req.user!._id },
                { 'sharedWith.user': req.user!._id },
            ],
        };

        if (status) {
            query.status = status;
        }

        if (category) {
            query['metadata.category'] = category;
        }

        const [documents, total] = await Promise.all([
            DocumentModel.find(query)
                .populate('uploadedBy', 'profile.firstName profile.lastName')
                .skip(skip)
                .limit(pageLimit)
                .sort({ createdAt: -1 }),
            DocumentModel.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            data: documents,
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

export const getDocumentById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;

        const document = await DocumentModel.findById(id)
            .populate('uploadedBy', 'profile.firstName profile.lastName email')
            .populate('sharedWith.user', 'profile.firstName profile.lastName')
            .populate('signatures.user', 'profile.firstName profile.lastName');

        if (!document) {
            throw new ApiError('Document not found', 404);
        }

        // Check access
        const isOwner = document.uploadedBy._id.equals(req.user!._id);
        const hasAccess = document.sharedWith.some(
            (s) => s.user._id.equals(req.user!._id)
        );

        if (!isOwner && !hasAccess) {
            throw new ApiError('Not authorized to view this document', 403);
        }

        res.status(200).json({
            success: true,
            data: document,
        });
    } catch (error) {
        next(error);
    }
};

export const shareDocument = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { userId, permission = 'view' } = req.body;

        const document = await DocumentModel.findById(id);
        if (!document) {
            throw new ApiError('Document not found', 404);
        }

        // Only owner can share
        if (!document.uploadedBy.equals(req.user!._id)) {
            throw new ApiError('Not authorized to share this document', 403);
        }

        // Check if already shared
        const existingShare = document.sharedWith.find(
            (s) => s.user.toString() === userId
        );

        if (existingShare) {
            existingShare.permission = permission;
        } else {
            document.sharedWith.push({
                user: userId,
                permission,
                sharedAt: new Date(),
            });
        }

        await document.save();

        // Notify user
        emitToUser(userId, 'document-shared', {
            documentId: document._id,
            title: document.title,
            sharedBy: `${req.user!.profile.firstName} ${req.user!.profile.lastName}`,
            permission,
        });

        res.status(200).json({
            success: true,
            message: 'Document shared successfully',
        });
    } catch (error) {
        next(error);
    }
};

export const signDocument = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { signatureData } = req.body; // Base64 encoded signature image

        if (!signatureData) {
            throw new ApiError('Signature data is required', 400);
        }

        const document = await DocumentModel.findById(id);
        if (!document) {
            throw new ApiError('Document not found', 404);
        }

        // Check if user has sign permission
        const shareEntry = document.sharedWith.find(
            (s) => s.user.equals(req.user!._id) && s.permission === 'sign'
        );

        const isOwner = document.uploadedBy.equals(req.user!._id);

        if (!isOwner && !shareEntry) {
            throw new ApiError('Not authorized to sign this document', 403);
        }

        // Check if already signed
        const alreadySigned = document.signatures.some(
            (s) => s.user.equals(req.user!._id)
        );

        if (alreadySigned) {
            throw new ApiError('You have already signed this document', 400);
        }

        // Upload signature to Cloudinary
        const signatureResult = await uploadSignature(signatureData);

        // Add signature
        document.signatures.push({
            user: req.user!._id,
            signatureImage: signatureResult.secure_url,
            signedAt: new Date(),
            ipAddress: req.ip || 'unknown',
        });

        // Update status if all required signatures are collected
        if (document.status === 'pending_signature') {
            // Simple logic: if at least one signature, mark as signed
            // In production, you might have a list of required signers
            document.status = 'signed';
        }

        await document.save();

        // Notify document owner
        if (!isOwner) {
            emitToUser(document.uploadedBy.toString(), 'document-signed', {
                documentId: document._id,
                title: document.title,
                signedBy: `${req.user!.profile.firstName} ${req.user!.profile.lastName}`,
            });
        }

        res.status(200).json({
            success: true,
            message: 'Document signed successfully',
        });
    } catch (error) {
        next(error);
    }
};

export const updateDocumentStatus = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const document = await DocumentModel.findById(id);
        if (!document) {
            throw new ApiError('Document not found', 404);
        }

        // Only owner can update status
        if (!document.uploadedBy.equals(req.user!._id)) {
            throw new ApiError('Not authorized to update this document', 403);
        }

        document.status = status;
        await document.save();

        res.status(200).json({
            success: true,
            message: 'Document status updated',
            data: document,
        });
    } catch (error) {
        next(error);
    }
};

export const deleteDocument = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;

        const document = await DocumentModel.findById(id);
        if (!document) {
            throw new ApiError('Document not found', 404);
        }

        // Only owner can delete
        if (!document.uploadedBy.equals(req.user!._id)) {
            throw new ApiError('Not authorized to delete this document', 403);
        }

        // Delete from Cloudinary (extract public_id from URL)
        const publicId = document.fileUrl.split('/').pop()?.split('.')[0];
        if (publicId) {
            try {
                await deleteFile(`nexus-documents/${publicId}`);
            } catch (cloudinaryError) {
                console.error('Failed to delete from Cloudinary:', cloudinaryError);
            }
        }

        await DocumentModel.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Document deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};
