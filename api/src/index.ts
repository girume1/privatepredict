/**
 * The PredictionBoard API facade: deploy/join a contract instance and expose
 * typed methods for each circuit, plus a derived-state observable combining
 * public ledger state with the locally-held identity keys.
 *
 * Modeled directly on the official Midnight bulletin-board example's
 * `api/src/index.ts` (BBoardAPI), adapted for PredictionBoard's circuits and
 * lifecycle.
 */

import { type ContractAddress } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { toHex } from "@midnight-ntwrk/midnight-js-utils";
import {
  deployContract,
  findDeployedContract,
} from "@midnight-ntwrk/midnight-js-contracts";
import { combineLatest, map, from, type Observable } from "rxjs";
import {
  CompiledPredictionBoardContractContract,
  MatchState,
  PredictionState,
  ledger,
  pureCircuits,
} from "@privatepredict/contract";
import {
  predictionBoardPrivateStateKey,
  type PredictionBoardContract,
  type PredictionBoardProviders,
  type DeployedPredictionBoardContract,
} from "./common-types.js";
import { decodeOutcome, type Outcome } from "./outcome.js";
import { generateSecretKey } from "./crypto.js";
import {
  createPrivatePredictPrivateState,
  type PrivatePredictPrivateState,
} from "./privateState.js";

export * from "./errors.js";
export * from "./crypto.js";
export * from "./outcome.js";
export * from "./commitment.js";
export * from "./privateState.js";
export * from "./common-types.js";

/**
 * Public ledger state combined with what the locally-held identity keys
 * imply about the connected user's relationship to this match.
 */
export type PredictionBoardDerivedState = {
  readonly matchId: Uint8Array;
  readonly teamA: string;
  readonly teamB: string;
  readonly deadline: bigint;
  readonly matchState: MatchState;
  readonly matchResult: Outcome | null;
  readonly organizer: Uint8Array;
  readonly predictionState: PredictionState;
  readonly commitment: Uint8Array;
  readonly points: bigint;
  readonly revealedPrediction: Outcome | null;
  /** True when the locally-held organizer secret key matches this deployment's organizer. */
  readonly isOrganizer: boolean;
  /** True when the locally-held participant secret key matches the committed prediction's owner. */
  readonly isPredictionOwner: boolean;
};

export interface DeployedPredictionBoardAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<PredictionBoardDerivedState>;

  submitPrediction(commitment: Uint8Array): Promise<void>;
  closeMatch(): Promise<void>;
  publishResult(result: Uint8Array): Promise<void>;
  revealPrediction(prediction: Uint8Array, salt: Uint8Array): Promise<void>;
}

export class PredictionBoardAPI implements DeployedPredictionBoardAPI {
  private constructor(
    public readonly deployedContract: DeployedPredictionBoardContract,
    providers: PredictionBoardProviders,
  ) {
    this.deployedContractAddress =
      deployedContract.deployTxData.public.contractAddress;
    providers.privateStateProvider.setContractAddress(
      this.deployedContractAddress,
    );

    this.state$ = combineLatest(
      [
        providers.publicDataProvider
          .contractStateObservable(this.deployedContractAddress, {
            type: "latest",
          })
          .pipe(map((contractState) => ledger(contractState.data))),
        from(
          providers.privateStateProvider.get(
            predictionBoardPrivateStateKey,
          ) as Promise<PrivatePredictPrivateState>,
        ),
      ],
      (ledgerState, privateState): PredictionBoardDerivedState => {
        const organizerPublicKey = pureCircuits.organizerPublicKey(
          privateState.organizerSecretKey,
        );
        const predictionOwner = pureCircuits.participantId(
          privateState.participantSecretKey,
          ledgerState.matchId,
        );

        return {
          matchId: ledgerState.matchId,
          teamA: ledgerState.teamA,
          teamB: ledgerState.teamB,
          deadline: ledgerState.deadline,
          matchState: ledgerState.matchState,
          matchResult: ledgerState.matchResult.is_some
            ? decodeOutcome(ledgerState.matchResult.value)
            : null,
          organizer: ledgerState.organizer,
          predictionState: ledgerState.predictionState,
          commitment: ledgerState.commitment,
          points: ledgerState.points,
          revealedPrediction: ledgerState.revealedPrediction.is_some
            ? decodeOutcome(ledgerState.revealedPrediction.value)
            : null,
          isOrganizer:
            toHex(organizerPublicKey) === toHex(ledgerState.organizer),
          isPredictionOwner:
            toHex(predictionOwner) === toHex(ledgerState.predictionOwner),
        };
      },
    );
  }

  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<PredictionBoardDerivedState>;

