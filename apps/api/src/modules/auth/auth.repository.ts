import { and, eq, isNull } from 'drizzle-orm';
import { authNonces, sessions, users, wallets, type Database } from '@adflow/db';
import { id } from '@adflow/shared';

export class AuthRepository {
  constructor(private readonly db: Database) {}

  createNonce(nonce: string, walletAddress: string, message: string, expiresAt: Date) {
    return this.db.insert(authNonces).values({ nonce, walletAddress, message, expiresAt });
  }

  async consumeNonce(message: string) {
    const [nonce] = await this.db
      .update(authNonces)
      .set({ consumedAt: new Date() })
      .where(and(eq(authNonces.message, message), isNull(authNonces.consumedAt)))
      .returning();
    return nonce;
  }

  async findOrCreateUser(walletAddress: string, chainId: number) {
    const [existing] = await this.db
      .select()
      .from(wallets)
      .where(eq(wallets.address, walletAddress))
      .limit(1);
    if (existing) return { userId: existing.userId, walletId: existing.id, walletAddress: existing.address };
    const userId = id('usr');
    const walletId = id('ses');
    await this.db.transaction(async (tx) => {
      await tx.insert(users).values({ id: userId });
      await tx.insert(wallets).values({ id: walletId, userId, address: walletAddress, chainId });
    });
    return { userId, walletId, walletAddress };
  }

  async createSession(userId: string, expiresAt: Date) {
    const sessionId = id('ses');
    await this.db.insert(sessions).values({ id: sessionId, userId, expiresAt });
    return sessionId;
  }

  revokeSession(sessionId: string) {
    return this.db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, sessionId));
  }
}
