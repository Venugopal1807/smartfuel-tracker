import { getPendingActions, markAsSynced } from "../db/sqlite";

type SyncResult = { success: true; processedCount: number } | { success: false; error: string };

/**
 * Processes all pending offline queue actions.
 * For MVP, we simulate a backend call with a 500ms delay per item.
 */
export const processSyncQueue = async (): Promise<SyncResult> => {
  try {
    const pending = await getPendingActions();
    if (!pending.length) {
      return { success: true, processedCount: 0 };
    }

    let processed = 0;
    for (const action of pending) {
      // Simulated network latency / backend call
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Here we would POST to backend; for now we assume success
      await markAsSynced(action.uuid);
      processed += 1;
    }

    return { success: true, processedCount: processed };
  } catch (err: any) {
    console.error("processSyncQueue error", err?.message || err);
    return { success: false, error: err?.message || "Unknown sync error" };
  }
};
