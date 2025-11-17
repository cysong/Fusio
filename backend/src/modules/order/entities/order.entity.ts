import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { OrderSide, OrderStatus, OrderType } from '../constants/order-status.enum';

@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  @Index()
  userId: string;

  @Column({ length: 30 })
  @Index()
  exchange: string; // e.g. mock/binance/bybit/okx

  @Column({ length: 50 })
  @Index()
  symbol: string; // e.g. BTC/USDT

  @Column({ type: 'text' })
  side: OrderSide;

  @Column({ type: 'text' })
  type: OrderType;

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  price?: number;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  quantity: number;

  @Column({ type: 'text', default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  filledQuantity: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  avgPrice?: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  fee?: number;

  @Column({ length: 120, nullable: true })
  exchangeOrderId?: string; // mock generated

  @Column({ length: 120, nullable: true })
  clientOrderId?: string; // idempotency from client

  @Column({ length: 100, nullable: true })
  errorCode?: string;

  @Column({ length: 255, nullable: true })
  errorMessage?: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
