import fs from "fs";
import path from "path";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "life-app.db");
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), "backups");
const MAX_BACKUPS = 7;

function getBackupFilename(): string {
  const date = new Date().toISOString().split("T")[0];
  return `life-app-${date}.db`;
}

function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function pruneOldBackups(): void {
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("life-app-") && f.endsWith(".db"))
    .sort()
    .reverse();

  const toDelete = files.slice(MAX_BACKUPS);
  for (const file of toDelete) {
    fs.unlinkSync(path.join(BACKUP_DIR, file));
  }
}

/**
 * Create a daily backup of the database if one hasn't been made today.
 * Safe to call multiple times -- it only copies once per day.
 */
export function runDailyBackup(): void {
  try {
    if (!fs.existsSync(DB_PATH)) return;

    ensureBackupDir();

    const backupFile = path.join(BACKUP_DIR, getBackupFilename());
    if (fs.existsSync(backupFile)) return;

    fs.copyFileSync(DB_PATH, backupFile);
    pruneOldBackups();

    console.log(`[Backup] Created daily backup: ${getBackupFilename()}`);
  } catch (error) {
    console.error("[Backup] Failed to create backup:", error);
  }
}
