import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for database connection');
  }

  return {
    type: 'postgres',
    url: databaseUrl,
    ssl:
      process.env.DB_SSL === 'false'
        ? false
        : {
            rejectUnauthorized: false,
          },
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: !isProduction, // 生产环境使用 migrations
    logging: !isProduction,
  } as TypeOrmModuleOptions;
};
