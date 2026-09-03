import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MatchState } from "@privatepredict/contract";
import { MatchStateTimeline } from "./MatchStateTimeline.js";

describe("MatchStateTimeline", () => {
  it("renders all three states", () => {
    render(<MatchStateTimeline current={MatchState.OPEN} />);
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
    expect(screen.getByText("Result published")).toBeInTheDocument();
  });

  it("marks the current state as the active step", () => {
    render(<MatchStateTimeline current={MatchState.CLOSED} />);
    expect(screen.getByText("Closed")).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("Open")).not.toHaveAttribute("aria-current");
  });
});
