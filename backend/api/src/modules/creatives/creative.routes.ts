import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DomainError, hash, safeUrl } from '@adflow/shared';
import type { ApplicationDependencies } from '../../types.js';
import { requireUser } from '../../shared/auth.js';
import { response } from '../../shared/http.js';
import { CloudinaryCreativeStorage } from './cloudinary.service.js';
import { CreativeRepository } from './creative.repository.js';

export async function registerCreativeRoutes(app: FastifyInstance, dependencies: ApplicationDependencies) {
  const storage = new CloudinaryCreativeStorage(dependencies.config);
  const repository = new CreativeRepository(dependencies.db);
  app.post('/api/v1/creatives/upload-url', async (request) => {
    await requireUser(request, dependencies.db);
    return response(request, {
      ...storage.createDirectUploadSignature(),
      constraints: { allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'], maxBytes: 5_000_000 },
    });
  });
  app.post('/api/v1/creatives/complete', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const input = z
      .object({
        publicId: z.string().min(1),
        destinationUrl: safeUrl,
        headline: z.string().max(160).optional(),
        body: z.string().max(500).optional(),
      })
      .parse(request.body);
    const asset = await storage.verifyUploadedImage(input.publicId);
    const creative = await repository.create({
      ownerUserId: user.id,
      cloudinaryPublicId: asset.publicId,
      assetUrl: asset.assetUrl,
      mimeType: asset.mimeType,
      bytes: asset.bytes,
      width: asset.width,
      height: asset.height,
      sha256: hash(`${asset.publicId}:${asset.bytes}:${asset.assetUrl}`),
      destinationUrl: input.destinationUrl,
      headline: input.headline,
      body: input.body,
    });
    return response(request, creative);
  });
  app.get('/api/v1/creatives/:creativeId', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const creative = await repository.findOwned(
      (request.params as { creativeId: string }).creativeId,
      user.id,
    );
    if (!creative) throw new DomainError('NOT_FOUND', 'Creative was not found.');
    return response(request, creative);
  });
  app.delete('/api/v1/creatives/:creativeId', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const creative = await repository.findOwned(
      (request.params as { creativeId: string }).creativeId,
      user.id,
    );
    if (!creative) throw new DomainError('NOT_FOUND', 'Creative was not found.');
    await storage.destroy(creative.cloudinaryPublicId);
    await repository.softDelete(creative.id, user.id);
    return response(request, { deleted: true });
  });
}
