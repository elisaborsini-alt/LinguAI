import {useAuthStore} from '@state/stores/authStore';
import axios, {AxiosInstance, AxiosError, InternalAxiosRequestConfig} from 'axios';
import Config from 'react-native-config';


// API Configuration
const API_BASE_URL = Config.API_BASE_URL || 'http://localhost:3000/api';
const API_TIMEOUT = Number(Config.API_TIMEOUT) || 30000;

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const tokens = useAuthStore.getState().tokens;

    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor - Handle errors and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {_retry?: boolean};

    // Handle 401 - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const tokens = useAuthStore.getState().tokens;

        if (tokens?.refreshToken) {
          // Try to refresh the token
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken: tokens.refreshToken,
          });

          const {accessToken, refreshToken, expiresAt} = response.data;

          // Update tokens in store
          useAuthStore.getState().setTokens({
            accessToken,
            refreshToken,
            expiresAt,
          });

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - logout user
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    return Promise.reject(formatApiError(error));
  },
);

// Error formatter
interface FormattedError {
  code: string;
  message: string;
  status?: number;
  details?: Record<string, unknown>;
}

const formatApiError = (error: AxiosError): FormattedError => {
  if (error.response) {
    // Server responded with error
    const data = error.response.data as any;
    return {
      code: data?.error?.code || 'SERVER_ERROR',
      message: data?.error?.message || 'An error occurred on the server',
      status: error.response.status,
      details: data?.error?.details,
    };
  } else if (error.request) {
    // Request made but no response
    return {
      code: 'NETWORK_ERROR',
      message: 'Unable to connect to the server. Please check your connection.',
    };
  } else {
    // Request setup error
    return {
      code: 'REQUEST_ERROR',
      message: error.message || 'An error occurred while making the request',
    };
  }
};

// Helper methods
export const api = {
  get: <T>(url: string, config?: object) =>
    apiClient.get<T>(url, config).then((res) => res.data),

  post: <T>(url: string, data?: object, config?: object) =>
    apiClient.post<T>(url, data, config).then((res) => res.data),

  put: <T>(url: string, data?: object, config?: object) =>
    apiClient.put<T>(url, data, config).then((res) => res.data),

  patch: <T>(url: string, data?: object, config?: object) =>
    apiClient.patch<T>(url, data, config).then((res) => res.data),

  delete: <T>(url: string, config?: object) =>
    apiClient.delete<T>(url, config).then((res) => res.data),
};

export default apiClient;
