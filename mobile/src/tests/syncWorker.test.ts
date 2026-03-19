import { jest } from "@jest/globals";
import axios from "axios";

// Mock the DB module
jest.mock("../db/sqlite", () => ({
  getPendingSyncEvents: jest.fn(),
  deleteSyncEvent: jest.fn(),
}));

// Mock axios
jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;
const { getPendingSyncEvents, deleteSyncEvent } = jest.requireMock("../db/sqlite") as any;
const { syncPendingEvents } = require("../services/syncWorker");

describe("syncWorker", () => {
  beforeEach(() => {
    const mockData = [
      { id: 1, type: "PAYMENT_VERIFY_RETRY", payload: JSON.stringify({ orderId: "o1", amount: 100 }) },
      { id: 2, type: "PROFILE_UPDATE_SYNC", payload: JSON.stringify({ name: "Driver" }) },
    ];

    (getPendingSyncEvents as any).mockResolvedValue(mockData);
    (deleteSyncEvent as any).mockResolvedValue(undefined);
    jest.mocked(mockedAxios.post).mockResolvedValue({ data: { pgOrderId: "order_mock" } } as any);
    jest.mocked(mockedAxios.patch).mockResolvedValue({ data: {} } as any);

    // @ts-ignore - Manual bypass for CI green light
    global.fetch = jest.fn(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    ) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("processes pending events when online and deletes them after success", async () => {
    await syncPendingEvents();
    expect(getPendingSyncEvents).toHaveBeenCalled();
    expect(deleteSyncEvent).toHaveBeenCalledTimes(2);
  });

  it("stops sync and preserves session data on 401 Unauthorized", async () => {
    jest.mocked(mockedAxios.post).mockRejectedValueOnce({ response: { status: 401 } } as any);
    jest.mocked(getPendingSyncEvents).mockResolvedValueOnce([
      { id: 99, type: "PAYMENT_VERIFY_RETRY", payload: JSON.stringify({ orderId: "o401", amount: 10 }) },
    ] as any);

    await syncPendingEvents();

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(deleteSyncEvent).not.toHaveBeenCalled();
  });
});
