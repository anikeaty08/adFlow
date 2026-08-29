import { DomainError, type PlacementClaims } from '@adflow/shared';

export type ImpressionInput = {
  occurredAt: Date;
  origin: string;
  visibleRatio: number;
  visibleMs: number;
};

export type FraudSignals = {
  eventsFromSessionInMinute: number;
  eventsFromIpInMinute: number;
  repeatClickCount: number;
  userAgentEntropy: number;
  isKnownDatacenterNetwork: boolean;
  isAutomationDetected: boolean;
};

export type VerificationResult = {
  status: 'ACCEPTED' | 'REJECTED';
  policyVersion: string;
  reasonCodes: string[];
  riskScore: number;
};

/** Deterministic display-v1.0 rule set. Model output never participates here. */
export class DisplayVerificationPolicy {
  readonly version = 'display-v1.0';

  validateImpression(claims: PlacementClaims, input: ImpressionInput): VerificationResult {
    if (input.occurredAt.getTime() > Date.now() + 60_000)
      throw new DomainError('INVALID_MEASUREMENT', 'Measurement time is in the future.');
    if (input.visibleRatio < 0.5 || input.visibleMs < 1_000)
      throw new DomainError('VIEWABILITY_NOT_MET', 'Impression did not meet the viewability policy.');
    if (new URL(input.origin).origin !== input.origin)
      throw new DomainError('INVALID_MEASUREMENT', 'Page origin must not include a path.');
    return {
      status: 'ACCEPTED',
      policyVersion: this.version,
      reasonCodes: ['VIEWABILITY_MET'],
      riskScore: 0,
    };
  }

  validateClick(claims: PlacementClaims, origin: string): VerificationResult {
    if (new URL(origin).origin !== origin)
      throw new DomainError('INVALID_MEASUREMENT', 'Page origin must not include a path.');
    return { status: 'ACCEPTED', policyVersion: this.version, reasonCodes: ['ORIGIN_VALID'], riskScore: 0 };
  }
}

/**
 * Pure, versioned fraud scoring. Inputs are computed by analytics pipelines and never by a model.
 * Hard fraud signals reject immediately; soft signals produce a reviewable numerical risk score.
 */
export class FraudHeuristicPolicy {
  readonly version = 'fraud-heuristics-v1.0';

  evaluate(signals: FraudSignals): VerificationResult {
    const reasonCodes: string[] = [];
    let riskScore = 0;

    if (signals.isAutomationDetected) {
      return this.reject(['AUTOMATION_DETECTED'], 1);
    }
    if (signals.repeatClickCount > 2) {
      return this.reject(['REPEATED_CLICK'], 1);
    }
    if (signals.eventsFromSessionInMinute > 30) {
      return this.reject(['SESSION_VELOCITY_EXCEEDED'], 0.95);
    }

    if (signals.eventsFromIpInMinute > 120) {
      riskScore += 0.35;
      reasonCodes.push('IP_VELOCITY_HIGH');
    }
    if (signals.userAgentEntropy < 0.2) {
      riskScore += 0.25;
      reasonCodes.push('LOW_USER_AGENT_ENTROPY');
    }
    if (signals.isKnownDatacenterNetwork) {
      riskScore += 0.3;
      reasonCodes.push('DATACENTER_NETWORK');
    }

    const roundedRiskScore = Math.min(1, Math.round(riskScore * 100) / 100);
    if (roundedRiskScore >= 0.5) return this.reject(reasonCodes, roundedRiskScore);

    return {
      status: 'ACCEPTED',
      policyVersion: this.version,
      reasonCodes: reasonCodes.length ? reasonCodes : ['FRAUD_SIGNALS_NORMAL'],
      riskScore: roundedRiskScore,
    };
  }

  private reject(reasonCodes: string[], riskScore: number): VerificationResult {
    return { status: 'REJECTED', policyVersion: this.version, reasonCodes, riskScore };
  }
}
