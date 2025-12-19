import { Router, Request, Response } from 'express';
import { supabase, supabaseAdmin, isSupabaseConfigured } from './supabase';
import { storage } from './storage';
import type { User } from '@shared/schema';
import { sendWelcomeEmail } from './email-service';

const router = Router();

interface SignUpBody {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  userType: 'student' | 'institution_admin' | 'platform_admin';
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

    const { email, password, firstName, lastName, userType } = req.body as SignUpBody;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!userType || !['student', 'institution_admin'].includes(userType)) {
      return res.status(400).json({ error: 'Valid userType is required (student or institution_admin). Platform admin accounts require manual approval.' });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          user_type: userType,
        }
      }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (data.user) {
      const existingUser = await storage.getUserByEmail(email);
      
      if (!existingUser) {
        await storage.createUser({
          email,
          firstName: firstName || null,
          lastName: lastName || null,
          userType,
          emailVerified: data.user.email_confirmed_at ? true : false,
          isActive: true,
          approvalStatus: userType === 'platform_admin' ? 'pending' : null,
          role: userType === 'platform_admin' ? null : 'user',
        });
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
      return res.status(401).json({ error: error.message });
    }

    let platformUser = await storage.getUserByEmail(email);
    
    if (!platformUser && data.user) {
      const metadata = data.user.user_metadata;
      // Normalize legacy 'institution_user' or 'university' to 'institution_admin'
      let userType = metadata?.user_type || 'student';
      if (userType === 'institution_user' || userType === 'university') {
        userType = 'institution_admin';
      }
      platformUser = await storage.createUser({
        email,
        firstName: metadata?.first_name || null,
        lastName: metadata?.last_name || null,
        userType,
        emailVerified: true,
        isActive: true,
      });
    }

    if (platformUser) {
      // Also normalize existing user's userType if it's legacy
      const updates: any = { lastLogin: new Date() };
      if (platformUser.userType === 'institution_user' || platformUser.userType === 'university') {
        updates.userType = 'institution_admin';
      }
      await storage.updateUser(platformUser.id, updates);
      // Update local reference
      if (updates.userType) {
        platformUser.userType = updates.userType;
      }
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
        } : null,
      },
      session: data.session,
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
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase is not configured' });
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/reset-password`,
    });

    if (error) {
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

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('[Supabase Auth] Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
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

    res.json({
      user: {
        ...user,
        platformUser: platformUser ? {
          id: platformUser.id,
          email: platformUser.email,
          firstName: platformUser.firstName,
          lastName: platformUser.lastName,
          userType: platformUser.userType,
          role: platformUser.role,
          profileImageUrl: platformUser.profileImageUrl,
        } : null,
      },
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

    const redirectTo = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/auth/callback`;

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
    const { supabaseId, email, firstName, lastName, userType, emailVerified, profileImageUrl } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // SECURITY: Only allow safe user types via OAuth sync
    // platform_admin can only be created through the proper signup flow with approval
    // This prevents privilege escalation via localStorage manipulation
    // Normalize legacy 'institution_user' to 'institution_admin'
    let normalizedUserType = userType;
    if (userType === 'institution_user') {
      normalizedUserType = 'institution_admin';
    }
    const allowedUserTypes = ['student', 'institution_admin'];
    const safeUserType = allowedUserTypes.includes(normalizedUserType) ? normalizedUserType : 'student';

    // Check if user already exists in local database
    let existingUser = await storage.getUserByEmail(email);

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
    // SECURITY: Only allow student or institution_admin via OAuth
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

    // Send welcome email to new user (students and institutions)
    const welcomeUserType = safeUserType === 'institution_admin' ? 'institution' : 'student';
    sendWelcomeEmail({
      email,
      firstName: firstName || 'there',
      userType: welcomeUserType,
    }).catch(err => console.error('[Email] Failed to send welcome email:', err));

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

// Get current user from database using Supabase token
router.get('/user', async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Supabase is not configured' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get user from local database
    const dbUser = await storage.getUserByEmail(user.email!);
    
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    // Include admin role if applicable
    if (dbUser.userType === 'platform_admin') {
      const adminMember = await storage.getAdminTeamMemberByUserId(dbUser.id);
      return res.json({
        ...dbUser,
        adminRole: adminMember?.role || dbUser.role || null,
      });
    }

    res.json(dbUser);
  } catch (err) {
    console.error('[Supabase Auth] Get user error:', err);
    res.status(500).json({ error: 'Failed to get user' });
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
      redirectTo: `${process.env.REPLIT_DOMAINS?.split(',')[0] ? 'https://' + process.env.REPLIT_DOMAINS.split(',')[0] : ''}/admin/login`,
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
      await sendWelcomeEmail({
        email: invitation.email,
        firstName: firstName || 'Team Member',
        userType: invitation.userType,
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

export function setupSupabaseAuth(app: any) {
  app.use('/api/supabase-auth', router);
  console.log('Supabase authentication routes registered');
}

export default router;
