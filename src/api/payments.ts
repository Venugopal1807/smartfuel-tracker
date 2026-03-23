import express from "express";
import crypto from "crypto";
import { db } from "../db";
import { orders, transactions } from "../db/schema";
import { eq } from "drizzle-orm";

const router = express.Router();
// Ensure this is set in your server's .env file
const PAYMENT_SECRET = process.env.PAYMENT_SECRET || "smartfuel_internal_sec_2026";

// ─── 1. INITIATE SETTLEMENT ─────────────────────────────────────────
router.post("/create-order", async (req, res) => {
  try {
    const { orderId, amount, volume, pumpId } = req.body || {};
    
    // Validation
    if (!orderId || !amount || !volume) {
      res.status(400).json({ success: false, message: "orderId, amount, and volume are required" });
      return;
    }

    // Generate our internal B2B order reference
    const pgOrderId = "sf_order_" + crypto.randomBytes(6).toString("hex");

    // FIX: Changed 'razorpayOrderId' to 'pgOrderId' to match your DB rename
    await db
      .insert(transactions)
      .values({ 
        orderId: orderId as any,
        pumpId: pumpId || "MDU-UNKNOWN",
        status: "INITIATED", 
        pgOrderId: pgOrderId, 
        amount: amount.toString(), // Numeric columns need strings
        volumeDispensed: volume.toString()
      });

    res.json({ success: true, pgOrderId });
  } catch (err: any) {
    console.error("create-order error", err?.message || err);
    res.status(500).json({ success: false, message: "Failed to create payment order" });
  }
});

// ─── 2. VERIFY & SETTLE ─────────────────────────────────────────────
router.post("/verify", async (req, res) => {
  try {
    const { pg_order_id, pg_payment_id } = req.body || {};
    
    if (!pg_order_id || !pg_payment_id) {
      res.status(400).json({ success: false, message: "Missing required payment fields" });
      return;
    }

    // FIX: Changed 'razorpayOrderId' to 'pgOrderId'
    const updated = await db
      .update(transactions)
      .set({ 
        status: "SUCCESS",
        pgPaymentId: pg_payment_id,
        paidAt: new Date()
      })
      .where(eq(transactions.pgOrderId, pg_order_id))
      .returning({ orderId: transactions.orderId });

    // If transaction found, update the Master Order to 'paid'
    if (updated.length && updated[0].orderId) {
      await db
        .update(orders)
        .set({ status: "paid" }) // Matches your new 'paid' status in enum
        .where(eq(orders.id, updated[0].orderId as any));
    }

    res.json({ success: true, message: "Transaction Settle Successfully" });
  } catch (err: any) {
    console.error("verify error", err?.message || err);
    res.status(500).json({ success: false, message: "Verification failed" });
  }
});

export default router;