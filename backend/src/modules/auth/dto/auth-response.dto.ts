import { UserRole } from '../../user/entities/user.entity';

export class UserResponseDto {
  id: string;
  email: string;
  nickname: string;
  role: UserRole;
  balanceUsdt: number;
  avatar?: string;
  createdAt: Date;
}

export class AuthResponseDto {
  accessToken: string;
  user: UserResponseDto;
}
