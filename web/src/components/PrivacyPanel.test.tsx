import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PrivacyPanel } from "./PrivacyPanel.js";

describe("PrivacyPanel", () => {
  it("exposes public and private regions labelled with the current stage", () => {
    render(<PrivacyPanel predictionState="committed" />);
    expect(
      screen.getByRole("region", { name: "Public information — committed" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Private information — committed" }),
    ).toBeInTheDocument();
  });

  it("renders On-chain and Private, local column headings", () => {
    render(<PrivacyPanel predictionState="before-commitment" />);
    expect(screen.getByText("On-chain")).toBeInTheDocument();
    expect(screen.getByText("Private, local")).toBeInTheDocument();
  });

  it("shows the correct stage note before commitment", () => {
    render(<PrivacyPanel predictionState="before-commitment" />);
    expect(
      screen.getByText(/your pick and salt stay in this browser/i),
    ).toBeInTheDocument();
  });

  it("shows the correct stage note when committed", () => {
    render(<PrivacyPanel predictionState="committed" />);
    expect(
      screen.getByText(/your commitment is locked on-chain/i),
    ).toBeInTheDocument();
  });

  it("shows the correct stage note when revealed", () => {
    render(<PrivacyPanel predictionState="revealed" />);
    expect(
      screen.getByText(/reveal proves your commitment matched your pick/i),
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

  it("labels the private column neutrally when the slot belongs to another participant", () => {
    render(<PrivacyPanel predictionState="committed" ownsPrediction={false} />);
    expect(
      screen.getByRole("region", {
        name: /private information — another participant's slot/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/nothing of yours/i)).toBeInTheDocument();
    expect(
      screen.queryByText("Your plaintext prediction"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/another participant's commitment/i),
    ).toBeInTheDocument();
  });

  it("keeps the personal committed view for the slot owner", () => {
    render(<PrivacyPanel predictionState="committed" ownsPrediction={true} />);
    expect(screen.getByText("Your plaintext prediction")).toBeInTheDocument();
    expect(screen.getByText("Your commitment")).toBeInTheDocument();
  });

  it("public region appears before private region in the DOM", () => {
    render(<PrivacyPanel predictionState="committed" />);
    const regions = screen.getAllByRole("region");
    const publicIndex = regions.findIndex((r) =>
      r.getAttribute("aria-label")?.startsWith("Public"),
    );
    const privateIndex = regions.findIndex((r) =>
      r.getAttribute("aria-label")?.startsWith("Private"),
    );
    expect(publicIndex).toBeLessThan(privateIndex);
  });
});
