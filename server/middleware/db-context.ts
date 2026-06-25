import { type Request, type Response, type NextFunction } from 'express';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../shared/schema';
import { appUserPool } from '../db';

declare module 'express-serve-static-core' {
  interface Locals {
    rlsDb?: ReturnType<typeof drizzle<typeof schema>>;
    rlsDbClient?: import('pg').PoolClient;
  }
}

/**
 * Per-request DB context middleware for Row-Level Security enforcement.
 *
 * When APP_DB_URL is configured (production with app_user role):
 *   1. Acquires a dedicated connection from the app_user pool.
 *   2. Sets app.current_user_id and app.current_user_type via set_config so
 *      PostgreSQL RLS policies can evaluate them with current_setting().
 *   3. Attaches res.locals.rlsDb (a Drizzle instance) for routes that want
 *      RLS-enforced queries instead of the global admin db.
 *   4. Resets context and releases the connection after the response finishes.
 *
 * When APP_DB_URL is not set (development, or not yet configured):
 *   No-op — existing routes continue using the global db unchanged.
 *
 * Usage in a route:
 *   const tenantDb = res.locals.rlsDb ?? db;   // fall back to global db
 *   const rows = await tenantDb.select()...
 */
export function dbContextMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!appUserPool) return next();

  const supabaseUser = (req as any).supabaseUser;
  if (!supabaseUser?.id) return next();

  const userId = String(supabaseUser.id);
  const userType = String(supabaseUser.userType ?? 'student');

  let released = false;

  appUserPool.connect()
    .then((client) => {
      return client
        .query(
          `SELECT set_config('app.current_user_id', $1, false),
                  set_config('app.current_user_type', $2, false)`,
          [userId, userType]
        )
        .then(() => {
          res.locals.rlsDb = drizzle({ client, schema });
          res.locals.rlsDbClient = client;

          const cleanup = () => {
            if (released) return;
            released = true;
            client
              .query(
                `SELECT set_config('app.current_user_id', '', false),
                        set_config('app.current_user_type', '', false)`
              )
              .catch(() => {})
              .finally(() => client.release());
          };

          res.on('finish', cleanup);
          res.on('close', cleanup);

          next();
        })
        .catch((err: Error) => {
          client.release();
          console.error('[DBContext] Failed to set context on app_user connection:', err.message);
          next();
        });
    })
    .catch((err: Error) => {
      console.error('[DBContext] Failed to acquire app_user connection:', err.message);
      next();
    });
}
