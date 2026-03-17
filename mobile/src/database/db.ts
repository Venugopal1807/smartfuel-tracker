import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

// Open the local SQLite database synchronously
export const db = SQLite.openDatabaseSync('smartfuel.db');

export type FuelLog = {
  id: number;
  mobileOfflineId: string;
  userId: number;
  volume: number;
  lat: number;
  lng: number;
  synced: number;
  timestamp: string;
};

/**
 * Initializes the local database and creates necessary tables for offline support.
 */
export const initDb = () => {
  try {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS local_fuel_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mobileOfflineId TEXT UNIQUE,
        userId INTEGER,
        volume REAL,
        lat REAL,
        lng REAL,
        synced INTEGER DEFAULT 0,
        timestamp TEXT
      );
    `);
    console.log('✅ SQLite database initialized: local_fuel_logs table is ready.');
  } catch (error) {
    console.error('❌ Failed to initialize SQLite database:', error);
  }
};

/**
 * Saves a new fuel log locally with a unique mobile ID.
 */
export const saveFuelLog = (
  volume: number,
  lat: number,
  lng: number,
  userId: number
): void => {
  const mobileOfflineId = Crypto.randomUUID();
  const timestamp = new Date().toISOString();
  
  try {
    const statement = db.prepareSync(
      'INSERT INTO local_fuel_logs (mobileOfflineId, userId, volume, lat, lng, synced, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7)'
    );
    statement.executeSync([mobileOfflineId, userId, volume, lat, lng, 0, timestamp]);
    console.log(`✅ Fuel log saved locally offline! ID: ${mobileOfflineId}`);
  } catch (error) {
    console.error('❌ Failed to save fuel log locally:', error);
    throw error; // Re-throw so UI can catch it
  }
};

/**
 * Retrieves all local fuel logs ordered by most recent first.
 */
export const getLogs = (): FuelLog[] => {
  try {
    const allRows = db.getAllSync<FuelLog>('SELECT * FROM local_fuel_logs ORDER BY timestamp DESC');
    return allRows;
  } catch (error) {
    console.error('❌ Failed to fetch fuel logs:', error);
    return [];
  }
};

/**
 * Retrieves only logs that haven't been synced to the server yet.
 */
export const getUnsyncedLogs = (): FuelLog[] => {
  try {
    return db.getAllSync<FuelLog>('SELECT * FROM local_fuel_logs WHERE synced = 0 ORDER BY timestamp ASC');
  } catch (error) {
    console.error('❌ Failed to fetch unsynced logs:', error);
    return [];
  }
};

/**
 * Marks a specific log as successfully synced.
 */
export const markLogAsSynced = (mobileOfflineId: string): void => {
  try {
    const statement = db.prepareSync('UPDATE local_fuel_logs SET synced = 1 WHERE mobileOfflineId = $1');
    statement.executeSync([mobileOfflineId]);
  } catch (error) {
    console.error(`❌ Failed to mark log as synced (${mobileOfflineId}):`, error);
  }
};
