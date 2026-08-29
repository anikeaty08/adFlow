import { hash, verifyPlacementToken } from '@adflow/shared';
import type { Config } from '../../config.js';
import { MeasurementRepository } from './measurement.repository.js';
import { DisplayVerificationPolicy, FraudHeuristicPolicy } from './verification.policy.js';

export class MeasurementService {
  private readonly policy = new DisplayVerificationPolicy();
  private readonly fraud = new FraudHeuristicPolicy();
  constructor(
    private readonly repository: MeasurementRepository,
    private readonly config: Config,
  ) {}

  async recordImpression(input: {
    placementToken: string;
    eventId: string;
    occurredAt: Date;
    origin: string;
    visibleRatio: number;
    visibleMs: number;
    userAgent: string;
  }) {
    const claims = verifyPlacementToken(input.placementToken, this.config.PLACEMENT_TOKEN_SECRET);
    const result = this.policy.validateImpression(claims, input);
    const fraud = this.fraud.evaluate({
      eventsFromSessionInMinute: 0,
      eventsFromIpInMinute: 0,
      repeatClickCount: 0,
      userAgentEntropy: input.userAgent.length >= 12 ? 1 : 0,
      isKnownDatacenterNetwork: false,
      isAutomationDetected: /headless|phantomjs|selenium|puppeteer/i.test(input.userAgent),
    });
    return this.repository.insert({
      eventKey: `impression:${input.eventId}`,
      agreementId: claims.agreementId,
      eventType: 'IMPRESSION',
      occurredAt: input.occurredAt,
      placementTokenHash: hash(input.placementToken),
      originHash: hash(input.origin),
      sessionDedupHash: hash(`${claims.agreementId}:${input.eventId}`),
      viewabilityRatio: input.visibleRatio.toString(),
      viewabilityMs: input.visibleMs,
      // Ingestion proves the request is well-formed. A separate deterministic worker makes the
      // final payable decision so the evidence path remains auditable and resumable.
      status: fraud.status === 'REJECTED' ? 'REJECTED' : 'PENDING',
      measurementPolicyVersion: result.policyVersion,
      riskScore: fraud.riskScore.toString(),
      metadata: { fraudReasonCodes: fraud.reasonCodes },
    });
  }

  async recordClick(placementToken: string, clickId: string, origin: string, userAgent: string) {
    const claims = verifyPlacementToken(placementToken, this.config.PLACEMENT_TOKEN_SECRET);
    const result = this.policy.validateClick(claims, origin);
    const fraud = this.fraud.evaluate({
      eventsFromSessionInMinute: 0,
      eventsFromIpInMinute: 0,
      repeatClickCount: 0,
      userAgentEntropy: userAgent.length >= 12 ? 1 : 0,
      isKnownDatacenterNetwork: false,
      isAutomationDetected: /headless|phantomjs|selenium|puppeteer/i.test(userAgent),
    });
    const recorded = await this.repository.insert({
      eventKey: `click:${clickId}`,
      agreementId: claims.agreementId,
      eventType: 'CLICK',
      occurredAt: new Date(),
      placementTokenHash: hash(placementToken),
      originHash: hash(origin),
      sessionDedupHash: hash(`${claims.agreementId}:${clickId}`),
      status: fraud.status === 'REJECTED' ? 'REJECTED' : 'PENDING',
      measurementPolicyVersion: result.policyVersion,
      riskScore: fraud.riskScore.toString(),
      metadata: { fraudReasonCodes: fraud.reasonCodes },
    });
    return { ...recorded, destination: claims.destination };
  }
}
