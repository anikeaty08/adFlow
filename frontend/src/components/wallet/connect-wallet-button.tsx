'use client';

import { IconWallet } from '@tabler/icons-react';
import { celoSepolia } from 'viem/chains';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';

const truncateAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

export function ConnectWalletButton() {
  const account = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  if (account.isConnected && account.chainId !== celoSepolia.id)
    return (
      <button
        className="buttonSecondary"
        onClick={() => switchChain({ chainId: celoSepolia.id })}
        type="button"
      >
        Switch to Celo Sepolia
      </button>
    );
  if (account.isConnected && account.address)
    return (
      <button className="buttonSecondary" onClick={() => disconnect()} type="button">
        <IconWallet size={16} />
        {truncateAddress(account.address)}
      </button>
    );
  const connector = connectors[0];
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
