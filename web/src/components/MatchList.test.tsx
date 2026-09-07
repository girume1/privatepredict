import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { MatchList } from "./MatchList.js";

const VALID_ADDRESS = "a".repeat(64);

describe("MatchList", () => {
  it("shows an empty state when there are no saved matches", () => {
    render(
      <MatchList
        matches={[]}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/no matches saved/i);
  });

  it("lists saved matches by label", () => {
    render(
      <MatchList
        matches={[{ address: VALID_ADDRESS, label: "Arsenal vs Chelsea" }]}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText("Arsenal vs Chelsea")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("calls onSelect with the address when a match is chosen", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <MatchList
        matches={[{ address: VALID_ADDRESS, label: "Arsenal vs Chelsea" }]}
        onSelect={onSelect}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    await user.click(screen.getByText("Arsenal vs Chelsea"));
    expect(onSelect).toHaveBeenCalledWith(VALID_ADDRESS);
  });

  it("calls onRemove with the address when the remove button is clicked", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(
      <MatchList
        matches={[{ address: VALID_ADDRESS, label: "Arsenal vs Chelsea" }]}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onRemove={onRemove}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Remove Arsenal vs Chelsea" }),
    );
    expect(onRemove).toHaveBeenCalledWith(VALID_ADDRESS);
  });

  it("adds a match with a valid hex address and clears the form", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(
      <MatchList
        matches={[]}
        onSelect={vi.fn()}
        onAdd={onAdd}
        onRemove={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText("Contract address"), VALID_ADDRESS);
    await user.type(screen.getByLabelText("Label (optional)"), "My Match");
    await user.click(screen.getByRole("button", { name: /add match/i }));

    expect(onAdd).toHaveBeenCalledWith(VALID_ADDRESS, "My Match");
    expect(screen.getByLabelText("Contract address")).toHaveValue("");
  });

  it("rejects a non-hex address without calling onAdd", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(
      <MatchList
        matches={[]}
        onSelect={vi.fn()}
        onAdd={onAdd}
        onRemove={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText("Contract address"), "not-hex!");
    await user.click(screen.getByRole("button", { name: /add match/i }));

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/hex characters only/i);
  });

  it("rejects an empty address without calling onAdd", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(
      <MatchList
        matches={[]}
        onSelect={vi.fn()}
        onAdd={onAdd}
        onRemove={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /add match/i }));

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("rejects a valid-hex address that is not a full 64-character contract address", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(
      <MatchList
        matches={[]}
        onSelect={vi.fn()}
        onAdd={onAdd}
        onRemove={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText("Contract address"), "abcd");
    await user.click(screen.getByRole("button", { name: /add match/i }));

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/64 hex characters/i);
  });
});
