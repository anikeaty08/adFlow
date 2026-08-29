import { describe, expect, it } from 'vitest';
import { hasDeployedBytecode } from './chain-deployment.js';

describe('hasDeployedBytecode', () => {
  it('rejects both RPC representations of an undeployed address', () => {
    expect(hasDeployedBytecode(undefined)).toBe(false);
    expect(hasDeployedBytecode('0x')).toBe(false);
  });

  it('accepts non-empty deployed bytecode', () => {
    expect(hasDeployedBytecode('0x60006000')).toBe(true);
  });
});
