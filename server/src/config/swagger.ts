import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Nexus API',
            version: '1.0.0',
            description: 'API documentation for Nexus - A platform connecting entrepreneurs and investors',
            contact: {
                name: 'Nexus Support',
                email: 'support@nexus.com',
            },
        },
        servers: [
            {
                url: '/api',
                description: 'API Server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        role: { type: 'string', enum: ['Investor', 'Entrepreneur'] },
                        isVerified: { type: 'boolean' },
                        balance: { type: 'number' },
                        profile: { $ref: '#/components/schemas/Profile' },
                    },
                },
                Profile: {
                    type: 'object',
                    properties: {
                        company: { type: 'string' },
                        position: { type: 'string' },
                        bio: { type: 'string' },
                        location: { type: 'string' },
                        phone: { type: 'string' },
                        website: { type: 'string' },
                        linkedin: { type: 'string' },
                        twitter: { type: 'string' },
                    },
                },
                Meeting: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        title: { type: 'string' },
                        description: { type: 'string' },
                        organizer: { type: 'string' },
                        participant: { type: 'string' },
                        scheduledAt: { type: 'string', format: 'date-time' },
                        duration: { type: 'number' },
                        status: { type: 'string', enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed'] },
                        meetingType: { type: 'string', enum: ['video', 'in-person'] },
                        roomId: { type: 'string' },
                    },
                },
                Document: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        name: { type: 'string' },
                        originalName: { type: 'string' },
                        mimeType: { type: 'string' },
                        size: { type: 'number' },
                        url: { type: 'string' },
                        owner: { type: 'string' },
                        status: { type: 'string', enum: ['draft', 'pending_signature', 'signed', 'archived'] },
                        sharedWith: { type: 'array', items: { type: 'string' } },
                    },
                },
                Transaction: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        user: { type: 'string' },
                        type: { type: 'string', enum: ['deposit', 'withdrawal', 'transfer_in', 'transfer_out'] },
                        amount: { type: 'number' },
                        status: { type: 'string', enum: ['pending', 'completed', 'failed'] },
                        description: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string' },
                    },
                },
            },
        },
        tags: [
            { name: 'Auth', description: 'Authentication endpoints' },
            { name: 'Users', description: 'User management endpoints' },
            { name: 'Meetings', description: 'Meeting scheduling endpoints' },
            { name: 'Documents', description: 'Document management endpoints' },
            { name: 'Payments', description: 'Payment and transaction endpoints' },
        ],
        paths: {
            // ==================== AUTH ====================
            '/auth/send-otp': {
                post: {
                    tags: ['Auth'],
                    summary: 'Send OTP for registration',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['email'],
                                    properties: {
                                        email: { type: 'string', format: 'email' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'OTP sent successfully' },
                        400: { description: 'Email already registered' },
                    },
                },
            },
            '/auth/verify-otp-only': {
                post: {
                    tags: ['Auth'],
                    summary: 'Verify OTP without registration',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['email', 'otp'],
                                    properties: {
                                        email: { type: 'string', format: 'email' },
                                        otp: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'OTP verified' },
                        400: { description: 'Invalid or expired OTP' },
                    },
                },
            },
            '/auth/register': {
                post: {
                    tags: ['Auth'],
                    summary: 'Register a new user',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['firstName', 'lastName', 'email', 'password', 'role'],
                                    properties: {
                                        firstName: { type: 'string' },
                                        lastName: { type: 'string' },
                                        email: { type: 'string', format: 'email' },
                                        password: { type: 'string', minLength: 8 },
                                        role: { type: 'string', enum: ['Investor', 'Entrepreneur'] },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: { description: 'User registered successfully' },
                        400: { description: 'Validation error' },
                    },
                },
            },
            '/auth/login': {
                post: {
                    tags: ['Auth'],
                    summary: 'Login user',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['email', 'password'],
                                    properties: {
                                        email: { type: 'string', format: 'email' },
                                        password: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Login successful, returns tokens' },
                        401: { description: 'Invalid credentials' },
                    },
                },
            },
            '/auth/refresh-token': {
                post: {
                    tags: ['Auth'],
                    summary: 'Refresh access token',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['refreshToken'],
                                    properties: {
                                        refreshToken: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'New access token returned' },
                        401: { description: 'Invalid refresh token' },
                    },
                },
            },
            '/auth/me': {
                get: {
                    tags: ['Auth'],
                    summary: 'Get current user',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Current user data' },
                        401: { description: 'Unauthorized' },
                    },
                },
            },
            // ==================== USERS ====================
            '/users/me': {
                get: {
                    tags: ['Users'],
                    summary: 'Get current user profile',
                    security: [{ bearerAuth: [] }],
                    responses: { 200: { description: 'User profile' } },
                },
                put: {
                    tags: ['Users'],
                    summary: 'Update user profile',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Profile' },
                            },
                        },
                    },
                    responses: { 200: { description: 'Profile updated' } },
                },
            },
            '/users': {
                get: {
                    tags: ['Users'],
                    summary: 'List all users',
                    security: [{ bearerAuth: [] }],
                    responses: { 200: { description: 'List of users' } },
                },
            },
            '/users/{id}': {
                get: {
                    tags: ['Users'],
                    summary: 'Get user by ID',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'User data' } },
                },
            },
            // ==================== MEETINGS ====================
            '/meetings': {
                get: {
                    tags: ['Meetings'],
                    summary: 'Get all meetings',
                    security: [{ bearerAuth: [] }],
                    responses: { 200: { description: 'List of meetings' } },
                },
                post: {
                    tags: ['Meetings'],
                    summary: 'Create a new meeting',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['title', 'participant', 'scheduledAt', 'duration'],
                                    properties: {
                                        title: { type: 'string' },
                                        description: { type: 'string' },
                                        participant: { type: 'string' },
                                        scheduledAt: { type: 'string', format: 'date-time' },
                                        duration: { type: 'number' },
                                        meetingType: { type: 'string', enum: ['video', 'in-person'] },
                                    },
                                },
                            },
                        },
                    },
                    responses: { 201: { description: 'Meeting created' } },
                },
            },
            '/meetings/{id}/accept': {
                put: {
                    tags: ['Meetings'],
                    summary: 'Accept meeting invitation',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Meeting accepted' } },
                },
            },
            '/meetings/{id}/reject': {
                put: {
                    tags: ['Meetings'],
                    summary: 'Reject meeting invitation',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Meeting rejected' } },
                },
            },
            '/meetings/{id}/cancel': {
                put: {
                    tags: ['Meetings'],
                    summary: 'Cancel meeting',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Meeting cancelled' } },
                },
            },
            // ==================== DOCUMENTS ====================
            '/documents': {
                get: {
                    tags: ['Documents'],
                    summary: 'Get all documents',
                    security: [{ bearerAuth: [] }],
                    responses: { 200: { description: 'List of documents' } },
                },
            },
            '/documents/upload': {
                post: {
                    tags: ['Documents'],
                    summary: 'Upload a document',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        content: {
                            'multipart/form-data': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        file: { type: 'string', format: 'binary' },
                                    },
                                },
                            },
                        },
                    },
                    responses: { 201: { description: 'Document uploaded' } },
                },
            },
            '/documents/{id}': {
                get: {
                    tags: ['Documents'],
                    summary: 'Get document by ID',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Document data' } },
                },
                delete: {
                    tags: ['Documents'],
                    summary: 'Delete document',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Document deleted' } },
                },
            },
            '/documents/{id}/share': {
                post: {
                    tags: ['Documents'],
                    summary: 'Share document with users',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        userIds: { type: 'array', items: { type: 'string' } },
                                    },
                                },
                            },
                        },
                    },
                    responses: { 200: { description: 'Document shared' } },
                },
            },
            '/documents/{id}/sign': {
                post: {
                    tags: ['Documents'],
                    summary: 'Sign document with e-signature',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        signatureData: { type: 'string', description: 'Base64 signature image' },
                                    },
                                },
                            },
                        },
                    },
                    responses: { 200: { description: 'Document signed' } },
                },
            },
            // ==================== PAYMENTS ====================
            '/payments/balance': {
                get: {
                    tags: ['Payments'],
                    summary: 'Get user balance',
                    security: [{ bearerAuth: [] }],
                    responses: { 200: { description: 'User balance' } },
                },
            },
            '/payments/deposit': {
                post: {
                    tags: ['Payments'],
                    summary: 'Deposit funds',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['amount'],
                                    properties: {
                                        amount: { type: 'number', minimum: 1 },
                                    },
                                },
                            },
                        },
                    },
                    responses: { 200: { description: 'Deposit successful' } },
                },
            },
            '/payments/withdraw': {
                post: {
                    tags: ['Payments'],
                    summary: 'Withdraw funds',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['amount'],
                                    properties: {
                                        amount: { type: 'number', minimum: 1 },
                                    },
                                },
                            },
                        },
                    },
                    responses: { 200: { description: 'Withdrawal successful' } },
                },
            },
            '/payments/transfer': {
                post: {
                    tags: ['Payments'],
                    summary: 'Transfer funds to another user',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['recipientId', 'amount'],
                                    properties: {
                                        recipientId: { type: 'string' },
                                        amount: { type: 'number', minimum: 1 },
                                    },
                                },
                            },
                        },
                    },
                    responses: { 200: { description: 'Transfer successful' } },
                },
            },
            '/payments/transactions': {
                get: {
                    tags: ['Payments'],
                    summary: 'Get transaction history',
                    security: [{ bearerAuth: [] }],
                    responses: { 200: { description: 'List of transactions' } },
                },
            },
        },
    },
    apis: [], // We defined paths inline above
};

export const swaggerSpec = swaggerJsdoc(options);
