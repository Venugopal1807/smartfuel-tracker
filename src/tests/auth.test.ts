import jwt from "jsonwebtoken";

/**
 * AUTHENTICATION MIDDLEWARE TESTS
 * This suite verifies that our JWT security logic correctly 
 * identifies valid, expired, and tampered tokens.
 */

describe("JWT Verification Logic", () => {
  const secret = "test_secret_auth_123";

  beforeAll(() => {
    // Inject the secret into the environment for the test duration
    process.env.JWT_SECRET = secret;
    // Clear module cache to ensure the middleware picks up the test secret
    if (typeof jest !== 'undefined') {
      jest.resetModules();
    }
  });

  // Helper to dynamically load the middleware after the environment is set
  const loadVerify = () => {
    return require("../middleware/auth").verifyToken as (token: string) => any;
  };

  it("✅ allows a valid JWT with the correct secret", () => {
    const token = jwt.sign({ sub: "user-123", name: "Test Driver" }, secret, { expiresIn: "1h" });
    const verifyToken = loadVerify();
    
    const decoded = verifyToken(token) as jwt.JwtPayload;
    
    expect(decoded.sub).toBe("user-123");
    expect(decoded.name).toBe("Test Driver");
  });

  it("❌ throws an error for an expired token", () => {
    // Generate a token that expired 1 second ago
    const token = jwt.sign({ sub: "user-expired" }, secret, { expiresIn: "-1s" });
    const verifyToken = loadVerify();
    
    expect(() => verifyToken(token)).toThrow();
  });

  it("❌ throws an error on signature mismatch (tampered payload)", () => {
    const token = jwt.sign({ sub: "user-secure" }, secret, { expiresIn: "1h" });
    
    // Manually tamper with the token string to simulate a hack attempt
    const parts = token.split(".");
    // Change a character in the payload segment
    const tamperedPayload = parts[1].substring(0, parts[1].length - 1) + (parts[1].endsWith("a") ? "b" : "a");
    const tamperedToken = [parts[0], tamperedPayload, parts[2]].join(".");
    
    const verifyToken = loadVerify();
    
    expect(() => verifyToken(tamperedToken)).toThrow();
  });

  it("❌ throws an error if an incorrect secret is used", () => {
    const wrongSecret = "definitely_not_the_right_secret";
    const token = jwt.sign({ sub: "user-123" }, wrongSecret, { expiresIn: "1h" });
    
    const verifyToken = loadVerify();
    
    expect(() => verifyToken(token)).toThrow();
  });
});