import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { OrganizerKeyInput } from "./OrganizerKeyInput.js";
import { hexToBytes } from "../hex.js";

const VALID_KEY = "a".repeat(64);

describe("OrganizerKeyInput", () => {
  it("is collapsed by default", () => {
    render(<OrganizerKeyInput onImport={vi.fn()} />);
    expect(
      screen.queryByLabelText("Organizer secret key"),
    ).not.toBeInTheDocument();
  });

  it("imports a valid 64-character hex key", async () => {
    const user = userEvent.setup();
    const onImport = vi.fn();
    render(<OrganizerKeyInput onImport={onImport} />);

    await user.click(screen.getByText(/i'm the organizer/i));
    await user.type(screen.getByLabelText("Organizer secret key"), VALID_KEY);

    expect(onImport).toHaveBeenLastCalledWith(hexToBytes(VALID_KEY));
  });

  it("rejects a key of the wrong length", async () => {
    const user = userEvent.setup();
    const onImport = vi.fn();
    render(<OrganizerKeyInput onImport={onImport} />);

    await user.click(screen.getByText(/i'm the organizer/i));
    await user.type(screen.getByLabelText("Organizer secret key"), "abcd");

    expect(screen.getByRole("alert")).toHaveTextContent(
      /64-character hex string/i,
    );
    expect(onImport).toHaveBeenLastCalledWith(null);
  });

  it("rejects non-hex characters", async () => {
    const user = userEvent.setup();
    const onImport = vi.fn();
    render(<OrganizerKeyInput onImport={onImport} />);

    await user.click(screen.getByText(/i'm the organizer/i));
    await user.type(
      screen.getByLabelText("Organizer secret key"),
      "z".repeat(64),
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(onImport).toHaveBeenLastCalledWith(null);
  });

  it("clears the imported key when the field is emptied", async () => {
    const user = userEvent.setup();
    const onImport = vi.fn();
    render(<OrganizerKeyInput onImport={onImport} />);

    await user.click(screen.getByText(/i'm the organizer/i));
    const input = screen.getByLabelText("Organizer secret key");
    await user.type(input, VALID_KEY);
    await user.clear(input);

    expect(onImport).toHaveBeenLastCalledWith(null);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
