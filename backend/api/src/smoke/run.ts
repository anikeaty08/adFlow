import { createDatabase } from '@adflow/db';
import { loadConfig } from '../config.js';
import { checkAgentIntegrations } from './agent.checks.js';
import { checkInfrastructure } from './infrastructure.checks.js';
import { createSmokeReport, printSmokeReport } from './report.js';

export async function runSmokeTest() {
  const config = loadConfig();
  const database = createDatabase(config.DATABASE_URL);

  try {
    const [infrastructureChecks, agentChecks] = await Promise.all([
      checkInfrastructure(config, database.db),
      checkAgentIntegrations(config),
    ]);
    return createSmokeReport([...infrastructureChecks, ...agentChecks]);
  } finally {
    await database.close();
  }
}

export async function runAndPrintSmokeTest() {
  try {
    const report = await runSmokeTest();
    printSmokeReport(report);
    if (!report.passed) process.exitCode = 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown smoke-test failure.';
    printSmokeReport(
      createSmokeReport([
        {
          name: 'smoke.execution',
          status: 'failed',
          details: { message },
        },
      ]),
    );
    process.exitCode = 1;
  }
}
