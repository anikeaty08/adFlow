import { ulid } from 'ulidx';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export const prefixes = [
  'usr',
  'ses',
  'agt',
  'pub',
  'site',
  'slot',
  'cmp',
  'crt',
  'qte',
  'qrq',
  'agr',
  'evt',
  'epc',
  'tx',
  'dec',
  'pol',
  'run',
  'act',
] as const;

export type Prefix = (typeof prefixes)[number];

export const id = (prefix: Prefix) => `${prefix}_${ulid()}`;
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const canonicalJson = (value: unknown) => JSON.stringify(value, Object.keys(value as object).sort());
export const atomic = z.string().regex(/^0$|^[1-9]\d*$/, 'must be an unsigned atomic integer');
export const address = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'invalid EVM address')
  .transform((v) => v.toLowerCase());
export const safeUrl = z.url().refine((value) => {
  const u = new URL(value);
  return u.protocol === 'https:' || u.protocol === 'http:';
}, 'only http(s) URLs are allowed');
export const pricingModel = z.enum(['CPC', 'CPM']);
export const campaignStatus = z.enum([
  'DRAFT',
  'FUNDING_PENDING',
  'FUNDED',
  'DISCOVERING',
  'ACTIVE',
  'PAUSED',
  'SETTLING',
  'CLOSED',
  'BLOCKED',
]);
export const success = <T>(data: T, requestId: string) => ({ data, meta: { requestId } });

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export type PlacementClaims = {
  version: 1;
  campaignId: string;
  agreementId: string;
  slotId: string;
  publisherSiteId: string;
  creativeId: string;
  originHash: string;
  destination: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
  keyId: string;
};

export function signPlacementToken(claims: PlacementClaims, secret: string) {
  const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyPlacementToken(token: string, secret: string): PlacementClaims {
  const [body, signature] = token.split('.');
  if (!body || !signature) throw new DomainError('INVALID_PLACEMENT_TOKEN', 'Malformed placement token');
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected)))
    throw new DomainError('INVALID_PLACEMENT_TOKEN', 'Invalid placement token signature');
  const claims = JSON.parse(Buffer.from(body, 'base64url').toString()) as PlacementClaims;
  if (claims.version !== 1 || claims.expiresAt < Date.now())
    throw new DomainError('EXPIRED_PLACEMENT_TOKEN', 'Placement token has expired');
  return claims;
}

export const campaignInput = z
  .object({
    name: z.string().min(2).max(120),
    objectiveText: z.string().min(2).max(4000),
    landingUrl: safeUrl,
    pricingModel,
    targeting: z.object({ categories: z.array(z.string()).max(30).default([]) }).default({ categories: [] }),
    blockedCategories: z.array(z.string()).max(30).default([]),
    maxUnitPriceAtomic: atomic,
    settlementToken: z.object({ symbol: z.string().min(2).max(10), address }),
    budgetPlannedAtomic: atomic,
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    strategy: z
      .object({
        minReputationScore: z.number().min(0).max(100).default(0),
        maxPublisherAllocationAtomic: atomic.optional(),
        explorationRatioBasisPoints: z.number().int().min(0).max(10000).default(1000),
      })
      .default({ minReputationScore: 0, explorationRatioBasisPoints: 1000 }),
  })
  .superRefine((data, ctx) => {
    if (data.endAt <= data.startAt)
      ctx.addIssue({ code: 'custom', message: 'endAt must be after startAt', path: ['endAt'] });
    if (BigInt(data.maxUnitPriceAtomic) > BigInt(data.budgetPlannedAtomic))
      ctx.addIssue({
        code: 'custom',
        message: 'max unit price cannot exceed budget',
        path: ['maxUnitPriceAtomic'],
      });
  });
