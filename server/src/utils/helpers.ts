import crypto from 'crypto';

export const generateOTP = (): string => {
    return crypto.randomInt(100000, 999999).toString();
};

export const generateRoomId = (): string => {
    return crypto.randomBytes(8).toString('hex');
};

export const generateResetToken = (): string => {
    return crypto.randomBytes(32).toString('hex');
};

export const hashToken = (token: string): string => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sanitizeUser = (user: any): Record<string, unknown> => {
    const { password, refreshToken, twoFactorSecret, passwordResetToken, ...sanitized } = user;
    return sanitized;
};

export const paginate = (
    page: number = 1,
    limit: number = 10
): { skip: number; limit: number } => {
    return {
        skip: (page - 1) * limit,
        limit: Math.min(limit, 100),
    };
};

export const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

export const isDateInPast = (date: Date): boolean => {
    return new Date(date) < new Date();
};

export const addMinutes = (date: Date, minutes: number): Date => {
    return new Date(date.getTime() + minutes * 60000);
};
