import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPendingSyncEvents, deleteSyncEvent } from "../db/sqlite";

// ✅ Use EXPO_PUBLIC_ prefix for client-side environment variables
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.3:3000";

let isSyncing = false; // Guard to prevent overlapping sync cycles

// Helper for Fetch Headers
const getHeaders = (token: string) => ({
  "Authorization": `Bearer ${token}`,
  "Content-Type": "application/json"
});

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
    const createRes = await fetch(`${API_URL}/api/payments/create-order`, {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify({ 
        orderId: payload.orderId, 
        amount: payload.amount,
        volume: payload.volume,
        pumpId: payload.pumpId || "MDU-OFFLINE"
      })
    });

    if (createRes.status === 401) throw new Error("401");
    if (!createRes.ok) return false;

    const createData = await createRes.json();
    const pgOrderId = createData?.pgOrderId;

    // 2. Verify using the OTP proof stored during the offline session
    const verifyRes = await fetch(`${API_URL}/api/payments/verify`, {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify({
        pg_order_id: pgOrderId,
        pg_payment_id: `sf_off_${payload.otp_proof?.substring(0, 8)}`
      })
    });

    if (verifyRes.status === 401) throw new Error("401");
    return verifyRes.ok;

  } catch (err: any) {
    if (err.message === "401") throw err; // Propagate auth errors to master loop
    console.error("Payment sync failed:", err.message);
    return false;
  }
};

const handleFuelLogSync = async (payload: any, token: string) => {
  try {
    // The backend expects an array of logs (Batch Sync)
    const res = await fetch(`${API_URL}/api/logs/sync`, {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify({ logs: [payload] })
    });

    if (res.status === 401) throw new Error("401");
    return res.ok;
  } catch (err: any) {
    if (err.message === "401") throw err;
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
        case "VEHICLE_SWITCH_SYNC": // Handled together as both hit the profile patch route
          const patchRes = await fetch(`${API_URL}/api/auth/profile`, {
            method: "PATCH",
            headers: getHeaders(token),
            body: JSON.stringify(payload)
          });
          
          if (patchRes.status === 401) throw new Error("401");
          
          // CONCURRENCY SAFETY: If 409 Conflict, the vehicle is taken. 
          // We MUST mark as success to delete the event so it doesn't block the queue forever.
          if (patchRes.status === 409) {
            console.warn(`[Sync] Vehicle switch rejected (Conflict). Dropping event ${evt.id}`);
            success = true; 
          } else {
            success = patchRes.ok;
          }
          break;
      }

      if (success) {
        await deleteSyncEvent(evt.id);
      }
    } catch (err: any) {
      if (err.message === "401") {
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