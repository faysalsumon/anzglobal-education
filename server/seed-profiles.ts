import { db } from './db';
import { profiles, profilePermissions } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const MODULES = ['leads', 'applications', 'courses', 'institutions', 'users', 'reports', 'tasks'];

interface ProfileSeed {
  name: string;
  displayName: string;
  description: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

const SYSTEM_PROFILES: ProfileSeed[] = [
  {
    name: 'full_access',
    displayName: 'Full Access',
    description: 'Complete CRUD access to all modules',
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  },
  {
    name: 'standard',
    displayName: 'Standard',
    description: 'Create, read, and update access — no delete',
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: false,
  },
  {
    name: 'data_entry',
    displayName: 'Data Entry',
    description: 'Create and read access for data entry work',
    canCreate: true,
    canRead: true,
    canUpdate: false,
    canDelete: false,
  },
  {
    name: 'read_only',
    displayName: 'Read Only',
    description: 'View-only access to all modules',
    canCreate: false,
    canRead: true,
    canUpdate: false,
    canDelete: false,
  },
];

export async function seedDefaultProfiles(): Promise<void> {
  try {
    for (const seed of SYSTEM_PROFILES) {
      const existing = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.name, seed.name))
        .limit(1);

      let profileId: string;

      if (existing.length === 0) {
        const [inserted] = await db
          .insert(profiles)
          .values({
            name: seed.name,
            displayName: seed.displayName,
            description: seed.description,
            isSystemProfile: true,
            isActive: true,
          })
          .returning({ id: profiles.id });
        profileId = inserted.id;
        console.log(`[SeedProfiles] Inserted profile: ${seed.name}`);
      } else {
        profileId = existing[0].id;
      }

      for (const module of MODULES) {
        const existingPerm = await db
          .select({ id: profilePermissions.id })
          .from(profilePermissions)
          .where(
            and(
              eq(profilePermissions.profileId, profileId),
              eq(profilePermissions.module, module)
            )
          )
          .limit(1);

        if (existingPerm.length === 0) {
          await db.insert(profilePermissions).values({
            profileId,
            module,
            canCreate: seed.canCreate,
            canRead: seed.canRead,
            canUpdate: seed.canUpdate,
            canDelete: seed.canDelete,
          });
        }
      }
    }
    console.log('[SeedProfiles] Profile seeding complete');
  } catch (error) {
    console.error('[SeedProfiles] Error seeding profiles:', error);
  }
}
