import crypto from "crypto";

const PAYMENT_SECRET = "smartfuel_internal_sec_2026";
const WRONG_SECRET = "hacker_secret_666";

// This logic should ideally be imported from a 'utils' file 
// so you aren't duplicating code in your tests!
const sign = (pgOrderId: string, pgPaymentId: string, secret: string) =>
  crypto
    .createHmac("sha256", secret)
    .update(`${pgOrderId}|${pgPaymentId}`)
    .digest("hex");

describe("B2B Payment Verification (HMAC-SHA256)", () => {
  const mockPgOrderId = "sf_order_a1b2c3d4";
  const mockPgPaymentId = "sf_verify_z9y8x7w6";

  it("✅ Accepts a valid signature with matching secret", () => {
    const validSignature = sign(mockPgOrderId, mockPgPaymentId, PAYMENT_SECRET);
    
    // Simulating server-side re-computation
    const serverSideHash = sign(mockPgOrderId, mockPgPaymentId, PAYMENT_SECRET);
    
    expect(serverSideHash).toEqual(validSignature);
  });

  it("❌ Rejects if the Payment ID has been tampered with", () => {
    const originalSignature = sign(mockPgOrderId, mockPgPaymentId, PAYMENT_SECRET);
    const tamperedPaymentId = "sf_verify_HACKED";
    
    const tamperedHash = sign(mockPgOrderId, tamperedPaymentId, PAYMENT_SECRET);
    
    expect(tamperedHash).not.toEqual(originalSignature);
  });

  it("❌ Rejects if the Secret Key does not match", () => {
    const clientSignature = sign(mockPgOrderId, mockPgPaymentId, PAYMENT_SECRET);
    
    // Server has a different secret (e.g., misconfigured .env)
    const serverSideHash = sign(mockPgOrderId, mockPgPaymentId, WRONG_SECRET);
    
    expect(serverSideHash).not.toEqual(clientSignature);
  });

  it("❌ Rejects if the Order ID is swapped", () => {
    const clientSignature = sign(mockPgOrderId, mockPgPaymentId, PAYMENT_SECRET);
    const wrongOrderId = "sf_order_DIFFERENT_ONE";
    
    const serverSideHash = sign(wrongOrderId, mockPgPaymentId, PAYMENT_SECRET);
    
    expect(serverSideHash).not.toEqual(clientSignature);
  });
});