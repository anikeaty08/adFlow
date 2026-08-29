'use client';

import { formatUnits } from 'viem';
import { useAccount, useBalance, useReadContract } from 'wagmi';
import { celoSepolia } from 'viem/chains';

const usdcAddress = (process.env.NEXT_PUBLIC_USDC_ADDRESS ??
  '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B') as `0x${string}`;
const erc20Abi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export function AccountPanel() {
  const { address } = useAccount();
  const nativeBalance = useBalance({ address, chainId: celoSepolia.id });
  const usdcBalance = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: celoSepolia.id,
  });

  if (!address) return <p style={{ color: 'var(--muted)' }}>Connect your wallet to load account state.</p>;

  return (
    <div style={{ display: 'grid', gap: '1rem', maxWidth: 760 }}>
      <div style={{ borderTop: '1px solid var(--line)' }}>
        <p style={{ borderBottom: '1px solid var(--line)', margin: 0, padding: '1rem 0' }}>
          <strong>Wallet</strong>
          <span style={{ color: 'var(--muted)', display: 'block', marginTop: 4, overflowWrap: 'anywhere' }}>
            {address}
          </span>
        </p>
        <p style={{ borderBottom: '1px solid var(--line)', margin: 0, padding: '1rem 0' }}>
          <strong>Network</strong>
          <span style={{ color: 'var(--muted)', display: 'block', marginTop: 4 }}>
            Celo Sepolia · chain ID {celoSepolia.id}
          </span>
        </p>
        <p style={{ borderBottom: '1px solid var(--line)', margin: 0, padding: '1rem 0' }}>
          <strong>USDC balance</strong>
          <span style={{ color: 'var(--muted)', display: 'block', marginTop: 4 }}>
            {usdcBalance.isLoading
              ? 'Loading…'
              : usdcBalance.data !== undefined
                ? `${formatUnits(usdcBalance.data, 6)} USDC`
                : 'Unavailable'}
          </span>
        </p>
        <p style={{ margin: 0, padding: '1rem 0' }}>
          <strong>Native CELO for gas</strong>
          <span style={{ color: 'var(--muted)', display: 'block', marginTop: 4 }}>
            {nativeBalance.isLoading
              ? 'Loading…'
              : nativeBalance.data
                ? `${formatUnits(nativeBalance.data.value, nativeBalance.data.decimals)} CELO`
                : 'Unavailable'}
          </span>
        </p>
      </div>
    </div>
  );
}
