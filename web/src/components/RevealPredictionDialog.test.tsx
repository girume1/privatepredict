import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { RevealPredictionDialog } from "./RevealPredictionDialog.js";

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

  it("disables both actions while a transaction is pending", () => {
    render(
      <RevealPredictionDialog
        open
        onConfirm={vi.fn()}
        onDismiss={vi.fn()}
        txPhase="awaiting_wallet"
      />,
    );
    expect(
      screen.getByRole("button", { name: "Confirm Reveal" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("shows the NO_LOCAL_PREDICTION message when passed as the error", () => {
    render(
      <RevealPredictionDialog
        open
        onConfirm={vi.fn()}
        onDismiss={vi.fn()}
        txPhase="error"
        errorMessage="Your local prediction data could not be found. Reveal is not possible without the original prediction and salt."
      />,
    );
    expect(
      screen.getByText(/your local prediction data could not be found/i),
    ).toBeInTheDocument();
  });

  it("can be dismissed after a successful reveal — does not get stuck", async () => {
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
    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(cancel).toBeEnabled();
    await user.click(cancel);
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
