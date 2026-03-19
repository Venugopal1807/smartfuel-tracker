type Event = { uuid: string; payload: Record<string, unknown> };

// Simple in-memory idempotency guard to mirror sync handler behaviour.
const makeProcessor = () => {
  const seen = new Set<string>();
  return (event: Event) => {
    if (seen.has(event.uuid)) {
      return { processed: false };
    }
    seen.add(event.uuid);
    return { processed: true };
  };
};

describe("Sync idempotency", () => {
  it("processes a UUID only once", () => {
    const process = makeProcessor();
    const event = { uuid: "123e4567", payload: { volume: 10 } };

    const first = process(event);
    const second = process(event);

    expect(first.processed).toBe(true);
    expect(second.processed).toBe(false);
  });
});
