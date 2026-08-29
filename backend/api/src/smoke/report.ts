import type { SmokeCheck, SmokeReport } from './types.js';

export function createSmokeReport(checks: SmokeCheck[]): SmokeReport {
  return {
    checks,
    passed: checks.every((check) => check.status !== 'failed'),
  };
}

export function printSmokeReport(report: SmokeReport) {
  process.stdout.write(`${JSON.stringify(report)}\n`);
}
