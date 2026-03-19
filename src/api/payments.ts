import express from "express";
import crypto from "crypto";
import { db } from "../db";
import { orders, transactions } from "../db/schema";
import { eq } from "drizzle-orm";

const router = express.Router();
const PAYMENT_SECRET = process.env.PAYMENT_SECRET;

if (!PAYMENT_SECRET) {
  throw new Error("PAYMENT_SECRET is not set");
}

router.post("/create-order", async (req, res) => {
  try {
    const { orderId, amount } = req.body || {};
    if (!orderId || !amount) {
      res.status(400).json({ success: false, message: "orderId and amount required" });
      return;
    }
    const pgOrderId = "order_" + crypto.randomBytes(6).toString("hex");

    await db
      .update(transactions)
      .set({ status: "INITIATED", razorpayOrderId: pgOrderId, amount })
      .where(eq(transactions.orderId, orderId));

    res.json({ success: true, pgOrderId });
  } catch (err: any) {
    console.error("create-order error", err?.message || err);
    res.status(500).json({ success: false, message: "Failed to create payment order" });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const { pg_order_id, pg_payment_id } = req.body || {};
    if (!pg_order_id || !pg_payment_id) {
      res.status(400).json({ success: false, message: "pg_order_id and pg_payment_id required" });
      return;
    }

    const webhookSignature = crypto
      .createHmac("sha256", PAYMENT_SECRET)
      .update(`${pg_order_id}|${pg_payment_id}`)
      .digest("hex");
    const expectedSignature = crypto
      .createHmac("sha256", PAYMENT_SECRET)
      .update(`${pg_order_id}|${pg_payment_id}`)
      .digest("hex");

    if (webhookSignature !== expectedSignature) {
      res.status(400).json({ success: false, message: "Signature mismatch" });
      return;
    }

    const updated = await db
      .update(transactions)
      .set({ status: "SUCCESS" })
      .where(eq(transactions.razorpayOrderId, pg_order_id))
      .returning({ orderId: transactions.orderId });

    if (updated.length) {
      await db.update(orders).set({ status: "delivered" }).where(eq(orders.id, updated[0].orderId));
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("verify error", err?.message || err);
    res.status(500).json({ success: false, message: "Verification failed" });
  }
});

export default router;
