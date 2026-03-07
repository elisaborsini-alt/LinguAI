import {api} from '../client';
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from '@appTypes/api';

export const authApi = {
  /**
   * Login with email and password
   */
  login: (credentials: LoginRequest): Promise<AuthResponse> =>
    api.post<AuthResponse>('/auth/login', credentials),

  /**
   * Register a new user
   */
  register: (data: RegisterRequest): Promise<AuthResponse> =>
    api.post<AuthResponse>('/auth/register', data),

  /**
   * Refresh access token
   */
  refreshToken: (data: RefreshTokenRequest): Promise<RefreshTokenResponse> =>
    api.post<RefreshTokenResponse>('/auth/refresh', data),

  /**
   * Logout and invalidate tokens
   */
  logout: (): Promise<void> => api.post('/auth/logout'),

  /**
   * Request password reset
   */
  forgotPassword: (email: string): Promise<{message: string}> =>
    api.post('/auth/forgot-password', {email}),

  /**
   * Reset password with token
   */
  resetPassword: (token: string, password: string): Promise<{message: string}> =>
    api.post('/auth/reset-password', {token, password}),

  /**
   * Verify email
   */
  verifyEmail: (token: string): Promise<{message: string}> =>
    api.post('/auth/verify-email', {token}),
};

export default authApi;
