import { hash, verifyPlacementToken } from '@adflow/shared';
import type { Config } from '../../config.js';
import { MeasurementRepository } from './measurement.repository.js';
import { DisplayVerificationPolicy } from './verification.policy.js';

export class MeasurementService {
  private readonly policy = new DisplayVerificationPolicy();
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
  }) {
    const claims = verifyPlacementToken(input.placementToken, this.config.PLACEMENT_TOKEN_SECRET);
    const result = this.policy.validateImpression(claims, input);
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
      status: result.status,
      measurementPolicyVersion: result.policyVersion,
      metadata: {},
    });
  }

  async recordClick(placementToken: string, clickId: string, origin: string) {
    const claims = verifyPlacementToken(placementToken, this.config.PLACEMENT_TOKEN_SECRET);
    const result = this.policy.validateClick(claims, origin);
    const recorded = await this.repository.insert({
      eventKey: `click:${clickId}`,
      agreementId: claims.agreementId,
      eventType: 'CLICK',
      occurredAt: new Date(),
      placementTokenHash: hash(placementToken),
      originHash: hash(origin),
      sessionDedupHash: hash(`${claims.agreementId}:${clickId}`),
      status: result.status,
      measurementPolicyVersion: result.policyVersion,
      metadata: {},
    });
    return { ...recorded, destination: claims.destination };
  }
}
