import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { address, DomainError } from '@adflow/shared';
import type { ApplicationDependencies } from '../../types.js';
import { response } from '../../shared/http.js';
import { requireUser, sessionCookieName } from '../../shared/auth.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';

export async function registerAuthRoutes(app: FastifyInstance, dependencies: ApplicationDependencies) {
  const repository = new AuthRepository(dependencies.db);
  const service = new AuthService(repository);
  const sessionLifetimeSeconds = 60 * 60 * 24 * 7;

  app.post(
    '/api/v1/auth/nonce',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request) => {
      const input = z
        .object({ walletAddress: address, chainId: z.number().int().positive() })
        .parse(request.body);
      const challenge = await service.createChallenge(input.walletAddress, input.chainId);
      return response(request, challenge);
    },
  );

  app.post('/api/v1/auth/verify', async (request, reply) => {
    const input = z
      .object({ message: z.string().min(1), signature: z.string().regex(/^0x[0-9a-fA-F]+$/) })
      .parse(request.body);
    const user = await service.verify(input.message, input.signature as `0x${string}`);
    const sessionId = await repository.createSession(
      user.userId,
      new Date(Date.now() + sessionLifetimeSeconds * 1000),
    );
    reply.setCookie(sessionCookieName, sessionId, {
      httpOnly: true,
      secure: dependencies.config.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: sessionLifetimeSeconds,
    });
    return response(request, { user: { id: user.userId, walletAddress: user.walletAddress } });
  });

  app.get('/api/v1/auth/session', async (request) =>
    response(request, { user: await requireUser(request, dependencies.db) }),
  );
  app.post('/api/v1/auth/logout', async (request, reply) => {
    const sessionId = request.cookies[sessionCookieName];
    if (sessionId) await repository.revokeSession(sessionId);
    reply.clearCookie(sessionCookieName, { path: '/' });
    return response(request, { loggedOut: true });
  });
}
