import { ethers } from 'hardhat';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const initialSupply = 10_000_000n * 10n ** 6n;

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error('DEPLOYER_PRIVATE_KEY is required for Celo Sepolia deployment.');

  const Token = await ethers.getContractFactory('AdFlowTestUSDC');
  const token = await Token.deploy(deployer.address, initialSupply);
  await token.waitForDeployment();

  const outputDirectory = join(process.cwd(), 'deployments');
  await mkdir(outputDirectory, { recursive: true });
  const manifestPath = join(outputDirectory, 'celoSepolia.json');
  const existing = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
  const deployment = {
    ...existing,
    contracts: {
      ...(existing.contracts as Record<string, unknown>),
      testSettlementToken: await token.getAddress(),
    },
    testSettlementToken: {
      symbol: 'adUSDC',
      decimals: 6,
      initialSupplyAtomic: initialSupply.toString(),
      deployedBy: deployer.address,
    },
  };
  await writeFile(manifestPath, `${JSON.stringify(deployment, null, 2)}\n`);
  console.log(JSON.stringify(deployment));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