  /**
   * Submits a commitment only — the salt is never a circuit parameter. See
   * contract/src/prediction-board.compact for the verified privacy-safe
   * `submitPrediction` signature.
   */
  async submitPrediction(commitment: Uint8Array): Promise<void> {
    await this.deployedContract.callTx.submitPrediction(commitment);
  }

  /** Organizer-only on-chain; succeeds even with no prediction submitted. */
  async closeMatch(): Promise<void> {
    await this.deployedContract.callTx.closeMatch();
  }

  /** Organizer-only on-chain; happens before reveal, not after. */
  async publishResult(result: Uint8Array): Promise<void> {
    await this.deployedContract.callTx.publishResult(result);
  }

  /**
   * Only accepted once the match's `matchState` is `RESULT_PUBLISHED`; the
   * circuit itself verifies the caller is the original committer.
   */
  async revealPrediction(
    prediction: Uint8Array,
    salt: Uint8Array,
  ): Promise<void> {
    await this.deployedContract.callTx.revealPrediction(prediction, salt);
  }

  /**
   * Deploys a new PredictionBoard contract — i.e. creates a new match. There
   * is no `createMatch` circuit; a match is created by deployment.
   */
  static async deploy(
    providers: PredictionBoardProviders,
    matchId: Uint8Array,
    teamA: string,
    teamB: string,
    deadline: bigint,
    organizerSecretKey: Uint8Array,
  ): Promise<PredictionBoardAPI> {
    const deployed = await deployContract(providers, {
      compiledContract: CompiledPredictionBoardContractContract,
      privateStateId: predictionBoardPrivateStateKey,
      initialPrivateState: createPrivatePredictPrivateState(
        generateSecretKey(),
        organizerSecretKey,
      ),
      args: [matchId, teamA, teamB, deadline, organizerSecretKey],
    });

    return new PredictionBoardAPI(deployed, providers);
  }

  /** Joins an already-deployed PredictionBoard contract at `contractAddress`. */
  static async join(
    providers: PredictionBoardProviders,
    contractAddress: ContractAddress,
  ): Promise<PredictionBoardAPI> {
    // Must happen before getPrivateState()'s .get() call below — the
    // private state provider scopes reads/writes by contract address and
    // throws if asked to read before this is set. (This was previously
    // missing and would have thrown on every real join() call; the
    // constructor calls setContractAddress() too, but only after
    // findDeployedContract() has already resolved, which is too late for
    // this read.)
    providers.privateStateProvider.setContractAddress(contractAddress);

    const deployed = await findDeployedContract<PredictionBoardContract>(
      providers,
      {
        contractAddress,
        compiledContract: CompiledPredictionBoardContractContract,
        privateStateId: predictionBoardPrivateStateKey,
        initialPrivateState:
          await PredictionBoardAPI.getPrivateState(providers),
      },
    );

    return new PredictionBoardAPI(deployed, providers);
  }

  private static async getPrivateState(
    providers: PredictionBoardProviders,
  ): Promise<PrivatePredictPrivateState> {
    const existing = await providers.privateStateProvider.get(
      predictionBoardPrivateStateKey,
    );
    return (
      existing ??
      createPrivatePredictPrivateState(generateSecretKey(), generateSecretKey())
    );
  }
}
