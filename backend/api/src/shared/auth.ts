import { and, eq, gt, isNull } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import { sessions, users, wallets, type Database } from '@adflow/db';
import { DomainError } from '@adflow/shared';

export type AuthenticatedUser = { id: string; walletAddress: string; walletId: string };
export const sessionCookieName = 'adflow_session';

export async function requireUser(request: FastifyRequest, db: Database): Promise<AuthenticatedUser> {
  const sessionId = request.cookies[sessionCookieName];
  if (!sessionId) throw new DomainError('UNAUTHORIZED', 'A wallet session is required.');
  const [record] = await db
    .select({ userId: users.id, walletAddress: wallets.address, walletId: wallets.id })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .innerJoin(wallets, and(eq(wallets.userId, users.id), eq(wallets.isPrimary, true)))
    .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!record) throw new DomainError('UNAUTHORIZED', 'The wallet session is invalid or expired.');
  return { id: record.userId, walletAddress: record.walletAddress, walletId: record.walletId };
}
