import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { MatchState } from "@privatepredict/contract";
import { OrganizerControls } from "./OrganizerControls.js";
import type { Match } from "../types.js";

const baseMatch: Match = {
  matchId: new Uint8Array(32).fill(1),
  teamA: "Team A",
  teamB: "Team B",
  deadline: Date.now() + 1000 * 60 * 60, // 1 hour from now
  matchState: MatchState.OPEN,
  matchResult: null,
  points: 0,
};

describe("OrganizerControls", () => {
  it("disables Close Match before the deadline, with an explanatory hint", () => {
    render(
      <OrganizerControls
        match={baseMatch}
        onCloseMatch={vi.fn()}
        onPublishResult={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Close Match" })).toBeDisabled();
    expect(
      screen.getByText(/client-side convenience only/i),
    ).toBeInTheDocument();
  });

  it("enables Close Match once the deadline has passed", () => {
    render(
      <OrganizerControls
        match={{ ...baseMatch, deadline: Date.now() - 1000 }}
        onCloseMatch={vi.fn()}
        onPublishResult={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Close Match" })).toBeEnabled();
  });

  it("calls onCloseMatch when Close Match is activated", async () => {
    const user = userEvent.setup();
    const onCloseMatch = vi.fn().mockResolvedValue({ ok: true });
    render(
      <OrganizerControls
        match={{ ...baseMatch, deadline: Date.now() - 1000 }}
        onCloseMatch={onCloseMatch}
        onPublishResult={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Close Match" }));
    expect(onCloseMatch).toHaveBeenCalledOnce();
  });

  it("does not render Close Match once the match is no longer OPEN", () => {
    render(
      <OrganizerControls
        match={{ ...baseMatch, matchState: MatchState.CLOSED }}
        onCloseMatch={vi.fn()}
        onPublishResult={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Close Match" }),
    ).not.toBeInTheDocument();
  });

  it("shows the result selector and disables Publish Result until a result is chosen", async () => {
    const user = userEvent.setup();
    render(
      <OrganizerControls
        match={{ ...baseMatch, matchState: MatchState.CLOSED }}
        onCloseMatch={vi.fn()}
        onPublishResult={vi.fn()}
      />,
    );
    const publishButton = screen.getByRole("button", {
      name: "Publish Result",
    });
    expect(publishButton).toBeDisabled();

    await user.selectOptions(screen.getByLabelText("Match result"), "HOME");
    expect(publishButton).toBeEnabled();
  });

  it("calls onPublishResult with the selected outcome", async () => {
    const user = userEvent.setup();
    const onPublishResult = vi.fn().mockResolvedValue({ ok: true });
    render(
      <OrganizerControls
        match={{ ...baseMatch, matchState: MatchState.CLOSED }}
        onCloseMatch={vi.fn()}
        onPublishResult={onPublishResult}
      />,
    );
    await user.selectOptions(screen.getByLabelText("Match result"), "DRAW");
    await user.click(screen.getByRole("button", { name: "Publish Result" }));

    expect(onPublishResult).toHaveBeenCalledWith("DRAW");
  });

  it("does not render the result selector before the match is closed", () => {
    render(
      <OrganizerControls
        match={baseMatch}
        onCloseMatch={vi.fn()}
        onPublishResult={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText("Match result")).not.toBeInTheDocument();
  });

  it("shows an error message when closing fails, without pretending success", async () => {
    const user = userEvent.setup();
    const onCloseMatch = vi.fn().mockResolvedValue({
      ok: false,
      error: "Only the organizer can close the match",
    });
    render(
      <OrganizerControls
        match={{ ...baseMatch, deadline: Date.now() - 1000 }}
        onCloseMatch={onCloseMatch}
        onPublishResult={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Close Match" }));

    expect(
      await screen.findByText("Only the organizer can close the match"),
    ).toBeInTheDocument();
  });
});
