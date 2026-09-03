import { act, render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TransactionStatus } from "./TransactionStatus.js";

describe("TransactionStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when idle", () => {
    const { container } = render(<TransactionStatus phase="idle" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the success state with an abbreviated tx hash", () => {
    render(
      <TransactionStatus
        phase="success"
        txHash="0123456789abcdef0123456789abcdef"
      />,
    );
    expect(screen.getByText(/success/i)).toBeInTheDocument();
    expect(screen.getByText(/012345…cdef/)).toBeInTheDocument();
  });

  it("shows the error message and a retry option", () => {
    const onRetry = vi.fn();
    render(
      <TransactionStatus
        phase="error"
        errorMessage="Invalid prediction or salt"
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText("Invalid prediction or salt")).toBeInTheDocument();
    screen.getByRole("button", { name: "Try Again" }).click();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows the slow-proof message after 10 seconds of proving", () => {
    render(<TransactionStatus phase="proving" />);
    expect(
      screen.queryByText(/this may take a moment/i),
    ).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByText(/this may take a moment/i)).toBeInTheDocument();
  });

  it("shows a timed-out message and Try Again after 30 seconds, without auto-retrying", () => {
    const onRetry = vi.fn();
    render(<TransactionStatus phase="proving" onRetry={onRetry} />);
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByText(/timed out/i)).toBeInTheDocument();
    expect(onRetry).not.toHaveBeenCalled();

    screen.getByRole("button", { name: "Try Again" }).click();
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
