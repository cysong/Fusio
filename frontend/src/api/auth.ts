import apiClient from '../lib/axios';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from '../types/auth';

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    return apiClient.post('/auth/login', data);
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    return apiClient.post('/auth/register', data);
  },

  getProfile: async (): Promise<User> => {
    return apiClient.get('/auth/profile');
  },
};
