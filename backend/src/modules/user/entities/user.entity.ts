import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  VIP = 'vip',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // === 基础认证字段 ===
  @Column({ unique: true, length: 255 })
  @Index()
  email: string;

  @Column({ length: 255 })
  passwordHash: string;

  // === 用户信息（预留扩展）===
  @Column({ nullable: true, length: 100 })
  nickname?: string;

  @Column({ nullable: true, length: 255 })
  avatar?: string;

  // === 角色和权限（预留）===
  @Column({
    type: 'text',
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    type: 'text',
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  // === 交易相关字段（预留）===
  @Column({ type: 'decimal', precision: 18, scale: 8, default: 10000 })
  balanceUsdt: number; // 模拟余额

  // === KYC 相关（预留）===
  @Column({ default: false })
  isKycVerified: boolean;

  @Column({ nullable: true })
  kycLevel?: number; // 0-3 级别

  // === 安全相关（预留）===
  @Column({ nullable: true })
  twoFactorSecret?: string; // 2FA secret

  @Column({ default: false })
  isTwoFactorEnabled: boolean;

  // === 统计字段（预留）===
  @Column({ type: 'int', default: 0 })
  totalOrders: number;

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @Column({ nullable: true, length: 45 })
  lastLoginIp?: string;

  // === 时间戳 ===
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // === 乐观锁（预留）===
  @Column({ type: 'int', default: 1 })
  version: number;
}
