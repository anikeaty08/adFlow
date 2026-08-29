import type { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { adSlots, agents, agreements, publishers, publisherSites } from '@adflow/db';
import { requireUser } from '../../shared/auth.js';
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

  app.get('/api/v1/network/inventory', async (request) => {
    await requireUser(request, dependencies.db);
    const rows = await dependencies.db
      .select({
        slotId: adSlots.id,
        slotName: adSlots.name,
        format: adSlots.format,
        categories: adSlots.categories,
        floorCpcAtomic: adSlots.floorCpcAtomic,
        siteDomain: publisherSites.normalizedDomain,
        publisherName: publishers.name,
        publisherAgentId: agents.id,
        publisherStatus: publishers.status,
      })
      .from(adSlots)
      .innerJoin(publisherSites, eq(adSlots.siteId, publisherSites.id))
      .innerJoin(publishers, eq(publisherSites.publisherId, publishers.id))
      .leftJoin(agents, and(eq(agents.publisherId, publishers.id), eq(agents.role, 'PUBLISHER')))
      .where(and(eq(adSlots.status, 'ACTIVE'), eq(publisherSites.status, 'VERIFIED')))
      .limit(100);
    return response(request, rows);
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
