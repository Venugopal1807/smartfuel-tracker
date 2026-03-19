import { jest } from "@jest/globals";
import axios from "axios";

jest.mock("../db/sqlite", () => ({
  getPendingSyncEvents: jest.fn(),
  deleteSyncEvent: jest.fn(),
}));

jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;
const { getPendingSyncEvents, deleteSyncEvent } = jest.requireMock("../db/sqlite") as {
  getPendingSyncEvents: jest.Mock;
  deleteSyncEvent: jest.Mock;
};

// Import after mocks so the worker uses mocked dependencies
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { syncPendingEvents } = require("../services/syncWorker");

describe("syncWorker", () => {
  beforeEach(() => {
    const mockData = [
      { id: 1, type: "PAYMENT_VERIFY_RETRY", payload: JSON.stringify({ orderId: "o1", amount: 100 }) },
      { id: 2, type: "PROFILE_UPDATE_SYNC", payload: JSON.stringify({ name: "Driver" }) },
    ] as any;

    jest.mocked(getPendingSyncEvents).mockResolvedValue(mockData);
    jest.mocked(deleteSyncEvent).mockResolvedValue(undefined as any);
    jest.mocked(mockedAxios.post).mockResolvedValue({ data: { pgOrderId: "order_mock" } } as any);
    jest.mocked(mockedAxios.patch).mockResolvedValue({} as any);
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
