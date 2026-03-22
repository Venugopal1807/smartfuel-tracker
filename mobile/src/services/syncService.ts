import { getPendingActions, markAsSynced } from "../db/sqlite";

type SyncResult =
  | { success: true; processedCount: number; failedCount: number }
  | { success: false; error: string };

/**
 * Processes all pending offline queue actions.
 * Simulates backend with 500ms latency and 10% failure rate.
 */
export const processSyncQueue = async (): Promise<SyncResult> => {
  try {
    const pending = await getPendingActions();
    if (!pending.length) {
      return { success: true, processedCount: 0, failedCount: 0 };
    }

    let processed = 0;
    let failed = 0;
    for (const action of pending) {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const simulatedFailure = Math.random() < 0.1;
      if (simulatedFailure) {
        failed += 1;
        continue; // leave as PENDING for retry
      }

      await markAsSynced(action.uuid);
      processed += 1;
    }

    return { success: true, processedCount: processed, failedCount: failed };
  } catch (err: any) {
    console.error("processSyncQueue error", err?.message || err);
    return { success: false, error: err?.message || "Unknown sync error" };
  }
};
