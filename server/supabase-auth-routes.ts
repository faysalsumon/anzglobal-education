import { Router, Request, Response } from 'express';
import { supabase, supabaseAdmin, isSupabaseConfigured } from './supabase';
import { storage } from './storage';
import type { User } from '@shared/schema';

const router = Router();

interface SignUpBody {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  userType: 'student' | 'institution_user' | 'platform_admin';
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

    if (!userType || !['student', 'institution_user', 'platform_admin'].includes(userType)) {
      return res.status(400).json({ error: 'Valid userType is required (student, institution_user, or platform_admin)' });
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
      platformUser = await storage.createUser({
        email,
        firstName: metadata?.first_name || null,
        lastName: metadata?.last_name || null,
        userType: metadata?.user_type || 'student',
        emailVerified: true,
        isActive: true,
      });
    }

    if (platformUser) {
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

export function setupSupabaseAuth(app: any) {
  app.use('/api/supabase-auth', router);
  console.log('Supabase authentication routes registered');
}

export default router;
