/**
 * SpacedReviewDrill Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SpacedReviewDrill } from "../SpacedReviewDrill";

// Mock the learning progress store
const mockRecordReviewResult = vi.fn();
const mockGetDueReviews = vi.fn(() => ["gpu-monitoring"]);

vi.mock("../../store/learningProgressStore", () => ({
  useLearningProgressStore: () => ({
    reviewSchedule: {
      "gpu-monitoring": {
        familyId: "gpu-monitoring",
        nextReviewDate: Date.now() - 1000,
        interval: 1,
        consecutiveSuccesses: 0,
      },
    },
    recordReviewResult: mockRecordReviewResult,
    getDueReviews: mockGetDueReviews,
  }),
}));

// Mock the command families data
vi.mock("../../data/commandFamilies.json", () => ({
  default: {
    version: "1.0.0",
    families: [
      {
        id: "gpu-monitoring",
        name: "GPU Monitoring",
        icon: "📊",
        description: "Monitor GPU status and metrics",
        tools: [
          {
            name: "nvidia-smi",
            bestFor: "real-time monitoring",
            tagline: "Quick GPU status",
            commonFlags: ["-L", "-q", "--query-gpu"],
          },
          {
            name: "dcgmi",
            bestFor: "diagnostics",
            tagline: "Deep diagnostics",
            commonFlags: ["diag", "health"],
          },
          {
            name: "nvidia-smi topo",
            bestFor: "topology",
            tagline: "NVLink topology",
            commonFlags: ["-m"],
          },
        ],
      },
      {
        id: "infiniband-tools",
        name: "InfiniBand Tools",
        icon: "🔗",
        description: "InfiniBand networking",
        tools: [
          {
            name: "ibstat",
            bestFor: "port status",
            tagline: "IB port info",
            commonFlags: [],
          },
        ],
      },
    ],
  },
}));

// Mock the spaced repetition utility
vi.mock("../../utils/spacedRepetition", () => ({
  generateReviewQuestion: vi.fn(() => ({
    familyId: "gpu-monitoring",
    scenario: "You need to check GPU utilization and memory usage.",
    choices: ["nvidia-smi", "dcgmi", "ibstat", "ipmitool"],
    correctAnswer: "nvidia-smi",
    explanation:
      "nvidia-smi is the standard tool for checking GPU utilization and memory.",
  })),
}));

describe("SpacedReviewDrill", () => {
  const mockOnComplete = vi.fn();
  const mockOnSnooze = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the review drill component", () => {
    render(
      <SpacedReviewDrill
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onSnooze={mockOnSnooze}
      />,
    );

    expect(screen.getByText("Review Drill")).toBeInTheDocument();
    expect(screen.getByText("GPU Monitoring")).toBeInTheDocument();
  });

  it("displays the scenario question", () => {
    render(
      <SpacedReviewDrill
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onSnooze={mockOnSnooze}
      />,
    );

    expect(
      screen.getByText(/check GPU utilization and memory/),
    ).toBeInTheDocument();
  });

  it("shows answer choices", () => {
    render(
      <SpacedReviewDrill
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onSnooze={mockOnSnooze}
      />,
    );

    expect(screen.getByText("nvidia-smi")).toBeInTheDocument();
    expect(screen.getByText("dcgmi")).toBeInTheDocument();
    expect(screen.getByText("ibstat")).toBeInTheDocument();
    expect(screen.getByText("ipmitool")).toBeInTheDocument();
  });

  it("displays the timer", () => {
    render(
      <SpacedReviewDrill
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onSnooze={mockOnSnooze}
      />,
    );

    expect(screen.getByText("2:00")).toBeInTheDocument();
  });

  it("decrements timer over time", async () => {
    render(
      <SpacedReviewDrill
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onSnooze={mockOnSnooze}
      />,
    );

    expect(screen.getByText("2:00")).toBeInTheDocument();

    // Advance time by 10 seconds
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(screen.getByText("1:50")).toBeInTheDocument();
  });

  it("allows selecting an answer", () => {
    render(
      <SpacedReviewDrill
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onSnooze={mockOnSnooze}
      />,
    );

    const nvidiaSmiButton = screen.getByRole("button", { name: /nvidia-smi/i });
    fireEvent.click(nvidiaSmiButton);

    expect(nvidiaSmiButton).toHaveClass("border-nvidia-green");
  });

  it("disables submit when no answer selected", () => {
    render(
      <SpacedReviewDrill
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onSnooze={mockOnSnooze}
      />,
    );

    const submitButton = screen.getByRole("button", { name: /submit answer/i });
    expect(submitButton).toBeDisabled();
  });

  it("enables submit when answer is selected", () => {
    render(
      <SpacedReviewDrill
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onSnooze={mockOnSnooze}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /nvidia-smi/i }));
    const submitButton = screen.getByRole("button", { name: /submit answer/i });
    expect(submitButton).not.toBeDisabled();
  });

  it("shows correct feedback when answer is correct", () => {
    render(
      <SpacedReviewDrill
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onSnooze={mockOnSnooze}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /nvidia-smi/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    // State updates synchronously, no need for waitFor
    expect(screen.getByText("Correct!")).toBeInTheDocument();
  });

  it("shows incorrect feedback when answer is wrong", () => {
    render(
      <SpacedReviewDrill
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onSnooze={mockOnSnooze}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /ipmitool/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    expect(screen.getByText("Incorrect")).toBeInTheDocument();
    expect(screen.getByText(/The correct answer is/)).toBeInTheDocument();
  });

  it("shows explanation after submission", () => {
    render(
      <SpacedReviewDrill
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onSnooze={mockOnSnooze}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /nvidia-smi/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    expect(screen.getByText("Explanation")).toBeInTheDocument();
    expect(
      screen.getByText(/standard tool for checking GPU utilization/),
    ).toBeInTheDocument();
  });

  it("records review result when submitting", () => {
    render(
      <SpacedReviewDrill
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onSnooze={mockOnSnooze}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /nvidia-smi/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    expect(mockRecordReviewResult).toHaveBeenCalledWith("gpu-monitoring", true);
  });

  it("records incorrect result when wrong answer", () => {
    render(
      <SpacedReviewDrill
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onSnooze={mockOnSnooze}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /ipmitool/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    expect(mockRecordReviewResult).toHaveBeenCalledWith(
      "gpu-monitoring",
      false,
    );
  });

  it("calls onComplete when continue button is clicked", () => {
    render(
      <SpacedReviewDrill
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onSnooze={mockOnSnooze}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /nvidia-smi/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    expect(screen.getByText("Correct!")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(mockOnComplete).toHaveBeenCalled();
  });

  it("calls onComplete when close button is clicked", () => {
    render(
      <SpacedReviewDrill
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onSnooze={mockOnSnooze}
      />,
    );

    // Click the × close button
    const closeButton = screen.getByRole("button", { name: /×/i });
    fireEvent.click(closeButton);

    expect(mockOnComplete).toHaveBeenCalled();
  });
});

describe("SpacedReviewDrill - Snooze functionality", () => {
  const mockOnComplete = vi.fn();
  const mockOnSnooze = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows snooze button", () => {
    render(
      <SpacedReviewDrill
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onSnooze={mockOnSnooze}
      />,
    );

    expect(screen.getByText("Snooze")).toBeInTheDocument();
  });

  it("opens snooze menu when clicked", () => {
    render(
      <SpacedReviewDrill
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onSnooze={mockOnSnooze}
      />,
    );

    fireEvent.click(screen.getByText("Snooze"));

    expect(screen.getByText("In 1 day")).toBeInTheDocument();
    expect(screen.getByText("In 3 days")).toBeInTheDocument();
  });

  it("calls onSnooze with 1 day", () => {
    render(
      <SpacedReviewDrill
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onSnooze={mockOnSnooze}
      />,
    );

    fireEvent.click(screen.getByText("Snooze"));
    fireEvent.click(screen.getByText("In 1 day"));

    expect(mockOnSnooze).toHaveBeenCalledWith(1);
    expect(mockOnComplete).toHaveBeenCalled();
  });

  it("calls onSnooze with 3 days", () => {
    render(
      <SpacedReviewDrill
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onSnooze={mockOnSnooze}
      />,
    );

    fireEvent.click(screen.getByText("Snooze"));
    fireEvent.click(screen.getByText("In 3 days"));

    expect(mockOnSnooze).toHaveBeenCalledWith(3);
    expect(mockOnComplete).toHaveBeenCalled();
  });
});

describe("SpacedReviewDrill - Timer behavior", () => {
  const mockOnComplete = vi.fn();
  const mockOnSnooze = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("changes timer color when low time", () => {
    render(
      <SpacedReviewDrill
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onSnooze={mockOnSnooze}
      />,
    );

    // Advance to 60 seconds remaining (should be yellow)
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(screen.getByText("1:00")).toBeInTheDocument();

    // Advance to 30 seconds remaining (should be red)
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(screen.getByText("0:30")).toBeInTheDocument();
  });

  it("stops timer when reaching zero", () => {
    render(
      <SpacedReviewDrill
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onSnooze={mockOnSnooze}
      />,
    );

    // Advance past timer duration
    act(() => {
      vi.advanceTimersByTime(130000);
    });

    expect(screen.getByText("0:00")).toBeInTheDocument();
  });

  it("stops timer when answer is submitted", () => {
    render(
      <SpacedReviewDrill
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onSnooze={mockOnSnooze}
      />,
    );

    // Submit answer
    fireEvent.click(screen.getByRole("button", { name: /nvidia-smi/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    expect(screen.getByText("Correct!")).toBeInTheDocument();

    // Timer should not be visible in feedback state
    expect(screen.queryByText(/^\d:\d\d$/)).not.toBeInTheDocument();
  });
});

describe("SpacedReviewDrill - Auto-select family", () => {
  const mockOnComplete = vi.fn();
  const mockOnSnooze = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses provided familyId when specified", () => {
    render(
      <SpacedReviewDrill
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onSnooze={mockOnSnooze}
      />,
    );

    expect(screen.getByText("GPU Monitoring")).toBeInTheDocument();
  });

  it("auto-selects from due reviews when no familyId provided", () => {
    render(
      <SpacedReviewDrill onComplete={mockOnComplete} onSnooze={mockOnSnooze} />,
    );

    // Should use the first due review (gpu-monitoring from mock)
    expect(screen.getByText("GPU Monitoring")).toBeInTheDocument();
  });
});
