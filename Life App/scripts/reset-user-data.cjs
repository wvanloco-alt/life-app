/**
 * Wipe all Life App data for one user while keeping their login account.
 *
 * Login uses the `users.username` column (there is no separate email field).
 * Pass the same value you use on the login screen, e.g. wvanloco@gmail.com
 *
 * Usage (from Life App/):
 *
 *   # Preview counts only (default — nothing is deleted)
 *   node scripts/reset-user-data.cjs wvanloco@gmail.com
 *
 *   # Actually delete (irreversible — back up the DB first)
 *   node scripts/reset-user-data.cjs wvanloco@gmail.com --confirm
 *
 * Environment:
 *   DB_PATH  — SQLite file (default: ./life-app.db; production: /data/life-app.db)
 *
 * After reset, sign in again. Default roles, activity types, spending categories,
 * and scheduler settings are re-seeded automatically on first login.
 */

const Database = require("better-sqlite3");
const path = require("path");
const { resetUserDataByUsername } = require("./reset-user-data-lib.cjs");

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "life-app.db");
const username =
  process.argv.slice(2).find((a) => !a.startsWith("-")) || process.env.USER_USERNAME;
const confirm = process.argv.includes("--confirm");

if (!username) {
  console.error("\nUsage: node scripts/reset-user-data.cjs <username> [--confirm]\n");
  console.error("Example: node scripts/reset-user-data.cjs wvanloco@gmail.com --confirm\n");
  process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const outcome = resetUserDataByUsername(db, username, { confirm });

if (!outcome.ok) {
  console.error(`\n${outcome.error}.\n`);
  console.error('List accounts: sqlite3 <db> "SELECT username, role FROM users;"\n');
  db.close();
  process.exit(1);
}

const { user, results, total } = outcome;

console.log(`\nUser: ${user.username} (${user.id})  role=${user.role}  active=${user.is_active ? 1 : 0}`);
console.log(`Database: ${DB_PATH}`);
console.log(confirm ? "Mode: DELETE (--confirm)\n" : "Mode: DRY RUN (pass --confirm to delete)\n");

for (const { label, n } of results) {
  if (n > 0) console.log(`  ${label}: ${n} row(s)`);
}

console.log(`\nTotal: ${total} row(s) ${confirm ? "deleted" : "would be deleted"}.`);
console.log("User account kept — you can log in again with the same password.\n");

if (!confirm) {
  console.log("To apply: node scripts/reset-user-data.cjs", username, "--confirm\n");
}

db.close();
