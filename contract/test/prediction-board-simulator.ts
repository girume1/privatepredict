/*
 * Simulator for testing the prediction board contract
 */

import {
  type CircuitContext,
  QueryContext,
  sampleContractAddress,
  createConstructorContext,
  CostModel,
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  type Ledger,
  ledger,
} from "../src/managed/prediction-board/contract/index.js";
import {
  type PrivatePredictPrivateState,
  createPrivatePredictPrivateState,
  witnesses,
} from "../src/prediction-board-witnesses.js";

export class PredictionBoardSimulator {
  readonly contract: Contract<PrivatePredictPrivateState>;
  circuitContext: CircuitContext<PrivatePredictPrivateState>;

  constructor(
    participantSecretKey: Uint8Array,
    matchId: Uint8Array,
    teamA: string,
    teamB: string,
    deadline: bigint,
    organizerSecretKey: Uint8Array,
  ) {
    this.contract = new Contract<PrivatePredictPrivateState>(witnesses);
    const {
      currentPrivateState,
      currentContractState,
      currentZswapLocalState,
    } = this.contract.initialState(
      createConstructorContext(
        createPrivatePredictPrivateState(
          participantSecretKey,
          organizerSecretKey,
        ),
        "0".repeat(64),
      ),
      matchId,
      teamA,
      teamB,
      deadline,
      organizerSecretKey,
    );
    this.circuitContext = {
      currentPrivateState,
      currentZswapLocalState,
      costModel: CostModel.initialCostModel(),
      currentQueryContext: new QueryContext(
        currentContractState.data,
        sampleContractAddress(),
      ),
    };
  }

  // Swaps the locally-held participant secret key, e.g. to simulate a
  // different participant attempting to reveal someone else's commitment.
  public setParticipantSecretKey(participantSecretKey: Uint8Array) {
    this.circuitContext.currentPrivateState = {
      ...this.circuitContext.currentPrivateState,
      participantSecretKey,
    };
  }

  // Swaps the locally-held organizer secret key, e.g. to simulate a
  // non-organizer attempting to close the match or publish a result.
  public setOrganizerSecretKey(organizerSecretKey: Uint8Array) {
    this.circuitContext.currentPrivateState = {
      ...this.circuitContext.currentPrivateState,
      organizerSecretKey,
    };
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public getPrivateState(): PrivatePredictPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  public submitPrediction(commitment: Uint8Array): Ledger {
    this.circuitContext = this.contract.impureCircuits.submitPrediction(
      this.circuitContext,
      commitment,
    ).context;
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public closeMatch(): Ledger {
    this.circuitContext = this.contract.impureCircuits.closeMatch(
      this.circuitContext,
    ).context;
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public publishResult(result: Uint8Array): Ledger {
    this.circuitContext = this.contract.impureCircuits.publishResult(
      this.circuitContext,
      result,
    ).context;
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public revealPrediction(prediction: Uint8Array, salt: Uint8Array): Ledger {
    this.circuitContext = this.contract.impureCircuits.revealPrediction(
      this.circuitContext,
      prediction,
      salt,
    ).context;
    return ledger(this.circuitContext.currentQueryContext.state);
  }
}
