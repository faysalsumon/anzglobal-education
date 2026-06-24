import { Router, Request, Response } from 'express';
import { supabase, supabaseAdmin, isSupabaseConfigured } from './supabase';
import { storage } from './storage';
import { db } from './db';
import { users, roles, branches, regions, studentProfiles, referrals } from '@shared/schema';
import type { User } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { sendWelcomeEmail, sendReferralRegistrationConfirmation, sendNewSignupAdminNotification } from './email-service';
import { getRegionContext } from './middleware/region-detection';
import crypto from 'crypto';
import { createCrmContactForUser } from './crm-routes';
import { getClientIp, replyTooManyRequests } from './middleware/rate-limit';
import { signinLimiter, forgotPasswordLimiter, verifyTotpLimiter, resendVerificationLimiter, checkEmailLimiter } from './middleware/rate-limit-instances';
import { logSecurityEvent, isSafeRedirect, safeRedirectUrl } from './middleware/bot-protection';

const router = Router();

function getSiteUrl(): string {
  if (process.env.SITE_URL) {
    return process.env.SITE_URL.replace(/\/$/, '');
  }
  if (process.env.REPLIT_DOMAINS) {
    const primaryDomain = process.env.REPLIT_DOMAINS.split(',')[0];
    if (primaryDomain) return `https://${primaryDomain}`;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return 'http://localhost:5000';
}

interface SignUpBody {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  userType: 'student' | 'platform_admin';
}

interface SignInBody {
  email: string;
  password: string;
}

router.post('/signup', async (req: Request, res: Response) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase is not configured' });
    }

    const { email, password, firstName, lastName, userType, branchId, entrySource } = req.body as SignUpBody & { branchId?: string; entrySource?: string };

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!userType || !['student'].includes(userType)) {
      return res.status(400).json({ error: 'Valid userType is required (student). Platform admin accounts require manual approval.' });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          user_type: userType,
          branch_id: branchId,
          entry_source: entrySource,
        }
      }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (data.user) {
      const existingUser = await storage.getUserByEmail(email);
      
      if (!existingUser) {
        const newUser = await storage.createUser({
          email,
          firstName: firstName || null,
          lastName: lastName || null,
          userType,
          emailVerified: data.user.email_confirmed_at ? true : false,
          isActive: true,
          approvalStatus: userType === 'platform_admin' ? 'pending' : null,
          role: userType === 'platform_admin' ? null : 'user',
        });
        
        // Auto-sync to CRM contacts for students
        if (newUser && userType === 'student') {
          await createCrmContactForUser({
            id: newUser.id,
            email: newUser.email!,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            userType: newUser.userType,
            entrySource: entrySource || null,
            branchId: branchId || null,
          });
        }
      }
    }

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      user: data.user,
      session: data.session,
    });
  } catch (err) {
    console.error('[Supabase Auth] Signup error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/signin', async (req: Request, res: Response) => {
  try {
    const rl = signinLimiter(getClientIp(req));
    if (!rl.allowed) return replyTooManyRequests(res, rl, 'Too many login attempts');

    if (!supabase) {
      return res.status(503).json({ error: 'Supabase is not configured' });
    }

    const { email, password } = req.body as SignInBody;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logSecurityEvent('LOGIN_FAILED', req, { reason: error.message.substring(0, 60) });
      return res.status(401).json({ error: error.message });
    }

    let platformUser = await storage.getUserByEmail(email);
    
    if (!platformUser && data.user) {
      const metadata = data.user.user_metadata;
      const userType = metadata?.user_type === 'student' ? 'student' : 'student';
      platformUser = await storage.createUser({
        email,
        firstName: metadata?.first_name || null,
        lastName: metadata?.last_name || null,
        userType,
        emailVerified: true,
        isActive: true,
      });
      
      // Auto-sync to CRM contacts for students
      if (platformUser && userType === 'student') {
        await createCrmContactForUser({
          id: platformUser.id,
          email: platformUser.email!,
          firstName: platformUser.firstName,
          lastName: platformUser.lastName,
          userType: platformUser.userType,
          entrySource: metadata?.entry_source || null,
          branchId: metadata?.branch_id || null,
        });
      }
    }

    if (platformUser) {
      // Block institution_admin users - portal has been removed
      if (platformUser.userType === 'institution_admin' || platformUser.userType === 'university') {
        await supabase.auth.signOut();
        return res.status(403).json({ error: 'Institution portal access has been removed. Please contact ANZ Global Education.' });
      }
      // Check if temp password has expired (24 hours)
      if (platformUser.requiresPasswordReset && platformUser.tempPasswordIssuedAt) {
        const tempPasswordAge = Date.now() - new Date(platformUser.tempPasswordIssuedAt).getTime();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        if (tempPasswordAge > twentyFourHours) {
          // Sign out user and reject
          await supabase.auth.signOut();
          return res.status(401).json({ 
            error: 'Your temporary password has expired. Please contact an administrator to issue a new one.',
            code: 'TEMP_PASSWORD_EXPIRED'
          });
        }
      }

      await storage.updateUser(platformUser.id, { lastLogin: new Date() });
    }

    res.json({
      message: 'Login successful',
      user: {
        ...data.user,
        platformUser: platformUser ? {
          id: platformUser.id,
          email: platformUser.email,
          firstName: platformUser.firstName,
          lastName: platformUser.lastName,
          userType: platformUser.userType,
          role: platformUser.role,
          profileImageUrl: platformUser.profileImageUrl,
          requiresPasswordReset: platformUser.requiresPasswordReset || false,
        } : null,
      },
      session: data.session,
      requiresPasswordReset: platformUser?.requiresPasswordReset || false,
    });
  } catch (err) {
    console.error('[Supabase Auth] Signin error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/signout', async (req: Request, res: Response) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase is not configured' });
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Signed out successfully' });
  } catch (err) {
    console.error('[Supabase Auth] Signout error:', err);
    res.status(500).json({ error: 'Sign out failed' });
  }
});

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const rl = forgotPasswordLimiter(getClientIp(req));
    if (!rl.allowed) return replyTooManyRequests(res, rl, 'Too many password reset requests');

    if (!supabase) {
      return res.status(503).json({ error: 'Supabase is not configured' });
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Use the Origin header from the request so the reset link in the email
    // always points to the domain the user is actually on (e.g. anzglobal.com.au
    // or anzglobal.com.bd), rather than the static server-side URL which may
    // resolve to the Replit dev preview domain.
    //
    // SECURITY: validate the Origin/Referer against the redirect allowlist before
    // embedding it in the Supabase redirectTo URL.  An attacker who forges
    // Origin: https://evil.com would otherwise receive a password-reset email
    // whose link points to their phishing page.
    const rawOrigin =
      req.headers.origin ||
      req.headers.referer?.replace(/\/$/, '').split('/').slice(0, 3).join('/');
    const safeOrigin = rawOrigin && isSafeRedirect(rawOrigin, req) ? rawOrigin : null;
    if (rawOrigin && !safeOrigin) {
      logSecurityEvent('OPEN_REDIRECT_BLOCKED', req, { origin: rawOrigin.substring(0, 80) });
    }
    const baseUrl = safeOrigin || getSiteUrl();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/reset-password`,
    });

    if (error) {
      logSecurityEvent('PASSWORD_RESET_FAILED', req, { reason: error.message.substring(0, 60) });
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Password reset email sent. Please check your inbox.' });
  } catch (err) {
    console.error('[Supabase Auth] Forgot password error:', err);
    res.status(500).json({ error: 'Failed to send password reset email' });
  }
});

// Resend verification email for unverified users
router.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const rl = resendVerificationLimiter(getClientIp(req));
    if (!rl.allowed) return replyTooManyRequests(res, rl, 'Too many verification email requests');

    if (!supabase) {
      return res.status(503).json({ error: 'Supabase is not configured' });
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Use Supabase's resend confirmation email feature
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      // Handle case where user doesn't exist or is already verified
      if (error.message.includes('already confirmed')) {
        return res.status(400).json({ 
          error: 'Email already verified',
          code: 'EMAIL_ALREADY_VERIFIED',
          suggestion: 'You can sign in with your email and password.'
        });
      }
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Verification email sent. Please check your inbox.' });
  } catch (err) {
    console.error('[Supabase Auth] Resend verification error:', err);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// Check if email exists (for better UX on signup)
router.post('/check-email', async (req: Request, res: Response) => {
  try {
    const rl = checkEmailLimiter(getClientIp(req));
    if (!rl.allowed) return replyTooManyRequests(res, rl, 'Too many email check requests');

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check local database first
    const existingUser = await storage.getUserByEmail(email);
    
    if (existingUser) {
      return res.json({ 
        exists: true, 
        verified: existingUser.emailVerified || false,
        message: existingUser.emailVerified 
          ? 'This email is already registered. Please sign in or reset your password.'
          : 'This email is registered but not verified. Please check your inbox or resend verification.'
      });
    }

    res.json({ exists: false });
  } catch (err) {
    console.error('[Supabase Auth] Check email error:', err);
    res.status(500).json({ error: 'Failed to check email' });
  }
});

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const rl = forgotPasswordLimiter(getClientIp(req));
    if (!rl.allowed) return replyTooManyRequests(res, rl, 'Too many password reset requests');

    if (!supabase) {
      return res.status(503).json({ error: 'Supabase is not configured' });
    }

    const { accessToken, newPassword } = req.body;

    if (!accessToken || !newPassword) {
      return res.status(400).json({ error: 'Access token and new password are required' });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('[Supabase Auth] Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Change password (authenticated user, requires current password verification)
router.post('/change-password', async (req: Request, res: Response) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase is not configured' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Validate the token and get the user making the request
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Verify the user exists in our platform database (prevents arbitrary Supabase users)
    const platformUser = await storage.getUserByEmail(user.email!);
    if (!platformUser) {
      return res.status(403).json({ error: 'User not found in platform' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Verify current password by attempting to sign in with a fresh ephemeral client
    // Creates a new client instance per request with no persistence to ensure no session reuse
    const { createClient } = await import('@supabase/supabase-js');
    const verificationClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,  // Disable session persistence
          autoRefreshToken: false, // Disable auto refresh
          detectSessionInUrl: false, // Disable URL detection
        }
      }
    );
    
    const { data: signInData, error: signInError } = await verificationClient.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    // Immediately sign out to cleanup any session state
    if (signInData?.session) {
      await verificationClient.auth.signOut();
    }

    if (signInError) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Additional security: verify the signed-in user matches the token user
    if (signInData?.user?.id !== user.id) {
      console.error('[Change Password] User ID mismatch detected');
      return res.status(403).json({ error: 'Security verification failed' });
    }

    // Update the password using admin API with explicit user ID
    // This ensures we're updating the exact user whose token we validated
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    // Send confirmation email
    const { sendPasswordChangedEmail } = await import('./email-service');
    await sendPasswordChangedEmail({
      email: user.email!,
      firstName: platformUser.firstName,
    });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('[Supabase Auth] Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

router.get('/user', async (req: Request, res: Response) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase is not configured' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const platformUser = await storage.getUserByEmail(user.email!);
    
    if (!platformUser) {
      return res.status(404).json({ error: 'User not found in platform database' });
    }

    // Return platform user data directly (expected format by useAuth hook and admin-login)
    // Determine adminRole — priority: legacy adminMember > RBAC roleId > legacy user.role (non-default)
    let adminRole: string | null = null;

    // 1. Check legacy admin_team_members table for both admin and platform_admin users
    if (platformUser.userType === 'platform_admin' || platformUser.userType === 'admin') {
      const adminMember = await storage.getAdminTeamMemberByUserId(platformUser.id);
      if (adminMember?.role) {
        adminRole = adminMember.role;
      }
    }

    // Get role name if roleId exists (RBAC system)
    let roleName: string | null = null;
    if (platformUser.roleId) {
      const [role] = await db.select().from(roles).where(eq(roles.id, platformUser.roleId)).limit(1);
      roleName = role?.displayName || role?.name || null;
      // 2. If no adminRole from legacy system, use the RBAC role's internal name
      if (!adminRole && role?.name) {
        adminRole = role.name;
      }
    }

    // 3. Final fallback: legacy user.role column — but only if it's an actual admin role (not "user")
    if (!adminRole && platformUser.role && platformUser.role !== 'user') {
      adminRole = platformUser.role;
    }

    // Get region name if regionId exists
    let regionName = null;
    let regionCode = null;
    if (platformUser.regionId) {
      const [region] = await db.select().from(regions).where(eq(regions.id, platformUser.regionId)).limit(1);
      regionName = region?.name || null;
      regionCode = region?.code || null;
    }

    // Get branch name if branchId exists
    let branchName = null;
    if (platformUser.branchId) {
      const [branch] = await db.select().from(branches).where(eq(branches.id, platformUser.branchId)).limit(1);
      branchName = branch?.name || null;
    }

    // Get role's default scope for region-based access control
    let defaultScope = null;
    if (platformUser.roleId) {
      const [roleData] = await db.select({ defaultScope: roles.defaultScope }).from(roles).where(eq(roles.id, platformUser.roleId)).limit(1);
      defaultScope = roleData?.defaultScope || null;
    }

    res.json({
      id: platformUser.id,
      email: platformUser.email,
      firstName: platformUser.firstName,
      lastName: platformUser.lastName,
      phone: platformUser.phone,
      userType: platformUser.userType,
      role: platformUser.role,
      roleId: platformUser.roleId,
      roleName: roleName,
      regionId: platformUser.regionId,
      regionName: regionName,
      regionCode: regionCode,
      branchId: platformUser.branchId,
      branchName: branchName,
      defaultScope: defaultScope,
      adminRole: adminRole,
      profileImageUrl: platformUser.profileImageUrl,
      isActive: platformUser.isActive,
      emailVerified: platformUser.emailVerified,
      approvalStatus: platformUser.approvalStatus,
      requiresPasswordReset: platformUser.requiresPasswordReset || false,
      createdAt: platformUser.createdAt,
      updatedAt: platformUser.updatedAt,
    });
  } catch (err) {
    console.error('[Supabase Auth] Get user error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase is not configured' });
    }

    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    res.json({
      session: data.session,
      user: data.user,
    });
  } catch (err) {
    console.error('[Supabase Auth] Refresh error:', err);
    res.status(500).json({ error: 'Failed to refresh session' });
  }
});

router.post('/enroll-totp', async (req: Request, res: Response) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase is not configured' });
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'ANZ Global Education Authenticator',
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    });
  } catch (err) {
    console.error('[Supabase Auth] Enroll TOTP error:', err);
    res.status(500).json({ error: 'Failed to enroll TOTP' });
  }
});

router.post('/verify-totp', async (req: Request, res: Response) => {
  try {
    const rl = verifyTotpLimiter(getClientIp(req));
    if (!rl.allowed) return replyTooManyRequests(res, rl, 'Too many verification attempts');

    if (!supabase) {
      return res.status(503).json({ error: 'Supabase is not configured' });
    }

    const { factorId, code } = req.body;

    if (!factorId || !code) {
      return res.status(400).json({ error: 'Factor ID and code are required' });
    }

    const { data, error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: 'TOTP verified successfully',
      ...data,
    });
  } catch (err) {
    console.error('[Supabase Auth] Verify TOTP error:', err);
    res.status(500).json({ error: 'Failed to verify TOTP' });
  }
});

router.post('/unenroll-totp', async (req: Request, res: Response) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase is not configured' });
    }

    const { factorId } = req.body;

    if (!factorId) {
      return res.status(400).json({ error: 'Factor ID is required' });
    }

    const { error } = await supabase.auth.mfa.unenroll({ factorId });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'TOTP unenrolled successfully' });
  } catch (err) {
    console.error('[Supabase Auth] Unenroll TOTP error:', err);
    res.status(500).json({ error: 'Failed to unenroll TOTP' });
  }
});

router.get('/mfa-factors', async (req: Request, res: Response) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase is not configured' });
    }

    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ factors: data });
  } catch (err) {
    console.error('[Supabase Auth] List MFA factors error:', err);
    res.status(500).json({ error: 'Failed to list MFA factors' });
  }
});

router.get('/oauth/:provider', async (req: Request, res: Response) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase is not configured' });
    }

    const { provider } = req.params;
    const validProviders = ['google', 'github', 'facebook', 'apple', 'twitter', 'linkedin'];

    if (!validProviders.includes(provider)) {
      return res.status(400).json({ error: 'Invalid OAuth provider' });
    }

    const redirectTo = safeRedirectUrl(`${getSiteUrl()}/auth/callback`, '/auth/callback', req);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo,
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ url: data.url });
  } catch (err) {
    console.error('[Supabase Auth] OAuth error:', err);
    res.status(500).json({ error: 'OAuth initialization failed' });
  }
});

// Sync user from Supabase to local database (called after email confirmation)
router.post('/sync-user', async (req: Request, res: Response) => {
  try {
    const { supabaseId, email, firstName, lastName, userType, emailVerified, profileImageUrl, referralCode, branchId, entrySource } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // SECURITY: Only allow students via OAuth sync
    // platform_admin can only be created through the proper signup flow with approval
    // This prevents privilege escalation via localStorage manipulation
    const safeUserType = userType === 'student' ? 'student' : 'student';

    // Check if user already exists in local database
    const existingUser = await storage.getUserByEmail(email);

    if (existingUser) {
      // Update existing user's verification status and profile image if not set
      // SECURITY: Never change userType for existing users via sync
      const updateData: any = {};
      if (emailVerified && !existingUser.emailVerified) {
        updateData.emailVerified = true;
      }
      // Sync profile image from OAuth if user doesn't have one
      if (profileImageUrl && !existingUser.profileImageUrl) {
        updateData.profileImageUrl = profileImageUrl;
      }
      if (Object.keys(updateData).length > 0) {
        await storage.updateUser(existingUser.id, updateData);
      }
      
      // IMPORTANT: Ensure student profile exists for student users
      // This handles the case where user exists but profile was never created
      if (existingUser.userType === 'student') {
        let existingProfile = await storage.getStudentProfileByUserId(existingUser.id);
        
        if (!existingProfile) {
          try {
            const newReferralCode = await storage.generateReferralCode();
            existingProfile = await storage.createStudentProfile({
              userId: existingUser.id,
              firstName: existingUser.firstName || firstName || null,
              lastName: existingUser.lastName || lastName || null,
              referralCode: newReferralCode,
            });
            console.log(`[Supabase Auth] Created missing student profile for existing user ${email}`);
            
            // Send welcome email (they never got one since profile wasn't created)
            sendWelcomeEmail({
              email,
              firstName: existingUser.firstName || firstName || 'there',
              userType: 'student',
            }).catch(err => console.error('[Email] Failed to send welcome email for existing user:', err));
            
            // Check for any pending invitations by email
            if (existingProfile) {
              const updatedInvitation = await storage.markInvitationAsRegistered(email, existingProfile.id);
              if (updatedInvitation) {
                console.log(`[Referral] Auto-matched invitation for existing user ${email}`);
                
                // Send confirmation email to the original referrer
                const referrerProfile = await storage.getStudentProfileById(updatedInvitation.referrerId);
                if (referrerProfile) {
                  const referrerUser = await storage.getUser(referrerProfile.userId);
                  if (referrerUser?.email) {
                    const referredName = existingUser.firstName || firstName || existingProfile.firstName || 'A friend';
                    sendReferralRegistrationConfirmation({
                      referrerEmail: referrerUser.email,
                      referrerName: referrerProfile.firstName || referrerUser.firstName || 'there',
                      inviteeName: referredName,
                      inviteeEmail: email,
                    }).catch((err: Error) => {
                      console.error(`[Referral] Error sending confirmation email:`, err);
                    });
                  }
                }
              }
            }
          } catch (profileErr) {
            console.error('[Supabase Auth] Failed to create missing student profile:', profileErr);
          }
        }
      }
      
      return res.json({ 
        message: 'User already exists', 
        user: { 
          ...existingUser, 
          emailVerified: emailVerified || existingUser.emailVerified,
          profileImageUrl: existingUser.profileImageUrl || profileImageUrl,
        },
        approvalStatus: existingUser.approvalStatus,
      });
    }

    // Create new user in local database
    // SECURITY: Only allow student via OAuth
    const newUser = await storage.createUser({
      email,
      firstName: firstName || null,
      lastName: lastName || null,
      userType: safeUserType,
      emailVerified: emailVerified || false,
      isActive: true,
      approvalStatus: null,
      role: 'user',
      profileImageUrl: profileImageUrl || null,
    });

    console.log(`[Supabase Auth] Synced user ${email} to local database`);
    
    // Auto-sync to CRM contacts for students
    if (newUser && safeUserType === 'student') {
      await createCrmContactForUser({
        id: newUser.id,
        email: newUser.email!,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        userType: newUser.userType,
        profileImageUrl: newUser.profileImageUrl,
        entrySource: entrySource || null,
        branchId: branchId || null,
      });
    }

    // Send welcome email to new students
    sendWelcomeEmail({
      email,
      firstName: firstName || 'there',
      userType: 'student',
    }).catch(err => console.error('[Email] Failed to send welcome email:', err));

    // Send admin notification about new sign-up
    const regionContext = getRegionContext(req);
    sendNewSignupAdminNotification({
      firstName: firstName || 'Unknown',
      lastName: lastName || '',
      email,
      userType: safeUserType,
      regionCode: regionContext.region?.code || undefined,
      entrySource: entrySource || undefined,
    }).catch(err => console.error('[Email] Failed to send new signup admin notification:', err));

    // ALWAYS create student profile for new student users
    if (safeUserType === 'student' && newUser) {
      try {
        // Get or create student profile for the new user
        let newStudentProfile = await storage.getStudentProfileByUserId(newUser.id);

        // If no profile exists, create one with its own referral code
        if (!newStudentProfile) {
          const newReferralCode = await storage.generateReferralCode();
          newStudentProfile = await storage.createStudentProfile({
            userId: newUser.id,
            firstName: firstName || null,
            lastName: lastName || null,
            referralCode: newReferralCode,
          });
          console.log(`[Supabase Auth] Created student profile for ${email}`);
        }

        // Handle referral code if provided
        if (referralCode && newStudentProfile) {
          // Validate the referral code and get the referrer
          const referrer = await storage.validateReferralCode(referralCode);

          if (referrer && referrer.id !== newStudentProfile.id) {
            // Check for existing referral to prevent duplicates
            const existingReferral = await db
              .select()
              .from(referrals)
              .where(eq(referrals.referredId, newStudentProfile.id))
              .limit(1)
              .then(rows => rows[0]);

            if (!existingReferral) {
              await storage.createReferral({
                referrerId: referrer.id,
                referredId: newStudentProfile.id,
                referralCode: referralCode,
                status: 'pending',
              });
              console.log(`[Referral] Created referral: ${referrer.id} -> ${newStudentProfile.id} with code ${referralCode}`);
              
              // Mark the referral invitation as registered (update status from 'invited' to 'registered')
              const updatedInvitation = await storage.markInvitationAsRegistered(email, newStudentProfile.id);
              if (updatedInvitation) {
                console.log(`[Referral] Updated invitation status to 'registered' for ${email}`);
              }
              
              // Send confirmation email to the referrer (non-blocking)
              const referrerUser = await storage.getUser(referrer.userId);
              if (referrerUser?.email) {
                const referredName = firstName || newStudentProfile.firstName || 'A friend';
                sendReferralRegistrationConfirmation({
                  referrerEmail: referrerUser.email,
                  referrerName: referrer.firstName || referrerUser.firstName || 'there',
                  inviteeName: referredName,
                  inviteeEmail: email,
                }).then((sent: boolean) => {
                  if (sent) {
                    console.log(`[Referral] Confirmation email sent to referrer ${referrerUser.email}`);
                  } else {
                    console.warn(`[Referral] Failed to send confirmation email to referrer`);
                  }
                }).catch((err: Error) => {
                  console.error(`[Referral] Error sending confirmation email:`, err);
                });
              }
            } else {
              console.log(`[Referral] Referral already exists for student ${newStudentProfile.id}`);
            }
          } else if (!referrer) {
            console.warn(`[Referral] Invalid referral code: ${referralCode}`);
          }
        }

        // Check for any pending invitations by email (even without referral code)
        // This handles the case where user signed up without using the referral link
        if (newStudentProfile && !referralCode) {
          try {
            const updatedInvitation = await storage.markInvitationAsRegistered(email, newStudentProfile.id);
            if (updatedInvitation) {
              console.log(`[Referral] Auto-matched invitation for ${email} (signed up without referral link)`);
              
              // Send confirmation email to the original referrer
              const referrerProfile = await storage.getStudentProfileById(updatedInvitation.referrerId);
              if (referrerProfile) {
                const referrerUser = await storage.getUser(referrerProfile.userId);
                if (referrerUser?.email) {
                  const referredName = firstName || newStudentProfile.firstName || 'A friend';
                  sendReferralRegistrationConfirmation({
                    referrerEmail: referrerUser.email,
                    referrerName: referrerProfile.firstName || referrerUser.firstName || 'there',
                    inviteeName: referredName,
                    inviteeEmail: email,
                  }).then((sent: boolean) => {
                    if (sent) {
                      console.log(`[Referral] Auto-match confirmation email sent to referrer ${referrerUser.email}`);
                    }
                  }).catch((err: Error) => {
                    console.error(`[Referral] Error sending auto-match confirmation email:`, err);
                  });
                }
              }
            }
          } catch (inviteErr) {
            // Don't fail if invitation matching fails
            console.error('[Referral] Failed to auto-match invitation:', inviteErr);
          }
        }
      } catch (refErr) {
        // Don't fail the whole sync if profile/referral creation fails
        console.error('[Referral] Failed to create student profile or referral:', refErr);
      }
    }

    res.status(201).json({ 
      message: 'User synced successfully', 
      user: newUser,
      approvalStatus: newUser.approvalStatus,
    });
  } catch (err) {
    console.error('[Supabase Auth] Sync user error:', err);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

router.get('/status', (req: Request, res: Response) => {
  res.json({
    configured: isSupabaseConfigured(),
    features: {
      emailPassword: true,
      oauth: true,
      mfa: true,
      passwordReset: true,
    },
  });
});

router.post('/admin/invite', async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Supabase Admin is not configured' });
    }

    // Use the supabaseUser populated by global middleware for consistency
    const supabaseUser = (req as any).supabaseUser;
    if (!supabaseUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify platform_admin role from our database (source of truth)
    if (supabaseUser.userType !== 'platform_admin') {
      return res.status(403).json({ error: 'Only platform admins can invite new admins' });
    }

    const requestingUser = supabaseUser;

    const { email, firstName, lastName, role } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        first_name: firstName || null,
        last_name: lastName || null,
        user_type: 'platform_admin',
        invited_by: requestingUser.id,
      },
      redirectTo: safeRedirectUrl(`${getSiteUrl()}/admin/login`, '/admin/login', req),
    });

    if (error) {
      console.error('[Admin Invite] Error:', error);
      return res.status(400).json({ error: error.message });
    }

    if (data.user) {
      await storage.createUser({
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        userType: 'platform_admin',
        emailVerified: false,
        isActive: true,
        approvalStatus: 'approved',
        role: role || 'admin',
      });
    }

    res.status(201).json({
      message: `Invitation sent to ${email}. They will receive an email to set their password.`,
      user: data.user,
    });
  } catch (err) {
    console.error('[Admin Invite] Error:', err);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// ==================== TEAM INVITATION ACCEPTANCE ROUTES ====================

// Validate invitation token (public - no auth required)
router.get('/invitation/validate', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Invitation token is required' });
    }

    const { validateInvitationToken } = await import('./invitation-service');
    const result = await validateInvitationToken(token);

    if (!result.valid) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      valid: true,
      email: result.invitation?.email,
      roleName: result.invitation?.role?.displayName,
      expiresAt: result.invitation?.expiresAt,
    });
  } catch (err) {
    console.error('[Invitation Validate] Error:', err);
    res.status(500).json({ error: 'Failed to validate invitation' });
  }
});

// Accept invitation and create account (public - no auth required)
router.post('/invitation/accept', async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Authentication service is not configured' });
    }

    const { token, password, firstName, lastName } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const { validateInvitationToken, acceptInvitation } = await import('./invitation-service');
    const validation = await validateInvitationToken(token);

    if (!validation.valid || !validation.invitation) {
      return res.status(400).json({ error: validation.error || 'Invalid invitation' });
    }

    const invitation = validation.invitation;

    // Create user in Supabase using admin client
    const { data: supabaseData, error: supabaseError } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true, // Auto-confirm email since they received the invitation
      user_metadata: {
        first_name: firstName || null,
        last_name: lastName || null,
        user_type: invitation.userType,
        invited: true,
      },
    });

    if (supabaseError) {
      console.error('[Invitation Accept] Supabase error:', supabaseError);
      return res.status(400).json({ error: supabaseError.message });
    }

    // Create user in our database
    const newUser = await storage.createUser({
      email: invitation.email,
      firstName: firstName || null,
      lastName: lastName || null,
      userType: invitation.userType,
      roleId: invitation.roleId,
      emailVerified: true,
      isActive: true,
      approvalStatus: 'approved',
    });

    // Mark invitation as accepted
    await acceptInvitation(token);

    // Send welcome email
    try {
      // Map userType to email template type
      const emailUserType = (invitation.userType === 'platform_admin' ? 'admin' : 'student') as 'student' | 'admin';
      await sendWelcomeEmail({
        email: invitation.email,
        firstName: firstName || 'Team Member',
        userType: emailUserType,
      });
    } catch (emailError) {
      console.error('[Invitation Accept] Welcome email error:', emailError);
    }

    res.status(201).json({
      message: 'Account created successfully. You can now sign in.',
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        userType: newUser.userType,
      },
    });
  } catch (err) {
    console.error('[Invitation Accept] Error:', err);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

// ==================== ADMIN USER CREATION (Direct with Temp Password) ====================

// Generate a secure temporary password
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  const bytes = crypto.randomBytes(12);
  for (let i = 0; i < 12; i++) {
    password += chars[bytes[i] % chars.length];
  }
  // Ensure password meets requirements
  return password + 'Aa1!';
}

// Admin creates a user directly with temp password
router.post('/admin/create-user', async (req: any, res: Response) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Authentication service is not configured' });
    }

    // Check admin access
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !authUser) {
      return res.status(401).json({ error: 'Invalid authentication' });
    }

    // Verify admin/platform_admin status
    const adminUser = await storage.getUserByEmail(authUser.email || '');
    if (!adminUser || !['admin', 'platform_admin'].includes(adminUser.userType)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { email, firstName, lastName, phone, roleId, regionId, branchId, profileId, userType } = req.body;

    if (!email || !firstName || !lastName || !roleId || !userType) {
      return res.status(400).json({ error: 'Email, first name, last name, role, and user type are required' });
    }

    // Validate user type
    if (!['admin', 'platform_admin'].includes(userType)) {
      return res.status(400).json({ error: 'Invalid user type. Must be admin or platform_admin' });
    }

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();

    // Create user in Supabase
    const { data: supabaseData, error: supabaseError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        user_type: userType,
        admin_created: true,
      },
    });

    if (supabaseError) {
      console.error('[Admin Create User] Supabase error:', supabaseError);
      return res.status(400).json({ error: supabaseError.message });
    }

    // Create user in our database
    const newUser = await storage.createUser({
      email,
      firstName,
      lastName,
      phone: phone || null,
      userType,
      roleId,
      regionId: regionId || null,
      branchId: branchId || null,
      profileId: profileId || null,
      emailVerified: true,
      isActive: true,
      approvalStatus: 'approved',
      requiresPasswordReset: true,
      tempPasswordIssuedAt: new Date(),
    });
    
    // Auto-sync to CRM contacts for students
    if (newUser && userType === 'student') {
      await createCrmContactForUser({
        id: newUser.id,
        email: newUser.email!,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        userType: newUser.userType,
        phone: newUser.phone,
      });
    }

    // Send welcome email with credentials
    try {
      const { sendAdminCreatedUserEmail } = await import('./email-service');
      await sendAdminCreatedUserEmail({
        email,
        firstName,
        lastName,
        tempPassword,
        createdByName: `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'Administrator',
      });
    } catch (emailError) {
      console.error('[Admin Create User] Email error:', emailError);
      // Don't fail the request, just log the error
    }

    res.status(201).json({
      message: 'User created successfully. Login credentials have been sent via email.',
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        userType: newUser.userType,
        requiresPasswordReset: true,
      },
    });
  } catch (err) {
    console.error('[Admin Create User] Error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Force password reset endpoint (for users who need to change password on first login)
router.post('/force-password-reset', async (req: any, res: Response) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Authentication service is not configured' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !authUser) {
      return res.status(401).json({ error: 'Invalid authentication' });
    }

    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Update password in Supabase
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      authUser.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('[Force Password Reset] Supabase error:', updateError);
      return res.status(400).json({ error: updateError.message });
    }

    // Clear the requiresPasswordReset flag in our database
    const dbUser = await storage.getUserByEmail(authUser.email || '');
    if (dbUser) {
      await db.update(users)
        .set({ 
          requiresPasswordReset: false,
          tempPasswordIssuedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, dbUser.id));
    }

    console.log(`[Force Password Reset] Password updated for user`);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('[Force Password Reset] Error:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

export function setupSupabaseAuth(app: any) {
  app.use('/api/supabase-auth', router);
  console.log('Supabase authentication routes registered');
}

export default router;
