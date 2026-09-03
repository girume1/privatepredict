import { PredictionBoardSimulator } from "./prediction-board-simulator.js";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { describe, it, expect } from "vitest";
import { randomBytes } from "./utils.js";
import {
  MatchState,
  PredictionState,
  pureCircuits,
} from "../src/managed/prediction-board/contract/index.js";

setNetworkId("undeployed");

// Helper to compute commitment using the contract's pure circuit
function computeCommitment(
  prediction: Uint8Array,
  salt: Uint8Array,
): Uint8Array {
  return pureCircuits.computeCommitment(prediction, salt);
}

// Helper to compute organizer public key
function computeOrganizerPublicKey(secretKey: Uint8Array): Uint8Array {
  return pureCircuits.organizerPublicKey(secretKey);
}

// Fixed match setup shared by most tests
function setupMatch() {
  const participantKey = randomBytes(32);
  const matchId = randomBytes(32);
  const teamA = "Team A";
  const teamB = "Team B";
  const deadline = BigInt(1735689600); // Jan 1, 2025
  const organizerKey = randomBytes(32);
  const simulator = new PredictionBoardSimulator(
    participantKey,
    matchId,
    teamA,
    teamB,
    deadline,
    organizerKey,
  );
  return {
    participantKey,
    matchId,
    teamA,
    teamB,
    deadline,
    organizerKey,
    simulator,
  };
}

