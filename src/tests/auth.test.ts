import jwt from "jsonwebtoken";

describe("verifyToken", () => {
  const secret = "test_secret_auth";

  beforeAll(() => {
    process.env.JWT_SECRET = secret;
    jest.resetModules();
  });

  const loadVerify = () => require("../middleware/auth").verifyToken as (token: string) => any;

  it("allows a valid JWT with the correct secret", () => {
    const token = jwt.sign({ sub: "user-123" }, secret, { expiresIn: "1h" });
    const verifyToken = loadVerify();
    const decoded = verifyToken(token) as jwt.JwtPayload;
    expect(decoded.sub).toBe("user-123");
  });

  it("throws for an expired token", () => {
    const token = jwt.sign({ sub: "user-expired" }, secret, { expiresIn: -1 });
    const verifyToken = loadVerify();
    expect(() => verifyToken(token)).toThrow();
  });

  it("throws on signature mismatch (tampered payload)", () => {
    const token = jwt.sign({ sub: "user-abc" }, secret, { expiresIn: "1h" });
    // Tamper by flipping a character in the payload segment
    const parts = token.split(".");
    const tamperedPayload = parts[1].replace(/./, (c) => (c === "a" ? "b" : "a"));
    const tampered = [parts[0], tamperedPayload, parts[2]].join(".");
    const verifyToken = loadVerify();
    expect(() => verifyToken(tampered)).toThrow();
  });
});
