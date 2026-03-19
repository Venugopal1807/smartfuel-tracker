import crypto from "crypto";

const PAYMENT_SECRET = "test_secret_123";

const sign = (orderId: string, paymentId: string) =>
  crypto.createHmac("sha256", PAYMENT_SECRET).update(`${orderId}|${paymentId}`).digest("hex");

describe("HMAC-SHA256 payment signature", () => {
  it("accepts a valid signature", () => {
    const orderId = "order_abc";
    const paymentId = "pay_123";
    const expectedSignature = sign(orderId, paymentId);
    const recomputed = sign(orderId, paymentId);
    expect(recomputed).toEqual(expectedSignature);
  });

  it("rejects a tampered signature", () => {
    const orderId = "order_abc";
    const paymentId = "pay_123";
    const expectedSignature = sign(orderId, paymentId);
    const tamperedSignature = sign(orderId, "pay_tampered");
    expect(tamperedSignature).not.toEqual(expectedSignature);
  });
});
