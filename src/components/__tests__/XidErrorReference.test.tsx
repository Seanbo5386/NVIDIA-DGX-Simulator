// src/components/__tests__/XidErrorReference.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { XidErrorReference } from "../XidErrorReference";
import { XID_ERRORS } from "@/data/xidErrors";

describe("XidErrorReference", () => {
  it("renders the component heading", () => {
    render(<XidErrorReference />);
    expect(screen.getByText("XID Error Reference")).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(<XidErrorReference />);
    expect(screen.getByPlaceholderText(/search xid/i)).toBeInTheDocument();
  });

  it("renders severity filter buttons", () => {
    render(<XidErrorReference />);
    expect(screen.getByRole("button", { name: /all/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /critical/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /warning/i }),
    ).toBeInTheDocument();
  });

  it("displays all XID error entries from centralized data", () => {
    render(<XidErrorReference />);
    // Verify count is displayed
    expect(
      screen.getByText(
        `Showing ${XID_ERRORS.length} of ${XID_ERRORS.length} XID errors`,
      ),
    ).toBeInTheDocument();
    // Check a few key XID codes are rendered
    expect(screen.getByText(/XID 13/)).toBeInTheDocument();
    expect(screen.getByText(/XID 48/)).toBeInTheDocument();
    expect(screen.getByText(/XID 79/)).toBeInTheDocument();
  });

  it("filters by severity when button clicked", () => {
    render(<XidErrorReference />);
    fireEvent.click(screen.getByRole("button", { name: /critical/i }));
    const criticalCount = XID_ERRORS.filter(
      (x) => x.severity === "Critical",
    ).length;
    expect(
      screen.getByText(
        `Showing ${criticalCount} of ${XID_ERRORS.length} XID errors`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/XID 48/)).toBeInTheDocument(); // Critical
    expect(screen.getByText(/XID 79/)).toBeInTheDocument(); // Critical
  });

  it("filters by search query", () => {
    render(<XidErrorReference />);
    const searchInput = screen.getByPlaceholderText(/search xid/i);
    fireEvent.change(searchInput, { target: { value: "ECC" } });
    // XID 48 is "Double-Bit ECC Error" and XID 92 is "High Single-Bit ECC Rate"
    expect(screen.getByText(/XID 48/)).toBeInTheDocument();
    expect(screen.getByText(/XID 92/)).toBeInTheDocument();
  });

  it("shows exam relevance tag on relevant errors", () => {
    render(<XidErrorReference />);
    expect(screen.getAllByText(/exam relevant/i).length).toBeGreaterThan(0);
  });

  it("renders all 28 XID errors from centralized data file", () => {
    render(<XidErrorReference />);
    // Should have all 28 XID errors from xidErrors.ts
    expect(XID_ERRORS.length).toBe(28);
  });
});
