import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { FreeMode } from "../FreeMode";

// ============================================================================
// Mocks
// ============================================================================

// Mock scenarioContextManager with spies for lifecycle verification
const mockReset = vi.fn();
const mockContext = { reset: mockReset };

const mockCreateContext = vi.fn().mockReturnValue(mockContext);
const mockSetActiveContext = vi.fn();
const mockDeleteContext = vi.fn();
const mockClearAll = vi.fn();
const mockGetContext = vi.fn().mockReturnValue(mockContext);

vi.mock("@/store/scenarioContext", () => ({
  scenarioContextManager: {
    createContext: (...args: unknown[]) => mockCreateContext(...args),
    setActiveContext: (...args: unknown[]) => mockSetActiveContext(...args),
    deleteContext: (...args: unknown[]) => mockDeleteContext(...args),
    clearAll: (...args: unknown[]) => mockClearAll(...args),
    getContext: (...args: unknown[]) => mockGetContext(...args),
    getActiveContext: vi.fn().mockReturnValue(null),
  },
}));

// Mock FaultInjection component to isolate FreeMode testing
vi.mock("../FaultInjection", () => ({
  FaultInjection: () => (
    <div data-testid="fault-injection">Fault Injection Panel</div>
  ),
}));

// Mock Terminal component to isolate FreeMode testing
vi.mock("../Terminal", () => ({
  Terminal: ({ className }: { className?: string }) => (
    <div data-testid="terminal" className={className}>
      Terminal Panel
    </div>
  ),
}));

// Mock lucide-react icons to avoid SVG rendering issues in jsdom
vi.mock("lucide-react", () => ({
  RotateCcw: ({ className }: { className?: string }) => (
    <span data-testid="icon-rotate-ccw" className={className} />
  ),
  X: ({ className }: { className?: string }) => (
    <span data-testid="icon-x" className={className} />
  ),
  FlaskConical: ({ className }: { className?: string }) => (
    <span data-testid="icon-flask" className={className} />
  ),
}));

// ============================================================================
// Tests
// ============================================================================

