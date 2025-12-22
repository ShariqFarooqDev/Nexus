import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// API Base URL - defaults to localhost for development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Token storage keys
const ACCESS_TOKEN_KEY = 'nexus_access_token';
const REFRESH_TOKEN_KEY = 'nexus_refresh_token';

// Token management
export const tokenManager = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clearTokens: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenManager.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If unauthorized and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = tokenManager.getRefreshToken();
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh-token`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          tokenManager.setTokens(accessToken, newRefreshToken);

          // Retry original request
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          return api(originalRequest);
        } catch {
          // Refresh failed, clear tokens
          tokenManager.clearTokens();
          window.location.href = '/auth';
        }
      }
    }

    return Promise.reject(error);
  }
);

// Types
export interface User {
  _id: string;
  email: string;
  role: 'investor' | 'entrepreneur';
  profile: {
    firstName: string;
    lastName: string;
    bio: string;
    avatar: string;
    phone?: string;
    location?: string;
    linkedIn?: string;
    website?: string;
    startupName?: string;
    startupStage?: string;
    industry?: string;
    fundingGoal?: number;
    preferredIndustries?: string[];
    investmentRange?: { min: number; max: number };
  };
  balance: number;
  isVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
  requiresTwoFactor?: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Auth API
export const authApi = {
  register: async (data: {
    email: string;
    password: string;
    role: 'investor' | 'entrepreneur';
    profile: {
      firstName: string;
      lastName: string;
    };
  }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    if (response.data.data) {
      tokenManager.setTokens(
        response.data.data.accessToken,
        response.data.data.refreshToken
      );
    }
    return response.data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    if (response.data.data) {
      tokenManager.setTokens(
        response.data.data.accessToken,
        response.data.data.refreshToken
      );
    }
    return response.data;
  },

  verifyOtp: async (email: string, otp: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/verify-otp', { email, otp });
    if (response.data.data) {
      tokenManager.setTokens(
        response.data.data.accessToken,
        response.data.data.refreshToken
      );
    }
    return response.data;
  },

  // Send OTP for email verification (before registration)
  sendOtp: async (email: string): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>('/auth/send-otp', { email });
    return response.data;
  },

  // Verify OTP only (without completing registration)
  verifyOtpOnly: async (email: string, otp: string): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>('/auth/verify-otp-only', { email, otp });
    return response.data;
  },

  resendOtp: async (email: string): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>('/auth/resend-otp', { email });
    return response.data;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } finally {
      tokenManager.clearTokens();
    }
  },

  forgotPassword: async (email: string): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, password: string): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>('/auth/reset-password', { token, password });
    return response.data;
  },

  getMe: async (): Promise<ApiResponse<User>> => {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    return response.data;
  },
};

// User API
export const userApi = {
  getProfile: async (): Promise<ApiResponse<User>> => {
    const response = await api.get<ApiResponse<User>>('/users/me');
    return response.data;
  },

  updateProfile: async (profile: Partial<User['profile']>): Promise<ApiResponse<User>> => {
    const response = await api.put<ApiResponse<User>>('/users/me', { profile });
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<ApiResponse> => {
    const response = await api.put<ApiResponse>('/users/me/password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  toggleTwoFactor: async (enabled: boolean): Promise<ApiResponse> => {
    const response = await api.put<ApiResponse>('/users/me/2fa', { enabled });
    return response.data;
  },

  getUsers: async (params?: {
    role?: string;
    industry?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<User[]>> => {
    const response = await api.get<ApiResponse<User[]>>('/users', { params });
    return response.data;
  },

  getUserById: async (id: string): Promise<ApiResponse<User>> => {
    const response = await api.get<ApiResponse<User>>(`/users/${id}`);
    return response.data;
  },
};

// Meeting API
export interface Meeting {
  _id: string;
  title: string;
  description?: string;
  organizer: User;
  participants: {
    user: User;
    status: 'pending' | 'accepted' | 'rejected';
    respondedAt?: string;
  }[];
  scheduledTime: string;
  duration: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  meetingLink?: string;
  roomId?: string;
  agenda?: string;
}

export const meetingApi = {
  create: async (data: {
    title: string;
    description?: string;
    participants: string[];
    scheduledTime: string;
    duration: number;
    agenda?: string;
  }): Promise<ApiResponse<Meeting>> => {
    const response = await api.post<ApiResponse<Meeting>>('/meetings', data);
    return response.data;
  },

  getAll: async (params?: {
    status?: string;
    upcoming?: boolean;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<Meeting[]>> => {
    const response = await api.get<ApiResponse<Meeting[]>>('/meetings', { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Meeting>> => {
    const response = await api.get<ApiResponse<Meeting>>(`/meetings/${id}`);
    return response.data;
  },

  update: async (id: string, data: Partial<Meeting>): Promise<ApiResponse<Meeting>> => {
    const response = await api.put<ApiResponse<Meeting>>(`/meetings/${id}`, data);
    return response.data;
  },

  respond: async (id: string, response: 'accepted' | 'rejected'): Promise<ApiResponse> => {
    const res = await api.post<ApiResponse>(`/meetings/${id}/respond`, { response });
    return res.data;
  },

  cancel: async (id: string): Promise<ApiResponse> => {
    const response = await api.delete<ApiResponse>(`/meetings/${id}`);
    return response.data;
  },

  getCalendarEvents: async (start: string, end: string): Promise<ApiResponse<Meeting[]>> => {
    const response = await api.get<ApiResponse<Meeting[]>>('/meetings/calendar', {
      params: { start, end },
    });
    return response.data;
  },
};

// Document API
export interface Document {
  _id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: User;
  sharedWith: {
    user: User;
    permission: 'view' | 'edit' | 'sign';
    sharedAt: string;
  }[];
  version: number;
  status: 'draft' | 'pending_signature' | 'signed' | 'archived';
  signatures: {
    user: User;
    signatureImage: string;
    signedAt: string;
  }[];
  createdAt: string;
}

export const documentApi = {
  upload: async (file: File, title: string, description?: string): Promise<ApiResponse<Document>> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    if (description) formData.append('description', description);

    const response = await api.post<ApiResponse<Document>>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getAll: async (params?: {
    status?: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<Document[]>> => {
    const response = await api.get<ApiResponse<Document[]>>('/documents', { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Document>> => {
    const response = await api.get<ApiResponse<Document>>(`/documents/${id}`);
    return response.data;
  },

  share: async (id: string, userId: string, permission: 'view' | 'edit' | 'sign'): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>(`/documents/${id}/share`, { userId, permission });
    return response.data;
  },

  sign: async (id: string, signatureData: string): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>(`/documents/${id}/sign`, { signatureData });
    return response.data;
  },

  updateStatus: async (id: string, status: Document['status']): Promise<ApiResponse<Document>> => {
    const response = await api.put<ApiResponse<Document>>(`/documents/${id}/status`, { status });
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse> => {
    const response = await api.delete<ApiResponse>(`/documents/${id}`);
    return response.data;
  },
};

// Payment API
export interface Transaction {
  _id: string;
  user: string;
  type: 'deposit' | 'withdraw' | 'transfer' | 'refund';
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  recipient?: User;
  description?: string;
  createdAt: string;
  completedAt?: string;
}

export const paymentApi = {
  createPaymentIntent: async (amount: number): Promise<ApiResponse<{ clientSecret: string; paymentIntentId: string }>> => {
    const response = await api.post<ApiResponse<{ clientSecret: string; paymentIntentId: string }>>('/payments/create-intent', { amount });
    return response.data;
  },

  deposit: async (amount: number, paymentIntentId?: string): Promise<ApiResponse<Transaction>> => {
    const response = await api.post<ApiResponse<Transaction>>('/payments/deposit', {
      amount,
      paymentIntentId,
    });
    return response.data;
  },

  withdraw: async (amount: number): Promise<ApiResponse<Transaction>> => {
    const response = await api.post<ApiResponse<Transaction>>('/payments/withdraw', { amount });
    return response.data;
  },

  transfer: async (amount: number, recipientId: string, description?: string): Promise<ApiResponse<Transaction>> => {
    const response = await api.post<ApiResponse<Transaction>>('/payments/transfer', {
      amount,
      recipientId,
      description,
    });
    return response.data;
  },

  getTransactions: async (params?: {
    type?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<Transaction[]>> => {
    const response = await api.get<ApiResponse<Transaction[]>>('/payments/transactions', { params });
    return response.data;
  },

  getBalance: async (): Promise<ApiResponse<{ balance: number; currency: string }>> => {
    const response = await api.get<ApiResponse<{ balance: number; currency: string }>>('/payments/balance');
    return response.data;
  },
};

export default api;