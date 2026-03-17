import { db } from "./index";
import { fuelLogs } from "./schema";
import type { ValidatedFuelLog } from "../schemas/logSchema";

/**
 * Processes a batch of fuel logs from the mobile app using an idempotent,
 * atomic database transaction.
 *
 * Uses Drizzle's `onConflictDoNothing()` on the `mobileOfflineId` column.
 * If a log with the same mobileOfflineId already exists in PostgreSQL,
 * the INSERT is silently skipped — no error, no duplicate.
 *
 * The entire batch is wrapped in a transaction for atomicity:
 * either ALL new logs are inserted, or NONE are (on failure).
 *
 * @returns The number of rows that were actually freshly inserted.
 */
export const processSyncBatch = async (
  logs: ValidatedFuelLog[]
): Promise<number> => {
  let insertedCount = 0;

  await db.transaction(async (tx) => {
    for (const log of logs) {
      const result = await tx
        .insert(fuelLogs)
        .values({
          userId: log.userId,
          mobileOfflineId: log.mobileOfflineId,
          volumeDispensed: log.volume.toFixed(2),
          locationLat: log.lat?.toFixed(7) ?? null,
          locationLng: log.lng?.toFixed(7) ?? null,
          syncStatus: "completed",
          // Data Enrichment: Use the device's dispense timestamp,
          // not the server's arrival time.
          dispensedAt: new Date(log.timestamp),
          createdAt: new Date(log.timestamp),
        })
        .onConflictDoNothing({ target: fuelLogs.mobileOfflineId })
        .returning();

      // .returning() gives us the inserted rows back.
      // If conflict occurred, result is empty.
      insertedCount += result.length;
    }
  });

  return insertedCount;
};
