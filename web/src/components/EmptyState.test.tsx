import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { EmptyState } from "./EmptyState.js";

describe("EmptyState", () => {
  it("renders the given message", () => {
    render(<EmptyState message="No matches exist yet" />);
    expect(screen.getByText("No matches exist yet")).toBeInTheDocument();
  });

  it("exposes a status role for assistive tech", () => {
    render(<EmptyState message="Nothing here" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
