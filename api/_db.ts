import { Pool, neon } from '@neondatabase/serverless';

export function sql() {
  return neon(process.env.DATABASE_URL!);
}

export function pool() {
  return new Pool({ connectionString: process.env.DATABASE_URL });
}
