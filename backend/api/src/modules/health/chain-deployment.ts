/**
 * RPC providers differ on whether an undeployed account is represented as `undefined` or `0x`.
 * Treat both values as missing bytecode so callers cannot accidentally mark an EOA or empty
 * address as a deployed contract.
 */
export function hasDeployedBytecode(bytecode: `0x${string}` | undefined): boolean {
  return bytecode !== undefined && bytecode !== '0x';
}
