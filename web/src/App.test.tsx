import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import App from "./App.js";

const ADDRESS = "a".repeat(64);

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders honestly as unconfigured, not a fake connected demo", () => {
    vi.stubEnv("VITE_PREDICTION_BOARD_ADDRESS", "");
    render(<App />);
    expect(screen.getByRole("status")).toHaveTextContent(/no matches saved/i);
  });

  it("lets a participant add a match by address and reach the connect flow", async () => {
    vi.stubEnv("VITE_PREDICTION_BOARD_ADDRESS", "");
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Contract address"), ADDRESS);
    await user.click(screen.getByRole("button", { name: /add match/i }));
    await user.click(screen.getByText(ADDRESS));

    expect(
      screen.getByRole("button", { name: /connect wallet/i }),
    ).toBeInTheDocument();
  });

  it("surfaces a clear configuration error rather than pretending to connect, when the network id is unset", async () => {
    // Explicit, not ambient — a real .env.local for local dev against an
    // actual wallet would otherwise leak in via Vite's env loading (shared
    // by Vitest) and silently break this test's assumption.
    vi.stubEnv("VITE_NETWORK_ID", "");
    vi.stubEnv("VITE_PREDICTION_BOARD_ADDRESS", "");
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Contract address"), ADDRESS);
    await user.click(screen.getByRole("button", { name: /add match/i }));
    await user.click(screen.getByText(ADDRESS));
    await user.click(screen.getByRole("button", { name: /connect wallet/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      /VITE_NETWORK_ID must be configured/i,
    );
  });

  it("seeds the match list from VITE_PREDICTION_BOARD_ADDRESS when configured", () => {
    vi.stubEnv("VITE_PREDICTION_BOARD_ADDRESS", ADDRESS);
    render(<App />);
    expect(screen.getByText("Default match")).toBeInTheDocument();
  });

  it("returns to the match list when Switch match is clicked", async () => {
    vi.stubEnv("VITE_PREDICTION_BOARD_ADDRESS", ADDRESS);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("Default match"));
    expect(
      screen.getByRole("button", { name: /connect wallet/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /switch match/i }));
    expect(screen.getByText("Default match")).toBeInTheDocument();
  });
});
