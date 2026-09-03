import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Brand } from "./Brand.js";

describe("Brand", () => {
  it("renders the wordmark", () => {
    render(<Brand />);
    expect(screen.getByText("Private")).toBeInTheDocument();
    expect(screen.getByText("Predict")).toBeInTheDocument();
  });

  it("hides the tagline by default", () => {
    render(<Brand />);
    expect(
      screen.queryByText(/predict privately\. reveal verifiably\./i),
    ).not.toBeInTheDocument();
  });

  it("shows the tagline when requested", () => {
    render(<Brand tagline />);
    expect(
      screen.getByText(/predict privately\. reveal verifiably\./i),
    ).toBeInTheDocument();
  });
});
