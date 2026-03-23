import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "smartfuel_dev_secret_2026";

// 1. Define the shape of your User payload
export interface UserPayload {
  id: string;      // The Driver's UUID
  phone: string;
  name: string;
  role?: string;   // Optional: if you add Admins later
}

// 2. EXTEND the Express Request type globally
// This allows you to use req.user anywhere in your app without 'as any'
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export const verifyToken = (token: string): UserPayload => {
  return jwt.verify(token, JWT_SECRET) as UserPayload;
};

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  
  // Extracting 'Bearer <token>'
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.split(" ")[1] 
    : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    const decoded = verifyToken(token);
    
    // Now TypeScript knows exactly what 'req.user' is!
    req.user = decoded; 
    
    next();
  } catch (err: any) {
    // Distinguish between expired and just plain wrong tokens
    const message = err.name === 'TokenExpiredError' ? "Session expired" : "Invalid token";
    res.status(403).json({ success: false, message });
  }
};