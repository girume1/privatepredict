/*
 * This file defines the shape of the prediction board's private state,
 * as well as the witness functions that access it.
 */

import { WitnessContext } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { Ledger } from "./managed/prediction-board/contract/index.js";

export type PrivatePredictPrivateState = {
  readonly participantSecretKey: Uint8Array;
  readonly organizerSecretKey: Uint8Array;
};

export const createPrivatePredictPrivateState = (
  participantSecretKey: Uint8Array,
  organizerSecretKey: Uint8Array,
) => ({
  participantSecretKey,
  organizerSecretKey,
});

export const witnesses = {
  localParticipantSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, PrivatePredictPrivateState>): [
    PrivatePredictPrivateState,
    Uint8Array,
  ] => [privateState, privateState.participantSecretKey],
  localOrganizerSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, PrivatePredictPrivateState>): [
    PrivatePredictPrivateState,
    Uint8Array,
  ] => [privateState, privateState.organizerSecretKey],
};
