import { describe, expect, it } from 'vitest';
import { serializePreparedContractCall } from './contract-call.serializer.js';

describe('serializePreparedContractCall', () => {
  it('returns an HTTP-safe contract call without leaking BigInt', () => {
    const call = serializePreparedContractCall({
      chainId: 11142220,
      data: '0x1234',
      to: '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B',
      value: 0n,
    });

    expect(call.value).toBe('0');
    expect(() => JSON.stringify(call)).not.toThrow();
  });
});
