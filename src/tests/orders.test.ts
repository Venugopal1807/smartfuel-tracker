// 1. Updated to match the real schema.ts enum
type OrderStatus = 
  | "pending" 
  | "confirmed" 
  | "accepted" 
  | "in_transit" 
  | "delivered" 
  | "payment_pending" 
  | "paid";

// 2. Reflecting the real-world delivery lifecycle
const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed"],
  confirmed: ["accepted"],
  accepted: ["in_transit"],
  in_transit: ["delivered"],
  delivered: ["paid", "payment_pending"], // Can go to paid online or pending offline
  payment_pending: ["paid"],
  paid: [],
};

const canTransition = (from: OrderStatus, to: OrderStatus) => 
  allowedTransitions[from]?.includes(to);

const computePrice = (volume: number, rate: number) => 
  Number((volume * rate).toFixed(2));

describe("Order state machine", () => {
  it("prevents skipping IN_TRANSIT before DELIVERED", () => {
    // Attempting to jump from accepted (assigned) to delivered (done) 
    const path: OrderStatus[] = ["accepted", "delivered"];
    const valid = canTransition(path[0], path[1]);
    expect(valid).toBe(false);
  });

  it("allows the full delivery lifecycle path", () => {
    const path: OrderStatus[] = [
      "pending", 
      "confirmed", 
      "accepted", 
      "in_transit", 
      "delivered", 
      "paid"
    ];
    
    const valid = path.every((status, idx) => {
      if (idx === 0) return true;
      return canTransition(path[idx - 1], status);
    });
    expect(valid).toBe(true);
  });

  it("supports the offline settlement transition", () => {
    // Delivered -> payment_pending (offline) -> paid (later sync)
    expect(canTransition("delivered", "payment_pending")).toBe(true);
    expect(canTransition("payment_pending", "paid")).toBe(true);
  });
});

describe("Order pricing", () => {
  it("calculates final price with 2-decimal precision", () => {
    const rate = 108.50; 
    const volume = 45.123; // High precision from meter
    const total = computePrice(volume, rate);
    
    // 45.123 * 108.50 = 4895.8455 -> Fixed to 4895.85
    expect(total).toBe(4895.85);
  });
});