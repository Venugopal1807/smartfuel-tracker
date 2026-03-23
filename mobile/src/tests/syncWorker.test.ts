import { jest } from "@jest/globals";
import axios from "axios";

// 1. Mock the DB module (SQLite)
jest.mock("../db/sqlite", () => ({
  getPendingSyncEvents: jest.fn(),
  deleteSyncEvent: jest.fn(),
}));

// 2. Mock axios
jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;
const { getPendingSyncEvents, deleteSyncEvent } = jest.requireMock("../db/sqlite") as any;

// Importing the actual worker logic
import { syncPendingEvents } from "../services/syncWorker";

describe("SyncWorker Background Service", () => {
  
  beforeEach(() => {
    // Standard mock data representing different types of offline events
    const mockData = [
      { 
        id: 1, 
        type: "PAYMENT_VERIFY_RETRY", 
        payload: JSON.stringify({ 
          orderId: "o1", 
          amount: 100, 
          volume: 50, 
          otp_proof: "hash_abc" 
        }) 
      },
      { 
        id: 2, 
        type: "FUEL_LOG_SYNC", 
        payload: JSON.stringify({ 
          mobileOfflineId: "uuid-123", 
          volume: 45.5 
        }) 
      },
    ];

    (getPendingSyncEvents as any).mockResolvedValue(mockData);
    (deleteSyncEvent as any).mockResolvedValue(undefined);
    
    // Default success responses for Axios
    mockedAxios.post.mockResolvedValue({ 
      data: { success: true, pgOrderId: "sf_order_mock", processedCount: 1 } 
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("✅ Processes pending events and clears them from SQLite on success", async () => {
    await syncPendingEvents();

    // Verify it checked the local DB
    expect(getPendingSyncEvents).toHaveBeenCalled();
    
    // Verify it sent requests to the server
    expect(mockedAxios.post).toHaveBeenCalled();

    // Verify it deleted the records locally after successful sync
    expect(deleteSyncEvent).toHaveBeenCalledTimes(2);
  });

  it("❌ Stops sync immediately on 401 Unauthorized to prevent lockout", async () => {
    // Simulate a 'Session Expired' error on the first request
    mockedAxios.post.mockRejectedValueOnce({ 
      response: { status: 401, data: { message: "Invalid Token" } } 
    } as any);

    await syncPendingEvents();

    // Should have tried only the first event
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    
    // CRITICAL: Should NOT have deleted the event (so we can try again after login)
    expect(deleteSyncEvent).not.toHaveBeenCalled();
  });

  it("🔄 Retries on 500 Server Error (Does not delete data)", async () => {
    // Simulate a temporary server crash
    mockedAxios.post.mockRejectedValueOnce({ 
      response: { status: 500 } 
    } as any);

    await syncPendingEvents();

    // Data must remain in SQLite for the next background pass
    expect(deleteSyncEvent).not.toHaveBeenCalled();
  });
});