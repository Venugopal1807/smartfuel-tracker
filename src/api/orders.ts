import express from "express";
import { db } from "../db";
import { orders, vehicles } from "../db/schema";
import { eq } from "drizzle-orm";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const status = (req.query.status as string | undefined)?.toLowerCase();
    const query = status ? db.select().from(orders).where(eq(orders.status, status)) : db.select().from(orders);
    const data = await query;
    res.json({ success: true, data });
  } catch (err: any) {
    console.error("Orders list error", err?.message || err);
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
});

const randomReg = () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const randLetters = () => letters[Math.floor(Math.random() * letters.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `TS-${randLetters()}${randLetters()}-${num}`;
};

router.patch("/:id/accept", async (req, res) => {
  try {
    const orderId = req.params.id;
    const { driverId } = req.body || {};
    if (!driverId) {
      res.status(400).json({ success: false, message: "driverId is required" });
      return;
    }

    // create demo vehicle
    const reg = randomReg();
    const [vehicle] = await db
      .insert(vehicles)
      .values({ registrationNumber: reg, status: "ASSIGNED" })
      .returning({ id: vehicles.id, registrationNumber: vehicles.registrationNumber });

    const updated = await db
      .update(orders)
      .set({ driverId, vehicleId: vehicle.id, status: "accepted" })
      .where(eq(orders.id, orderId))
      .returning();

    if (!updated.length) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    res.json({ success: true, data: { ...updated[0], vehicleRegistration: vehicle.registrationNumber } });
  } catch (err: any) {
    console.error("Accept order error", err?.message || err);
    res.status(500).json({ success: false, message: "Failed to accept order" });
  }
});

router.patch("/:id/complete", async (req, res) => {
  try {
    const orderId = req.params.id;
    const { final_volume } = req.body || {};
    const updated = await db
      .update(orders)
      .set({ status: "delivered", measurementFinalVolume: final_volume })
      .where(eq(orders.id, orderId))
      .returning();

    if (!updated.length) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    res.json({ success: true, data: updated[0] });
  } catch (err: any) {
    console.error("Complete order error", err?.message || err);
    res.status(500).json({ success: false, message: "Failed to complete order" });
  }
});

export default router;