describe("PredictionBoard smart contract", () => {
  it("properly initializes ledger state with match metadata", () => {
    const { matchId, teamA, teamB, deadline, organizerKey, simulator } =
      setupMatch();
    const initialLedgerState = simulator.getLedger();

    expect(initialLedgerState.matchId).toEqual(matchId);
    expect(initialLedgerState.teamA).toEqual(teamA);
    expect(initialLedgerState.teamB).toEqual(teamB);
    expect(initialLedgerState.deadline).toEqual(deadline);
    expect(initialLedgerState.matchState).toEqual(MatchState.OPEN);
    expect(initialLedgerState.matchResult.is_some).toEqual(false);
    expect(initialLedgerState.organizer).toEqual(
      computeOrganizerPublicKey(organizerKey),
    );
    expect(initialLedgerState.predictionState).toEqual(
      PredictionState.NO_COMMITMENT,
    );
    expect(initialLedgerState.revealedPrediction.is_some).toEqual(false);
    expect(initialLedgerState.points).toEqual(0n);
  });

  it("lets you submit a prediction with a commitment only", () => {
    const { simulator } = setupMatch();
    const prediction = randomBytes(32);
    const salt = randomBytes(32);
    const commitment = computeCommitment(prediction, salt);

    simulator.submitPrediction(commitment);

    const ledgerState = simulator.getLedger();
    expect(ledgerState.predictionState).toEqual(PredictionState.COMMITTED);
    expect(ledgerState.commitment).toEqual(commitment);
  });

  it("lets the organizer close the match", () => {
    const { simulator } = setupMatch();
    const prediction = randomBytes(32);
    const salt = randomBytes(32);
    const commitment = computeCommitment(prediction, salt);

    simulator.submitPrediction(commitment);
    simulator.closeMatch();

    const ledgerState = simulator.getLedger();
    expect(ledgerState.matchState).toEqual(MatchState.CLOSED);
  });

  it("lets the organizer close the match even with no prediction submitted", () => {
    const { simulator } = setupMatch();

    simulator.closeMatch();

    const ledgerState = simulator.getLedger();
    expect(ledgerState.matchState).toEqual(MatchState.CLOSED);
  });

  it("rejects closeMatch from a non-organizer key", () => {
    const { simulator } = setupMatch();
    simulator.setOrganizerSecretKey(randomBytes(32));

    expect(() => {
      simulator.closeMatch();
    }).toThrow("Only the organizer can close the match");
  });

  it("lets the organizer publish the result after closing", () => {
    const { simulator } = setupMatch();
    const result = randomBytes(32);

    simulator.closeMatch();
    simulator.publishResult(result);

    const ledgerState = simulator.getLedger();
    expect(ledgerState.matchState).toEqual(MatchState.RESULT_PUBLISHED);
    expect(ledgerState.matchResult.is_some).toEqual(true);
    expect(ledgerState.matchResult.value).toEqual(result);
  });

  it("rejects publishResult from a non-organizer key", () => {
    const { simulator } = setupMatch();
    simulator.closeMatch();
    simulator.setOrganizerSecretKey(randomBytes(32));

    expect(() => {
      simulator.publishResult(randomBytes(32));
    }).toThrow("Only the organizer can publish the result");
  });

  it("rejects publishResult before the match is closed", () => {
    const { simulator } = setupMatch();

    expect(() => {
      simulator.publishResult(randomBytes(32));
    }).toThrow("Match is not closed");
  });

  it("lets the original participant reveal after the result is published, and awards points on a correct prediction", () => {
    const { simulator } = setupMatch();
    const prediction = randomBytes(32);
    const salt = randomBytes(32);
    const commitment = computeCommitment(prediction, salt);

    simulator.submitPrediction(commitment);
    simulator.closeMatch();
    simulator.publishResult(prediction);
    simulator.revealPrediction(prediction, salt);

    const ledgerState = simulator.getLedger();
    expect(ledgerState.predictionState).toEqual(PredictionState.REVEALED);
    expect(ledgerState.revealedPrediction.is_some).toEqual(true);
    expect(ledgerState.revealedPrediction.value).toEqual(prediction);
    expect(ledgerState.points).toEqual(3n);
  });

  it("awards zero points on an incorrect prediction", () => {
    const { simulator } = setupMatch();
    const prediction = randomBytes(32);
    const salt = randomBytes(32);
    const commitment = computeCommitment(prediction, salt);
    const actualResult = randomBytes(32);

    simulator.submitPrediction(commitment);
    simulator.closeMatch();
    simulator.publishResult(actualResult);
    simulator.revealPrediction(prediction, salt);

    const ledgerState = simulator.getLedger();
    expect(ledgerState.predictionState).toEqual(PredictionState.REVEALED);
    expect(ledgerState.points).toEqual(0n);
  });

  it("rejects reveal before the result is published", () => {
    const { simulator } = setupMatch();
    const prediction = randomBytes(32);
    const salt = randomBytes(32);
    const commitment = computeCommitment(prediction, salt);

    simulator.submitPrediction(commitment);
    simulator.closeMatch();

    expect(() => {
      simulator.revealPrediction(prediction, salt);
    }).toThrow("Result not yet published");
  });

  it("rejects an invalid prediction or salt at reveal", () => {
    const { simulator } = setupMatch();
    const prediction = randomBytes(32);
    const salt = randomBytes(32);
    const commitment = computeCommitment(prediction, salt);
    const wrongPrediction = randomBytes(32);

    simulator.submitPrediction(commitment);
    simulator.closeMatch();
    simulator.publishResult(randomBytes(32));

    expect(() => {
      simulator.revealPrediction(wrongPrediction, salt);
    }).toThrow("Invalid prediction or salt");
  });

  it("rejects reveal from a participant key that did not submit the commitment", () => {
    const { simulator } = setupMatch();
    const prediction = randomBytes(32);
    const salt = randomBytes(32);
    const commitment = computeCommitment(prediction, salt);

    simulator.submitPrediction(commitment);
    simulator.closeMatch();
    simulator.publishResult(randomBytes(32));
    simulator.setParticipantSecretKey(randomBytes(32));

    expect(() => {
      simulator.revealPrediction(prediction, salt);
    }).toThrow("Only the original participant can reveal this prediction");
  });

  it("doesn't let you close the match when it is not open", () => {
    const { simulator } = setupMatch();

    simulator.closeMatch();

    expect(() => {
      simulator.closeMatch();
    }).toThrow("Match is not open");
  });

  it("doesn't let you submit a prediction twice", () => {
    const { simulator } = setupMatch();
    const commitment = computeCommitment(randomBytes(32), randomBytes(32));

    simulator.submitPrediction(commitment);

    expect(() => {
      simulator.submitPrediction(commitment);
    }).toThrow("Prediction already submitted");
  });
});
