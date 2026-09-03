import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { PredictionSelector } from "./PredictionSelector.js";

describe("PredictionSelector", () => {
  it("disables submit until an outcome is selected", async () => {
    const user = userEvent.setup();
    render(<PredictionSelector onSubmit={vi.fn()} />);
    const submit = screen.getByRole("button", { name: "Submit Prediction" });
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: "HOME" }));
    expect(submit).toBeEnabled();
  });

  it("calls onSubmit with the selected outcome", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PredictionSelector onSubmit={onSubmit} />);

    await user.click(screen.getByRole("radio", { name: "DRAW" }));
    await user.click(screen.getByRole("button", { name: "Submit Prediction" }));

    expect(onSubmit).toHaveBeenCalledWith("DRAW");
  });

  it("highlights only the selected option", async () => {
    const user = userEvent.setup();
    render(<PredictionSelector onSubmit={vi.fn()} />);
    await user.click(screen.getByRole("radio", { name: "AWAY" }));

    expect(screen.getByRole("radio", { name: "AWAY" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "HOME" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("disables all controls when disabled", () => {
    render(<PredictionSelector onSubmit={vi.fn()} disabled />);
    expect(screen.getByRole("radio", { name: "HOME" })).toBeDisabled();
  });
});
