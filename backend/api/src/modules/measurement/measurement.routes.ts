import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ApplicationDependencies } from '../../types.js';
import { response } from '../../shared/http.js';
import { MeasurementRepository } from './measurement.repository.js';
import { MeasurementService } from './measurement.service.js';

export async function registerMeasurementRoutes(app: FastifyInstance, dependencies: ApplicationDependencies) {
  const service = new MeasurementService(new MeasurementRepository(dependencies.db), dependencies.config);
  app.post(
    '/measure/v1/impression',
    { config: { rateLimit: { max: 1_000, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const input = z
        .object({
          placementToken: z.string().min(1),
          eventId: z.string().min(8).max(200),
          occurredAt: z.coerce.date(),
          viewability: z.object({
            visibleRatio: z.number().min(0).max(1),
            visibleMs: z.number().int().nonnegative(),
          }),
          page: z.object({ origin: z.url() }),
        })
        .parse(request.body);
      const recorded = await service.recordImpression({
        placementToken: input.placementToken,
        eventId: input.eventId,
        occurredAt: input.occurredAt,
        origin: input.page.origin,
        visibleRatio: input.viewability.visibleRatio,
        visibleMs: input.viewability.visibleMs,
        userAgent: request.headers['user-agent'] ?? '',
        ipAddress: request.ip,
      });
      reply.status(recorded.duplicate ? 200 : 202);
      return response(request, { accepted: !recorded.duplicate, eventId: recorded.event.id });
    },
  );
  app.get(
    '/measure/v1/click/:placementToken',
    { config: { rateLimit: { max: 300, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const query = z.object({ eventId: z.string().min(8).max(200), origin: z.url() }).parse(request.query);
      const result = await service.recordClick(
        (request.params as { placementToken: string }).placementToken,
        query.eventId,
        query.origin,
        request.headers['user-agent'] ?? '',
        request.ip,
      );
      return reply.redirect(result.destination, 302);
    },
  );
}
