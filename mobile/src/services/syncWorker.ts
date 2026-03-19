import axios from "axios";
import { getPendingSyncEvents, deleteSyncEvent, enqueueSyncEvent } from "../db/sqlite";

const API_URL = process.env.API_URL || "http://localhost:3000";

export const checkConnectivity = async () => {
  try {
    const res = await fetch(`${API_URL}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
};

const handlePaymentRetry = async (payload: any) => {
  const orderId = payload?.orderId;
  const amount = payload?.amount;
  if (!orderId || !amount) return false;
  try {
    const create = await axios.post(`${API_URL}/api/payments/create-order`, { orderId, amount });
    const pgOrderId = create.data?.pgOrderId;
    const paymentId = `pay_${Math.random().toString(36).slice(2, 8)}`;
    await axios.post(`${API_URL}/api/payments/verify`, {
      pg_order_id: pgOrderId,
      pg_payment_id: paymentId,
    });
    return true;
  } catch (err: any) {
    console.error("Payment retry failed", err?.message || err);
    return false;
  }
};

const handleProfileSync = async (payload: any) => {
  try {
    await axios.patch(`${API_URL}/api/auth/profile`, payload);
    return true;
  } catch (err: any) {
    console.error("Profile sync failed", err?.message || err);
    return false;
  }
};

export const syncPendingEvents = async () => {
  const online = await checkConnectivity();
  if (!online) return;

  const events = await getPendingSyncEvents();
  for (const evt of events) {
    try {
      const payload = evt.payload ? JSON.parse(evt.payload) : {};
      switch (evt.type) {
        case "PAYMENT_VERIFY_RETRY":
          if (!(await handlePaymentRetry(payload))) continue;
          break;
        case "PROFILE_UPDATE_SYNC":
          if (!(await handleProfileSync(payload))) continue;
          break;
        default:
          // Unhandled types can be requeued or logged
          break;
      }
      await deleteSyncEvent(evt.id);
    } catch (err: any) {
      console.error("Sync event failed", err?.message || err);
      // keep event for retry
    }
  }
};

export const startSyncWorker = () => {
  setInterval(() => {
    syncPendingEvents();
  }, 30000);
};
