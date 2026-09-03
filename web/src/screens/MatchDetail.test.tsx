import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { MatchState, PredictionState } from "@privatepredict/contract";
import { MatchDetail } from "./MatchDetail.js";
import type { Match, PredictionStatus } from "../types.js";

const baseMatch: Match = {
  matchId: new Uint8Array(32).fill(1),
  teamA: "Team A",
  teamB: "Team B",
  deadline: Date.now() + 1000 * 60 * 60, // 1 hour from now
  matchState: MatchState.OPEN,
  matchResult: null,
  points: 0,
};

const SAMPLE_COMMITMENT = new Uint8Array(32).fill(9);

function noPrediction(): PredictionStatus {
  return {
    predictionState: PredictionState.NO_COMMITMENT,
    hasLocalPrediction: false,
    revealedPrediction: null,
    commitment: null,
  };
}

describe("MatchDetail", () => {
  it("shows an EmptyState when no match is configured", () => {
    render(
      <MatchDetail
        match={null}
        predictionStatus={null}
        walletConnected={false}
        isOrganizer={false}
        onSubmitPrediction={vi.fn()}
        onRevealPrediction={vi.fn()}
        onCloseMatch={vi.fn()}
        onPublishResult={vi.fn()}
      />,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("prompts to connect a wallet when OPEN + NO_COMMITMENT + disconnected", () => {
    render(
      <MatchDetail
        match={baseMatch}
        predictionStatus={noPrediction()}
        walletConnected={false}
        isOrganizer={false}
        onSubmitPrediction={vi.fn()}
        onRevealPrediction={vi.fn()}
        onCloseMatch={vi.fn()}
        onPublishResult={vi.fn()}
      />,
    );
    expect(screen.getByText(/connect a wallet to submit/i)).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("renders the PredictionSelector when OPEN + NO_COMMITMENT + connected", () => {
    render(
      <MatchDetail
        match={baseMatch}
        predictionStatus={noPrediction()}
        walletConnected={true}
        isOrganizer={false}
        onSubmitPrediction={vi.fn()}
        onRevealPrediction={vi.fn()}
        onCloseMatch={vi.fn()}
        onPublishResult={vi.fn()}
      />,
    );
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
  });

  it("hides the PredictionSelector and explains why once the deadline has passed", () => {
    render(
      <MatchDetail
        match={{ ...baseMatch, deadline: Date.now() - 1000 }}
        predictionStatus={noPrediction()}
        walletConnected={true}
        isOrganizer={false}
        onSubmitPrediction={vi.fn()}
        onRevealPrediction={vi.fn()}
        onCloseMatch={vi.fn()}
        onPublishResult={vi.fn()}
      />,
    );
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(
      screen.getByText(/submission deadline has passed/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/client-side convenience only/i),
    ).toBeInTheDocument();
  });

  it("shows a submitted-awaiting-result message when OPEN + COMMITTED", () => {
    render(
      <MatchDetail
        match={baseMatch}
        predictionStatus={{
          predictionState: PredictionState.COMMITTED,
          hasLocalPrediction: true,
          revealedPrediction: null,
          commitment: SAMPLE_COMMITMENT,
        }}
        walletConnected={true}
        isOrganizer={false}
        onSubmitPrediction={vi.fn()}
        onRevealPrediction={vi.fn()}
        onCloseMatch={vi.fn()}
        onPublishResult={vi.fn()}
      />,
    );
    expect(screen.getByText(/awaiting the result/i)).toBeInTheDocument();
  });

  it("shows the submission-closed message when CLOSED + NO_COMMITMENT", () => {
    render(
      <MatchDetail
        match={{ ...baseMatch, matchState: MatchState.CLOSED }}
        predictionStatus={noPrediction()}
        walletConnected={true}
        isOrganizer={false}
        onSubmitPrediction={vi.fn()}
        onRevealPrediction={vi.fn()}
        onCloseMatch={vi.fn()}
        onPublishResult={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/submission window has closed/i),
    ).toBeInTheDocument();
  });

  it("offers the reveal trigger only once RESULT_PUBLISHED + COMMITTED + connected", () => {
    render(
      <MatchDetail
        match={{
          ...baseMatch,
          matchState: MatchState.RESULT_PUBLISHED,
          matchResult: "HOME",
        }}
        predictionStatus={{
          predictionState: PredictionState.COMMITTED,
          hasLocalPrediction: true,
          revealedPrediction: null,
          commitment: SAMPLE_COMMITMENT,
        }}
        walletConnected={true}
        isOrganizer={false}
        onSubmitPrediction={vi.fn()}
        onRevealPrediction={vi.fn()}
        onCloseMatch={vi.fn()}
        onPublishResult={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Reveal Prediction" }),
    ).toBeInTheDocument();
  });

  it("does not offer reveal before the result is published, even if committed", () => {
    render(
      <MatchDetail
        match={{ ...baseMatch, matchState: MatchState.CLOSED }}
        predictionStatus={{
          predictionState: PredictionState.COMMITTED,
          hasLocalPrediction: true,
          revealedPrediction: null,
          commitment: SAMPLE_COMMITMENT,
        }}
        walletConnected={true}
        isOrganizer={false}
        onSubmitPrediction={vi.fn()}
        onRevealPrediction={vi.fn()}
        onCloseMatch={vi.fn()}
        onPublishResult={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Reveal Prediction" }),
    ).not.toBeInTheDocument();
  });

  it("does not offer the prediction/reveal actions while disconnected, even mid-match", () => {
    render(
      <MatchDetail
        match={{
          ...baseMatch,
          matchState: MatchState.RESULT_PUBLISHED,
          matchResult: "HOME",
        }}
        predictionStatus={{
          predictionState: PredictionState.COMMITTED,
          hasLocalPrediction: true,
          revealedPrediction: null,
          commitment: SAMPLE_COMMITMENT,
        }}
        walletConnected={false}
        isOrganizer={false}
        onSubmitPrediction={vi.fn()}
        onRevealPrediction={vi.fn()}
        onCloseMatch={vi.fn()}
        onPublishResult={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Reveal Prediction" }),
    ).not.toBeInTheDocument();
  });

  it("shows the revealed prediction, result, and points once REVEALED", () => {
    render(
      <MatchDetail
        match={{
          ...baseMatch,
          matchState: MatchState.RESULT_PUBLISHED,
          matchResult: "HOME",
          points: 3,
        }}
        predictionStatus={{
          predictionState: PredictionState.REVEALED,
          hasLocalPrediction: false,
          revealedPrediction: "HOME",
          commitment: SAMPLE_COMMITMENT,
        }}
        walletConnected={true}
        isOrganizer={false}
        onSubmitPrediction={vi.fn()}
        onRevealPrediction={vi.fn()}
        onCloseMatch={vi.fn()}
        onPublishResult={vi.fn()}
      />,
    );
    expect(screen.getByText(/points: 3/i)).toBeInTheDocument();
  });

  it("shows the match info card with status, deadline, and commitment once committed", () => {
    render(
      <MatchDetail
        match={baseMatch}
        predictionStatus={{
          predictionState: PredictionState.COMMITTED,
          hasLocalPrediction: true,
          revealedPrediction: null,
          commitment: SAMPLE_COMMITMENT,
        }}
        walletConnected={true}
        isOrganizer={false}
        onSubmitPrediction={vi.fn()}
        onRevealPrediction={vi.fn()}
        onCloseMatch={vi.fn()}
        onPublishResult={vi.fn()}
      />,
    );
    expect(screen.getByText("Match ID")).toBeInTheDocument();
    expect(screen.getAllByText("Open")).toHaveLength(2); // timeline node + status badge
    // "Your commitment" also appears in the PrivacyPanel's public list — both are expected here.
    expect(screen.getAllByText("Your commitment").length).toBeGreaterThan(0);
  });

  it("does not show a commitment row before any commitment exists", () => {
    render(
      <MatchDetail
        match={baseMatch}
        predictionStatus={noPrediction()}
        walletConnected={true}
        isOrganizer={false}
        onSubmitPrediction={vi.fn()}
        onRevealPrediction={vi.fn()}
        onCloseMatch={vi.fn()}
        onPublishResult={vi.fn()}
      />,
    );
    expect(screen.queryByText("Your commitment")).not.toBeInTheDocument();
  });

  it("opens the commit dialog after selecting and submitting an outcome", async () => {
    const user = userEvent.setup();
    render(
      <MatchDetail
        match={baseMatch}
        predictionStatus={noPrediction()}
        walletConnected={true}
        isOrganizer={false}
        onSubmitPrediction={vi
          .fn()
          .mockResolvedValue({ ok: true, txHash: "abc" })}
        onRevealPrediction={vi.fn()}
        onCloseMatch={vi.fn()}
        onPublishResult={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("radio", { name: "HOME" }));
    await user.click(screen.getByRole("button", { name: "Submit Prediction" }));
    expect(
      screen.getByRole("dialog", { name: /commit prediction: HOME/i }),
    ).toBeInTheDocument();
  });

  it("shows organizer controls alongside participant controls when isOrganizer is true", () => {
    render(
      <MatchDetail
        match={baseMatch}
        predictionStatus={noPrediction()}
        walletConnected={true}
        isOrganizer={true}
        onSubmitPrediction={vi.fn()}
        onRevealPrediction={vi.fn()}
        onCloseMatch={vi.fn()}
        onPublishResult={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", { name: /organizer controls/i }),
    ).toBeInTheDocument();
    // Participant controls remain visible too — organizer status doesn't hide them.
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
  });

  it("does not show organizer controls when isOrganizer is false", () => {
    render(
      <MatchDetail
        match={baseMatch}
        predictionStatus={noPrediction()}
        walletConnected={true}
        isOrganizer={false}
        onSubmitPrediction={vi.fn()}
        onRevealPrediction={vi.fn()}
        onCloseMatch={vi.fn()}
        onPublishResult={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("heading", { name: /organizer controls/i }),
    ).not.toBeInTheDocument();
  });
});
