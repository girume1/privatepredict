/**
 * PredictionBoard common types and provider abstractions, mirroring the
 * pattern used by the official Midnight bulletin-board example's
 * `api/src/common-types.ts`.
 */

import { type MidnightProviders } from "@midnight-ntwrk/midnight-js-types";
import { type FoundContract } from "@midnight-ntwrk/midnight-js-contracts";
import type {
  Contract,
  Witnesses,
  PrivatePredictPrivateState,
} from "@privatepredict/contract";

export const predictionBoardPrivateStateKey = "predictionBoardPrivateState";
export type PrivateStateId = typeof predictionBoardPrivateStateKey;

/**
 * The private states consumed throughout the application. There is only
 * one contract type here, so only one key/type in the schema — matching
 * the bulletin-board reference's `PrivateStates` shape.
 */
export type PrivateStates = {
  readonly predictionBoardPrivateState: PrivatePredictPrivateState;
};

export type PredictionBoardContract = Contract<
  PrivatePredictPrivateState,
  Witnesses<PrivatePredictPrivateState>
>;

export type PredictionBoardCircuitKeys = Exclude<
  keyof PredictionBoardContract["impureCircuits"],
  number | symbol
>;

export type PredictionBoardProviders = MidnightProviders<
  PredictionBoardCircuitKeys,
  PrivateStateId,
  PrivatePredictPrivateState
>;

export type DeployedPredictionBoardContract =
  FoundContract<PredictionBoardContract>;
