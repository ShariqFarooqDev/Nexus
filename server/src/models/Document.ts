import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IDocument extends Document {
    title: string;
    description?: string;
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadedBy: Types.ObjectId;
    sharedWith: {
        user: Types.ObjectId;
        permission: 'view' | 'edit' | 'sign';
        sharedAt: Date;
    }[];
    version: number;
    previousVersions: {
        fileUrl: string;
        version: number;
        uploadedAt: Date;
    }[];
    status: 'draft' | 'pending_signature' | 'signed' | 'archived';
    signatures: {
        user: Types.ObjectId;
        signatureImage: string;
        signedAt: Date;
        ipAddress: string;
    }[];
    metadata: {
        pages?: number;
        category?: string;
        tags?: string[];
    };
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
    {
        title: {
            type: String,
            required: [true, 'Document title is required'],
            trim: true,
            maxlength: [200, 'Title cannot exceed 200 characters'],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [1000, 'Description cannot exceed 1000 characters'],
        },
        fileUrl: {
            type: String,
            required: [true, 'File URL is required'],
        },
        fileName: {
            type: String,
            required: [true, 'File name is required'],
        },
        fileType: {
            type: String,
            required: [true, 'File type is required'],
        },
        fileSize: {
            type: Number,
            required: [true, 'File size is required'],
        },
        uploadedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Uploader is required'],
        },
        sharedWith: [
            {
                user: {
                    type: Schema.Types.ObjectId,
                    ref: 'User',
                },
                permission: {
                    type: String,
                    enum: ['view', 'edit', 'sign'],
                    default: 'view',
                },
                sharedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        version: {
            type: Number,
            default: 1,
        },
        previousVersions: [
            {
                fileUrl: { type: String },
                version: { type: Number },
                uploadedAt: { type: Date },
            },
        ],
        status: {
            type: String,
            enum: ['draft', 'pending_signature', 'signed', 'archived'],
            default: 'draft',
        },
        signatures: [
            {
                user: {
                    type: Schema.Types.ObjectId,
                    ref: 'User',
                },
                signatureImage: {
                    type: String,
                    required: true,
                },
                signedAt: {
                    type: Date,
                    default: Date.now,
                },
                ipAddress: {
                    type: String,
                },
            },
        ],
        metadata: {
            pages: { type: Number },
            category: { type: String },
            tags: [{ type: String }],
        },
        expiresAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ 'sharedWith.user': 1 });
documentSchema.index({ status: 1 });
documentSchema.index({ createdAt: -1 });

export default mongoose.model<IDocument>('Document', documentSchema);
