import { db } from './db';
import { invitations, roles, users, type Invitation, type InvitationWithDetails, type Role } from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';
import { sendTeamInvitationEmail } from './email-service';

const INVITATION_EXPIRY_DAYS = 7;

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface CreateInvitationData {
  email: string;
  roleId: string;
  userType: 'platform_admin' | 'admin';
  invitedById: string;
  note?: string;
}

export interface InvitationResult {
  success: boolean;
  invitation?: InvitationWithDetails;
  token?: string;
  error?: string;
}

export async function createInvitation(data: CreateInvitationData): Promise<InvitationResult> {
  try {
    const existingUser = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    if (existingUser.length > 0) {
      return { success: false, error: 'A user with this email already exists' };
    }

    const pendingInvitation = await db.select()
      .from(invitations)
      .where(and(
        eq(invitations.email, data.email),
        eq(invitations.status, 'pending')
      ))
      .limit(1);
    
    if (pendingInvitation.length > 0) {
      return { success: false, error: 'A pending invitation already exists for this email' };
    }

    const role = await db.select().from(roles).where(eq(roles.id, data.roleId)).limit(1);
    if (role.length === 0) {
      return { success: false, error: 'Invalid role selected' };
    }

    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    const [newInvitation] = await db.insert(invitations).values({
      email: data.email,
      roleId: data.roleId,
      userType: data.userType,
      tokenHash,
      invitedById: data.invitedById,
      expiresAt,
      note: data.note,
    }).returning();

    const inviter = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
    }).from(users).where(eq(users.id, data.invitedById)).limit(1);

    const inviterName = inviter[0]?.firstName && inviter[0]?.lastName 
      ? `${inviter[0].firstName} ${inviter[0].lastName}`
      : inviter[0]?.email || 'ANZ Global Education';

    console.log(`[Invitation] Sending email to ${data.email} for role ${role[0].displayName}`);
    
    const emailSent = await sendTeamInvitationEmail({
      email: data.email,
      inviterName,
      roleName: role[0].displayName,
      inviteToken: token,
      expiresAt,
      note: data.note,
    });
    
    console.log(`[Invitation] Email sent: ${emailSent}`);

    const invitationWithDetails: InvitationWithDetails = {
      ...newInvitation,
      role: role[0],
      invitedBy: inviter[0] || undefined,
    };

    return { success: true, invitation: invitationWithDetails, token };
  } catch (error: any) {
    console.error('Error creating invitation:', error);
    return { success: false, error: error.message || 'Failed to create invitation' };
  }
}

export async function getInvitations(): Promise<InvitationWithDetails[]> {
  const results = await db
    .select({
      invitation: invitations,
      role: roles,
      inviter: {
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      },
    })
    .from(invitations)
    .leftJoin(roles, eq(invitations.roleId, roles.id))
    .leftJoin(users, eq(invitations.invitedById, users.id))
    .orderBy(desc(invitations.createdAt));

  return results.map(r => ({
    ...r.invitation,
    role: r.role || undefined,
    invitedBy: r.inviter || undefined,
  }));
}

export async function getInvitationByToken(token: string): Promise<InvitationWithDetails | null> {
  const tokenHash = hashToken(token);
  
  const results = await db
    .select({
      invitation: invitations,
      role: roles,
    })
    .from(invitations)
    .leftJoin(roles, eq(invitations.roleId, roles.id))
    .where(eq(invitations.tokenHash, tokenHash))
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  const invitation = results[0];
  return {
    ...invitation.invitation,
    role: invitation.role || undefined,
  };
}

export async function validateInvitationToken(token: string): Promise<{ valid: boolean; invitation?: InvitationWithDetails; error?: string }> {
  const invitation = await getInvitationByToken(token);
  
  if (!invitation) {
    return { valid: false, error: 'Invalid invitation token' };
  }

  if (invitation.status !== 'pending') {
    return { valid: false, error: `This invitation has already been ${invitation.status}` };
  }

  if (new Date() > new Date(invitation.expiresAt)) {
    await db.update(invitations)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(eq(invitations.id, invitation.id));
    return { valid: false, error: 'This invitation has expired' };
  }

  return { valid: true, invitation };
}

export async function acceptInvitation(token: string): Promise<{ success: boolean; invitation?: Invitation; error?: string }> {
  const validation = await validateInvitationToken(token);
  
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const [updated] = await db.update(invitations)
    .set({ 
      status: 'accepted',
      acceptedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(invitations.id, validation.invitation!.id))
    .returning();

  return { success: true, invitation: updated };
}

export async function revokeInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const [invitation] = await db.select().from(invitations).where(eq(invitations.id, invitationId)).limit(1);
    
    if (!invitation) {
      return { success: false, error: 'Invitation not found' };
    }

    if (invitation.status !== 'pending') {
      return { success: false, error: `Cannot revoke an invitation that is ${invitation.status}` };
    }

    await db.update(invitations)
      .set({ 
        status: 'revoked',
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(invitations.id, invitationId));

    return { success: true };
  } catch (error: any) {
    console.error('Error revoking invitation:', error);
    return { success: false, error: error.message || 'Failed to revoke invitation' };
  }
}

export async function resendInvitation(invitationId: string, inviterId: string): Promise<InvitationResult> {
  try {
    const results = await db
      .select({
        invitation: invitations,
        role: roles,
      })
      .from(invitations)
      .leftJoin(roles, eq(invitations.roleId, roles.id))
      .where(eq(invitations.id, invitationId))
      .limit(1);

    if (results.length === 0) {
      return { success: false, error: 'Invitation not found' };
    }

    const invitation = results[0].invitation;
    const role = results[0].role;

    if (invitation.status !== 'pending') {
      return { success: false, error: `Cannot resend an invitation that is ${invitation.status}` };
    }

    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    const [updated] = await db.update(invitations)
      .set({ 
        tokenHash,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(invitations.id, invitationId))
      .returning();

    const inviter = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
    }).from(users).where(eq(users.id, inviterId)).limit(1);

    const inviterName = inviter[0]?.firstName && inviter[0]?.lastName 
      ? `${inviter[0].firstName} ${inviter[0].lastName}`
      : inviter[0]?.email || 'ANZ Global Education';

    await sendTeamInvitationEmail({
      email: invitation.email,
      inviterName,
      roleName: role?.displayName || 'Team Member',
      inviteToken: token,
      expiresAt,
      note: invitation.note || undefined,
    });

    return { 
      success: true, 
      invitation: { ...updated, role: role || undefined },
      token 
    };
  } catch (error: any) {
    console.error('Error resending invitation:', error);
    return { success: false, error: error.message || 'Failed to resend invitation' };
  }
}

export async function getAdminRoles(): Promise<Role[]> {
  return db.select()
    .from(roles)
    .where(and(
      eq(roles.isActive, true),
      sql`${roles.userType} IN ('platform_admin', 'admin')`
    ))
    .orderBy(roles.displayName);
}
