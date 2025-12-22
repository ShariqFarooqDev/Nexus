import { body, param, query, ValidationChain } from 'express-validator';

export const registerValidation: ValidationChain[] = [
    body('email')
        .isEmail()
        .withMessage('Please enter a valid email')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain uppercase, lowercase and number'),
    body('role')
        .isIn(['investor', 'entrepreneur'])
        .withMessage('Role must be either investor or entrepreneur'),
    body('profile.firstName')
        .trim()
        .notEmpty()
        .withMessage('First name is required')
        .isLength({ max: 50 })
        .withMessage('First name cannot exceed 50 characters'),
    body('profile.lastName')
        .trim()
        .notEmpty()
        .withMessage('Last name is required')
        .isLength({ max: 50 })
        .withMessage('Last name cannot exceed 50 characters'),
];

export const loginValidation: ValidationChain[] = [
    body('email')
        .isEmail()
        .withMessage('Please enter a valid email')
        .normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
];

export const updateProfileValidation: ValidationChain[] = [
    body('profile.firstName')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('First name cannot exceed 50 characters'),
    body('profile.lastName')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Last name cannot exceed 50 characters'),
    body('profile.bio')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Bio cannot exceed 500 characters'),
    body('profile.phone')
        .optional()
        .isLength({ max: 20 })
        .withMessage('Phone number cannot exceed 20 characters'),
    body('profile.location')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Location cannot exceed 100 characters'),
    body('profile.linkedIn')
        .optional()
        .isLength({ max: 200 })
        .withMessage('LinkedIn URL cannot exceed 200 characters'),
    body('profile.website')
        .optional()
        .isLength({ max: 200 })
        .withMessage('Website URL cannot exceed 200 characters'),
    body('profile.industry')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Industry cannot exceed 50 characters'),
    body('profile.startupName')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Startup name cannot exceed 100 characters'),
    body('profile.startupStage')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Startup stage cannot exceed 50 characters'),
    body('profile.fundingGoal')
        .optional()
        .isNumeric()
        .withMessage('Funding goal must be a number'),
];

export const meetingValidation: ValidationChain[] = [
    body('title')
        .trim()
        .notEmpty()
        .withMessage('Title is required')
        .isLength({ max: 100 })
        .withMessage('Title cannot exceed 100 characters'),
    body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),
    body('participants')
        .isArray({ min: 1 })
        .withMessage('At least one participant is required'),
    body('participants.*')
        .isMongoId()
        .withMessage('Invalid participant ID'),
    body('scheduledTime')
        .isISO8601()
        .withMessage('Please enter a valid date and time')
        .custom((value) => {
            if (new Date(value) <= new Date()) {
                throw new Error('Meeting time must be in the future');
            }
            return true;
        }),
    body('duration')
        .isInt({ min: 15, max: 480 })
        .withMessage('Duration must be between 15 and 480 minutes'),
];

export const documentValidation: ValidationChain[] = [
    body('title')
        .trim()
        .notEmpty()
        .withMessage('Title is required')
        .isLength({ max: 200 })
        .withMessage('Title cannot exceed 200 characters'),
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),
];

export const transactionValidation: ValidationChain[] = [
    body('amount')
        .isFloat({ min: 1 })
        .withMessage('Amount must be at least $1'),
    body('recipient')
        .optional()
        .isMongoId()
        .withMessage('Invalid recipient ID'),
    body('description')
        .optional()
        .isLength({ max: 200 })
        .withMessage('Description cannot exceed 200 characters'),
];

export const mongoIdValidation = (paramName: string): ValidationChain[] => [
    param(paramName).isMongoId().withMessage(`Invalid ${paramName}`),
];

export const paginationValidation: ValidationChain[] = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
];
