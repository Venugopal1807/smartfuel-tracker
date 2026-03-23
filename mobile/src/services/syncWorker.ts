import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPendingSyncEvents, deleteSyncEvent } from "../db/sqlite";

// ✅ Use EXPO_PUBLIC_ prefix for client-side environment variables
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.3:3000";

let isSyncing = false; // Guard to prevent overlapping sync cycles

export const checkConnectivity = async () => {
  try {
    const res = await fetch(`${API_URL}/api/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
};

// ─── HANDLERS ──────────────────────────────────────────────────

const handlePaymentRetry = async (payload: any, token: string) => {
  try {
    // 1. Create the transaction record
    const create = await axios.post(`${API_URL}/api/payments/create-order`, 
      { 
        orderId: payload.orderId, 
        amount: payload.amount,
        volume: payload.volume,
        pumpId: payload.pumpId || "MDU-OFFLINE"
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const pgOrderId = create.data?.pgOrderId;

    // 2. Verify using the OTP proof stored during the offline session
    await axios.post(`${API_URL}/api/payments/verify`, 
      {
        pg_order_id: pgOrderId,
        pg_payment_id: `sf_off_${payload.otp_proof?.substring(0, 8)}`
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return true;
  } catch (err: any) {
    console.error("Payment sync failed:", err.response?.data || err.message);
    return false;
  }
};

const handleFuelLogSync = async (payload: any, token: string) => {
  try {
    // The backend expects an array of logs (Batch Sync)
    await axios.post(`${API_URL}/api/logs/sync`, 
      { logs: [payload] }, 
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return true;
  } catch (err: any) {
    return false;
  }
};

// ─── MASTER WORKER ─────────────────────────────────────────────

export const syncPendingEvents = async () => {
  if (isSyncing) return;
  
  const online = await checkConnectivity();
  if (!online) return;

  const token = await AsyncStorage.getItem("auth_token");
  if (!token) return; // Can't sync without being logged in

  isSyncing = true;
  const events = await getPendingSyncEvents();

  for (const evt of events) {
    try {
      const payload = evt.payload ? JSON.parse(evt.payload) : {};
      let success = false;

      switch (evt.type) {
        case "PAYMENT_VERIFY_RETRY":
        case "PAYMENT_PENDING":
          success = await handlePaymentRetry(payload, token);
          break;
        case "FUEL_LOG_SYNC":
          success = await handleFuelLogSync(payload, token);
          break;
        case "PROFILE_UPDATE_SYNC":
          const res = await axios.patch(`${API_URL}/api/auth/profile`, payload, {
             headers: { Authorization: `Bearer ${token}` }
          });
          success = !!res.data.success;
          break;
      }

      if (success) {
        await deleteSyncEvent(evt.id);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        console.warn("Sync aborted: Token expired.");
        break; // Stop processing the queue if unauthorized
      }
    }
  }
  isSyncing = false;
};

export const startSyncWorker = () => {
  // Run every 30 seconds
  setInterval(() => {
    syncPendingEvents();
  }, 30000);
};