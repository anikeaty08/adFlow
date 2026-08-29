import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
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

export async function buildApp(dependencies: ApplicationDependencies) {
  const app = Fastify({
    logger: {
      transport: dependencies.config.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
    },
  });
  await app.register(cookie);
  await app.register(cors, { origin: true, credentials: true });
  await app.register(helmet);
  await app.register(rateLimit, { max: 200, timeWindow: '1 minute' });

  app.setErrorHandler((error, request, reply) => {
    const domainError = error instanceof DomainError ? error : undefined;
    const status = domainError
      ? ({ UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409 }[domainError.code] ?? 400)
      : 500;
    request.log.error(error);
    reply.status(status).send({
      error: {
        code: domainError?.code ?? 'INTERNAL_ERROR',
        message: domainError?.message ?? 'Unexpected server error.',
        details: domainError?.details ?? {},
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
  return app;
}
