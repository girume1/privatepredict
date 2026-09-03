import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { WalletConnect } from "./WalletConnect.js";

describe("WalletConnect", () => {
  it("shows only a Connect Wallet button when disconnected", () => {
    render(
      <WalletConnect
        connected={false}
        address={null}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /connect wallet/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /disconnect/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the truncated address and Disconnect when connected", () => {
    render(
      <WalletConnect
        connected
        address="0x1234567890abcdef"
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />,
    );
    expect(screen.getByText("0x1234…cdef")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /disconnect/i }),
    ).toBeInTheDocument();
  });

  it("calls onConnect when the connect button is activated", async () => {
    const user = userEvent.setup();
    const onConnect = vi.fn();
    render(
      <WalletConnect
        connected={false}
        address={null}
        onConnect={onConnect}
        onDisconnect={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /connect wallet/i }));
    expect(onConnect).toHaveBeenCalledOnce();
  });

  it("shows a connection error", () => {
    render(
      <WalletConnect
        connected={false}
        address={null}
        error="Connection declined"
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Connection declined");
  });
});
