import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import config from '../config/env.js';

// Configure Cloudinary
cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
});

interface UploadOptions {
    folder?: string;
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
    transformation?: Record<string, unknown>[];
}

export const uploadFile = async (
    filePath: string,
    options: UploadOptions = {}
): Promise<UploadApiResponse> => {
    const { folder = 'nexus-documents', resourceType = 'auto' } = options;

    return cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: resourceType,
        ...options,
    });
};

export const uploadBuffer = async (
    buffer: Buffer,
    options: UploadOptions = {}
): Promise<UploadApiResponse> => {
    const { folder = 'nexus-documents', resourceType = 'auto' } = options;

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: resourceType,
                ...options,
            },
            (error, result) => {
                if (error) reject(error);
                else if (result) resolve(result);
                else reject(new Error('Upload failed'));
            }
        );

        uploadStream.end(buffer);
    });
};

export const deleteFile = async (publicId: string): Promise<void> => {
    await cloudinary.uploader.destroy(publicId);
};

export const getFileUrl = (
    publicId: string,
    options: Record<string, unknown> = {}
): string => {
    return cloudinary.url(publicId, options);
};

export const uploadSignature = async (
    signatureData: string // Base64 encoded image
): Promise<UploadApiResponse> => {
    return cloudinary.uploader.upload(signatureData, {
        folder: 'nexus-signatures',
        resource_type: 'image',
        format: 'png',
    });
};

export default cloudinary;
