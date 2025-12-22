import jwt from 'jsonwebtoken';
import config from '../config/env.js';

interface TokenPayload {
    userId: string;
    role: string;
}

export const generateAccessToken = (payload: TokenPayload): string => {
    // Using explicit any cast to avoid type compatibility issues with different jwt versions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpire } as any);
};

export const generateRefreshToken = (payload: TokenPayload): string => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: config.jwtRefreshExpire } as any);
};

export const verifyAccessToken = (token: string): TokenPayload => {
    return jwt.verify(token, config.jwtSecret) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
    return jwt.verify(token, config.jwtRefreshSecret) as TokenPayload;
};

export const generateTokens = (
    userId: string,
    role: string
): { accessToken: string; refreshToken: string } => {
    const payload: TokenPayload = { userId, role };
    return {
        accessToken: generateAccessToken(payload),
        refreshToken: generateRefreshToken(payload),
    };
};
