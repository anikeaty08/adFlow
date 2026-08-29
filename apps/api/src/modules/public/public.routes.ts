import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { adSlots, agreements, type Database } from '@adflow/db';
import { response } from '../../shared/http.js';
import type { ApplicationDependencies } from '../../types.js';

export async function registerPublicRoutes(app: FastifyInstance, dependencies: ApplicationDependencies) {
  app.get('/embed/v1/adflow.js', async (_request, reply) => {
    reply.type('application/javascript; charset=utf-8');
    return 'window.AdFlow=window.AdFlow||{};';
  });

  app.get('/agent/v1/inventory', async (request) => {
    const slots = await dependencies.db
      .select({
        id: adSlots.id,
        publicKey: adSlots.publicKey,
        format: adSlots.format,
        categories: adSlots.categories,
      })
      .from(adSlots)
      .where(eq(adSlots.status, 'ACTIVE'))
      .limit(100);
    return response(request, { slots });
  });

  app.get('/agent/v1/inventory/premium', async (_request, reply) => {
    reply.header('WWW-Authenticate', 'x402');
    return reply
      .status(402)
      .send({ error: { code: 'PAYMENT_REQUIRED', message: 'x402 payment is required.' } });
  });

  app.get('/agent/v1/agreements/:agreementId', async (request) => {
    const [agreement] = await dependencies.db
      .select({
        id: agreements.id,
        status: agreements.status,
        startAt: agreements.startAt,
        endAt: agreements.endAt,
      })
      .from(agreements)
      .where(eq(agreements.id, (request.params as { agreementId: string }).agreementId))
      .limit(1);
    return response(request, agreement ?? { status: 'NOT_FOUND' });
  });
}
