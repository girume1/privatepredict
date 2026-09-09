import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ParticipantKeyInput } from "./ParticipantKeyInput.js";
import { hexToBytes } from "../hex.js";

const VALID_KEY = "b".repeat(64);

describe("ParticipantKeyInput", () => {
  it("is collapsed by default", () => {
    render(<ParticipantKeyInput onImport={vi.fn()} />);
    expect(
      screen.queryByLabelText("Participant secret key"),
    ).not.toBeInTheDocument();
  });

  it("expands when the summary is clicked", async () => {
    const user = userEvent.setup();
    render(<ParticipantKeyInput onImport={vi.fn()} />);

    await user.click(
      screen.getByRole("button", { name: /i'm a returning participant/i }),
    );

    expect(screen.getByLabelText("Participant secret key")).toBeInTheDocument();
  });

  it("imports a valid 64-character hex key", async () => {
    const user = userEvent.setup();
    const onImport = vi.fn();
    render(<ParticipantKeyInput onImport={onImport} />);

    await user.click(screen.getByText(/i'm a returning participant/i));
    await user.type(screen.getByLabelText("Participant secret key"), VALID_KEY);

    expect(onImport).toHaveBeenLastCalledWith(hexToBytes(VALID_KEY));
  });

  it("rejects a key of the wrong length", async () => {
    const user = userEvent.setup();
    const onImport = vi.fn();
    render(<ParticipantKeyInput onImport={onImport} />);

    await user.click(screen.getByText(/i'm a returning participant/i));
    await user.type(screen.getByLabelText("Participant secret key"), "abcd");

    expect(screen.getByRole("alert")).toHaveTextContent(
      /64-character hex string/i,
    );
    expect(onImport).toHaveBeenLastCalledWith(null);
  });

  it("rejects non-hex characters", async () => {
    const user = userEvent.setup();
    const onImport = vi.fn();
    render(<ParticipantKeyInput onImport={onImport} />);

    await user.click(screen.getByText(/i'm a returning participant/i));
    await user.type(
      screen.getByLabelText("Participant secret key"),
      "z".repeat(64),
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(onImport).toHaveBeenLastCalledWith(null);
  });

  it("clears the imported key when the field is emptied", async () => {
    const user = userEvent.setup();
    const onImport = vi.fn();
    render(<ParticipantKeyInput onImport={onImport} />);

    await user.click(screen.getByText(/i'm a returning participant/i));
    const input = screen.getByLabelText("Participant secret key");
    await user.type(input, VALID_KEY);
    await user.clear(input);

    expect(onImport).toHaveBeenLastCalledWith(null);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("disables the input when disabled prop is true", () => {
    render(<ParticipantKeyInput onImport={vi.fn()} disabled />);

    // When disabled, the toggle button itself is disabled — the body never opens.
    expect(
      screen.getByRole("button", { name: /i'm a returning participant/i }),
    ).toBeDisabled();
  });

  it("shows the helper hint text", async () => {
    const user = userEvent.setup();
    render(<ParticipantKeyInput onImport={vi.fn()} />);

    await user.click(screen.getByText(/i'm a returning participant/i));

    expect(
      screen.getByText(/only needed if your browser storage was cleared/i),
    ).toBeInTheDocument();
  });
});
