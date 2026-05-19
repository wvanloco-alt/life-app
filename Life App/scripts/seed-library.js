#!/usr/bin/env node
/**
 * Seed script for the Library feature.
 *
 * All content and seeding logic live in seed-library-lib.cjs — the single
 * source of truth. This script is a thin CLI wrapper around that module.
 *
 * Idempotent: safe to re-run. Inserts missing topics/categories/items only.
 *
 * Usage:
 *   node scripts/seed-library.js
 *   DB_PATH=./local.db node scripts/seed-library.js
 *
 * DB_PATH defaults:
 *   local dev  → ./life-app.db   (matches apply-schema.js and reset-user-data.cjs)
 *   production → set DB_PATH=/data/life-app.db in container environment
 */

"use strict";

const path     = require("path");
const Database = require("better-sqlite3");
const { seedLibrary } = require("./seed-library-lib.cjs");

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "life-app.db");

console.log("seed-library: connecting to", DB_PATH);
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

try {
  const { topicsAdded, categoriesAdded, itemsAdded } = seedLibrary(db);

  if (topicsAdded === 0 && categoriesAdded === 0 && itemsAdded === 0) {
    console.log("seed-library: nothing to add — all content already present.");
  } else {
    console.log(
      `seed-library: done. ${topicsAdded} topic(s), ${categoriesAdded} category(ies), ${itemsAdded} item(s) added.`
    );
  }
} catch (err) {
  console.error("seed-library: failed:", err.message);
  process.exit(1);
} finally {
  db.close();
}
