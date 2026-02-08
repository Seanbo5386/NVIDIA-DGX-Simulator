import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StudyDashboard } from "../StudyDashboard";
import type { DomainId } from "@/types/scenarios";

// ============================================================================
// Mock data
// ============================================================================

const mockDomainTrends: Record<
  DomainId,
  {
    domain: DomainId;
    domainName: string;
    scores: Array<{ timestamp: number; score: number }>;
    averageScore: number;
    trend: "improving" | "stable" | "declining";
    totalAttempts: number;
  }
> = {
  domain1: {
    domain: "domain1",
    domainName: "Platform Bring-Up",
    scores: [],
    averageScore: 75,
    trend: "improving",
    totalAttempts: 3,
  },
  domain2: {
    domain: "domain2",
    domainName: "Accelerator Configuration",
    scores: [],
    averageScore: 60,
    trend: "declining",
    totalAttempts: 2,
  },
  domain3: {
    domain: "domain3",
    domainName: "Base Infrastructure",
    scores: [],
    averageScore: 80,
    trend: "stable",
    totalAttempts: 4,
  },
  domain4: {
    domain: "domain4",
    domainName: "Validation & Testing",
    scores: [],
    averageScore: 55,
    trend: "declining",
    totalAttempts: 1,
  },
  domain5: {
    domain: "domain5",
    domainName: "Troubleshooting",
    scores: [],
    averageScore: 90,
    trend: "improving",
    totalAttempts: 5,
  },
};

const mockProgress = {
  sessions: [],
  streak: {
    currentStreak: 3,
    longestStreak: 7,
    lastStudyDate: "2026-02-08",
    totalDaysStudied: 15,
    weeklyGoal: 5,
    weeklyProgress: 3,
  },
  domainTrends: mockDomainTrends,
  totalExamsTaken: 10,
  totalLabsCompleted: 5,
  totalStudyTime: 7200,
  averageScore: 72,
  bestScore: 95,
  passRate: 80,
  lastUpdated: Date.now(),
};

const mockSummary = {
  totalExams: 10,
  totalLabs: 5,
  averageScore: 72,
  passRate: 80,
  streak: 3,
  totalTime: "2h 0m",
  weakestDomain: "Validation & Testing",
  strongestDomain: "Troubleshooting",
};

const mockWeakDomains = [
  {
    domain: "domain4" as DomainId,
    domainName: "Validation & Testing",
    scores: [],
    averageScore: 55,
    trend: "declining" as const,
    totalAttempts: 1,
  },
  {
    domain: "domain2" as DomainId,
    domainName: "Accelerator Configuration",
    scores: [],
    averageScore: 60,
    trend: "declining" as const,
    totalAttempts: 2,
  },
];

const mockStrongDomains = [
  {
    domain: "domain5" as DomainId,
    domainName: "Troubleshooting",
    scores: [],
    averageScore: 90,
    trend: "improving" as const,
    totalAttempts: 5,
  },
  {
    domain: "domain3" as DomainId,
    domainName: "Base Infrastructure",
    scores: [],
    averageScore: 80,
    trend: "stable" as const,
    totalAttempts: 4,
  },
];

const mockRecommendations = [
  "Focus on Validation & Testing - your average score is 55%.",
  "Increase study frequency to maintain your streak.",
];

// ============================================================================
// Mocks
// ============================================================================

vi.mock("../../utils/studyProgressTracker", () => ({
  loadProgress: vi.fn(() => mockProgress),
  getProgressSummary: vi.fn(() => mockSummary),
  getWeakDomains: vi.fn(() => mockWeakDomains),
  getStrongDomains: vi.fn(() => mockStrongDomains),
  getStudyRecommendations: vi.fn(() => mockRecommendations),
  getRecentSessions: vi.fn(() => []),
  exportProgress: vi.fn(() => "{}"),
  importProgress: vi.fn(() => true),
  resetProgress: vi.fn(),
}));

vi.mock("../../utils/examEngine", () => ({
  DOMAIN_INFO: {
    domain1: {
      name: "Platform Bring-Up",
      weight: 31,
      description: "Hardware verification",
    },
    domain2: {
      name: "Accelerator Configuration",
      weight: 5,
      description: "GPU configuration",
    },
    domain3: {
      name: "Base Infrastructure",
      weight: 19,
      description: "Slurm and containers",
    },
    domain4: {
      name: "Validation & Testing",
      weight: 33,
      description: "DCGM and benchmarks",
    },
    domain5: {
      name: "Troubleshooting",
      weight: 12,
      description: "Error diagnosis",
    },
  },
}));

const mockDomainProgress: Record<
  DomainId,
  { labsCompleted: number; labsTotal: number }
