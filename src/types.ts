/**
 * Shape of a fuel log arriving from the mobile app.
 * Maps directly to the fields the mobile SQLite database stores.
 */
export interface IncomingFuelLog {
  mobileOfflineId: string;
  userId: number;
  volume: number;
  lat: number | null;
  lng: number | null;
  timestamp: string; // ISO 8601 string from the device
}

/**
 * The expected request body for the POST /api/logs/sync endpoint.
 */
export interface SyncRequestBody {
  logs: IncomingFuelLog[];
}

/**
 * The response from a successful sync operation.
 */
export interface SyncResponse {
  success: boolean;
  processedCount: number;
  message: string;
}
