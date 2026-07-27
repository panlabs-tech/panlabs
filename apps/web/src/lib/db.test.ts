import { describe, expect, it } from "vitest";
import { ensureSchema, type Queryable, recordClick } from "./db";

function fakeDb() {
  const calls: Array<{ sql: string; params?: unknown[] }> = [];
  const db: Queryable = {
    async query(sql: string, params?: unknown[]) {
      calls.push({ sql, params });
      return { rows: [] };
    },
  };
  return { db, calls };
}

describe("ensureSchema", () => {
  it("creates the click_event table with slug and ts columns, idempotently", async () => {
    const { db, calls } = fakeDb();
    await ensureSchema(db);
    expect(calls).toHaveLength(1);
    const ddl = calls[0].sql;
    expect(ddl).toMatch(/create table if not exists click_event/i);
    expect(ddl).toMatch(/\bslug\b/);
    expect(ddl).toMatch(/\bts\b/);
  });
});

describe("recordClick", () => {
  it("inserts one click_event row, passing the slug as a bound parameter", async () => {
    const { db, calls } = fakeDb();
    await recordClick("ethitorial", db);
    const insert = calls.find((c) => /insert into click_event/i.test(c.sql));
    expect(insert).toBeDefined();
    expect(insert?.params).toEqual(["ethitorial"]);
  });
});
