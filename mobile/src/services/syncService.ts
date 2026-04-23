import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPendingActions, markLogAsSynced } from "../db/sqlite";

// Use the environment variable for your local dev server
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.5:3000";

// 1. FIX: Made counts optional (?) to allow the catch block to return only an error
interface SyncResult {
  success: boolean;
  processedCount?: number; 
  failedCount?: number;
  error?: string;
}

// 2. FIX: Defined the interface to match your fuel log data structure
interface QueueAction {
  uuid: string;
  userId: string;
  volume: number;
  lat: number | null;
  lng: number | null;
  timestamp: string;
  orderId?: string;
}

/**
 * Processes all pending fuel logs by sending them to the real backend.
 * Handles the manual trigger for the sync process.
 */
export const processSyncQueue = async (): Promise<SyncResult> => {
  try {
    // 3. FIX: Intermediate 'unknown' cast to bypass strict overlap check ts(2352)
    const pending = (await getPendingActions()) as unknown as QueueAction[];
    
    if (!pending.length) {
      return { success: true, processedCount: 0, failedCount: 0 };
    }

    const token = await AsyncStorage.getItem("auth_token");
    if (!token) {
      return { success: false, error: "Not authenticated. Please login again." };
    }

    // Prepare the batch payload for the server
    const logsToSync = pending.map(action => ({
      mobileOfflineId: action.uuid,
      userId: action.userId,
      volume: action.volume,
      lat: action.lat,
      lng: action.lng,
      timestamp: action.timestamp,
      orderId: action.orderId
    }));

    // Send to Backend in ONE efficient batch
    const response = await axios.post(
      `${API_URL}/api/logs/sync`,
      { logs: logsToSync },
      { 
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000 
      }
    );

    if (response.data.success) {
      // Mark as synced in local SQLite only after server confirms receipt
      for (const log of logsToSync) {
        await markLogAsSynced(log.mobileOfflineId);
      }

      return { 
        success: true, 
        processedCount: response.data.processedCount || logsToSync.length, 
        failedCount: 0 
      };
    }

    return { success: false, error: "Server rejected the sync batch." };

  } catch (err: any) {
    console.error("Manual Sync Error:", err.response?.data || err.message);
    
    // 4. FIX: This now compiles because SyncResult allows partial returns on failure
    const errorMessage = err.response?.status === 401 
      ? "Session expired. Login to sync." 
      : "Network error. Try again when online.";

    return { success: false, error: errorMessage };
  }
};