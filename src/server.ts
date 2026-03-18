import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import { processSyncBatch } from "./db/logic";
import type { SyncRequestBody, IncomingFuelLog } from "./types";
import { authenticateToken } from "./middleware/auth";
import authRouter from "./api/auth";
import ordersRouter from "./api/orders";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/orders", ordersRouter);

// ─── Health Check ───────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "SmartFuel Backend Active" });
});

// ─── Sync Endpoint ──────────────────────────────────────────
app.post("/api/logs/sync", async (req, res) => {
  try {
    const body = req.body as SyncRequestBody;

    // --- Validation ---
    if (!body.logs || !Array.isArray(body.logs) || body.logs.length === 0) {
      res.status(400).json({
        success: false,
        message: "Request body must contain a non-empty 'logs' array.",
      });
      return;
    }

    const invalidLogs: number[] = [];
    body.logs.forEach((log: IncomingFuelLog, index: number) => {
      if (
        !log.mobileOfflineId ||
        typeof log.userId !== "number" ||
        typeof log.volume !== "number" ||
        log.volume <= 0 ||
        !log.timestamp
      ) {
        invalidLogs.push(index);
      }
    });

    if (invalidLogs.length > 0) {
      res.status(400).json({
        success: false,
        message: `Invalid log entries at indices: [${invalidLogs.join(", ")}]. Each log needs a valid mobileOfflineId, userId, volume > 0, and timestamp.`,
      });
      return;
    }

    // --- Idempotent Batch Processing ---
    const processedCount = await processSyncBatch(body.logs);

    res.status(200).json({
      success: true,
      processedCount,
      message:
        processedCount > 0
          ? `Successfully synced ${processedCount} new log(s).`
          : "All logs were already synced (0 new entries).",
    });
  } catch (error: any) {
    console.error("❌ Sync endpoint error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error. Logs were NOT processed. Please retry.",
    });
  }
});

import { db } from "./db/index";
import { fuelLogs } from "./db/schema";
import { eq, gte, sql, and } from "drizzle-orm";

// ─── Analytics Endpoint ──────────────────────────────────────
app.get("/api/stats/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) {
      res.status(400).json({ success: false, message: "Invalid userId" });
      return;
    }

    // IDOR guard: ensure authenticated user matches requested userId
    const authUser = (req as any).user;
    if (!authUser || Number(authUser.sub) !== userId) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    // Calculate time 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Aggregate sum and count using Drizzle SQL operators
    const [stats] = await db
      .select({
        totalVolume: sql<number>`COALESCE(SUM(${fuelLogs.volumeDispensed}), 0)`,
        totalLogs: sql<number>`COUNT(${fuelLogs.id})`,
      })
      .from(fuelLogs)
      .where(
        and(
          eq(fuelLogs.userId, userId),
          gte(fuelLogs.dispensedAt, twentyFourHoursAgo)
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
    console.error("❌ Stats endpoint error:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
});


// ─── Start Server ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 SmartFuel server running on http://localhost:${PORT}`);
});
