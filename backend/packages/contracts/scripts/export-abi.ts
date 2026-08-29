import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

type ContractArtifact = { abi: unknown };

async function exportAbi(contractName: 'CampaignVault' | 'AdFlowSettlement', outputName: string) {
  const artifactPath = join(
    process.cwd(),
    'artifacts',
    'contracts',
    `${contractName}.sol`,
    `${contractName}.json`,
  );
  const artifact = JSON.parse(await readFile(artifactPath, 'utf8')) as ContractArtifact;
  const outputDirectory = join(process.cwd(), '..', 'chain', 'src', 'abis');

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(join(outputDirectory, outputName), `${JSON.stringify(artifact.abi, null, 2)}\n`);
}

async function main() {
  await exportAbi('CampaignVault', 'campaign-vault.abi.json');
  await exportAbi('AdFlowSettlement', 'adflow-settlement.abi.json');
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
