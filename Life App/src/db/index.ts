import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import path from "path";
import * as schema from "./schema";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "life-app.db");

let _db: BetterSQLite3Database<typeof schema> | null = null;

function getDb(): BetterSQLite3Database<typeof schema> {
  if (_db) return _db;

  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("foreign_keys = ON");

  _db = drizzle(sqlite, { schema });

  const migrationsFolder = path.join(process.cwd(), "migrations");
  try {
    migrate(_db, { migrationsFolder });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ENOENT") || msg.includes("no such file")) {
      // Migrations folder may not exist in local dev (uses drizzle-kit push)
    } else {
      console.error("[DB] Migration failed:", msg);
    }
  }

  return _db;
}

export const db = new Proxy({} as BetterSQLite3Database<typeof schema>, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
