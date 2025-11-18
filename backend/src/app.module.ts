import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { MarketModule } from './modules/market/market.module';
import { getDatabaseConfig } from './config/database.config';
import { OrderModule } from './modules/order/order.module';
import { BullModule } from '@nestjs/bull';
import { BadRequestException } from '@nestjs/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
    }),
    TypeOrmModule.forRoot(getDatabaseConfig()),
    BullModule.forRoot({
      redis: (() => {
        if (!process.env.REDIS_URL) {
          throw new BadRequestException('REDIS_URL is required for BullModule');
        }
        return process.env.REDIS_URL;
      })(),
    }),
    RedisModule.forRoot({
      type: 'single',
      url: (() => {
        if (!process.env.REDIS_URL) {
          throw new BadRequestException('REDIS_URL is required for RedisModule');
        }
        return process.env.REDIS_URL;
      })(),
    }),
    AuthModule,
    MarketModule,
    OrderModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
