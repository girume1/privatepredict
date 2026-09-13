import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MatchState } from "@privatepredict/contract";
import { MatchStateTimeline } from "./MatchStateTimeline.js";

describe("MatchStateTimeline", () => {
  it("renders all three step labels", () => {
    render(<MatchStateTimeline current={MatchState.OPEN} />);
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
    expect(screen.getByText("Result published")).toBeInTheDocument();
  });

  it("marks the current step with aria-current=step", () => {
    render(<MatchStateTimeline current={MatchState.CLOSED} />);
    expect(screen.getByText("Closed").closest("li")).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(screen.getByText("Open").closest("li")).not.toHaveAttribute(
      "aria-current",
    );
    expect(
      screen.getByText("Result published").closest("li"),
    ).not.toHaveAttribute("aria-current");
  });

  it("applies the active class to the current step", () => {
    render(<MatchStateTimeline current={MatchState.RESULT_PUBLISHED} />);
    expect(screen.getByText("Result published").closest("li")).toHaveClass(
      "active",
    );
  });

  it("applies the past class to steps before the current one", () => {
    render(<MatchStateTimeline current={MatchState.RESULT_PUBLISHED} />);
    expect(screen.getByText("Open").closest("li")).toHaveClass("past");
    expect(screen.getByText("Closed").closest("li")).toHaveClass("past");
  });

  it("applies the future class to steps after the current one", () => {
    render(<MatchStateTimeline current={MatchState.OPEN} />);
    expect(screen.getByText("Closed").closest("li")).toHaveClass("future");
    expect(screen.getByText("Result published").closest("li")).toHaveClass(
      "future",
    );
  });

  it("renders a check icon for past steps", () => {
    render(<MatchStateTimeline current={MatchState.RESULT_PUBLISHED} />);
    // The Open and Closed steps are past — their dots contain a check icon.
    // lucide-react renders SVGs; we check for the dot container class on past
    // steps rather than querying the SVG directly.
    const openStep = screen.getByText("Open").closest("li");
    const closedStep = screen.getByText("Closed").closest("li");
    expect(
      openStep?.querySelector(".match-state-timeline-dot svg"),
    ).toBeTruthy();
    expect(
      closedStep?.querySelector(".match-state-timeline-dot svg"),
    ).toBeTruthy();
  });

  it("does not render a check icon for the active or future steps", () => {
    render(<MatchStateTimeline current={MatchState.OPEN} />);
    const openStep = screen.getByText("Open").closest("li");
    const closedStep = screen.getByText("Closed").closest("li");
    // Active step dot has no SVG check
    expect(
      openStep?.querySelector(".match-state-timeline-dot svg"),
    ).toBeFalsy();
    // Future step dot has no SVG check
    expect(
      closedStep?.querySelector(".match-state-timeline-dot svg"),
    ).toBeFalsy();
  });

  it("has an accessible list label", () => {
    render(<MatchStateTimeline current={MatchState.OPEN} />);
    expect(
      screen.getByRole("list", { name: "Match progress" }),
    ).toBeInTheDocument();
  });
});
