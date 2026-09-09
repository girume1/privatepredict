import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { MatchState, PredictionState } from "@privatepredict/contract";
import { MatchDetail } from "./MatchDetail.js";
import type { Match, Outcome, PredictionStatus } from "../types.js";

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
    isPredictionOwner: false,
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
    expect(
      screen.getByText(/connect a wallet to load this match/i),
    ).toBeInTheDocument();
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
    expect(
      screen.getByText(/connect your wallet to submit a prediction/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("radio", { name: "HOME" }),
    ).not.toBeInTheDocument();
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
    expect(screen.getByRole("radio", { name: "HOME" })).toBeInTheDocument();
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
    expect(
      screen.queryByRole("radio", { name: "HOME" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/submission deadline has passed/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/contract itself does not enforce/i),
    ).toBeInTheDocument();
  });

  it("shows a submitted-awaiting-result message when OPEN + COMMITTED", () => {
    render(
      <MatchDetail
        match={baseMatch}
        predictionStatus={{
          predictionState: PredictionState.COMMITTED,
          hasLocalPrediction: true,
          isPredictionOwner: true,
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
          isPredictionOwner: true,
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
          isPredictionOwner: true,
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
          isPredictionOwner: true,
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
          isPredictionOwner: true,
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
    expect(screen.getByText(/\+3 points/i)).toBeInTheDocument();
  });

  it("shows the match info card with status, deadline, and commitment once committed", () => {
    render(
      <MatchDetail
        match={baseMatch}
        predictionStatus={{
          predictionState: PredictionState.COMMITTED,
          hasLocalPrediction: true,
          isPredictionOwner: true,
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
    expect(screen.getByRole("radio", { name: "HOME" })).toBeInTheDocument();
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

  it("does not frame another participant's commitment as yours", () => {
    render(
      <MatchDetail
        match={baseMatch}
        predictionStatus={{
          predictionState: PredictionState.COMMITTED,
          hasLocalPrediction: false,
          isPredictionOwner: false,
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
      screen.getByText(/prediction slot is held by another participant/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/your prediction.*committed/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Your commitment")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("radio", { name: "HOME" }),
    ).not.toBeInTheDocument();
  });

  it("does not offer reveal when the on-chain owner differs from this browser", () => {
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
          isPredictionOwner: false,
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

  it("explains when local reveal data is missing instead of offering an impossible reveal", () => {
    render(
      <MatchDetail
        match={{
          ...baseMatch,
          matchState: MatchState.RESULT_PUBLISHED,
          matchResult: "HOME",
        }}
        predictionStatus={{
          predictionState: PredictionState.COMMITTED,
          hasLocalPrediction: false,
          isPredictionOwner: true,
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
    expect(
      screen.getByText(/reveal data not found in this browser/i),
    ).toBeInTheDocument();
  });

  it("asks a disconnected owner to reconnect once the result is published", () => {
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
          isPredictionOwner: true,
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
      screen.getByText(/reconnect your wallet to reveal/i),
    ).toBeInTheDocument();
  });

  it("does not report another participant's revealed prediction as the viewer's", () => {
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
          isPredictionOwner: false,
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
    expect(screen.queryByText(/you predicted/i)).not.toBeInTheDocument();
    expect(screen.getByText(/match has been revealed/i)).toBeInTheDocument();
  });

  it("keeps the commit dialog open while the submission is pending and closes it on success", async () => {
    const user = userEvent.setup();
    let resolveSubmit!: (result: { ok: boolean; txHash?: string }) => void;
    const onSubmitPrediction = vi.fn(
      () =>
        new Promise<{ ok: boolean; txHash?: string }>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    render(
      <MatchDetail
        match={baseMatch}
        predictionStatus={noPrediction()}
        walletConnected={true}
        isOrganizer={false}
        onSubmitPrediction={onSubmitPrediction}
        onRevealPrediction={vi.fn()}
        onCloseMatch={vi.fn()}
        onPublishResult={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("radio", { name: "HOME" }));
    await user.click(screen.getByRole("button", { name: "Submit Prediction" }));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    // The transaction is unresolved: Confirm and Cancel are disabled and
    // the dialog cannot be dismissed via Cancel, Escape, or the backdrop.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await user.keyboard("{Escape}");
    await user.click(document.querySelector(".dialog-backdrop")!);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // A real success closes the modal (after the Confirmed state is shown).
    await act(async () => {
      resolveSubmit({ ok: true, txHash: "abc" });
    });
    expect(await screen.findByText(/confirmed/i)).toBeInTheDocument();
    await waitFor(
      () => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      },
      { timeout: 4000, interval: 100 },
    );
  });

  it("shows an error instead of a stuck loader when the submission throws", async () => {
    const user = userEvent.setup();
    render(
      <MatchDetail
        match={baseMatch}
        predictionStatus={noPrediction()}
        walletConnected={true}
        isOrganizer={false}
        onSubmitPrediction={vi.fn().mockRejectedValue(new Error("boom"))}
        onRevealPrediction={vi.fn()}
        onCloseMatch={vi.fn()}
        onPublishResult={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("radio", { name: "HOME" }));
    await user.click(screen.getByRole("button", { name: "Submit Prediction" }));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(await screen.findByText("boom")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  });

  it("keeps the reveal dialog open while the reveal is pending and closes it on success", async () => {
    const user = userEvent.setup();
    let resolveReveal!: (result: { ok: boolean; txHash?: string }) => void;
    const onRevealPrediction = vi.fn(
      () =>
        new Promise<{ ok: boolean; txHash?: string }>((resolve) => {
          resolveReveal = resolve;
        }),
    );
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
          isPredictionOwner: true,
          revealedPrediction: null,
          commitment: SAMPLE_COMMITMENT,
        }}
        walletConnected={true}
        isOrganizer={false}
        onSubmitPrediction={vi.fn()}
        onRevealPrediction={onRevealPrediction}
        onCloseMatch={vi.fn()}
        onPublishResult={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Reveal Prediction" }));
    await user.click(screen.getByRole("button", { name: "Confirm Reveal" }));

    // The transaction is unresolved: Confirm Reveal and Cancel are disabled
    // and the dialog cannot be dismissed (Escape does nothing).
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirm Reveal" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // A real success closes the modal (after the Confirmed state is shown).
    await act(async () => {
      resolveReveal({ ok: true });
    });
    expect(await screen.findByText(/confirmed/i)).toBeInTheDocument();
    await waitFor(
      () => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      },
      { timeout: 4000, interval: 100 },
    );
  });

  it("disables Confirm immediately and submits only once when activation is repeated", async () => {
    const user = userEvent.setup();
    type ActionResult = { ok: boolean; txHash?: string; error?: string };
    let resolveSubmit!: (result: ActionResult) => void;
    const onSubmitPrediction = vi.fn(
      (_outcome: Outcome) =>
        new Promise<ActionResult>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    render(
      <MatchDetail
        match={baseMatch}
        predictionStatus={noPrediction()}
        walletConnected={true}
        isOrganizer={false}
        onSubmitPrediction={onSubmitPrediction}
        onRevealPrediction={vi.fn()}
        onCloseMatch={vi.fn()}
        onPublishResult={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("radio", { name: "HOME" }));
    await user.click(screen.getByRole("button", { name: "Submit Prediction" }));
    await user.click(screen.getByRole("checkbox"));

    const confirm = screen.getByRole("button", { name: "Confirm" });
    await user.click(confirm);

    // Immediately disabled, and repeat activations do not create extra txs.
    expect(confirm).toBeDisabled();
    expect(screen.getByText(/submitting transaction/i)).toBeInTheDocument();
    await user.click(confirm);
    expect(onSubmitPrediction).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSubmit({ ok: true });
    });
  });

  it("shows Confirmed and closes the commit dialog automatically on success", async () => {
    const user = userEvent.setup();
    const onSubmitPrediction = vi.fn(
      async (_outcome: Outcome) =>
        ({ ok: true }) as { ok: boolean; txHash?: string; error?: string },
    );
    render(
      <MatchDetail
        match={baseMatch}
        predictionStatus={noPrediction()}
        walletConnected={true}
        isOrganizer={false}
        onSubmitPrediction={onSubmitPrediction}
        onRevealPrediction={vi.fn()}
        onCloseMatch={vi.fn()}
        onPublishResult={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("radio", { name: "HOME" }));
    await user.click(screen.getByRole("button", { name: "Submit Prediction" }));
    await user.click(screen.getByRole("checkbox"));

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByText(/confirmed/i)).toBeInTheDocument();
    await waitFor(
      () => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      },
      { timeout: 4000, interval: 100 },
    );
    expect(onSubmitPrediction).toHaveBeenCalledTimes(1);
  });
});
