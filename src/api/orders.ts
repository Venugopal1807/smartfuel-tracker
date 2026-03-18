import express from "express";
import { db } from "../db";
import { orders } from "../db/schema";
import { eq } from "drizzle-orm";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const query = status ? db.select().from(orders).where(eq(orders.status, status)) : db.select().from(orders);
    const data = await query;
    res.json({ success: true, data });
  } catch (err: any) {
    console.error("Orders list error", err?.message || err);
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
});

router.patch("/:id/accept", async (req, res) => {
  try {
    const orderId = req.params.id;
    const { driverId, vehicleId } = req.body || {};
    if (!driverId || !vehicleId) {
      res.status(400).json({ success: false, message: "driverId and vehicleId are required" });
      return;
    }

    const updated = await db
      .update(orders)
      .set({ driverId, vehicleId, status: "ACCEPTED" })
      .where(eq(orders.id, orderId))
      .returning();

    if (!updated.length) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    res.json({ success: true, data: updated[0] });
  } catch (err: any) {
    console.error("Accept order error", err?.message || err);
    res.status(500).json({ success: false, message: "Failed to accept order" });
  }
});

export default router;
