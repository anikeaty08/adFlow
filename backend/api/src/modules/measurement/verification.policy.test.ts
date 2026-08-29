import { describe, expect, it } from 'vitest';
import { hash, type PlacementClaims } from '@adflow/shared';
import { DisplayVerificationPolicy, FraudHeuristicPolicy } from './verification.policy.js';

const claims: PlacementClaims = {
  version: 1,
  campaignId: 'cmp_1',
  agreementId: 'agr_1',
  slotId: 'slot_1',
  publisherSiteId: 'site_1',
  creativeId: 'crt_1',
  originHash: hash('https://publisher.example'),
  destination: 'https://advertiser.example',
  issuedAt: Date.now(),
  expiresAt: Date.now() + 60_000,
  nonce: 'n',
  keyId: 'current',
};
describe('DisplayVerificationPolicy', () => {
  it('accepts a viewable impression', () =>
    expect(
      new DisplayVerificationPolicy().validateImpression(claims, {
        occurredAt: new Date(),
        origin: 'https://publisher.example',
        visibleRatio: 0.5,
        visibleMs: 1000,
      }).status,
    ).toBe('ACCEPTED'));
  it('rejects an impression that fails viewability', () =>
    expect(() =>
      new DisplayVerificationPolicy().validateImpression(claims, {
        occurredAt: new Date(),
        origin: 'https://publisher.example',
        visibleRatio: 0.49,
        visibleMs: 999,
      }),
    ).toThrow('viewability'));

  it('rejects a measurement replayed from an origin outside the placement claim', () => {
    const policy = new DisplayVerificationPolicy();

    expect(() => policy.validateClick(claims, 'https://attacker.example')).toThrow(
      'Measurement origin does not match the placement claim.',
    );
    expect(() =>
      policy.validateImpression(claims, {
        occurredAt: new Date(),
        origin: 'https://attacker.example',
        visibleRatio: 1,
        visibleMs: 1_000,
      }),
    ).toThrow('Measurement origin does not match the placement claim.');
  });
});

describe('FraudHeuristicPolicy', () => {
  it('rejects deterministic automation signals', () => {
    const result = new FraudHeuristicPolicy().evaluate({
      eventsFromSessionInMinute: 1,
      eventsFromIpInMinute: 1,
      repeatClickCount: 0,
      userAgentEntropy: 1,
      isKnownDatacenterNetwork: false,
      isAutomationDetected: true,
    });

    expect(result).toMatchObject({ status: 'REJECTED', reasonCodes: ['AUTOMATION_DETECTED'] });
  });

  it('uses additive statistical heuristics without an LLM decision', () => {
    const result = new FraudHeuristicPolicy().evaluate({
      eventsFromSessionInMinute: 1,
      eventsFromIpInMinute: 130,
      repeatClickCount: 0,
      userAgentEntropy: 0.1,
      isKnownDatacenterNetwork: true,
      isAutomationDetected: false,
    });

    expect(result).toMatchObject({ status: 'REJECTED', riskScore: 0.9 });
  });
});
