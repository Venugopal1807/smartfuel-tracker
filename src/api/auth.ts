import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { drivers, bankDocuments, vehicles } from "../db/schema";
import { eq } from "drizzle-orm";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "smartfuel_dev_secret_2026";
const SALT_ROUNDS = 10;

// ─── 1. SIGNUP ──────────────────────────────────────────────────
router.post("/signup", async (req, res) => {
  try {
    const { phone, name, pin, vehicle_number, pump_id } = req.body || {};
    
    if (!phone || !name || !pin) {
      return res.status(400).json({ success: false, message: "phone, name, and pin are required" });
    }

    if (pin.length !== 4) {
      return res.status(400).json({ success: false, message: "PIN must be 4 digits" });
    }

    const existing = await db.select().from(drivers).where(eq(drivers.phone, phone)).limit(1);
    if (existing.length) {
      return res.status(409).json({ success: false, message: "Driver already exists" });
    }

    const pinHash = await bcrypt.hash(pin, SALT_ROUNDS);
    
    const [created] = await db
      .insert(drivers)
      .values({ 
        phone, 
        name, 
        pinHash, 
        vehicleNumber: vehicle_number, 
        pumpId: pump_id 
      })
      .returning();

    // ✅ FIXED: Changed 'sub' to 'id' to match your UserPayload interface
    const token = jwt.sign(
      { id: created.id, name: created.name, phone: created.phone }, 
      JWT_SECRET, 
      { expiresIn: "7d" }
    );

    res.status(201).json({ success: true, token });
  } catch (err: any) {
    console.error("Signup error", err);
    res.status(500).json({ success: false, message: "Signup failed" });
  }
});

// ─── 2. LOGIN ───────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { phone, pin } = req.body || {};
    
    if (!phone || !pin) {
      return res.status(400).json({ success: false, message: "phone and pin are required" });
    }

    const [driver] = await db.select().from(drivers).where(eq(drivers.phone, phone)).limit(1);
    if (!driver) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const valid = await bcrypt.compare(pin, driver.pinHash);
    if (!valid) {
      return res.status(401).json({ success: false, message: "Invalid PIN" });
    }

    // ✅ FIXED: Changed 'sub' to 'id'
    const token = jwt.sign(
      { id: driver.id, name: driver.name, phone: driver.phone }, 
      JWT_SECRET, 
      { expiresIn: "7d" }
    );

    res.status(200).json({ success: true, token });
  } catch (err: any) {
    res.status(500).json({ success: false, message: "Login failed" });
  }
});

// ─── 3. PROFILE ─────────────────────────────────────────────────
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const driverId = req.user?.id;
    if (!driverId) return res.status(401).json({ message: "Unauthorized" });

    const [profile] = await db
      .select({
        id: drivers.id,
        name: drivers.name,
        phone: drivers.phone,
        vehicleNumber: drivers.vehicleNumber,
        pumpId: drivers.pumpId,
        bankName: bankDocuments.bankName,
        accountNumber: bankDocuments.accountNumber,
        ifscCode: bankDocuments.ifscCode,
      })
      .from(drivers)
      .leftJoin(bankDocuments, eq(drivers.id, bankDocuments.driverId))
      .where(eq(drivers.id, driverId))
      .limit(1);

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    res.json({ success: true, data: profile });
  } catch (err: any) {
    console.error("Profile fetch error", err);
    res.status(500).json({ success: false, message: "Failed to fetch profile" });
  }
});

// ─── 4. UPDATE PROFILE (NEW!) ───────────────────────────────────
router.patch("/profile", authenticateToken, async (req, res) => {
  try {
    const driverId = req.user?.id;
    const { name, vehicle_number, bank_name, account_number, ifsc_code } = req.body;

    if (!driverId) return res.status(401).json({ message: "Unauthorized" });

    // We use a transaction to update two tables at once
    await db.transaction(async (tx) => {
      // A. Update the Driver table (Personal Info)
      await tx
        .update(drivers)
        .set({ 
          name: name, 
          vehicleNumber: vehicle_number 
        })
        .where(eq(drivers.id, driverId));

      // B. Handle Bank Details (The "Upsert" logic)
      // Check if bank info exists for this driver
      const [existingBank] = await tx
        .select()
        .from(bankDocuments)
        .where(eq(bankDocuments.driverId, driverId))
        .limit(1);

      if (existingBank) {
        // Update existing record
        await tx
          .update(bankDocuments)
          .set({
            bankName: bank_name,
            accountNumber: account_number,
            ifscCode: ifsc_code,
          })
          .where(eq(bankDocuments.driverId, driverId));
      } else {
        // Insert new record if it's their first time adding bank info
        await tx.insert(bankDocuments).values({
          driverId: driverId,
          bankName: bank_name,
          accountNumber: account_number,
          ifscCode: ifsc_code,
        });
      }
    });

    res.json({ success: true, message: "Profile and Bank details updated successfully" });
  } catch (err: any) {
    console.error("Profile update error", err);
    res.status(500).json({ success: false, message: "Failed to update profile" });
  }
});

// ─── 5. VEHICLES BY PUMP ──────────────────────────────────────
router.get("/vehicles/pump", authenticateToken, async (req, res) => {
  try {
    const driverId = req.user?.id;
    const [driver] = await db.select().from(drivers).where(eq(drivers.id, driverId as any)).limit(1);
    
    if (!driver || !driver.pumpId) {
      return res.json({ success: true, data: [] });
    }

    const pumpVehicles = await db
      .select({ 
        id: vehicles.id, 
        reg: vehicles.registrationNumber 
      })
      .from(vehicles)
      .where(eq(vehicles.pumpId, driver.pumpId));

    res.json({ success: true, data: pumpVehicles });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch vehicles" });
  }
});

export default router;