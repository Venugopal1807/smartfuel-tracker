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

// ✅ FIXED: Changed userId to string to support UUIDs
export type FuelLog = {
  id: number;
  mobileOfflineId: string;
  userId: string; 
  volume: number;
  latitude: number;
  longitude: number;
  synced: number;
  timestamp: string;
  status: string;
  orderId?: string | null;
};

const DB_NAME = "smartfuel.db";
const db = SQLite.openDatabaseSync(DB_NAME);

// --- TABLE SCHEMAS ---

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

// ✅ FIXED: userId is now TEXT to hold UUID strings
const LOCAL_LOGS_SQL = `
CREATE TABLE IF NOT EXISTS local_fuel_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mobileOfflineId TEXT UNIQUE,
  userId TEXT, 
  volume REAL,
  latitude REAL,
  longitude REAL,
  status TEXT,
  orderId TEXT,
  synced INTEGER DEFAULT 0,
  timestamp TEXT
);`;

const SYNC_QUEUE_SQL = `
CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE,
  type TEXT,
  payload TEXT,
  status TEXT DEFAULT 'PENDING',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`;

// --- CORE FUNCTIONS ---

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
  return Crypto.randomUUID();
};

export const initDB = async () => {
  await applyPragmas();
  
  // NOTE: This drops the table to force the new 'TEXT' schema for userId.
  // In a real app, you would use an ALTER TABLE migration instead.
  await db.execAsync("DROP TABLE IF EXISTS local_fuel_logs;");
  
  await db.execAsync(TABLE_SQL);
  await db.execAsync(SYNC_EVENTS_SQL);
  await db.execAsync(LOCAL_LOGS_SQL);
  await db.execAsync(SYNC_QUEUE_SQL);
  console.log("✅ Main SQLite Database initialized with UUID support.");
};

// --- FUEL LOG FUNCTIONS ---

// ✅ FIXED: userId parameter type is now string
export const saveFuelLog = (
  volume: number, 
  latitude: number, 
  longitude: number, 
  userId: string, 
  orderId?: string
): void => {
  const mobileOfflineId = Crypto.randomUUID();
  const timestamp = new Date().toISOString();
  try {
    const statement = db.prepareSync(
      'INSERT INTO local_fuel_logs (mobileOfflineId, userId, volume, latitude, longitude, synced, timestamp, orderId, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)'
    );
    statement.executeSync([mobileOfflineId, userId, volume, latitude, longitude, 0, timestamp, orderId || null, "PENDING"]);
    console.log(`✅ Fuel log saved locally! ID: ${mobileOfflineId}`);
  } catch (error) {
    console.error('❌ Failed to save fuel log locally:', error);
    throw error;
  }
};

export const getLogs = (): FuelLog[] => {
  try { 
    return db.getAllSync<FuelLog>('SELECT * FROM local_fuel_logs ORDER BY timestamp DESC'); 
  } catch (error) { 
    return []; 
  }
};

export const getUnsyncedLogs = (): FuelLog[] => {
  try { 
    return db.getAllSync<FuelLog>('SELECT * FROM local_fuel_logs WHERE synced = 0 ORDER BY timestamp ASC'); 
  } catch (error) { 
    return []; 
  }
};

export const markLogAsSynced = (mobileOfflineId: string): void => {
  try {
    const statement = db.prepareSync('UPDATE local_fuel_logs SET synced = 1 WHERE mobileOfflineId = $1');
    statement.executeSync([mobileOfflineId]);
  } catch (error) {
    console.error(`❌ Failed to mark log as synced:`, error);
  }
};

// --- SYNC QUEUE FUNCTIONS ---

export const enqueueAction = async (type: string, payload: unknown) => {
  const uuid = genUuid();
  const payloadStr = JSON.stringify(payload ?? {});
  await run(`INSERT INTO offline_queue (uuid, type, payload, status, created_at) VALUES (?, ?, ?, 'PENDING', ?)`, [uuid, type.trim(), payloadStr, new Date().toISOString()]);
  return uuid;
};

export const getPendingActions = async (): Promise<QueueRecord[]> => {
  return await getAll<QueueRecord>(`SELECT * FROM offline_queue WHERE status = 'PENDING' ORDER BY created_at ASC`);
};

export const markAsSyncedQueue = async (uuid: string) => {
  await run(`UPDATE offline_queue SET status = 'SYNCED' WHERE uuid = ?`, [uuid]);
};

// --- SYNC EVENTS ---

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