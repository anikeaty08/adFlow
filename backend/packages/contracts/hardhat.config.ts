import '@nomicfoundation/hardhat-toolbox';
import { HardhatUserConfig } from 'hardhat/config';
import dotenv from 'dotenv';
import { resolve } from 'node:path';

// Hardhat executes from this package, while operational credentials live in the ignored repository
// root `.env`. Load it explicitly so deployment commands have the same configuration source as API.
dotenv.config({ path: resolve(process.cwd(), '../../..', '.env') });

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.28',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    celoSepolia: {
      url: process.env.CELO_RPC_URL ?? 'https://forno.celo-sepolia.celo-testnet.org',
      chainId: 11142220,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
  },
};

export default config;
