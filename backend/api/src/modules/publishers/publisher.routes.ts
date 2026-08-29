import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { address, atomic, DomainError, safeUrl } from '@adflow/shared';
import type { ApplicationDependencies } from '../../types.js';
import { requireUser } from '../../shared/auth.js';
import { response } from '../../shared/http.js';
import { PublisherRepository } from './publisher.repository.js';
import { adSlots } from '@adflow/db';
import { eq } from 'drizzle-orm';
import { PublisherSiteVerificationService } from './site-verification.service.js';

export async function registerPublisherRoutes(app: FastifyInstance, dependencies: ApplicationDependencies) {
  const repository = new PublisherRepository(dependencies.db);
  const verifier = new PublisherSiteVerificationService();

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

  app.patch('/api/v1/publishers/me', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const input = z
      .object({ name: z.string().min(2).max(120), payoutWalletAddress: address })
      .parse(request.body);
    const publisher = await repository.updatePublisher(user.id, input.name, input.payoutWalletAddress);
    if (!publisher) throw new DomainError('NOT_FOUND', 'Publisher profile was not found.');
    return response(request, publisher);
  });

  app.patch('/api/v1/publishers/me/preferences', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const input = z
      .object({
        blockedCategories: z.array(z.string().min(1).max(80)).max(30).default([]),
        acceptedCategories: z.array(z.string().min(1).max(80)).max(30).default([]),
        minimumAdvertiserReputationScore: z.number().min(0).max(100).default(0),
      })
      .parse(request.body);
    const publisher = await repository.updatePreferences(user.id, input);
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

  app.get('/api/v1/publishers/sites', async (request) => {
    const user = await requireUser(request, dependencies.db);
    return response(request, await repository.listSites(user.id));
  });

  app.post('/api/v1/publishers/sites/:siteId/verification', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const site = await repository.findSiteOwned((request.params as { siteId: string }).siteId, user.id);
    if (!site) throw new DomainError('NOT_FOUND', 'Publisher site was not found.');
    return response(request, {
      siteId: site.id,
      method: site.verificationMethod,
      challenge: site.verificationChallengeHash,
      instructions: 'Publish the challenge using the selected verification method, then call check.',
    });
  });

  app.post('/api/v1/publishers/sites/:siteId/verification/check', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const site = await repository.findSiteOwned((request.params as { siteId: string }).siteId, user.id);
    if (!site) throw new DomainError('NOT_FOUND', 'Publisher site was not found.');
    const verified = await verifier.verify(site);
    const updated = verified ? await repository.markSiteVerified(site.id) : site;
    return response(request, { siteId: site.id, status: updated?.status, verified });
  });

  app.get('/api/v1/publishers/slots', async (request) => {
    const user = await requireUser(request, dependencies.db);
    return response(request, await repository.listSlots(user.id));
  });

  app.get('/api/v1/publishers/slots/:slotId', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const slot = await repository.findSlot((request.params as { slotId: string }).slotId, user.id);
    if (!slot) throw new DomainError('NOT_FOUND', 'Ad slot was not found.');
    return response(request, slot);
  });

  app.patch('/api/v1/publishers/slots/:slotId', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const slotId = (request.params as { slotId: string }).slotId;
    const slot = await repository.findSlot(slotId, user.id);
    if (!slot) throw new DomainError('NOT_FOUND', 'Ad slot was not found.');
    const input = z
      .object({
        name: z.string().min(2).max(120).optional(),
        categories: z.array(z.string()).max(30).optional(),
      })
      .parse(request.body);
    const [updated] = await dependencies.db
      .update(adSlots)
      .set(input)
      .where(eq(adSlots.id, slotId))
      .returning();
    return response(request, updated);
  });

  for (const [path, status] of [
    ['/api/v1/publishers/slots/:slotId/activate', 'ACTIVE'],
    ['/api/v1/publishers/slots/:slotId/pause', 'PAUSED'],
  ] as const) {
    app.post(path, async (request) => {
      const user = await requireUser(request, dependencies.db);
      const slotId = (request.params as { slotId: string }).slotId;
      if (!(await repository.findSlot(slotId, user.id)))
        throw new DomainError('NOT_FOUND', 'Ad slot was not found.');
      return response(request, await repository.setSlotStatus(slotId, status));
    });
  }
}