> = {
  domain1: { labsCompleted: 2, labsTotal: 6 },
  domain2: { labsCompleted: 1, labsTotal: 3 },
  domain3: { labsCompleted: 3, labsTotal: 5 },
  domain4: { labsCompleted: 0, labsTotal: 7 },
  domain5: { labsCompleted: 4, labsTotal: 4 },
};

vi.mock("../../store/learningStore", () => ({
  useLearningStore: vi.fn((selector?: (state: unknown) => unknown) => {
    const state = {
      domainProgress: mockDomainProgress,
    };
    return selector ? selector(state) : state;
  }),
}));

// ============================================================================
// Tests
// ============================================================================

describe("StudyDashboard", () => {
  const onClose = vi.fn();
  const onStartExam = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Basic rendering
  // --------------------------------------------------------------------------

  it("renders without crashing", () => {
    const { container } = render(
      <StudyDashboard onClose={onClose} onStartExam={onStartExam} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("shows the dashboard heading", () => {
    render(<StudyDashboard onClose={onClose} onStartExam={onStartExam} />);
    expect(screen.getByText("Study Progress Dashboard")).toBeInTheDocument();
  });

  it("shows the subtitle with NCP-AII reference", () => {
    render(<StudyDashboard onClose={onClose} onStartExam={onStartExam} />);
    expect(
      screen.getByText(/Track your NCP-AII certification journey/i),
    ).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Close button
  // --------------------------------------------------------------------------

  it("shows a close button when onClose is provided", () => {
    render(<StudyDashboard onClose={onClose} onStartExam={onStartExam} />);
    // The close button shows the x-mark character
    const closeButton = screen.getByText("\u00D7");
    expect(closeButton).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    render(<StudyDashboard onClose={onClose} onStartExam={onStartExam} />);
    const closeButton = screen.getByText("\u00D7");
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not render close button when onClose is not provided", () => {
    render(<StudyDashboard onStartExam={onStartExam} />);
    expect(screen.queryByText("\u00D7")).not.toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Quick Actions - exam mode buttons
  // --------------------------------------------------------------------------

  it("shows Full Practice Exam button", () => {
    render(<StudyDashboard onClose={onClose} onStartExam={onStartExam} />);
    expect(
      screen.getByRole("button", { name: /full practice exam/i }),
    ).toBeInTheDocument();
  });

  it("shows Quick Quiz button", () => {
    render(<StudyDashboard onClose={onClose} onStartExam={onStartExam} />);
    expect(
      screen.getByRole("button", { name: /quick quiz/i }),
    ).toBeInTheDocument();
  });

  it("calls onStartExam with 'full-practice' when Full Practice button is clicked", () => {
    render(<StudyDashboard onClose={onClose} onStartExam={onStartExam} />);
    fireEvent.click(
      screen.getByRole("button", { name: /full practice exam/i }),
    );
    expect(onStartExam).toHaveBeenCalledWith("full-practice");
  });

  it("calls onStartExam with 'quick-quiz' when Quick Quiz button is clicked", () => {
    render(<StudyDashboard onClose={onClose} onStartExam={onStartExam} />);
    fireEvent.click(screen.getByRole("button", { name: /quick quiz/i }));
    expect(onStartExam).toHaveBeenCalledWith("quick-quiz");
  });

  // --------------------------------------------------------------------------
  // Stats display
  // --------------------------------------------------------------------------

  it("shows summary statistics on the overview tab", () => {
    render(<StudyDashboard onClose={onClose} onStartExam={onStartExam} />);
    expect(screen.getByText("Exams Taken")).toBeInTheDocument();
    expect(screen.getByText("Labs Completed")).toBeInTheDocument();
    expect(screen.getByText("Avg Score")).toBeInTheDocument();
    expect(screen.getByText("Pass Rate")).toBeInTheDocument();
    expect(screen.getByText("Day Streak")).toBeInTheDocument();
    expect(screen.getByText("Total Time")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Study recommendations
  // --------------------------------------------------------------------------

  it("shows study recommendations section", () => {
    render(<StudyDashboard onClose={onClose} onStartExam={onStartExam} />);
    expect(screen.getByText("Study Recommendations")).toBeInTheDocument();
    expect(
      screen.getByText(/Focus on Validation & Testing/i),
    ).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Tab navigation
  // --------------------------------------------------------------------------

  it("renders tab navigation with all four tabs", () => {
    render(<StudyDashboard onClose={onClose} onStartExam={onStartExam} />);
    expect(
      screen.getByRole("button", { name: "Overview" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Domains" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "History" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Settings" }),
    ).toBeInTheDocument();
  });
});
