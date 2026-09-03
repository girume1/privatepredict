import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { HowItWorks } from "./HowItWorks.js";

describe("HowItWorks", () => {
  it("describes the real commit/reveal flow, not an idealized one", () => {
    render(<HowItWorks />);
    expect(screen.getByText(/choose privately/i)).toBeInTheDocument();
    expect(screen.getByText(/commit a secret/i)).toBeInTheDocument();
    expect(screen.getByText(/reveal after the result/i)).toBeInTheDocument();
    expect(
      screen.getByText(/only the commitment goes on-chain/i),
    ).toBeInTheDocument();
  });

  it("never mentions a live sports feed or leaderboard", () => {
    render(<HowItWorks />);
    expect(screen.queryByText(/leaderboard/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/live/i)).not.toBeInTheDocument();
  });
});
