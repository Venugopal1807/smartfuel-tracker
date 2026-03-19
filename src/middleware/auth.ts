import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set");
}

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];
  if (!token) {
    res.status(401).json({ success: false, message: "Missing token" });
    return;
  }
  try {
    const decoded = verifyToken(token);
    (req as any).user = decoded;
    next();
  } catch (err: any) {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};
