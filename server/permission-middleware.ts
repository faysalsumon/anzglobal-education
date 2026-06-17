import { Request, Response, NextFunction } from "express";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isPlatformAdmin,
  isAdmin,
  getUserPermissionContext,
  PermissionCheck,
} from "./permission-service";
import { logSecurityEvent } from "./middleware/bot-protection";

// Extend Express Request to include permission context
declare global {
  namespace Express {
    interface Request {
      permissionContext?: {
        userId: string;
        userType: string;
        roleId: string | null;
        roleName: string | null;
        permissions: string[];
      };
    }
  }
}

/**
 * Middleware to load user's permission context into the request
 */
export function loadPermissionContext() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user?.id) {
      return next();
    }

    try {
      const context = await getUserPermissionContext(user.id);
      if (context) {
        req.permissionContext = context;
      }
    } catch (error) {
      console.error("Error loading permission context:", error);
    }
    next();
  };
}

/**
 * Middleware to require a specific permission
 * Usage: requirePermission('courses', 'manage')
 */
export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const hasAccess = await hasPermission(user.id, resource, action);
    if (!hasAccess) {
      return res.status(403).json({
        message: "Forbidden",
        error: `Missing permission: ${resource}:${action}`,
      });
    }

    next();
  };
}

/**
 * Middleware to require any of the specified permissions
 * Usage: requireAnyPermission([{ resource: 'courses', action: 'view' }, { resource: 'courses', action: 'manage' }])
 */
export function requireAnyPermission(checks: PermissionCheck[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const hasAccess = await hasAnyPermission(user.id, checks);
    if (!hasAccess) {
      return res.status(403).json({
        message: "Forbidden",
        error: "Missing required permissions",
      });
    }

    next();
  };
}

/**
 * Middleware to require all of the specified permissions
 * Usage: requireAllPermissions([{ resource: 'users', action: 'manage' }, { resource: 'users', action: 'approve' }])
 */
export function requireAllPermissions(checks: PermissionCheck[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const hasAccess = await hasAllPermissions(user.id, checks);
    if (!hasAccess) {
      return res.status(403).json({
        message: "Forbidden",
        error: "Missing required permissions",
      });
    }

    next();
  };
}

/**
 * Middleware to require platform admin access (Super Admin only)
 */
export function requirePlatformAdmin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const isPlatAdmin = await isPlatformAdmin(user.id);
    if (!isPlatAdmin) {
      logSecurityEvent('ACCESS_DENIED', req, { reason: 'platform_admin_required', userId: user.id });
      return res.status(403).json({
        message: "Forbidden",
        error: "Platform admin access required",
      });
    }

    next();
  };
}

/**
 * Middleware to require admin access (any admin role)
 */
export function requireAdmin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const isAdminUser = await isAdmin(user.id);
    if (!isAdminUser) {
      logSecurityEvent('ACCESS_DENIED', req, { reason: 'admin_required', userId: user.id });
      return res.status(403).json({
        message: "Forbidden",
        error: "Admin access required",
      });
    }

    next();
  };
}

/**
 * Middleware to require specific user type
 */
export function requireUserType(...types: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!types.includes(user.userType)) {
      return res.status(403).json({
        message: "Forbidden",
        error: `Required user type: ${types.join(" or ")}`,
      });
    }

    next();
  };
}

/**
 * Helper to check permission synchronously from loaded context
 * (Use after loadPermissionContext middleware)
 */
export function checkPermissionFromContext(
  req: Request,
  resource: string,
  action: string
): boolean {
  if (!req.permissionContext) {
    return false;
  }
  return req.permissionContext.permissions.includes(`${resource}:${action}`);
}
