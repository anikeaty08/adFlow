export type SmokeCheckStatus = 'passed' | 'failed' | 'skipped';

export type SmokeCheck = {
  name: string;
  status: SmokeCheckStatus;
  details: Record<string, string | number | boolean | null>;
};

export type SmokeReport = {
  checks: SmokeCheck[];
  passed: boolean;
};