describe("FreeMode", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Basic rendering
  // --------------------------------------------------------------------------

  it("renders without crashing", () => {
    const { container } = render(<FreeMode onClose={onClose} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("shows 'Free Mode' header text", () => {
    render(<FreeMode onClose={onClose} />);
    expect(screen.getByText("Free Mode")).toBeInTheDocument();
  });

  it("shows 'Sandbox' badge indicator", () => {
    render(<FreeMode onClose={onClose} />);
    expect(screen.getByText("Sandbox")).toBeInTheDocument();
  });

  it("shows the flask icon in the header", () => {
    render(<FreeMode onClose={onClose} />);
    expect(screen.getByTestId("icon-flask")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Exit button
  // --------------------------------------------------------------------------

  it("shows 'Exit' button", () => {
    render(<FreeMode onClose={onClose} />);
    expect(screen.getByRole("button", { name: /exit/i })).toBeInTheDocument();
  });

  it("calls onClose when Exit button is clicked", () => {
    render(<FreeMode onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /exit/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Exit button has title 'Exit Free Mode'", () => {
    render(<FreeMode onClose={onClose} />);
    const exitBtn = screen.getByTitle("Exit Free Mode");
    expect(exitBtn).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // ScenarioContext lifecycle - mount
  // --------------------------------------------------------------------------

  it("clears all existing contexts on mount", () => {
    render(<FreeMode onClose={onClose} />);
    expect(mockClearAll).toHaveBeenCalledTimes(1);
  });

  it("creates a ScenarioContext with id 'free-mode' on mount", () => {
    render(<FreeMode onClose={onClose} />);
    expect(mockCreateContext).toHaveBeenCalledWith("free-mode");
  });

  it("sets 'free-mode' as the active context on mount", () => {
    render(<FreeMode onClose={onClose} />);
    expect(mockSetActiveContext).toHaveBeenCalledWith("free-mode");
  });

  it("creates context before setting it active (call order)", () => {
    render(<FreeMode onClose={onClose} />);
    const clearOrder = mockClearAll.mock.invocationCallOrder[0];
    const createOrder = mockCreateContext.mock.invocationCallOrder[0];
    const setActiveOrder = mockSetActiveContext.mock.invocationCallOrder[0];
    expect(clearOrder).toBeLessThan(createOrder);
    expect(createOrder).toBeLessThan(setActiveOrder);
  });

  // --------------------------------------------------------------------------
  // ScenarioContext lifecycle - unmount
  // --------------------------------------------------------------------------

  it("deletes the 'free-mode' context on unmount", () => {
    const { unmount } = render(<FreeMode onClose={onClose} />);
    vi.clearAllMocks(); // Clear mount calls
    unmount();
    expect(mockDeleteContext).toHaveBeenCalledWith("free-mode");
  });

  it("sets active context to null on unmount", () => {
    const { unmount } = render(<FreeMode onClose={onClose} />);
    vi.clearAllMocks(); // Clear mount calls
    unmount();
    expect(mockSetActiveContext).toHaveBeenCalledWith(null);
  });

  it("does not create context more than once (useRef guard)", () => {
    render(<FreeMode onClose={onClose} />);
    // The useRef guard ensures createContext is called exactly once
    // even if the effect were to re-run (React strict mode double-invoke
    // is not tested here, but the ref guard exists for it)
    expect(mockCreateContext).toHaveBeenCalledTimes(1);
  });

  // --------------------------------------------------------------------------
  // Reset button
  // --------------------------------------------------------------------------

  it("shows 'Reset Cluster' button", () => {
    render(<FreeMode onClose={onClose} />);
    expect(
      screen.getByRole("button", { name: /reset cluster/i }),
    ).toBeInTheDocument();
  });

  it("Reset button has title 'Reset cluster to default state'", () => {
    render(<FreeMode onClose={onClose} />);
    const resetBtn = screen.getByTitle("Reset cluster to default state");
    expect(resetBtn).toBeInTheDocument();
  });

  it("calls context.reset() when Reset Cluster is clicked", () => {
    render(<FreeMode onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /reset cluster/i }));
    expect(mockGetContext).toHaveBeenCalledWith("free-mode");
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("handles reset gracefully when context is not found", () => {
    mockGetContext.mockReturnValueOnce(undefined);
    render(<FreeMode onClose={onClose} />);
    // Should not throw
    fireEvent.click(screen.getByRole("button", { name: /reset cluster/i }));
    expect(mockReset).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Child components presence
  // --------------------------------------------------------------------------

  it("renders FaultInjection panel", () => {
    render(<FreeMode onClose={onClose} />);
    expect(screen.getByTestId("fault-injection")).toBeInTheDocument();
  });

  it("renders Terminal component", () => {
    render(<FreeMode onClose={onClose} />);
    expect(screen.getByTestId("terminal")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Layout structure
  // --------------------------------------------------------------------------

  it("renders as a fixed full-screen overlay (z-50)", () => {
    const { container } = render(<FreeMode onClose={onClose} />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("fixed");
    expect(root.className).toContain("inset-0");
    expect(root.className).toContain("z-50");
  });

  it("has fault injection panel and terminal side by side", () => {
    render(<FreeMode onClose={onClose} />);
    const faultPanel = screen.getByTestId("fault-injection");
    const terminal = screen.getByTestId("terminal");

    // The fault injection panel's wrapper has a fixed width class
    const faultWrapper = faultPanel.parentElement!;
    expect(faultWrapper.className).toContain("w-[400px]");

    // Terminal's wrapper fills remaining space
    const terminalWrapper = terminal.parentElement!;
    expect(terminalWrapper.className).toContain("flex-1");

    // Both wrappers share the same flex parent (the main content area)
    expect(faultWrapper.parentElement).toBe(terminalWrapper.parentElement);
    const mainContent = faultWrapper.parentElement!;
    expect(mainContent.className).toContain("flex");
  });

  // --------------------------------------------------------------------------
  // No step progression UI (free mode is unstructured)
  // --------------------------------------------------------------------------

  it("does not show 'Next Step' button", () => {
    render(<FreeMode onClose={onClose} />);
    expect(screen.queryByText(/next step/i)).not.toBeInTheDocument();
  });

  it("does not show 'Previous Step' button", () => {
    render(<FreeMode onClose={onClose} />);
    expect(screen.queryByText(/previous step/i)).not.toBeInTheDocument();
  });

  it("does not show step progress indicators", () => {
    render(<FreeMode onClose={onClose} />);
    expect(screen.queryByText(/step \d+ of \d+/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/progress/i)).not.toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // No validation/tracking UI
  // --------------------------------------------------------------------------

  it("does not show validation feedback elements", () => {
    render(<FreeMode onClose={onClose} />);
    expect(screen.queryByText(/validation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/correct/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/incorrect/i)).not.toBeInTheDocument();
  });

  it("does not show score or completion percentage", () => {
    render(<FreeMode onClose={onClose} />);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/score/i)).not.toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Cleanup robustness
  // --------------------------------------------------------------------------

  it("cleans up properly when rapidly mounted and unmounted", () => {
    const { unmount: unmount1 } = render(<FreeMode onClose={onClose} />);
    unmount1();
    cleanup();

    vi.clearAllMocks();

    const { unmount: unmount2 } = render(<FreeMode onClose={onClose} />);
    expect(mockClearAll).toHaveBeenCalledTimes(1);
    expect(mockCreateContext).toHaveBeenCalledTimes(1);

    unmount2();
    expect(mockDeleteContext).toHaveBeenCalledWith("free-mode");
    expect(mockSetActiveContext).toHaveBeenCalledWith(null);
  });
});
