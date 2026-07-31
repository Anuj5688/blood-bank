import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const rawSecret = process.env.SESSION_SECRET;

if (!rawSecret) {
  throw new Error(
    "SESSION_SECRET environment variable is required but was not provided.",
  );
}

const JWT_SECRET: string = rawSecret;

export interface JwtPayload {
  id: number;
  email: string;
  role: "hospital" | "admin" | "user";
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}

export function requireHospital(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== "hospital") {
      res.status(403).json({ error: "Hospital access required" });
      return;
    }
    next();
  });
}

export function requireUser(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== "user") {
      res.status(403).json({ error: "User access required" });
      return;
    }
    next();
  });
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
