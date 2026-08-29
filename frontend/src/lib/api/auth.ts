import { apiRequest } from './client';

export type AuthChallenge = { message: string; expiresAt: string };
export type AuthSession = { user: { id: string; walletAddress: string } };

export function createAuthChallenge(walletAddress: string, chainId: number) {
  return apiRequest<AuthChallenge>('/api/v1/auth/nonce', {
    body: JSON.stringify({ walletAddress, chainId }),
    method: 'POST',
  });
}

export function verifyWalletSession(message: string, signature: string) {
  return apiRequest<AuthSession>('/api/v1/auth/verify', {
    body: JSON.stringify({ message, signature }),
    method: 'POST',
  });
}

export function logoutWalletSession() {
  return apiRequest<{ loggedOut: boolean }>('/api/v1/auth/logout', { method: 'POST' });
}
