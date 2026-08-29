import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { address, atomic, DomainError, safeUrl } from '@adflow/shared';
import type { ApplicationDependencies } from '../../types.js';
import { requireUser } from '../../shared/auth.js';
import { response } from '../../shared/http.js';
import { PublisherRepository } from './publisher.repository.js';

export async function registerPublisherRoutes(app: FastifyInstance, dependencies: ApplicationDependencies) {
  const repository = new PublisherRepository(dependencies.db);

  app.post('/api/v1/publishers', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const input = z
      .object({ name: z.string().min(2).max(120), payoutWalletAddress: address })
      .parse(request.body);
    const current = await repository.findMine(user.id);
    if (current) throw new DomainError('CONFLICT', 'A publisher profile already exists for this account.');
    return response(
      request,
      await repository.createPublisher(user.id, input.name, input.payoutWalletAddress),
    );
  });

  app.get('/api/v1/publishers/me', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const publisher = await repository.findMine(user.id);
    if (!publisher) throw new DomainError('NOT_FOUND', 'Publisher profile was not found.');
    return response(request, publisher);
  });

  app.post('/api/v1/publishers/sites', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const input = z
      .object({ origin: safeUrl, verificationMethod: z.enum(['DNS_TXT', 'WELL_KNOWN', 'META_TAG']) })
      .parse(request.body);
    const publisher = await repository.findMine(user.id);
    if (!publisher) throw new DomainError('NOT_FOUND', 'Create a publisher profile before adding a site.');
    return response(request, await repository.addSite(publisher.id, input.origin, input.verificationMethod));
  });

  app.post('/api/v1/publishers/sites/:siteId/slots', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const publisher = await repository.findMine(user.id);
    if (!publisher) throw new DomainError('NOT_FOUND', 'Publisher profile was not found.');
    const siteId = (request.params as { siteId: string }).siteId;
    const site = await repository.findSiteOwned(siteId, user.id);
    if (!site) throw new DomainError('NOT_FOUND', 'Publisher site was not found.');
    const input = z
      .object({
        name: z.string().min(2).max(120),
        format: z.enum(['BANNER', 'RECTANGLE', 'NATIVE']),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
        floorCpcAtomic: atomic.default('0'),
        floorCpmAtomic: atomic.default('0'),
        categories: z.array(z.string()).max(30).default([]),
      })
      .parse(request.body);
    return response(request, await repository.addSlot({ siteId, ...input }));
  });

  app.get('/api/v1/publishers/slots', async (request) => {
    const user = await requireUser(request, dependencies.db);
    return response(request, await repository.listSlots(user.id));
  });
}
