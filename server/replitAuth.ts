import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  const isProduction = process.env.NODE_ENV === "production";
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction, // Only require HTTPS in production
      sameSite: isProduction ? "none" : "lax", // Lax for development, None for production
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  const registeredStrategies = new Set<string>();

  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, async (err: any, user: any) => {
      if (err || !user) {
        return res.redirect("/api/login");
      }

      try {
        const claims = user.claims;
        const userId = claims.sub;
        const sessionData = req.session as any;
        const loginIntent = sessionData?.loginIntent;
        const studentRedirect = sessionData?.studentLoginRedirect || '/student/documents';

        // If this is a student login, provision student profile and folders
        if (loginIntent === 'student') {
          console.log('[STUDENT CALLBACK] Processing student login for userId:', userId);
          
          // Check if user already exists - if they're an admin/university, preserve their role
          const existingUser = await storage.getUser(userId);
          if (existingUser && (existingUser.userType === 'admin' || existingUser.userType === 'university')) {
            console.log('[STUDENT CALLBACK] User is actually admin/university type:', existingUser.userType, '- redirecting to home instead');
            // Clear the login intent flag
            delete sessionData.loginIntent;
            delete sessionData.studentLoginRedirect;
            
            // Log in and redirect to home (admin/university dashboard)
            req.logIn(user, (loginErr) => {
              if (loginErr) {
                console.error("Login error:", loginErr);
                return res.redirect("/?error=login_failed");
              }
              res.redirect("/");
            });
            return;
          }
          
          // Ensure user exists with userType 'student'
          // Note: Only new users get userType='student'. Existing users preserve their type.
          await storage.upsertUser({
            id: userId,
            email: claims.email,
            firstName: claims.first_name,
            lastName: claims.last_name,
            profileImageUrl: claims.profile_image_url,
            userType: existingUser && existingUser.userType ? existingUser.userType : 'student', // Explicit default to student
          });

          // Check if student profile exists
          let studentProfile = await storage.getStudentProfileByUserId(userId);
          console.log('[STUDENT CALLBACK] Student profile exists:', !!studentProfile);

          // If no profile, create one with default folders
          if (!studentProfile) {
            console.log('[STUDENT CALLBACK] Creating new student profile and default folders...');
            studentProfile = await storage.createStudentProfile({
              userId,
              firstName: claims.first_name || null,
              lastName: claims.last_name || null,
              profileImageUrl: claims.profile_image_url || null,
            });
            console.log('[STUDENT CALLBACK] Student profile created:', studentProfile.id);

            // Create default document folders
            const defaultFolders = [
              { name: 'Academic', color: 'blue', sortOrder: 1 },
              { name: 'Financial', color: 'green', sortOrder: 2 },
              { name: 'Personal', color: 'purple', sortOrder: 3 },
            ];

            for (const folder of defaultFolders) {
              const createdFolder = await storage.createFolder({
                name: folder.name,
                ownerId: userId, // Must reference users table, not studentProfiles
                ownerType: 'student',
                color: folder.color,
                isDefault: true,
                sortOrder: folder.sortOrder,
                studentProfileId: studentProfile.id,
              });
              console.log('[STUDENT CALLBACK] Created folder:', folder.name, 'id:', createdFolder.id);
            }
            console.log('[STUDENT CALLBACK] All default folders created successfully');
          } else {
            console.log('[STUDENT CALLBACK] Student profile already exists, skipping folder creation');
          }

          // Clear the login intent flag
          delete sessionData.loginIntent;
          delete sessionData.studentLoginRedirect;

          // Log in the user and redirect to student dashboard
          req.logIn(user, (loginErr) => {
            if (loginErr) {
              console.error("Login error:", loginErr);
              return res.redirect("/?error=login_failed");
            }
            res.redirect(studentRedirect);
          });
        } else {
          // Default behavior for non-student logins (universities/admins)
          // Check if user already exists to preserve their existing role/type
          const existingUser = await storage.getUser(userId);
          
          if (existingUser) {
            // User exists - preserve their existing userType and role
            console.log('[NON-STUDENT CALLBACK] Existing user found:', userId, 'type:', existingUser.userType, 'role:', existingUser.role);
            // Update profile info but keep userType and role
            await storage.upsertUser({
              id: userId,
              email: claims.email,
              firstName: claims.first_name,
              lastName: claims.last_name,
              profileImageUrl: claims.profile_image_url,
              userType: existingUser.userType, // Preserve existing type
              role: existingUser.role, // Preserve existing role
            });
          } else {
            // New user - create with default type (university)
            console.log('[NON-STUDENT CALLBACK] New user, creating as university type:', userId);
            await storage.upsertUser({
              id: userId,
              email: claims.email,
              firstName: claims.first_name,
              lastName: claims.last_name,
              profileImageUrl: claims.profile_image_url,
              userType: 'university', // Default for non-student logins
            });
          }
          
          req.logIn(user, (loginErr) => {
            if (loginErr) {
              console.error("Login error:", loginErr);
              return res.redirect("/api/login");
            }
            // Honor returnTo if set, otherwise redirect to home
            const returnTo = (sessionData?.returnTo as string) || "/";
            delete sessionData?.returnTo;
            res.redirect(returnTo);
          });
        }
      } catch (error) {
        console.error("Callback error:", error);
        res.redirect("/?error=auth_failed");
      }
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Check if user is authenticated via session
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as any;
  
  // For email/password sessions (has claims but no expires_at)
  if (user.claims && !user.expires_at) {
    return next();
  }
  
  // For OIDC sessions (has expires_at)
  if (!user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
