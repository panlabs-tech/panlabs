import { Pool } from "pg";

/**
 * Postgres access for panlabs (#10). The only write path of the app is the
 * tracked redirect (`/go/[slug]` → #11); reads/writes go through this module.
 *
 * The pool is created lazily from `DATABASE_URL` so importing this file never
 * opens a connection at build time (the env is runtime-only).
 */

/** Minimal query surface, so callers can be tested without a real connection. */
export interface Queryable {
  query(sql: string, params?: unknown[]): Promise<{ rows: unknown[] }>;
}

/** Idempotent base schema: one row per tracked click (ADR-0006, ADR-0001). */
export const CLICK_EVENT_DDL = `
  CREATE TABLE IF NOT EXISTS click_event (
    id   bigserial   PRIMARY KEY,
    slug text        NOT NULL,
    ts   timestamptz NOT NULL DEFAULT now()
  );
`;

/** Run the migration. Safe to call repeatedly (CREATE TABLE IF NOT EXISTS). */
export async function ensureSchema(db: Queryable): Promise<void> {
  await db.query(CLICK_EVENT_DDL);
}

let migrated = false;

/**
 * Record one tracked click. Ensures the schema exists once per process, then
 * inserts a row (the timestamp defaults to now() in the DB).
 */
export async function recordClick(slug: string, db: Queryable = getPool()): Promise<void> {
  if (!migrated) {
    await ensureSchema(db);
    migrated = true;
  }
  await db.query("INSERT INTO click_event (slug) VALUES ($1)", [slug]);
}

let pool: Pool | undefined;

/** Lazily-built shared connection pool. Throws if `DATABASE_URL` is unset. */
export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    pool = new Pool({ connectionString });
  }
  return pool;
}
