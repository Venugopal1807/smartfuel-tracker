type SyncEvent = { idempotencyKey: string; payload: Record<string, unknown> };

// Improved mock to handle failures (critical for offline sync)
const makeProcessor = () => {
  const seen = new Set<string>();
  
  return (event: SyncEvent, shouldSucceed = true) => {
    if (seen.has(event.idempotencyKey)) {
      return { processed: false, reason: "Duplicate" };
    }

    if (!shouldSucceed) {
      // If sync fails (e.g., network timeout), we DON'T add to seen
      return { processed: false, reason: "Network Error" };
    }

    seen.add(event.idempotencyKey);
    return { processed: true };
  };
};

describe("Sync Idempotency Gatekeeper", () => {
  
  it("✅ Prevents duplicate processing of the same key", () => {
    const process = makeProcessor();
    const event = { idempotencyKey: "evt_123", payload: { liters: 50 } };

    const firstAttempt = process(event);
    const secondAttempt = process(event);

    expect(firstAttempt.processed).toBe(true);
    expect(secondAttempt.processed).toBe(false);
    expect(secondAttempt.reason).toBe("Duplicate");
  });

  it("🔄 Allows retries if the initial sync failed", () => {
    const process = makeProcessor();
    const event = { idempotencyKey: "evt_retry_test", payload: {} };

    // First attempt fails (e.g., Server 500 or Network Down)
    const firstAttempt = process(event, false);
    expect(firstAttempt.processed).toBe(false);
    expect(firstAttempt.reason).toBe("Network Error");

    // Second attempt (retry) should succeed because it wasn't marked as 'seen'
    const secondAttempt = process(event, true);
    expect(secondAttempt.processed).toBe(true);
  });

  it("⚡ Processes independent events concurrently", () => {
    const process = makeProcessor();
    const results = [
      process({ idempotencyKey: "log_1", payload: {} }),
      process({ idempotencyKey: "log_2", payload: {} })
    ];
    
    expect(results.every(r => r.processed)).toBe(true);
  });
});