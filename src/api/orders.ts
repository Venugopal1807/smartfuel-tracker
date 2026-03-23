import express from "express";
import { db } from "../db";
import { orders, vehicles } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { authenticateToken } from "../middleware/auth"; // ✅ Added Auth

const router = express.Router();

// ─── 1. FETCH ORDERS ────────────────────────────────────────────────
router.get("/", authenticateToken, async (req, res) => {
  try {
    const status = req.query.status as string;

    // Filter by status if provided, and ensure only relevant orders are shown
    const query = status 
      ? db.select().from(orders).where(eq(orders.status, status as any)) 
      : db.select().from(orders);

    const data = await query;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
});

// ─── 2. ACCEPT ORDER ───────────────────────────────────────────────
router.patch("/:id/accept", authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { driverId } = req.body || {};
    
    if (!driverId) {
      return res.status(400).json({ success: false, message: "driverId is required" });
    }

    // Create a demo vehicle for the assignment
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const reg = `TS-${letters[Math.floor(Math.random() * 26)]}${letters[Math.floor(Math.random() * 26)]}-${Math.floor(1000 + Math.random() * 9000)}`;

    const [vehicle] = await db
      .insert(vehicles)
      .values({ 
        registrationNumber: reg, 
        status: "AVAILABLE" 
      })
      .returning();

    const updated = await db
      .update(orders)
      .set({ 
        driverId: driverId as any, 
        vehicleId: vehicle.id, 
        status: "accepted" 
      })
      .where(eq(orders.id, orderId as any))
      .returning();

    if (!updated.length) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({ 
      success: true, 
      data: { ...updated[0], vehicleRegistration: vehicle.registrationNumber } 
    });
  } catch (err: any) {
    console.error("Accept error:", err);
    res.status(500).json({ success: false, message: "Failed to accept order" });
  }
});

// ─── 3. START TRANSIT ──────────────────────────────────────────────
router.patch("/:id/transit", authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const updated = await db
      .update(orders)
      .set({ status: "in_transit" })
      .where(eq(orders.id, orderId as any))
      .returning();

    if (!updated.length) return res.status(404).json({ message: "Order not found" });

    res.json({ success: true, data: updated[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, message: "Failed to start transit" });
  }
});

// ─── 4. COMPLETE DELIVERY ──────────────────────────────────────────
router.patch("/:id/complete", authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { final_volume } = req.body || {};

    if (final_volume === undefined) {
      return res.status(400).json({ success: false, message: "final_volume is required" });
    }

    const updated = await db
      .update(orders)
      .set({ 
        status: "delivered", 
        // ✅ CRITICAL: Convert volume to string for numeric column safety
        measurementFinalVolume: final_volume.toString() 
      })
      .where(eq(orders.id, orderId as any))
      .returning();

    if (!updated.length) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, data: updated[0] });
  } catch (err: any) {
    console.error("Complete error:", err);
    res.status(500).json({ success: false, message: "Failed to complete delivery" });
  }
});

export default router;