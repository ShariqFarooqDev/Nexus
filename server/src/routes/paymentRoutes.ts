import { Router } from 'express';
import express from 'express';
import {
    createPaymentIntent,
    deposit,
    withdraw,
    transfer,
    getTransactions,
    getBalance,
    getTransactionById,
    handleWebhook,
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { transactionValidation, mongoIdValidation, paginationValidation } from '../middleware/validation.js';
import { validateRequest } from '../middleware/errorHandler.js';

const router = Router();

// Stripe webhook - must be before protect middleware and use raw body
router.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    handleWebhook
);

// All other routes are protected
router.use(protect);

// Payment routes
router.post('/create-intent', createPaymentIntent);
router.post('/deposit', transactionValidation, validateRequest, deposit);
router.post('/withdraw', transactionValidation, validateRequest, withdraw);
router.post('/transfer', transactionValidation, validateRequest, transfer);
router.get('/transactions', paginationValidation, validateRequest, getTransactions);
router.get('/transactions/:id', mongoIdValidation('id'), validateRequest, getTransactionById);
router.get('/balance', getBalance);

export default router;
