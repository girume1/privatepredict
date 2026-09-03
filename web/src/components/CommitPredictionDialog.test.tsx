import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { CommitPredictionDialog } from "./CommitPredictionDialog.js";

describe("CommitPredictionDialog", () => {
  it("disables confirm until the checkbox is checked", async () => {
    const user = userEvent.setup();
    render(
      <CommitPredictionDialog
        outcome="HOME"
        open
        onConfirm={vi.fn()}
        onDismiss={vi.fn()}
        txPhase="idle"
      />,
    );
    const confirm = screen.getByRole("button", { name: "Confirm" });
    expect(confirm).toBeDisabled();

    await user.click(screen.getByRole("checkbox"));
    expect(confirm).toBeEnabled();
  });

  it("never renders a salt value anywhere in the dialog", () => {
    render(
      <CommitPredictionDialog
        outcome="HOME"
        open
        onConfirm={vi.fn()}
        onDismiss={vi.fn()}
        txPhase="idle"
      />,
    );
    expect(screen.queryByText(/salt/i)).not.toBeInTheDocument();
  });

  it("shows all three required notices", () => {
    render(
      <CommitPredictionDialog
        outcome="DRAW"
        open
        onConfirm={vi.fn()}
        onDismiss={vi.fn()}
        txPhase="idle"
      />,
    );
    expect(
      screen.getByText(/submitted to the blockchain/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/remain private until you choose to reveal/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/retain your wallet connection/i),
    ).toBeInTheDocument();
  });

  it("disables cancel and confirm while a transaction is pending", () => {
    render(
      <CommitPredictionDialog
        outcome="HOME"
        open
        onConfirm={vi.fn()}
        onDismiss={vi.fn()}
        txPhase="proving"
      />,
    );
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("can be dismissed after a successful submission — does not get stuck", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <CommitPredictionDialog
        outcome="HOME"
        open
        onConfirm={vi.fn()}
        onDismiss={onDismiss}
        txPhase="success"
      />,
    );
    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(cancel).toBeEnabled();
    await user.click(cancel);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("can be dismissed after a failed submission", () => {
    render(
      <CommitPredictionDialog
        outcome="HOME"
        open
        onConfirm={vi.fn()}
        onDismiss={vi.fn()}
        txPhase="error"
        errorMessage="Something went wrong"
      />,
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  });
});
