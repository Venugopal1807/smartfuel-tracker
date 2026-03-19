import { syncPendingEvents } from "../services/syncWorker";
import { jest } from "@jest/globals";

jest.mock("../db/sqlite", () => ({
  getPendingSyncEvents: jest.fn(),
  deleteSyncEvent: jest.fn(),
}));

jest.mock("axios", () => ({
  post: jest.fn().mockResolvedValue({ data: { pgOrderId: "order_mock" } }),
  patch: jest.fn().mockResolvedValue({}),
}));

const { getPendingSyncEvents, deleteSyncEvent } = jest.requireMock("../db/sqlite");

describe("syncWorker", () => {
  beforeEach(() => {
    (getPendingSyncEvents as jest.Mock).mockResolvedValue([
      { id: 1, type: "PAYMENT_VERIFY_RETRY", payload: JSON.stringify({ orderId: "o1", amount: 100 }) },
      { id: 2, type: "PROFILE_UPDATE_SYNC", payload: JSON.stringify({ name: "Driver" }) },
    ]);
    (deleteSyncEvent as jest.Mock).mockResolvedValue(undefined);
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("processes pending events when online and deletes them after success", async () => {
    await syncPendingEvents();
    expect(getPendingSyncEvents).toHaveBeenCalled();
    expect(deleteSyncEvent).toHaveBeenCalledTimes(2);
  });
});
