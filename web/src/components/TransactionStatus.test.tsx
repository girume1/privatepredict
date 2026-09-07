import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TransactionStatus } from "./TransactionStatus.js";

describe("TransactionStatus", () => {
  it("renders nothing when idle", () => {
    const { container } = render(<TransactionStatus phase="idle" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the confirmed state with an abbreviated tx hash", () => {
    render(
      <TransactionStatus
        phase="success"
        txHash="0123456789abcdef0123456789abcdef"
      />,
    );
    expect(screen.getByText(/confirmed/i)).toBeInTheDocument();
    expect(screen.getByText(/012345…cdef/)).toBeInTheDocument();
  });

  it("shows the error message without deciding anything on its own", () => {
    render(
      <TransactionStatus
        phase="error"
        errorMessage="Invalid prediction or salt"
      />,
    );
    expect(screen.getByText("Invalid prediction or salt")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Try Again" }),
    ).not.toBeInTheDocument();
  });

  it("falls back to a generic message when the error has no text", () => {
    render(<TransactionStatus phase="error" />);
    expect(
      screen.getByText(/the transaction failed. please try again/i),
    ).toBeInTheDocument();
  });

  it("labels the submitting phase", () => {
    render(<TransactionStatus phase="submitting" />);
    expect(screen.getByText(/submitting transaction/i)).toBeInTheDocument();
  });

  it("labels the proving phase", () => {
    render(<TransactionStatus phase="proving" />);
    expect(
      screen.getByText(/generating zero-knowledge proof/i),
    ).toBeInTheDocument();
  });

  it("labels the pending phase as still processing — not as failed", () => {
    render(<TransactionStatus phase="pending" />);
    expect(screen.getByText(/still processing/i)).toBeInTheDocument();
    expect(screen.getByText(/has not failed/i)).toBeInTheDocument();
    expect(screen.queryByText(/timed out/i)).not.toBeInTheDocument();
  });
});
