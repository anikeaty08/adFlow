import {
  createPublicClient,
  defineChain,
  encodeFunctionData,
  http,
  isAddress,
  type Address,
  type Hex,
  type PublicClient,
} from 'viem';

export const celoSepolia = defineChain({
  id: 11142220,
  name: 'Celo Sepolia',
  nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
  rpcUrls: { default: { http: ['https://forno.celo-sepolia.celo-testnet.org'] } },
  blockExplorers: { default: { name: 'Blockscout', url: 'https://celo-sepolia.blockscout.com' } },
  testnet: true,
});

export const celoSepoliaUsdc = {
  address: '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B' as const,
  decimals: 6,
  feeCurrencyAddress: '0x4822e58de6f5e485eF90df51C41CE01721331dC0' as const,
};

export function createCeloPublicClient(rpcUrl = celoSepolia.rpcUrls.default.http[0]): PublicClient {
  return createPublicClient({ chain: celoSepolia, transport: http(rpcUrl) });
}

/** The browser wallet signs this exact request. The API never signs user transactions. */
export type PreparedContractCall = {
  chainId: 11142220;
  to: Address;
  data: Hex;
  value: 0n;
};

const campaignVaultAbi = [
  {
    type: 'function',
    name: 'createCampaign',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'initialFunding', type: 'uint256' },
    ],
    outputs: [{ name: 'campaignId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'createAgreement',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'campaignId', type: 'uint256' },
      { name: 'publisher', type: 'address' },
      { name: 'allocationCap', type: 'uint256' },
    ],
    outputs: [{ name: 'agreementId', type: 'uint256' }],
  },
] as const;

export function prepareCampaignCreation(
  vaultAddress: string,
  tokenAddress: string,
  initialFunding: bigint,
): PreparedContractCall {
  if (!isAddress(vaultAddress) || !isAddress(tokenAddress)) throw new Error('Invalid contract address');
  if (initialFunding <= 0n) throw new Error('Funding must be positive');

  return {
    chainId: 11142220,
    to: vaultAddress,
    data: encodeFunctionData({
      abi: campaignVaultAbi,
      functionName: 'createCampaign',
      args: [tokenAddress, initialFunding],
    }),
    value: 0n,
  };
}

export function prepareAgreementCreation(
  vaultAddress: string,
  onchainCampaignId: bigint,
  publisherAddress: string,
  allocationCap: bigint,
): PreparedContractCall {
  if (!isAddress(vaultAddress) || !isAddress(publisherAddress)) throw new Error('Invalid contract address');
  if (onchainCampaignId <= 0n || allocationCap <= 0n)
    throw new Error('Campaign and allocation must be positive');

  return {
    chainId: 11142220,
    to: vaultAddress,
    data: encodeFunctionData({
      abi: campaignVaultAbi,
      functionName: 'createAgreement',
      args: [onchainCampaignId, publisherAddress, allocationCap],
    }),
    value: 0n,
  };
}
