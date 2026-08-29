import { verifyMessage } from 'viem';
import { DomainError } from '@adflow/shared';
import { AuthRepository } from './auth.repository.js';

const nonceLifetimeMs = 5 * 60_000;

export class AuthService {
  constructor(private readonly repository: AuthRepository) {}

  async createChallenge(walletAddress: string, chainId: number) {
    if (chainId !== 11142220)
      throw new DomainError('UNSUPPORTED_CHAIN', 'Connect a wallet on Celo Sepolia (chain ID 11142220).');
    const expiresAt = new Date(Date.now() + nonceLifetimeMs);
    const nonce = crypto.randomUUID();
    const message = [
      'AdFlow authentication',
      `Wallet: ${walletAddress}`,
      `Chain ID: ${chainId}`,
      `Nonce: ${nonce}`,
      `Expires: ${expiresAt.toISOString()}`,
    ].join('\n');
    await this.repository.createNonce(nonce, walletAddress, message, expiresAt);
    return { message, expiresAt };
  }

  async verify(message: string, signature: `0x${string}`) {
    const nonce = await this.repository.consumeNonce(message);
    if (!nonce || nonce.expiresAt < new Date())
      throw new DomainError('UNAUTHORIZED', 'Authentication challenge is invalid, used, or expired.');
    const verified = await verifyMessage({
      address: nonce.walletAddress as `0x${string}`,
      message,
      signature,
    });
    if (!verified) throw new DomainError('UNAUTHORIZED', 'Wallet signature is invalid.');
    return this.repository.findOrCreateUser(nonce.walletAddress, 11142220);
  }
}
