import type { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { adSlots, agreements, campaignCreatives, campaigns, creatives, publisherSites } from '@adflow/db';
import { DomainError, hash, id, signPlacementToken } from '@adflow/shared';
import { z } from 'zod';
import type { ApplicationDependencies } from '../../types.js';
import { response } from '../../shared/http.js';

export async function registerEmbedRoutes(app: FastifyInstance, dependencies: ApplicationDependencies) {
  app.get('/embed/v1/slots/:publicSlotKey/ad', async (request) => {
    const publicSlotKey = (request.params as { publicSlotKey: string }).publicSlotKey;
    const origin = z.url().parse((request.query as { origin?: string }).origin);
    const [slot] = await dependencies.db
      .select({ slot: adSlots, site: publisherSites })
      .from(adSlots)
      .innerJoin(publisherSites, eq(adSlots.siteId, publisherSites.id))
      .where(and(eq(adSlots.publicKey, publicSlotKey), eq(adSlots.status, 'ACTIVE')))
      .limit(1);
    if (!slot || new URL(origin).origin !== slot.site.origin)
      throw new DomainError('NOT_FOUND', 'No active ad is available for this slot.');

    const [agreement] = await dependencies.db
      .select()
      .from(agreements)
      .innerJoin(campaigns, eq(agreements.campaignId, campaigns.id))
      .where(
        and(
          eq(agreements.slotId, slot.slot.id),
          eq(agreements.status, 'ACTIVE'),
          eq(campaigns.status, 'ACTIVE'),
        ),
      )
      .limit(1);
    if (!agreement) throw new DomainError('NOT_FOUND', 'No active agreement is available for this slot.');

    const [creative] = await dependencies.db
      .select({ creative: creatives })
      .from(campaignCreatives)
      .innerJoin(creatives, eq(campaignCreatives.creativeId, creatives.id))
      .where(
        and(
          eq(campaignCreatives.campaignId, agreement.placement_agreements.campaignId),
          eq(creatives.status, 'ACTIVE'),
        ),
      )
      .limit(1);
    if (!creative) throw new DomainError('NOT_FOUND', 'No active creative is available for this agreement.');

    const now = Date.now();
    const placementToken = signPlacementToken(
      {
        version: 1,
        campaignId: agreement.placement_agreements.campaignId,
        agreementId: agreement.placement_agreements.id,
        slotId: slot.slot.id,
        publisherSiteId: slot.site.id,
        creativeId: creative.creative.id,
        originHash: hash(origin),
        destination: creative.creative.destinationUrl,
        issuedAt: now,
        expiresAt: now + 15 * 60_000,
        nonce: id('act'),
        keyId: 'current',
      },
      dependencies.config.PLACEMENT_TOKEN_SECRET,
    );
    return response(request, {
      placementToken,
      creative: {
        type: 'image',
        assetUrl: creative.creative.assetUrl,
        headline: creative.creative.headline,
        body: creative.creative.body,
        destination: creative.creative.destinationUrl,
      },
      measurement: {
        impressionUrl: '/measure/v1/impression',
        clickUrl: `/measure/v1/click/${placementToken}`,
        viewabilityPolicy: 'display-v1',
      },
    });
  });
}
