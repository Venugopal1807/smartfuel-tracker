import * as SQLite from "expo-sqlite";
import * as Crypto from "expo-crypto";

type QueueRecord = {
  id: number;
  uuid: string;
  type: string;
  payload: string;
  status: "PENDING" | "SYNCED";
  created_at: string;
};

const DB_NAME = "smartfuel.db";
const TABLE_SQL = `
CREATE TABLE IF NOT EXISTS offline_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE,
  type TEXT,
  payload TEXT,
  status TEXT,
  created_at DATETIME
);`;

const SYNC_EVENTS_SQL = `
CREATE TABLE IF NOT EXISTS sync_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT,
  payload TEXT,
  status TEXT DEFAULT 'PENDING',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`;

const db = SQLite.openDatabaseSync(DB_NAME);

const applyPragmas = async () => {
  await db.execAsync("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;");
};

const run = async (sql: string, params: unknown[] = []) => {
  try {
    await db.runAsync(sql, params as SQLite.SQLiteBindValue[]);
  } catch (error) {
    console.error("SQLite run error:", error);
    throw error;
  }
};

const getAll = async <T = any>(sql: string, params: unknown[] = []): Promise<T[]> => {
  try {
    return await db.getAllAsync<T>(sql, params as SQLite.SQLiteBindValue[]);
  } catch (error) {
    console.error("SQLite query error:", error);
    throw error;
  }
};

const genUuid = () => {
  if (typeof Crypto.randomUUID === "function") return Crypto.randomUUID();
  const bytes = Crypto.getRandomBytes(16);
  // rudimentary UUID v4 from random bytes
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  const b = Array.from(bytes).map(toHex);
  return `${b[0]}${b[1]}${b[2]}${b[3]}-${b[4]}${b[5]}-${b[6]}${b[7]}-${b[8]}${b[9]}-${b[10]}${b[11]}${b[12]}${b[13]}${b[14]}${b[15]}`;
};

export const initDB = async () => {
  await applyPragmas();
  await db.execAsync(TABLE_SQL);
  await db.execAsync(SYNC_EVENTS_SQL);
};

export const enqueueAction = async (type: string, payload: unknown) => {
  if (typeof type !== "string" || !type.trim()) {
    throw new Error("Invalid queue type");
  }
  const uuid = genUuid();
  const createdAt = new Date().toISOString();
  let payloadStr = "{}";
  try {
    payloadStr = JSON.stringify(payload ?? {});
  } catch {
    payloadStr = "{}";
  }
  await run(`INSERT INTO offline_queue (uuid, type, payload, status, created_at) VALUES (?, ?, ?, 'PENDING', ?)`, [
    uuid,
    type.trim(),
    payloadStr,
    createdAt,
  ]);
  return uuid;
};

export const getPendingActions = async (): Promise<QueueRecord[]> => {
  const rows = await getAll<QueueRecord>(`SELECT * FROM offline_queue WHERE status = 'PENDING' ORDER BY created_at ASC`);
  return rows;
};

export const markAsSynced = async (uuid: string) => {
  await run(`UPDATE offline_queue SET status = 'SYNCED' WHERE uuid = ?`, [uuid]);
};

export const enqueueSyncEvent = async (type: string, payload: unknown) => {
  let payloadStr = "{}";
  try {
    payloadStr = JSON.stringify(payload ?? {});
  } catch {
    payloadStr = "{}";
  }
  await run(`INSERT INTO sync_events (type, payload, status) VALUES (?, ?, 'PENDING')`, [type, payloadStr]);
};

export const getPendingSyncEvents = async () => {
  return await getAll(`SELECT * FROM sync_events WHERE status = 'PENDING' ORDER BY created_at ASC`);
};

export const deleteSyncEvent = async (id: number) => {
  await run(`DELETE FROM sync_events WHERE id = ?`, [id]);
};

export default db;
