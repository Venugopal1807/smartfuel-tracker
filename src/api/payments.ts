import express from "express";
import crypto from "crypto";
import { db } from "../db";
import { orders, transactions } from "../db/schema";
import { eq, and } from "drizzle-orm";

const router = express.Router();

// ─── 1. INITIATE SETTLEMENT (Create Reference) ──────────────────────
router.post("/create-order", async (req, res) => {
  try {
    const { orderId, amount, volume, pumpId } = req.body || {};
    
    if (!orderId || !amount || !volume) {
      return res.status(400).json({ success: false, message: "Missing orderId, amount, or volume" });
    }

    const pgOrderId = "sf_order_" + crypto.randomBytes(6).toString("hex");

    await db.insert(transactions).values({ 
      orderId: orderId as any,
      pumpId: pumpId || "MDU-UNKNOWN",
      status: "INITIATED", 
      pgOrderId: pgOrderId, 
      amount: amount.toString(),
      volumeDispensed: volume.toString()
    });

    res.json({ success: true, pgOrderId });
  } catch (err: any) {
    res.status(500).json({ success: false, message: "Failed to create payment order" });
  }
});

// ─── 2. VERIFY OTP & SETTLE (The Critical Fix) ──────────────────────
router.post("/verify", async (req, res) => {
  try {
    const { pg_order_id, pg_payment_id, otp, orderId } = req.body || {};
    
    // 1. Basic Validation
    if (!orderId || !otp) {
      return res.status(400).json({ success: false, error: "Order ID and OTP are required" });
    }

    // 2. Fetch the Order to check the saved End OTP
    const orderData = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

    if (!orderData.length) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    // 3. OTP COMPARISON (Surgical Fix)
    // ✅ Use securityCloseOtp (which maps to close_otp in your DB)
    const submittedOtp = String(otp).trim();
    const correctOtp = orderData[0].securityCloseOtp ? String(orderData[0].securityCloseOtp).trim() : "";

    if (submittedOtp !== correctOtp) {
      console.log(`[Security] OTP Mismatch for Order ${orderId}: Expected ${correctOtp}, got ${submittedOtp}`);
      // Keep this exact string so the mobile app's error handling catches it
      return res.status(400).json({ success: false, error: "invalid otp entered" });
    }

    // 4. Update Transaction Status
    await db
      .update(transactions)
      .set({ 
        status: "SUCCESS",
        pgPaymentId: pg_payment_id || "bypass_" + crypto.randomBytes(4).toString("hex"),
        paidAt: new Date()
      })
      .where(eq(transactions.orderId, orderId as any));

    // 5. Mark Master Order as Paid
    await db
      .update(orders)
      .set({ status: "paid" })
      .where(eq(orders.id, orderId as any));

    res.json({ success: true, message: "Transaction Settled Successfully" });

  } catch (err: any) {
    console.error("Verify Error:", err);
    res.status(500).json({ success: false, error: "Internal server error during verification" });
  }
});

export default router;