import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';
import { DomainError } from '@adflow/shared';
import type { ApplicationDependencies } from './types.js';
import { response } from './shared/http.js';
import { registerAuthRoutes } from './modules/auth/auth.routes.js';
import { registerCampaignRoutes } from './modules/campaigns/campaign.routes.js';
import { registerCreativeRoutes } from './modules/creatives/creative.routes.js';
import { registerMeasurementRoutes } from './modules/measurement/measurement.routes.js';
import { registerPublisherRoutes } from './modules/publishers/publisher.routes.js';
import { registerAgreementRoutes } from './modules/agreements/agreement.routes.js';
import { registerAgentRoutes } from './modules/agents/agent.routes.js';
import { registerQuoteRoutes } from './modules/quotes/quote.routes.js';
import { registerActivityRoutes } from './modules/activity/activity.routes.js';
import { registerPublicRoutes } from './modules/public/public.routes.js';
import { registerOperationsRoutes } from './modules/operations/operations.routes.js';
import { registerEmbedRoutes } from './modules/embed/embed.routes.js';

export async function buildApp(dependencies: ApplicationDependencies) {
  const app = Fastify({
    bodyLimit: 1_000_000,
    logger: {
      transport: dependencies.config.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
    },
  });
  await app.register(cookie);
  const allowedOrigins = new Set(
    dependencies.config.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
  await app.register(cors, {
    credentials: true,
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed by AdFlow CORS policy.'), false);
    },
  });
  await app.register(helmet, {
    contentSecurityPolicy: dependencies.config.NODE_ENV === 'production',
  });
  await app.register(rateLimit, { max: 200, timeWindow: '1 minute' });

  app.setErrorHandler((error, request, reply) => {
    const domainError = error instanceof DomainError ? error : undefined;
    const validationError = error instanceof ZodError ? error : undefined;
    const status = domainError
      ? ({ UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409 }[domainError.code] ?? 400)
      : validationError
        ? 400
        : 500;
    request.log.error(error);
    reply.status(status).send({
      error: {
        code: domainError?.code ?? (validationError ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR'),
        message:
          domainError?.message ??
          (validationError ? 'Request validation failed.' : 'Unexpected server error.'),
        details: domainError?.details ?? validationError?.flatten() ?? {},
      },
      meta: { requestId: request.id },
    });
  });

  app.get('/health/live', async (request) => response(request, { status: 'ok' }));
  app.get('/health/ready', async (request) =>
    response(request, { status: 'ready', chain: dependencies.config.CELO_NETWORK }),
  );
  await registerAuthRoutes(app, dependencies);
  await registerCampaignRoutes(app, dependencies);
  await registerCreativeRoutes(app, dependencies);
  await registerMeasurementRoutes(app, dependencies);
  await registerPublisherRoutes(app, dependencies);
  await registerAgreementRoutes(app, dependencies);
  await registerAgentRoutes(app, dependencies);
  await registerQuoteRoutes(app, dependencies);
  await registerActivityRoutes(app, dependencies);
  await registerPublicRoutes(app, dependencies);
  await registerOperationsRoutes(app, dependencies);
  await registerEmbedRoutes(app, dependencies);
  return app;
}
