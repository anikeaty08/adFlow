import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

async function main() {
  const artifactPath = join(
    process.cwd(),
    'artifacts',
    'contracts',
    'CampaignVault.sol',
    'CampaignVault.json',
  );
  const artifact = JSON.parse(await readFile(artifactPath, 'utf8')) as { abi: unknown };
  const outputDirectory = join(process.cwd(), '..', 'chain', 'src', 'abis');
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    join(outputDirectory, 'campaign-vault.abi.json'),
    `${JSON.stringify(artifact.abi, null, 2)}\n`,
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
