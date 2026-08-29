import { celoSepolia } from 'viem/chains';
import { createConfig, http } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';

const rpcUrl = process.env.NEXT_PUBLIC_CELO_RPC_URL ?? 'https://forno.celo-sepolia.celo-testnet.org';
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const connectors = [injected()];

if (walletConnectProjectId) {
  connectors.push(
    walletConnect({
      projectId: walletConnectProjectId,
      showQrModal: true,
    }),
  );
}

export const celoConfig = createConfig({
  chains: [celoSepolia],
  connectors,
  ssr: true,
  transports: {
    [celoSepolia.id]: http(rpcUrl),
  },
});
