import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PrivacyPanel } from "./PrivacyPanel.js";

describe("PrivacyPanel", () => {
  it("exposes public/private regions labelled with the current stage", () => {
    render(<PrivacyPanel predictionState="committed" />);
    expect(
      screen.getByRole("region", { name: "Private information — committed" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Public information — committed" }),
    ).toBeInTheDocument();
  });

  it("shows the salt as private before commitment", () => {
    render(<PrivacyPanel predictionState="before-commitment" />);
    expect(screen.getByText(/future random salt/i)).toBeInTheDocument();
  });

  it("never claims complete anonymity, and notes timing/address observability", () => {
    render(<PrivacyPanel predictionState="revealed" />);
    expect(
      screen.getByText(/does not provide complete anonymity/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /wallet address and transaction timing may remain observable/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows no active unrevealed prediction data once revealed", () => {
    render(<PrivacyPanel predictionState="revealed" />);
    expect(
      screen.getByText(/no active unrevealed prediction data/i),
    ).toBeInTheDocument();
  });
});
