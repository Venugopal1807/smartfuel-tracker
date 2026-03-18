import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const SALT_ROUNDS = 10;

router.post("/signup", async (req, res) => {
  try {
    const { phone, name, pin } = req.body || {};
    if (!phone || !name || !pin || typeof phone !== "string" || typeof name !== "string" || typeof pin !== "string") {
      res.status(400).json({ success: false, message: "phone, name, and pin are required" });
      return;
    }
    const pinHash = await bcrypt.hash(pin, SALT_ROUNDS);

    const existing = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    if (existing.length) {
      res.status(409).json({ success: false, message: "User already exists" });
      return;
    }

    const [created] = await db
      .insert(users)
      .values({ phone, name, pinHash })
      .returning({ id: users.id, role: users.role, name: users.name });

    const token = jwt.sign({ sub: created.id, role: created.role, name: created.name }, JWT_SECRET, {
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
    if (!phone || !pin || typeof phone !== "string" || typeof pin !== "string") {
      res.status(400).json({ success: false, message: "phone and pin are required" });
      return;
    }

    const found = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    if (!found.length) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const user = found[0];
    const valid = await bcrypt.compare(pin, user.pinHash);
    if (!valid) {
      res.status(401).json({ success: false, message: "Invalid PIN" });
      return;
    }

    const token = jwt.sign({ sub: user.id, role: user.role, name: user.name }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res.status(200).json({ success: true, token });
  } catch (err: any) {
    console.error("Login error", err?.message || err);
    res.status(500).json({ success: false, message: "Login failed" });
  }
});

export default router;
