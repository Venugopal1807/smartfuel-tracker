import axios from "axios";
import { enqueueSyncEvent } from "../db/sqlite";

const API_URL = process.env.API_URL || "http://localhost:3000";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const processPayment = async (amount: number, orderId: string) => {
  try {
    const create = await axios.post(`${API_URL}/api/payments/create-order`, {
      orderId,
      amount,
    });
    const pgOrderId = create.data?.pgOrderId;
    if (!pgOrderId) throw new Error("Failed to create PG order");

    await delay(2000); // simulate user paying

    const paymentId = `pay_${Math.random().toString(36).slice(2, 8)}`;

    const verify = await axios.post(`${API_URL}/api/payments/verify`, {
      pg_order_id: pgOrderId,
      pg_payment_id: paymentId,
    });

    return verify.data;
  } catch (err: any) {
    console.error("processPayment error", err?.message || err);
    // offline / retry queue
    await enqueueSyncEvent("PAYMENT_VERIFY_RETRY", {
      orderId,
      amount,
      message: err?.message || "verify failed",
    });
    throw err;
  }
};
