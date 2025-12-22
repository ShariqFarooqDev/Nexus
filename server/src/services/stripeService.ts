import Stripe from 'stripe';
import config from '../config/env.js';

const stripe = new Stripe(config.stripe.secretKey, {
    apiVersion: '2023-10-16',
});

interface CreatePaymentIntentParams {
    amount: number;
    currency?: string;
    customerId?: string;
    metadata?: Record<string, string>;
}

interface CreateCustomerParams {
    email: string;
    name: string;
    metadata?: Record<string, string>;
}

export const createPaymentIntent = async ({
    amount,
    currency = 'usd',
    customerId,
    metadata,
}: CreatePaymentIntentParams): Promise<Stripe.PaymentIntent> => {
    return stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        customer: customerId,
        metadata,
        automatic_payment_methods: {
            enabled: true,
        },
    });
};

export const createCustomer = async ({
    email,
    name,
    metadata,
}: CreateCustomerParams): Promise<Stripe.Customer> => {
    return stripe.customers.create({
        email,
        name,
        metadata,
    });
};

export const retrievePaymentIntent = async (
    paymentIntentId: string
): Promise<Stripe.PaymentIntent> => {
    return stripe.paymentIntents.retrieve(paymentIntentId);
};

export const confirmPaymentIntent = async (
    paymentIntentId: string,
    paymentMethodId?: string
): Promise<Stripe.PaymentIntent> => {
    return stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
    });
};

export const cancelPaymentIntent = async (
    paymentIntentId: string
): Promise<Stripe.PaymentIntent> => {
    return stripe.paymentIntents.cancel(paymentIntentId);
};

export const createRefund = async (
    paymentIntentId: string,
    amount?: number
): Promise<Stripe.Refund> => {
    return stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
    });
};

export const listPaymentMethods = async (
    customerId: string
): Promise<Stripe.PaymentMethod[]> => {
    const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
    });
    return paymentMethods.data;
};

export const constructWebhookEvent = (
    payload: string | Buffer,
    signature: string
): Stripe.Event => {
    return stripe.webhooks.constructEvent(
        payload,
        signature,
        config.stripe.webhookSecret
    );
};

export const createTransfer = async (
    amount: number,
    destination: string,
    metadata?: Record<string, string>
): Promise<Stripe.Transfer> => {
    return stripe.transfers.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        destination,
        metadata,
    });
};

export default stripe;
