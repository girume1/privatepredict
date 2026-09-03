import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";

export * from "./managed/prediction-board/contract/index.js";
export * from "./prediction-board-witnesses.js";

import * as CompiledPredictionBoardContract from "./managed/prediction-board/contract/index.js";
import * as Witnesses from "./prediction-board-witnesses.js";

export const CompiledPredictionBoardContractContract = CompiledContract.make<
  CompiledPredictionBoardContract.Contract<Witnesses.PrivatePredictPrivateState>
>(
  "PredictionBoard",
  CompiledPredictionBoardContract.Contract<Witnesses.PrivatePredictPrivateState>,
).pipe(
  CompiledContract.withWitnesses(Witnesses.witnesses),
  CompiledContract.withCompiledFileAssets("./managed/prediction-board"),
);
