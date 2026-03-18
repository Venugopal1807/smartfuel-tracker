import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { drivers } from "../db/schema";
import { eq } from "drizzle-orm";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const SALT_ROUNDS = 10;

router.post("/signup", async (req, res) => {
  try {
    const { phone, name, pin, vehicle_number, pump_id } = req.body || {};
    if (!phone || !name || !pin) {
      res.status(400).json({ success: false, message: "phone, name, and pin are required" });
      return;
    }
    const existing = await db.select().from(drivers).where(eq(drivers.phone, phone)).limit(1);
    if (existing.length) {
      res.status(409).json({ success: false, message: "Driver already exists" });
      return;
    }
    const pinHash = await bcrypt.hash(pin, SALT_ROUNDS);
    const [created] = await db
      .insert(drivers)
      .values({ phone, name, pinHash, vehicleNumber: vehicle_number, pumpId: pump_id })
      .returning({ id: drivers.id, name: drivers.name, phone: drivers.phone });

    const token = jwt.sign({ sub: created.id, name: created.name, phone: created.phone }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res.status(201).json({ success: true, token });
  } catch (err: any) {
    console.error("Signup error", err?.message || err);
    res.status(500).json({ success: false, message: "Signup failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { phone, pin } = req.body || {};
    if (!phone || !pin) {
      res.status(400).json({ success: false, message: "phone and pin are required" });
      return;
    }
    const found = await db.select().from(drivers).where(eq(drivers.phone, phone)).limit(1);
    if (!found.length) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    const driver = found[0];
    const valid = await bcrypt.compare(pin, driver.pinHash);
    if (!valid) {
      res.status(401).json({ success: false, message: "Invalid PIN" });
      return;
    }
    const token = jwt.sign({ sub: driver.id, name: driver.name, phone: driver.phone }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res.status(200).json({ success: true, token });
  } catch (err: any) {
    console.error("Login error", err?.message || err);
    res.status(500).json({ success: false, message: "Login failed" });
  }
});

export default router;
