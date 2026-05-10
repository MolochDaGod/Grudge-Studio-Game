import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env["JWT_SECRET"] || "grudge-dev-secret-change-me";

export interface JwtPayload {
  accountId: string;
  grudgeId: string;
}

declare global {
  namespace Express {
    interface Request {
      accountId?: string;
      grudgeId?: string;
    }
  }
}

/**
 * Require a valid JWT. Returns 401 if missing/invalid.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "missing token" });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as JwtPayload;
    req.accountId = payload.accountId;
    req.grudgeId = payload.grudgeId;
    next();
  } catch {
    res.status(401).json({ error: "invalid token" });
  }
}

/**
 * Optionally attach account info if a valid token is present, but don't reject.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(header.slice(7), JWT_SECRET) as JwtPayload;
      req.accountId = payload.accountId;
      req.grudgeId = payload.grudgeId;
    } catch {
      /* token invalid — proceed without auth */
    }
  }
  next();
}

export function signToken(accountId: string, grudgeId: string): string {
  return jwt.sign({ accountId, grudgeId } satisfies JwtPayload, JWT_SECRET, {
    expiresIn: "30d",
  });
}

export { JWT_SECRET };
