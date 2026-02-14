import type { Request, Response, NextFunction } from "express";
import { getUserAccessContext, type UserAccessContext } from "../access-policy-service";

declare global {
  namespace Express {
    interface Request {
      accessContext?: UserAccessContext;
    }
  }
}

export async function injectAccessContext(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.supabaseUser?.id;
    if (!userId) {
      return next();
    }

    const context = await getUserAccessContext(userId);
    if (context) {
      req.accessContext = context;
    }

    next();
  } catch (error) {
    console.error("Error injecting access context:", error);
    next();
  }
}

export function requireRegionScope(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.accessContext) {
    return res.status(403).json({ message: "Access context not available" });
  }
  next();
}
