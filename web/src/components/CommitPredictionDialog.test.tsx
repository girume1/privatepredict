import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { CommitPredictionDialog } from "./CommitPredictionDialog.js";

const BUSY_PHASES = ["submitting", "proving", "pending"] as const;

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
      screen.getByText(/stored only in this browser, on this device/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/same browser and device where i submitted/i),
    ).toBeInTheDocument();
  });

  it.each(BUSY_PHASES)(
    "disables Confirm, Cancel, and the checkbox while %s and refuses dismissal",
    async (phase) => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      const { container } = render(
        <CommitPredictionDialog
          outcome="HOME"
          open
          onConfirm={vi.fn()}
          onDismiss={onDismiss}
          txPhase={phase}
        />,
      );
      expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
      expect(screen.getByRole("checkbox")).toBeDisabled();

      await user.keyboard("{Escape}");
      await user.click(container.querySelector(".dialog-backdrop")!);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(onDismiss).not.toHaveBeenCalled();
    },
  );

  it("shows the still-processing copy while pending, never a failure", () => {
    render(
      <CommitPredictionDialog
        outcome="HOME"
        open
        onConfirm={vi.fn()}
        onDismiss={vi.fn()}
        txPhase="pending"
      />,
    );
    expect(screen.getByText(/still processing/i)).toBeInTheDocument();
    expect(screen.getByText(/has not failed/i)).toBeInTheDocument();
    expect(screen.queryByText(/timed out/i)).not.toBeInTheDocument();
  });

  it("re-enables Confirm as Try Again after a definitive failure", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const { rerender } = render(
      <CommitPredictionDialog
        outcome="HOME"
        open
        onConfirm={onConfirm}
        onDismiss={vi.fn()}
        txPhase="idle"
      />,
    );
    await user.click(screen.getByRole("checkbox"));

    rerender(
      <CommitPredictionDialog
        outcome="HOME"
        open
        onConfirm={onConfirm}
        onDismiss={vi.fn()}
        txPhase="error"
        errorMessage="Something went wrong"
      />,
    );

    const retry = screen.getByRole("button", { name: "Try Again" });
    expect(retry).toBeEnabled();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    await user.click(retry);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("shows Confirmed on success and remains dismissible", async () => {
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
    expect(screen.getByText(/confirmed/i)).toBeInTheDocument();
    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(cancel).toBeEnabled();
    await user.click(cancel);
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
