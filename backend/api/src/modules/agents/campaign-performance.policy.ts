import type { MonitorResult } from '@adflow/agent-core';

export type CampaignPerformanceMetrics = {
  acceptedImpressions: number;
  acceptedClicks: number;
  rejectedEvents: number;
};

const minimumImpressionsForDecision = 100;
const minimumCtr = 0.005;
const minimumRejectedEventsForFraud = 20;
const fraudRejectionRatio = 0.5;

/**
 * Deterministic delivery classification. This is deliberately independent from the model so
 * fraudulent or weak measurement data can never be reinterpreted as a financial fact by an LLM.
 */
export function classifyCampaignPerformance(metrics: CampaignPerformanceMetrics): MonitorResult {
  const acceptedEvents = metrics.acceptedImpressions + metrics.acceptedClicks;
  const totalEvents = acceptedEvents + metrics.rejectedEvents;
  const rejectedRatio = totalEvents === 0 ? 0 : metrics.rejectedEvents / totalEvents;
  if (metrics.rejectedEvents >= minimumRejectedEventsForFraud && rejectedRatio >= fraudRejectionRatio)
    return 'FRAUD';
  if (metrics.acceptedImpressions < minimumImpressionsForDecision) return 'NO_DATA';
  return metrics.acceptedClicks / metrics.acceptedImpressions >= minimumCtr ? 'GOOD' : 'BAD';
}
