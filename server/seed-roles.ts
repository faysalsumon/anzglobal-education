import { db } from './db';
import { roles } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface RoleSeed {
  name: string;
  displayName: string;
  description: string;
  userType: string;
  hierarchyLevel: number;
  defaultScope: 'global' | 'region' | 'branch';
}

const ADMIN_ROLES: RoleSeed[] = [
  {
    name: 'cto',
    displayName: 'CTO',
    description: 'Chief Technology Officer — full platform access',
    userType: 'platform_admin',
    hierarchyLevel: 10,
    defaultScope: 'global',
  },
  {
    name: 'ceo',
    displayName: 'CEO',
    description: 'Chief Executive Officer — full platform access',
    userType: 'platform_admin',
    hierarchyLevel: 10,
    defaultScope: 'global',
  },
  {
    name: 'cfo',
    displayName: 'CFO',
    description: 'Chief Financial Officer — finance and operations access',
    userType: 'admin',
    hierarchyLevel: 20,
    defaultScope: 'global',
  },
  {
    name: 'accounts_officer',
    displayName: 'Accounts Officer',
    description: 'Manages financial accounts, invoices, expenses, and billing',
    userType: 'admin',
    hierarchyLevel: 40,
    defaultScope: 'global',
  },
  {
    name: 'branch_manager',
    displayName: 'Branch Manager',
    description: 'Manages a branch — team, applications, and CRM',
    userType: 'admin',
    hierarchyLevel: 30,
    defaultScope: 'branch',
  },
  {
    name: 'marketing_executive',
    displayName: 'Marketing Executive',
    description: 'Handles marketing, CMS content, and CRM leads',
    userType: 'admin',
    hierarchyLevel: 60,
    defaultScope: 'branch',
  },
  {
    name: 'senior_consultant',
    displayName: 'Senior Consultant',
    description: 'Senior admissions consultant with CRM and application access',
    userType: 'admin',
    hierarchyLevel: 50,
    defaultScope: 'branch',
  },
  {
    name: 'junior_consultant',
    displayName: 'Junior Consultant',
    description: 'Junior admissions consultant with CRM and application access',
    userType: 'admin',
    hierarchyLevel: 70,
    defaultScope: 'branch',
  },
  {
    name: 'admissions_director',
    displayName: 'Admissions Director',
    description: 'Head of Admission & Compliance — global full CRUD access across applications, CRM, institutions, and finance',
    userType: 'admin',
    hierarchyLevel: 25,
    defaultScope: 'global',
  },
];

export async function seedDefaultRoles(): Promise<void> {
  try {
    for (const roleSeed of ADMIN_ROLES) {
      const existing = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.name, roleSeed.name))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(roles).values({
          name: roleSeed.name,
          displayName: roleSeed.displayName,
          description: roleSeed.description,
          userType: roleSeed.userType,
          hierarchyLevel: roleSeed.hierarchyLevel,
          defaultScope: roleSeed.defaultScope,
          isActive: true,
        });
        console.log(`[SeedRoles] Inserted role: ${roleSeed.name}`);
      }
    }
    console.log('[SeedRoles] Role seeding complete');
  } catch (error) {
    console.error('[SeedRoles] Error seeding roles:', error);
  }
}
