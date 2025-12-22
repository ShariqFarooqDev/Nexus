import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITransaction extends Document {
    user: Types.ObjectId;
    type: 'deposit' | 'withdraw' | 'transfer' | 'refund';
    amount: number;
    currency: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
    recipient?: Types.ObjectId;
    stripePaymentId?: string;
    stripePaymentIntentId?: string;
    description?: string;
    metadata: {
        paymentMethod?: string;
        last4?: string;
        brand?: string;
        receiptUrl?: string;
    };
    failureReason?: string;
    fee?: number;
    netAmount?: number;
    createdAt: Date;
    completedAt?: Date;
}

const transactionSchema = new Schema<ITransaction>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User is required'],
        },
        type: {
            type: String,
            enum: ['deposit', 'withdraw', 'transfer', 'refund'],
            required: [true, 'Transaction type is required'],
        },
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
            min: [0.01, 'Amount must be greater than 0'],
        },
        currency: {
            type: String,
            default: 'usd',
            lowercase: true,
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
            default: 'pending',
        },
        recipient: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        stripePaymentId: {
            type: String,
        },
        stripePaymentIntentId: {
            type: String,
        },
        description: {
            type: String,
            maxlength: [500, 'Description cannot exceed 500 characters'],
        },
        metadata: {
            paymentMethod: { type: String },
            last4: { type: String },
            brand: { type: String },
            receiptUrl: { type: String },
        },
        failureReason: {
            type: String,
        },
        fee: {
            type: Number,
            default: 0,
        },
        netAmount: {
            type: Number,
        },
        completedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Calculate net amount before saving
transactionSchema.pre('save', function (next) {
    if (this.fee && this.amount) {
        this.netAmount = this.amount - this.fee;
    } else {
        this.netAmount = this.amount;
    }
    next();
});

// Indexes
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ stripePaymentId: 1 });

export default mongoose.model<ITransaction>('Transaction', transactionSchema);
