import { db } from "./db";
import { users, roles, permissions, rolePermissions } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface PermissionCheck {
  resource: string;
  action: string;
}

export interface UserPermissionContext {
  userId: string;
  userType: string;
  roleId: string | null;
  roleName: string | null;
  permissions: string[]; // Array of "resource:action" strings
}

// Cache for user permissions (invalidate on role changes)
const permissionCache = new Map<string, { permissions: string[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get all permissions for a user based on their role
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  // Check cache first
  const cached = permissionCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permissions;
  }

  try {
    // Get user's role
    const user = await db
      .select({
        roleId: users.roleId,
        userType: users.userType,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length || !user[0].roleId) {
      return [];
    }

    // Get permissions for the role
    const rolePerms = await db
      .select({
        resource: permissions.resource,
        action: permissions.action,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, user[0].roleId));

    const permissionStrings = rolePerms.map((p) => `${p.resource}:${p.action}`);

    // Cache the result
    permissionCache.set(userId, {
      permissions: permissionStrings,
      timestamp: Date.now(),
    });

    return permissionStrings;
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    return [];
  }
}

/**
 * Get full permission context for a user
 */
export async function getUserPermissionContext(userId: string): Promise<UserPermissionContext | null> {
  try {
    const user = await db
      .select({
        userId: users.id,
        userType: users.userType,
        roleId: users.roleId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) {
      return null;
    }

    let roleName: string | null = null;
    if (user[0].roleId) {
      const role = await db
        .select({ name: roles.name })
        .from(roles)
        .where(eq(roles.id, user[0].roleId))
        .limit(1);
      roleName = role[0]?.name || null;
    }

    const permissions = await getUserPermissions(userId);

    return {
      userId: user[0].userId,
      userType: user[0].userType,
      roleId: user[0].roleId,
      roleName,
      permissions,
    };
  } catch (error) {
    console.error("Error getting user permission context:", error);
    return null;
  }
}

/**
 * Check if a user has a specific permission
 */
export async function hasPermission(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  const permissionKey = `${resource}:${action}`;
  return permissions.includes(permissionKey);
}

/**
 * Check if a user has any of the specified permissions
 */
export async function hasAnyPermission(
  userId: string,
  checks: PermissionCheck[]
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return checks.some((check) => permissions.includes(`${check.resource}:${check.action}`));
}

/**
 * Check if a user has all of the specified permissions
 */
export async function hasAllPermissions(
  userId: string,
  checks: PermissionCheck[]
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return checks.every((check) => permissions.includes(`${check.resource}:${check.action}`));
}

/**
 * Check if user is a platform admin (CTO role)
 */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  try {
    const user = await db
      .select({ userType: users.userType, roleId: users.roleId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) return false;

    // Platform admin must have userType 'platform_admin' AND role 'cto'
    if (user[0].userType !== "platform_admin") return false;

    if (user[0].roleId) {
      const role = await db
        .select({ name: roles.name })
        .from(roles)
        .where(eq(roles.id, user[0].roleId))
        .limit(1);
      return role[0]?.name === "cto";
    }

    return false;
  } catch (error) {
    console.error("Error checking platform admin:", error);
    return false;
  }
}

/**
 * Check if user is an admin (any admin role)
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const user = await db
      .select({ userType: users.userType })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) return false;

    return user[0].userType === "admin" || user[0].userType === "platform_admin";
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

/**
 * Get user's role details
 */
export async function getUserRole(userId: string): Promise<{
  id: string;
  name: string;
  displayName: string;
  userType: string;
} | null> {
  try {
    const user = await db
      .select({ roleId: users.roleId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length || !user[0].roleId) return null;

    const role = await db
      .select({
        id: roles.id,
        name: roles.name,
        displayName: roles.displayName,
        userType: roles.userType,
      })
      .from(roles)
      .where(eq(roles.id, user[0].roleId))
      .limit(1);

    return role[0] || null;
  } catch (error) {
    console.error("Error getting user role:", error);
    return null;
  }
}

/**
 * Invalidate permission cache for a user (call when role changes)
 */
export function invalidatePermissionCache(userId: string): void {
  permissionCache.delete(userId);
}

/**
 * Clear all permission cache
 */
export function clearPermissionCache(): void {
  permissionCache.clear();
}

/**
 * Get all available roles for a user type
 */
export async function getRolesForUserType(userType: string): Promise<
  Array<{
    id: string;
    name: string;
    displayName: string;
    description: string | null;
  }>
> {
  try {
    const roleList = await db
      .select({
        id: roles.id,
        name: roles.name,
        displayName: roles.displayName,
        description: roles.description,
      })
      .from(roles)
      .where(and(eq(roles.userType, userType), eq(roles.isActive, true)));

    return roleList;
  } catch (error) {
    console.error("Error getting roles for user type:", error);
    return [];
  }
}

/**
 * Get all permissions for a role
 */
export async function getRolePermissions(roleId: string): Promise<
  Array<{
    resource: string;
    action: string;
    displayName: string;
  }>
> {
  try {
    const perms = await db
      .select({
        resource: permissions.resource,
        action: permissions.action,
        displayName: permissions.displayName,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));

    return perms;
  } catch (error) {
    console.error("Error getting role permissions:", error);
    return [];
  }
}
