import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum MatchState { OPEN = 0, CLOSED = 1, RESULT_PUBLISHED = 2 }

export enum PredictionState { NO_COMMITMENT = 0, COMMITTED = 1, REVEALED = 2 }

export type Witnesses<PS> = {
  localParticipantSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  localOrganizerSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  submitPrediction(context: __compactRuntime.CircuitContext<PS>,
                   newCommitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  closeMatch(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  publishResult(context: __compactRuntime.CircuitContext<PS>,
                result_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revealPrediction(context: __compactRuntime.CircuitContext<PS>,
                   prediction_0: Uint8Array,
                   salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  submitPrediction(context: __compactRuntime.CircuitContext<PS>,
                   newCommitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  closeMatch(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  publishResult(context: __compactRuntime.CircuitContext<PS>,
                result_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revealPrediction(context: __compactRuntime.CircuitContext<PS>,
                   prediction_0: Uint8Array,
                   salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  participantId(secretKey_0: Uint8Array, matchIdParam_0: Uint8Array): Uint8Array;
  computeCommitment(prediction_0: Uint8Array, salt_0: Uint8Array): Uint8Array;
  organizerPublicKey(secretKey_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  participantId(context: __compactRuntime.CircuitContext<PS>,
                secretKey_0: Uint8Array,
                matchIdParam_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  computeCommitment(context: __compactRuntime.CircuitContext<PS>,
                    prediction_0: Uint8Array,
                    salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  organizerPublicKey(context: __compactRuntime.CircuitContext<PS>,
                     secretKey_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  submitPrediction(context: __compactRuntime.CircuitContext<PS>,
                   newCommitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  closeMatch(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  publishResult(context: __compactRuntime.CircuitContext<PS>,
                result_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revealPrediction(context: __compactRuntime.CircuitContext<PS>,
                   prediction_0: Uint8Array,
                   salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly matchId: Uint8Array;
  readonly teamA: string;
  readonly teamB: string;
  readonly deadline: bigint;
  readonly matchState: MatchState;
  readonly matchResult: { is_some: boolean, value: Uint8Array };
  readonly organizer: Uint8Array;
  readonly predictionState: PredictionState;
  readonly commitment: Uint8Array;
  readonly predictionOwner: Uint8Array;
  readonly revealedPrediction: { is_some: boolean, value: Uint8Array };
  readonly points: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               matchIdParam_0: Uint8Array,
               teamAParam_0: string,
               teamBParam_0: string,
               deadlineParam_0: bigint,
               organizerSecretKey_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
