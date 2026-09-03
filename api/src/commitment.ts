import { pureCircuits } from "@privatepredict/contract";

/**
 * Computes the prediction commitment, delegating directly to the compiled
 * contract's own `computeCommitment` circuit so there is no possibility of
 * drift between what the API computes and what the contract verifies at
 * reveal time.
 *
 * Must only ever be called with a `salt` held in local private state. The
 * result (a commitment) is the only value that may be sent on-chain before
 * reveal.
 */
export function computeCommitment(
  prediction: Uint8Array,
  salt: Uint8Array,
): Uint8Array {
  return pureCircuits.computeCommitment(prediction, salt);
}
