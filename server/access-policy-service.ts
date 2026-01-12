import { db } from "./db";
import { users, roles, profiles, profilePermissions, branches, regions } from "@shared/schema";
import { eq, and, inArray, or, SQL } from "drizzle-orm";

export type RoleScope = 'global' | 'region' | 'branch' | 'self';
export type CrudAction = 'create' | 'read' | 'update' | 'delete';

export interface UserAccessContext {
  userId: string;
  userType: string;
  roleId: string | null;
  roleName: string | null;
  hierarchyLevel: number;
  defaultScope: RoleScope;
  profileId: string | null;
  profileName: string | null;
  regionId: string | null;
  branchId: string | null;
  allowedBranchIds: string[];
}

export interface ModulePermissions {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

const accessContextCache = new Map<string, { context: UserAccessContext; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function getUserAccessContext(userId: string): Promise<UserAccessContext | null> {
  const cached = accessContextCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.context;
  }

  try {
    const [user] = await db
      .select({
        id: users.id,
        userType: users.userType,
        roleId: users.roleId,
        profileId: users.profileId,
        regionId: users.regionId,
        branchId: users.branchId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return null;

    let roleName: string | null = null;
    let hierarchyLevel = 100;
    let defaultScope: RoleScope = 'self';

    if (user.roleId) {
      const [role] = await db
        .select({
          name: roles.name,
          hierarchyLevel: roles.hierarchyLevel,
          defaultScope: roles.defaultScope,
        })
        .from(roles)
        .where(eq(roles.id, user.roleId))
        .limit(1);

      if (role) {
        roleName = role.name;
        hierarchyLevel = role.hierarchyLevel ?? 100;
        defaultScope = (role.defaultScope as RoleScope) ?? 'self';
      }
    }

    let profileName: string | null = null;
    if (user.profileId) {
      const [profile] = await db
        .select({ name: profiles.name })
        .from(profiles)
        .where(eq(profiles.id, user.profileId))
        .limit(1);
      profileName = profile?.name ?? null;
    }

    let allowedBranchIds: string[] = [];
    if (defaultScope === 'global') {
      const allBranches = await db.select({ id: branches.id }).from(branches);
      allowedBranchIds = allBranches.map(b => b.id);
    } else if (defaultScope === 'region' && user.regionId) {
      const regionBranches = await db
        .select({ id: branches.id })
        .from(branches)
        .where(eq(branches.regionId, user.regionId));
      allowedBranchIds = regionBranches.map(b => b.id);
    } else if (defaultScope === 'branch' && user.branchId) {
      allowedBranchIds = [user.branchId];
    }

    const context: UserAccessContext = {
      userId: user.id,
      userType: user.userType,
      roleId: user.roleId,
      roleName,
      hierarchyLevel,
      defaultScope,
      profileId: user.profileId,
      profileName,
      regionId: user.regionId,
      branchId: user.branchId,
      allowedBranchIds,
    };

    accessContextCache.set(userId, { context, timestamp: Date.now() });
    return context;
  } catch (error) {
    console.error("Error getting user access context:", error);
    return null;
  }
}

export async function getModulePermissions(
  userId: string,
  module: string
): Promise<ModulePermissions> {
  const defaultPerms: ModulePermissions = {
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  };

  try {
    const [user] = await db
      .select({ profileId: users.profileId, userType: users.userType })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return defaultPerms;

    if (user.userType === 'platform_admin') {
      return { canCreate: true, canRead: true, canUpdate: true, canDelete: true };
    }

    if (!user.profileId) {
      return { canCreate: false, canRead: true, canUpdate: false, canDelete: false };
    }

    const [perm] = await db
      .select({
        canCreate: profilePermissions.canCreate,
        canRead: profilePermissions.canRead,
        canUpdate: profilePermissions.canUpdate,
        canDelete: profilePermissions.canDelete,
      })
      .from(profilePermissions)
      .where(
        and(
          eq(profilePermissions.profileId, user.profileId),
          eq(profilePermissions.module, module)
        )
      )
      .limit(1);

    if (!perm) return defaultPerms;

    return {
      canCreate: perm.canCreate ?? false,
      canRead: perm.canRead ?? false,
      canUpdate: perm.canUpdate ?? false,
      canDelete: perm.canDelete ?? false,
    };
  } catch (error) {
    console.error("Error getting module permissions:", error);
    return defaultPerms;
  }
}

export async function checkCrudPermission(
  userId: string,
  module: string,
  action: CrudAction
): Promise<boolean> {
  const perms = await getModulePermissions(userId, module);
  
  switch (action) {
    case 'create':
      return perms.canCreate;
    case 'read':
      return perms.canRead;
    case 'update':
      return perms.canUpdate;
    case 'delete':
      return perms.canDelete;
    default:
      return false;
  }
}

export async function canViewRecord(
  viewerContext: UserAccessContext,
  ownerUserId: string | null,
  recordBranchId: string | null
): Promise<boolean> {
  if (viewerContext.defaultScope === 'global') {
    return true;
  }

  if (viewerContext.defaultScope === 'region') {
    if (!recordBranchId) return true;
    return viewerContext.allowedBranchIds.includes(recordBranchId);
  }

  if (viewerContext.defaultScope === 'branch') {
    if (!recordBranchId) return true;
    return viewerContext.allowedBranchIds.includes(recordBranchId);
  }

  if (viewerContext.defaultScope === 'self') {
    return ownerUserId === viewerContext.userId;
  }

  return false;
}

export async function canEditRecord(
  viewerContext: UserAccessContext,
  ownerUserId: string | null,
  ownerHierarchyLevel: number | null
): Promise<boolean> {
  if (!await canViewRecord(viewerContext, ownerUserId, null)) {
    return false;
  }

  if (viewerContext.defaultScope === 'global') {
    return true;
  }

  if (ownerUserId === viewerContext.userId) {
    return true;
  }

  if (ownerHierarchyLevel !== null) {
    if (viewerContext.hierarchyLevel < ownerHierarchyLevel) {
      return true;
    }
    if (viewerContext.hierarchyLevel === ownerHierarchyLevel) {
      return false;
    }
  }

  return false;
}

export function invalidateAccessContextCache(userId: string): void {
  accessContextCache.delete(userId);
}

export function clearAccessContextCache(): void {
  accessContextCache.clear();
}

export interface ScopedFilterOptions {
  branchIdColumn?: any;
  assignedToColumn?: any;
  createdByColumn?: any;
}

export function buildScopedFilter(
  context: UserAccessContext,
  options: ScopedFilterOptions
): SQL | null {
  if (context.defaultScope === 'global') {
    return null;
  }

  const conditions: SQL[] = [];

  if (context.defaultScope === 'self') {
    if (options.assignedToColumn) {
      conditions.push(eq(options.assignedToColumn, context.userId));
    }
    if (options.createdByColumn) {
      conditions.push(eq(options.createdByColumn, context.userId));
    }
    if (conditions.length === 0 && options.branchIdColumn) {
      return eq(options.branchIdColumn, context.branchId ?? '');
    }
    return conditions.length > 0 ? or(...conditions) ?? null : null;
  }

  if ((context.defaultScope === 'region' || context.defaultScope === 'branch') && options.branchIdColumn) {
    if (context.allowedBranchIds.length === 0) {
      return eq(options.branchIdColumn, '');
    }
    return inArray(options.branchIdColumn, context.allowedBranchIds);
  }

  return null;
}

export async function getAllProfiles(): Promise<Array<{
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isSystemProfile: boolean | null;
  isActive: boolean | null;
}>> {
  try {
    return await db
      .select({
        id: profiles.id,
        name: profiles.name,
        displayName: profiles.displayName,
        description: profiles.description,
        isSystemProfile: profiles.isSystemProfile,
        isActive: profiles.isActive,
      })
      .from(profiles)
      .where(eq(profiles.isActive, true));
  } catch (error) {
    console.error("Error getting profiles:", error);
    return [];
  }
}

export async function getProfileWithPermissions(profileId: string): Promise<{
  profile: {
    id: string;
    name: string;
    displayName: string;
    description: string | null;
  } | null;
  permissions: Array<{
    module: string;
    canCreate: boolean | null;
    canRead: boolean | null;
    canUpdate: boolean | null;
    canDelete: boolean | null;
  }>;
}> {
  try {
    const [profile] = await db
      .select({
        id: profiles.id,
        name: profiles.name,
        displayName: profiles.displayName,
        description: profiles.description,
      })
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1);

    if (!profile) {
      return { profile: null, permissions: [] };
    }

    const perms = await db
      .select({
        module: profilePermissions.module,
        canCreate: profilePermissions.canCreate,
        canRead: profilePermissions.canRead,
        canUpdate: profilePermissions.canUpdate,
        canDelete: profilePermissions.canDelete,
      })
      .from(profilePermissions)
      .where(eq(profilePermissions.profileId, profileId));

    return { profile, permissions: perms };
  } catch (error) {
    console.error("Error getting profile with permissions:", error);
    return { profile: null, permissions: [] };
  }
}

export async function getBranchesForRegion(regionId: string): Promise<Array<{
  id: string;
  name: string;
  code: string | null;
}>> {
  try {
    return await db
      .select({
        id: branches.id,
        name: branches.name,
        code: branches.code,
      })
      .from(branches)
      .where(eq(branches.regionId, regionId));
  } catch (error) {
    console.error("Error getting branches for region:", error);
    return [];
  }
}

export async function getAllRegions(): Promise<Array<{
  id: string;
  name: string;
  code: string;
}>> {
  try {
    return await db
      .select({
        id: regions.id,
        name: regions.name,
        code: regions.code,
      })
      .from(regions);
  } catch (error) {
    console.error("Error getting regions:", error);
    return [];
  }
}
