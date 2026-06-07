import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env, isAdminEnabled, isSupabaseConfigured } from './config/env';
import { decodeSupabaseKeyRole } from './lib/supabase';
import { errorHandler } from './middleware/errorHandler';
import { globalLimiter } from './middleware/rateLimit';
import adminRoutes from './routes/admin.routes';
import v1Routes from './routes';

export type CreateAppOptions = {
  /** Set false only in isolated unit tests that assert limiter wiring separately */
  enableRateLimit?: boolean;
};

function corsOrigin():
  | boolean
  | string[]
  | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void) {
  if (env.corsOrigins.length > 0) {
    return env.corsOrigins;
  }
  if (env.isProduction) {
    return ['https://splitsol.app', 'https://www.splitsol.app'];
  }
  return true;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  const { enableRateLimit = true } = options;

  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: corsOrigin(),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '6mb' }));

  if (enableRateLimit) {
    app.use(globalLimiter);
  }

  app.get('/health', (_req, res) => {
    if (env.isProduction) {
      res.json({
        status: 'ok',
        supabase: { configured: isSupabaseConfigured() },
      });
      return;
    }

    const keyRole = isSupabaseConfigured()
      ? decodeSupabaseKeyRole(env.supabaseServiceRoleKey)
      : null;
    res.json({
      status: 'ok',
      supabase: {
        configured: isSupabaseConfigured(),
        key_role: keyRole,
        key_ok: keyRole === 'service_role',
      },
      admin: isAdminEnabled(),
    });
  });

  if (isAdminEnabled()) {
    app.use('/admin', adminRoutes);
  }

  app.use('/v1', v1Routes);

  app.use(errorHandler);

  return app;
}
