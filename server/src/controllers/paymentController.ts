import { Response, NextFunction } from 'express';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { paginate } from '../utils/helpers.js';
import { ApiError } from '../middleware/errorHandler.js';
import * as stripeService from '../services/stripeService.js';

export const createPaymentIntent = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { amount } = req.body;

        if (amount < 1) {
            throw new ApiError('Amount must be at least $1', 400);
        }

        // Create payment intent
        const paymentIntent = await stripeService.createPaymentIntent({
            amount,
            metadata: {
                userId: req.user!._id.toString(),
                email: req.user!.email,
            },
        });

        res.status(200).json({
            success: true,
            data: {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
            },
        });
    } catch (error) {
        next(error);
    }
};

export const deposit = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { amount, paymentIntentId } = req.body;

        if (amount < 1) {
            throw new ApiError('Amount must be at least $1', 400);
        }

        // Create transaction record
        const transaction = await Transaction.create({
            user: req.user!._id,
            type: 'deposit',
            amount,
            stripePaymentIntentId: paymentIntentId,
            status: 'pending',
            description: 'Account deposit',
        });

        // In a real app, this would be handled by webhooks
        // For demo, we'll simulate successful payment
        if (paymentIntentId) {
            try {
                const paymentIntent = await stripeService.retrievePaymentIntent(paymentIntentId);

                if (paymentIntent.status === 'succeeded') {
                    // Update transaction
                    transaction.status = 'completed';
                    transaction.completedAt = new Date();
                    transaction.metadata = {
                        paymentMethod: paymentIntent.payment_method_types[0],
                    };
                    await transaction.save();

                    // Update user balance
                    await User.findByIdAndUpdate(req.user!._id, {
                        $inc: { balance: amount },
                    });
                }
            } catch (stripeError) {
                console.error('Stripe error:', stripeError);
                transaction.status = 'failed';
                transaction.failureReason = 'Payment processing failed';
                await transaction.save();
                throw new ApiError('Payment processing failed', 400);
            }
        } else {
            // Demo mode - auto-complete
            transaction.status = 'completed';
            transaction.completedAt = new Date();
            await transaction.save();

            await User.findByIdAndUpdate(req.user!._id, {
                $inc: { balance: amount },
            });
        }

        res.status(200).json({
            success: true,
            message: 'Deposit successful',
            data: transaction,
        });
    } catch (error) {
        next(error);
    }
};

export const withdraw = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { amount } = req.body;

        if (amount < 1) {
            throw new ApiError('Amount must be at least $1', 400);
        }

        // Check balance
        const user = await User.findById(req.user!._id);
        if (!user || user.balance < amount) {
            throw new ApiError('Insufficient balance', 400);
        }

        // Create transaction
        const transaction = await Transaction.create({
            user: req.user!._id,
            type: 'withdraw',
            amount,
            status: 'pending',
            description: 'Account withdrawal',
        });

        // In demo mode, auto-approve withdrawals
        transaction.status = 'completed';
        transaction.completedAt = new Date();
        await transaction.save();

        // Update balance
        await User.findByIdAndUpdate(req.user!._id, {
            $inc: { balance: -amount },
        });

        res.status(200).json({
            success: true,
            message: 'Withdrawal successful',
            data: transaction,
        });
    } catch (error) {
        next(error);
    }
};

export const transfer = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { amount, recipientId, description } = req.body;

        if (amount < 1) {
            throw new ApiError('Amount must be at least $1', 400);
        }

        // Check if recipient exists
        const recipient = await User.findById(recipientId);
        if (!recipient) {
            throw new ApiError('Recipient not found', 404);
        }

        // Check sender balance
        const sender = await User.findById(req.user!._id);
        if (!sender || sender.balance < amount) {
            throw new ApiError('Insufficient balance', 400);
        }

        // Create transaction for sender
        const senderTransaction = await Transaction.create({
            user: req.user!._id,
            type: 'transfer',
            amount,
            recipient: recipientId,
            status: 'completed',
            completedAt: new Date(),
            description: description || `Transfer to ${recipient.profile.firstName} ${recipient.profile.lastName}`,
        });

        // Create transaction for recipient
        await Transaction.create({
            user: recipientId,
            type: 'deposit',
            amount,
            status: 'completed',
            completedAt: new Date(),
            description: `Transfer from ${sender.profile.firstName} ${sender.profile.lastName}`,
            metadata: {
                fromUserId: req.user!._id.toString(),
            },
        });

        // Update balances
        await User.findByIdAndUpdate(req.user!._id, {
            $inc: { balance: -amount },
        });
        await User.findByIdAndUpdate(recipientId, {
            $inc: { balance: amount },
        });

        res.status(200).json({
            success: true,
            message: 'Transfer successful',
            data: senderTransaction,
        });
    } catch (error) {
        next(error);
    }
};

export const getTransactions = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { type, status, page = 1, limit = 10 } = req.query;
        const { skip, limit: pageLimit } = paginate(Number(page), Number(limit));

        const query: Record<string, unknown> = { user: req.user!._id };

        if (type) {
            query.type = type;
        }

        if (status) {
            query.status = status;
        }

        const [transactions, total] = await Promise.all([
            Transaction.find(query)
                .populate('recipient', 'profile.firstName profile.lastName')
                .skip(skip)
                .limit(pageLimit)
                .sort({ createdAt: -1 }),
            Transaction.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            data: transactions,
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

export const getBalance = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const user = await User.findById(req.user!._id).select('balance');

        res.status(200).json({
            success: true,
            data: {
                balance: user?.balance || 0,
                currency: 'usd',
            },
        });
    } catch (error) {
        next(error);
    }
};

export const getTransactionById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;

        const transaction = await Transaction.findById(id)
            .populate('recipient', 'profile.firstName profile.lastName email');

        if (!transaction) {
            throw new ApiError('Transaction not found', 404);
        }

        // Check ownership
        if (!transaction.user.equals(req.user!._id)) {
            throw new ApiError('Not authorized', 403);
        }

        res.status(200).json({
            success: true,
            data: transaction,
        });
    } catch (error) {
        next(error);
    }
};

// Stripe webhook handler
export const handleWebhook = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const signature = req.headers['stripe-signature'] as string;

        let event;
        try {
            event = stripeService.constructWebhookEvent(
                req.body,
                signature
            );
        } catch (err) {
            throw new ApiError('Webhook signature verification failed', 400);
        }

        // Handle the event
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                // Update transaction status
                await Transaction.findOneAndUpdate(
                    { stripePaymentIntentId: paymentIntent.id },
                    {
                        status: 'completed',
                        completedAt: new Date(),
                    }
                );
                break;

            case 'payment_intent.payment_failed':
                const failedPayment = event.data.object;
                await Transaction.findOneAndUpdate(
                    { stripePaymentIntentId: failedPayment.id },
                    {
                        status: 'failed',
                        failureReason: 'Payment failed',
                    }
                );
                break;

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        res.status(200).json({ received: true });
    } catch (error) {
        next(error);
    }
};
