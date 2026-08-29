import type { PreparedContractCall } from '@adflow/chain';

/**
 * Contract call data crosses an HTTP boundary before a wallet sends it.
 * BigInt is not JSON serializable, so encode the zero native-token value as a string.
 */
export function serializePreparedContractCall(call: PreparedContractCall) {
  return {
    ...call,
    value: call.value.toString(),
  };
}
