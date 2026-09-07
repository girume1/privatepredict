import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { RevealPredictionDialog } from "./RevealPredictionDialog.js";

const BUSY_PHASES = ["submitting", "proving", "pending"] as const;

describe("RevealPredictionDialog", () => {
  it("explains that the prediction and salt become permanently public", () => {
    render(
      <RevealPredictionDialog
        open
        onConfirm={vi.fn()}
        onDismiss={vi.fn()}
        txPhase="idle"
      />,
    );
    expect(
      screen.getByText(/permanently make your original prediction and salt/i),
    ).toBeInTheDocument();
  });

  it.each(BUSY_PHASES)(
    "disables Confirm Reveal and Cancel while %s and refuses dismissal",
    async (phase) => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      const { container } = render(
        <RevealPredictionDialog
          open
          onConfirm={vi.fn()}
          onDismiss={onDismiss}
          txPhase={phase}
        />,
      );
      expect(
        screen.getByRole("button", { name: "Confirm Reveal" }),
      ).toBeDisabled();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();

      await user.keyboard("{Escape}");
      await user.click(container.querySelector(".dialog-backdrop")!);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(onDismiss).not.toHaveBeenCalled();
    },
  );

  it("shows the still-processing copy while pending, never a failure", () => {
    render(
      <RevealPredictionDialog
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

  it("re-enables Confirm Reveal as Try Again after a definitive failure", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <RevealPredictionDialog
        open
        onConfirm={onConfirm}
        onDismiss={vi.fn()}
        txPhase="error"
        errorMessage="Your local prediction data could not be found. Reveal is not possible without the original prediction and salt."
      />,
    );

    const retry = screen.getByRole("button", { name: "Try Again" });
    expect(retry).toBeEnabled();
    expect(
      screen.getByText(/your local prediction data could not be found/i),
    ).toBeInTheDocument();
    await user.click(retry);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("shows Confirmed on success and remains dismissible", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <RevealPredictionDialog
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
