import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import { processSyncBatch } from "./db/logic";
import type { SyncRequestBody, IncomingFuelLog } from "./types";
import { authenticateToken } from "./middleware/auth";
import authRouter from "./api/auth";
import ordersRouter from "./api/orders";
import paymentsRouter from "./api/payments";
import { db } from "./db/index";
import { transactions, fuelLogs } from "./db/schema"; 
import { eq, sql, and } from "drizzle-orm";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ─── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// DEBUG LOGGER: Essential for tracking mobile sync attempts
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// ─── API Routes ─────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/payments", paymentsRouter);

// ─── Health Check ───────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", serverTime: new Date().toISOString() });
});

// ─── Sync Endpoint (UUID Compatible) ────────────────────────
app.post("/api/logs/sync", async (req, res) => {
  try {
    const body = req.body as SyncRequestBody;

    if (!body.logs || !Array.isArray(body.logs) || body.logs.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Request must contain a non-empty 'logs' array.",
      });
    }

    const invalidLogs: number[] = [];
    body.logs.forEach((log: IncomingFuelLog, index: number) => {
      if (
        !log.mobileOfflineId ||
        typeof log.userId !== "string" || 
        typeof log.volume !== "number" ||
        log.volume <= 0 ||
        !log.timestamp
      ) {
        invalidLogs.push(index);
      }
    });

    if (invalidLogs.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid entries at indices: [${invalidLogs.join(", ")}]. userId must be a string UUID.`,
      });
    }

    // Process the batch (handles idempotency via mobileOfflineId)
    const processedCount = await processSyncBatch(body.logs);

    res.status(200).json({
      success: true,
      processedCount,
      message: processedCount > 0
        ? `Successfully synced ${processedCount} log(s).`
        : "All logs were already synced.",
    });
  } catch (error: any) {
    console.error("❌ Sync Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error. Please retry sync.",
    });
  }
});

// ─── Analytics Endpoint (Fixed Overload Error) ──────────────
app.get("/api/stats/:userId", authenticateToken, async (req, res) => {
  try {
    // ✅ FIX: Force cast to string to prevent "string | string[]" overload errors
    const userId = req.params.userId as string; 
    const authUser = (req as any).user;

    // Security: Only allow users to see their own stats
    if (!authUser || authUser.sub !== userId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    // Query fuelLogs for performance data
    const [stats] = await db
      .select({
        totalVolume: sql<number>`COALESCE(SUM(${fuelLogs.volumeDispensed}), 0)`,
        totalLogs: sql<number>`COUNT(${fuelLogs.id})`,
      })
      .from(fuelLogs)
      .where(
        and(
          eq(fuelLogs.userId, userId), // Now correctly matches PgUUID string
          eq(fuelLogs.syncStatus, "completed")
        )
      );

    res.status(200).json({
      success: true,
      data: {
        totalVolume: Number(stats.totalVolume).toFixed(2),
        totalLogs: Number(stats.totalLogs),
      },
    });
  } catch (error: any) {
    console.error("❌ Stats Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch driver stats" });
  }
});

// ─── Start Server ───────────────────────────────────────────
// Listen on 0.0.0.0 to allow mobile devices on your network to connect
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 SmartFuel Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Use your machine's local IP for EXPO_PUBLIC_API_URL`);
});