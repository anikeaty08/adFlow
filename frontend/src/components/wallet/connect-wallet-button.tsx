'use client';

import { IconWallet } from '@tabler/icons-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { celoSepolia } from 'viem/chains';
import { useAccount, useConnect, useSignMessage, useSwitchChain } from 'wagmi';
import { createAuthChallenge, verifyWalletSession } from '@/lib/api/auth';

const truncateAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

export function ConnectWalletButton() {
  const account = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { signMessageAsync } = useSignMessage();
  const { switchChain } = useSwitchChain();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const queryClient = useQueryClient();
  const connector = connectors[0];

  async function authenticate() {
    if (!account.address || !account.chainId) return;
    setIsAuthenticating(true);
    try {
      const challenge = await createAuthChallenge(account.address, account.chainId);
      const signature = await signMessageAsync({ message: challenge.message });
      await verifyWalletSession(challenge.message, signature);
      await queryClient.invalidateQueries({ queryKey: ['auth-session'] });
    } finally {
      setIsAuthenticating(false);
    }
  }

  if (account.isConnected && account.chainId !== celoSepolia.id) {
    return (
      <button
        className="buttonSecondary"
        onClick={() => switchChain({ chainId: celoSepolia.id })}
        type="button"
      >
        Switch to Celo Sepolia
      </button>
    );
  }

  if (account.isConnected && account.address) {
    return (
      <button className="buttonSecondary" disabled={isAuthenticating} onClick={authenticate} type="button">
        <IconWallet size={16} />
        {isAuthenticating ? 'Sign in wallet' : truncateAddress(account.address)}
      </button>
    );
  }

  return (
    <button
      className="buttonPrimary"
      disabled={!connector || isPending}
      onClick={() => connector && connect({ connector })}
      type="button"
    >
      <IconWallet size={16} />
      {isPending ? 'Connecting' : 'Connect wallet'}
    </button>
  );
}
