import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  const dbType = process.env.DB_TYPE || 'sqlite';

  const baseConfig = {
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: !isProduction, // 生产环境使用 migrations
    logging: !isProduction,
  };

  if (dbType === 'postgres') {
    return {
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'fusio',
      ...baseConfig,
    } as TypeOrmModuleOptions;
  }

  // 默认 SQLite (开发环境) - 使用 better-sqlite3
  return {
    type: 'better-sqlite3',
    database: process.env.DB_PATH || 'data/fusio.db',
    ...baseConfig,
  } as TypeOrmModuleOptions;
};
