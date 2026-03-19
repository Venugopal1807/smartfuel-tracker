type OrderStatus = "pending" | "accepted" | "dispensing" | "delivered";

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["accepted"],
  accepted: ["dispensing"],
  dispensing: ["delivered"],
  delivered: [],
};

const canTransition = (from: OrderStatus, to: OrderStatus) => allowedTransitions[from]?.includes(to);

const computePrice = (volume: number, rate: number) => Number((volume * rate).toFixed(2));

describe("Order state machine", () => {
  it("prevents skipping DISPENSING before COMPLETED", () => {
    const path: OrderStatus[] = ["pending", "delivered"];
    const valid = path.every((status, idx) => {
      if (idx === 0) return true;
      return canTransition(path[idx - 1], status);
    });
    expect(valid).toBe(false);
  });

  it("allows the required path through DISPENSING", () => {
    const path: OrderStatus[] = ["pending", "accepted", "dispensing", "delivered"];
    const valid = path.every((status, idx) => {
      if (idx === 0) return true;
      return canTransition(path[idx - 1], status);
    });
    expect(valid).toBe(true);
  });
});

describe("Order pricing", () => {
  it("calculates final price from volume and seeded rate", () => {
    const seededRate = 90; // ₹/L from seeded data
    const volume = 45.5;
    const total = computePrice(volume, seededRate);
    expect(total).toBeCloseTo(4095);
  });
});
