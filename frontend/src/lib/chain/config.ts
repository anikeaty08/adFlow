import { celoSepolia } from 'viem/chains';
import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';

const rpcUrl = process.env.NEXT_PUBLIC_CELO_RPC_URL ?? 'https://forno.celo-sepolia.celo-testnet.org';

export const celoConfig = createConfig({
  chains: [celoSepolia],
  connectors: [injected()],
  ssr: true,
  transports: {
    [celoSepolia.id]: http(rpcUrl),
  },
});
