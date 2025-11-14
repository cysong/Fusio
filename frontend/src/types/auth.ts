export interface User {
  id: string;
  email: string;
  nickname: string;
  role: string;
  balanceUsdt: number;
  avatar?: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nickname?: string;
}
