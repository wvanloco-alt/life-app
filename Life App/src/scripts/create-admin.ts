/**
 * One-time script to create the first admin user.
 * Run with: npx tsx src/scripts/create-admin.ts
 *
 * Set these environment variables before running (or edit the defaults below):
 *   ADMIN_USERNAME  - the username for the admin account
 *   ADMIN_PASSWORD  - the password for the admin account
 */

import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import path from "path";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "life-app.db");
const username = process.env.ADMIN_USERNAME || "admin";
const password = process.env.ADMIN_PASSWORD;

if (!password) {
  console.error("\nError: ADMIN_PASSWORD environment variable is required.");
  console.error("Usage: ADMIN_PASSWORD=yourpassword npx tsx src/scripts/create-admin.ts\n");
  process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);

if (existing) {
  console.log(`\nUser "${username}" already exists. No changes made.\n`);
  db.close();
  process.exit(0);
}

const id = crypto.randomUUID();
const passwordHash = bcrypt.hashSync(password, 12);

db.prepare(
  "INSERT INTO users (id, username, password_hash, role, is_active) VALUES (?, ?, ?, 'admin', 1)"
).run(id, username, passwordHash);

db.close();

console.log(`\nAdmin user created successfully.`);
console.log(`  Username: ${username}`);
console.log(`  ID:       ${id}`);
console.log(`\nLog in at http://localhost:3000/login\n`);
