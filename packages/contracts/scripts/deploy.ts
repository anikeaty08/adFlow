import { ethers } from 'hardhat';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error('DEPLOYER_PRIVATE_KEY is required for Celo Sepolia deployment.');
  const settlementOperator = process.env.SETTLEMENT_OPERATOR_ADDRESS;
  if (!settlementOperator)
    throw new Error('SETTLEMENT_OPERATOR_ADDRESS is required for Celo Sepolia deployment.');

  const Vault = await ethers.getContractFactory('CampaignVault');
  const vault = await Vault.deploy(deployer.address, settlementOperator);
  await vault.waitForDeployment();

  const deployment = {
    chainId: 11142220,
    network: 'celoSepolia',
    campaignVault: await vault.getAddress(),
    settlementOperator,
    deployedBy: deployer.address,
  };
  const outputDirectory = join(process.cwd(), 'deployments');
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(join(outputDirectory, 'celo-sepolia.json'), `${JSON.stringify(deployment, null, 2)}\n`);
  console.log(JSON.stringify(deployment));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
