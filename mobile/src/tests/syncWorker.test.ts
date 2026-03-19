import { jest } from "@jest/globals";
import axios from "axios";

jest.mock("../db/sqlite", () => ({
  getPendingSyncEvents: jest.fn(),
  deleteSyncEvent: jest.fn(),
}));

jest.mock("axios");

const { getPendingSyncEvents, deleteSyncEvent } = jest.requireMock("../db/sqlite") as {
  getPendingSyncEvents: jest.Mock;
  deleteSyncEvent: jest.Mock;
};

const mockedAxios = axios as jest.Mocked<typeof axios>;

// Import after mocks so the worker uses mocked dependencies
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { syncPendingEvents } = require("../services/syncWorker");

describe("syncWorker", () => {
  beforeEach(() => {
    (getPendingSyncEvents as jest.Mock).mockResolvedValue([
      { id: 1, type: "PAYMENT_VERIFY_RETRY", payload: JSON.stringify({ orderId: "o1", amount: 100 }) },
      { id: 2, type: "PROFILE_UPDATE_SYNC", payload: JSON.stringify({ name: "Driver" }) },
    ]);
    (deleteSyncEvent as jest.Mock).mockResolvedValue(undefined);
    mockedAxios.post.mockResolvedValue({ data: { pgOrderId: "order_mock" } } as any);
    mockedAxios.patch.mockResolvedValue({} as any);
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as any) as unknown as typeof fetch;
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
