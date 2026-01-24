import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "./supabase";
import { storage } from "./storage";

export interface SupabaseUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  userType?: string;
  role?: string;
  isActive?: boolean;
  profileImageUrl?: string | null;
  authProvider: "supabase";
}

declare global {
  namespace Express {
    interface Request {
      supabaseUser?: SupabaseUser;
    }
  }
}

export async function supabaseAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }
    
    const token = authHeader.split(" ")[1];
    
    if (!token) {
      return next();
    }
    
    if (!supabaseAdmin) {
      console.warn("Supabase admin client not available for token verification");
      return next();
    }
    
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return next();
    }
    
    const dbUser = await storage.getUserByEmail(user.email!);
    
    if (!dbUser) {
      const email = user.email!;
      const metadata = user.user_metadata || {};
      
      const firstName = metadata.first_name || metadata.firstName || email.split("@")[0];
      const lastName = metadata.last_name || metadata.lastName || "";
      const userType = metadata.user_type || metadata.userType || "student";
      const role = metadata.role || "member";
      
      await storage.createUser({
        id: user.id,
        email: email,
        firstName,
        lastName,
        userType,
        role,
        isActive: true,
        profileImageUrl: metadata.avatar_url || null,
      });
      
      req.supabaseUser = {
        id: user.id,
        email,
        firstName,
        lastName,
        userType,
        role,
        isActive: true,
        profileImageUrl: metadata.avatar_url || null,
        authProvider: "supabase",
      };
    } else {
      req.supabaseUser = {
        id: dbUser.id,
        email: dbUser.email!,
        firstName: dbUser.firstName || undefined,
        lastName: dbUser.lastName || undefined,
        userType: dbUser.userType || undefined,
        role: dbUser.role || undefined,
        isActive: dbUser.isActive ?? true,
        profileImageUrl: dbUser.profileImageUrl || null,
        authProvider: "supabase",
      };
    }
    
    next();
  } catch (error) {
    console.error("Supabase auth middleware error:", error);
    next();
  }
}

export function isSupabaseAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.supabaseUser) {
    return res.status(401).json({ message: "Unauthorized - Supabase auth required" });
  }
  next();
}

export function requireSupabaseRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.supabaseUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (!req.supabaseUser.role || !allowedRoles.includes(req.supabaseUser.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    
    next();
  };
}

export function requireSupabaseUserType(allowedTypes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.supabaseUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (!req.supabaseUser.userType || !allowedTypes.includes(req.supabaseUser.userType)) {
      return res.status(403).json({ message: "Access denied for your user type" });
    }
    
    next();
  };
}

export function isUnifiedAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.supabaseUser) {
    const { id, ...userWithoutId } = req.supabaseUser;
    (req as any).user = {
      id,
      claims: { sub: id },
      ...userWithoutId,
    };
    return next();
  }
  
  if ((req as any).user && (req as any).isAuthenticated?.()) {
    return next();
  }
  
  return res.status(401).json({ message: "Unauthorized" });
}

/**
 * Main authentication middleware for all routes.
 * Only uses Supabase authentication (Replit Auth removed).
 * Populates req.user with claims.sub for backward compatibility.
 */
export function isAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.supabaseUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // Populate req.user with claims for backward compatibility with existing routes
  (req as any).user = {
    claims: { sub: req.supabaseUser.id },
    supabaseUser: req.supabaseUser,
  };
  
  next();
}

/**
 * Get the authenticated user ID from the request.
 * Returns null if user is not authenticated.
 */
export function getAuthenticatedUserId(req: any): string | null {
  return req.supabaseUser?.id ?? null;
}

/**
 * Check if the authenticated user has institution/university access.
 * Returns { userId, universityId } if access granted, null otherwise.
 */
export async function checkInstitutionAccess(req: any): Promise<{ userId: string; universityId: string } | null> {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return null;
  }

  // Get user from request (already populated by supabaseAuthMiddleware)
  const user = req.supabaseUser;
  if (!user || (user.userType !== 'university' && user.userType !== 'institution_admin')) {
    return null;
  }

  // Import storage dynamically to avoid circular imports
  const { storage } = await import('./storage');
  
  // Get university associated with this user
  const university = await storage.getUniversityByUserId(userId);
  if (!university) {
    return null;
  }

  return { userId, universityId: university.id };
}
