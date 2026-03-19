import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { drivers, bankDocuments } from "../db/schema";
import { eq } from "drizzle-orm";
import { authenticateToken } from "../middleware/auth";

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

// ─── Profile Routes ──────────────────────────────────────────
router.get("/profile", authenticateToken, async (req: any, res) => {
  try {
    const driverId = req.user?.sub;
    if (!driverId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const [profile] = await db
      .select({
        id: drivers.id,
        name: drivers.name,
        phone: drivers.phone,
        vehicleNumber: drivers.vehicleNumber,
        bankName: bankDocuments.bankName,
        accountNumber: bankDocuments.accountNumber,
        ifscCode: bankDocuments.ifscCode,
      })
      .from(drivers)
      .leftJoin(bankDocuments, eq(drivers.id, bankDocuments.driverId))
      .where(eq(drivers.id, driverId))
      .limit(1);

    if (!profile) {
      res.status(404).json({ success: false, message: "Profile not found" });
      return;
    }
    res.json({ success: true, data: profile });
  } catch (err: any) {
    console.error("Profile fetch error", err?.message || err);
    res.status(500).json({ success: false, message: "Failed to fetch profile" });
  }
});

router.patch("/profile", authenticateToken, async (req: any, res) => {
  try {
    const driverId = req.user?.sub;
    if (!driverId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const { name, vehicle_number, bank_name, account_number, ifsc_code } = req.body || {};

    if (name || vehicle_number) {
      await db
        .update(drivers)
        .set({
          ...(name ? { name } : {}),
          ...(vehicle_number ? { vehicleNumber: vehicle_number } : {}),
        })
        .where(eq(drivers.id, driverId));
    }

    if (bank_name || account_number || ifsc_code) {
      // Upsert bank_documents
      const existing = await db.select().from(bankDocuments).where(eq(bankDocuments.driverId, driverId)).limit(1);
      if (existing.length) {
        await db
          .update(bankDocuments)
          .set({
            bankName: bank_name ?? existing[0].bankName,
            accountNumber: account_number ?? existing[0].accountNumber,
            ifscCode: ifsc_code ?? existing[0].ifscCode,
          })
          .where(eq(bankDocuments.driverId, driverId));
      } else {
        await db.insert(bankDocuments).values({
          driverId,
          bankName: bank_name || "",
          accountNumber: account_number || "",
          ifscCode: ifsc_code || "",
        });
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("Profile update error", err?.message || err);
    res.status(500).json({ success: false, message: "Failed to update profile" });
  }
});
