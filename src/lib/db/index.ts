import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Global cached pool to avoid connection exhaustion in Next.js dev hot-reloads
declare global {
  var _qlessPgPool: pg.Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not configured in environment');
}

export const pool = globalThis._qlessPgPool ?? new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
});

if (process.env.NODE_ENV !== 'production') {
  globalThis._qlessPgPool = pool;
}

export const db = drizzle(pool, { schema });
export * from './schema';
