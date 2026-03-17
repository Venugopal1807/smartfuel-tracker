import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import { eq, gte, sql, and } from "drizzle-orm";

import { db } from "./db/index";
import { fuelLogs } from "./db/schema";
import { processSyncBatch } from "./db/logic";
import { authenticateToken } from "./middleware/auth";
import { SyncRequestSchema } from "./schemas/logSchema";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Health Check ───────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "SmartFuel Backend Active" });
});

// ─── Sync Endpoint (Protected + Validated) ──────────────────
app.post("/api/logs/sync", authenticateToken, async (req, res) => {
  try {
    // Zod validation — replaces the old manual checks
    const parsed = SyncRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    // --- Idempotent Batch Processing ---
    const processedCount = await processSyncBatch(parsed.data.logs);

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

// ─── Analytics Endpoint ──────────────────────────────────────
app.get("/api/stats/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) {
      res.status(400).json({ success: false, message: "Invalid userId" });
      return;
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

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
