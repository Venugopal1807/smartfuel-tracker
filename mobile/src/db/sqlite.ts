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

const db = SQLite.openDatabase(DB_NAME);

const applyPragmas = async () => {
  await exec("PRAGMA journal_mode=WAL;");
  await exec("PRAGMA busy_timeout=3000;"); // 3s wait on lock
};

const exec = (sql: string, params: any[] = []): Promise<SQLite.SQLResultSet> =>
  new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        tx.executeSql(
          sql,
          params,
          (_tx, result) => resolve(result),
          (_tx, error) => {
            console.error("SQLite error:", error);
            reject(error);
            return false;
          }
        );
      },
      (error) => {
        console.error("SQLite txn error:", error);
        reject(error);
      }
    );
  });

const genUuid = () => {
  if (typeof Crypto.randomUUID === "function") return Crypto.randomUUID();
  const bytes = Crypto.getRandomBytes(16);
  // rudimentary UUID v4 from random bytes
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  const b = bytes.map(toHex);
  return `${b[0]}${b[1]}${b[2]}${b[3]}-${b[4]}${b[5]}-${b[6]}${b[7]}-${b[8]}${b[9]}-${b[10]}${b[11]}${b[12]}${b[13]}${b[14]}${b[15]}`;
};

export const initDB = async () => {
  await applyPragmas();
  await exec(TABLE_SQL);
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
  await exec(`INSERT INTO offline_queue (uuid, type, payload, status, created_at) VALUES (?, ?, ?, 'PENDING', ?)`, [
    uuid,
    type.trim(),
    payloadStr,
    createdAt,
  ]);
  return uuid;
};

export const getPendingActions = async (): Promise<QueueRecord[]> => {
  const res = await exec(`SELECT * FROM offline_queue WHERE status = 'PENDING' ORDER BY created_at ASC`);
  const rows = res.rows;
  const out: QueueRecord[] = [];
  for (let i = 0; i < rows.length; i++) {
    out.push(rows.item(i) as QueueRecord);
  }
  return out;
};

export const markAsSynced = async (uuid: string) => {
  await exec(`UPDATE offline_queue SET status = 'SYNCED' WHERE uuid = ?`, [uuid]);
};

export default db;
