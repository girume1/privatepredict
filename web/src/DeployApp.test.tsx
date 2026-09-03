import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DeployApp } from "./DeployApp.js";
import { connectAndDeploy } from "./wallet/connect.js";

vi.mock("./wallet/connect.js", () => ({
  connectAndDeploy: vi.fn(),
}));

const mockedConnectAndDeploy = vi.mocked(connectAndDeploy);

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Home team"), "Team A");
  await user.type(screen.getByLabelText("Away team"), "Team B");
  const deadlineInput = screen.getByLabelText("Submission deadline");
  await user.click(deadlineInput);
  await user.type(deadlineInput, "2030-01-01T00:00");
}

describe("DeployApp", () => {
  beforeEach(() => {
    mockedConnectAndDeploy.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("disables the deploy button until team names and a deadline are filled in", async () => {
    const user = userEvent.setup();
    render(<DeployApp />);
    const button = screen.getByRole("button", {
      name: /connect wallet & deploy/i,
    });
    expect(button).toBeDisabled();

    await fillRequiredFields(user);
    expect(button).toBeEnabled();
  });

  it("shows the generated match ID and organizer secret key before deploying", () => {
    render(<DeployApp />);
    expect(screen.getByText(/generated match id/i)).toBeInTheDocument();
    expect(
      screen.getByText(/generated organizer secret key/i),
    ).toBeInTheDocument();
  });

  it("warns that the organizer secret key must be saved and does not survive a reload", () => {
    render(<DeployApp />);
    expect(screen.getByText(/save this secret key now/i)).toBeInTheDocument();
    expect(
      screen.getByText(/does not survive a page reload/i),
    ).toBeInTheDocument();
  });

  it("shows the contract address and organizer secret key together on success", async () => {
    vi.stubEnv("VITE_NETWORK_ID", "testnet");
    const user = userEvent.setup();
    mockedConnectAndDeploy.mockResolvedValue({
      walletAddress: "wallet-address",
      contractAddress: "0xcontractaddress",
    });
    render(<DeployApp />);
    await fillRequiredFields(user);
    await user.click(
      screen.getByRole("button", { name: /connect wallet & deploy/i }),
    );

    expect(await screen.findByText(/match deployed/i)).toBeInTheDocument();
    expect(screen.getByText("0xcontractaddress")).toBeInTheDocument();
    expect(
      screen.getByText(/VITE_PREDICTION_BOARD_ADDRESS/i),
    ).toBeInTheDocument();
  });

  it("shows a clear error when the wallet connection fails, without pretending success", async () => {
    vi.stubEnv("VITE_NETWORK_ID", "testnet");
    const user = userEvent.setup();
    mockedConnectAndDeploy.mockRejectedValue(
      new Error("Could not find Midnight Lace wallet. Extension installed?"),
    );
    render(<DeployApp />);
    await fillRequiredFields(user);
    await user.click(
      screen.getByRole("button", { name: /connect wallet & deploy/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /could not find midnight lace wallet/i,
    );
  });

  it("requires VITE_NETWORK_ID to be configured before attempting to connect", async () => {
    // Explicitly force the unconfigured case rather than relying on it
    // being unset by default — a real .env.local (e.g. for local dev
    // against an actual wallet) would otherwise leak in via Vite's env
    // loading, which Vitest shares, and silently break this assumption.
    vi.stubEnv("VITE_NETWORK_ID", "");
    const user = userEvent.setup();
    render(<DeployApp />);
    await fillRequiredFields(user);
    await user.click(
      screen.getByRole("button", { name: /connect wallet & deploy/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /VITE_NETWORK_ID must be configured/i,
    );
    expect(mockedConnectAndDeploy).not.toHaveBeenCalled();
  });
});
