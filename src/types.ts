/**
 * Shape of a fuel log arriving from the mobile app.
 * Maps directly to the fields the mobile SQLite database stores.
 */
export interface IncomingFuelLog {
  mobileOfflineId: string; // Used as the Idempotency Key
  userId: string;          // FIXED: Changed from number to string to match UUID
  orderId?: string;        // Added to link logs to specific orders
  volume: number;
  lat: number | null;
  lng: number | null;
  timestamp: string;       // ISO 8601 string from the device
}

/**
 * Payment & Settlement Types
 * Used for the B2B internal handshake
 */
export interface PaymentInitRequest {
  orderId: string;
  amount: number;
  volume: number;
  pumpId: string;
}

export interface PaymentVerifyRequest {
  pg_order_id: string;
  pg_payment_id: string;
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
  failedIds?: string[]; // Helpful for debugging sync issues
}

/**
 * Shared Order Interface
 * Used by DispensingScreen and ReceiptScreen
 */
export interface Order {
  id: string;
  orderNumber: number;
  customer_name: string;
  customer_address: string;
  status: "pending" | "confirmed" | "accepted" | "in_transit" | "delivered" | "paid";
  expected_volume: string;
  amount: string;
}