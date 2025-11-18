import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for database connection');
  }

  const isSqlite = databaseUrl.startsWith('sqlite');

  const synchronize = process.env.DB_SYNC === 'true' ? true : !isProduction;

  // SQLite via URL (e.g., sqlite:data/fusio.db or sqlite://data/fusio.db)
  if (isSqlite) {
    let dbPath = databaseUrl.replace(/^sqlite:/, '');
    if (dbPath.startsWith('//')) {
      dbPath = dbPath.slice(2);
    }
    if (!dbPath) {
      throw new Error('DATABASE_URL for sqlite must include a database path');
    }
    return {
      type: 'better-sqlite3',
      database: dbPath,
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize,
      logging: !isProduction,
    } as TypeOrmModuleOptions;
  }

  // Postgres via URL
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
    synchronize, // 可通过 DB_SYNC=true 强制同步
    logging: !isProduction,
  } as TypeOrmModuleOptions;
};
