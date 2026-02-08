/**
 * ExplanationGate Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExplanationGate } from "../ExplanationGate";

// Mock the explanationGates.json data
vi.mock("../../data/explanationGates.json", () => ({
  default: {
    explanationGates: [
      {
        id: "gate-test-bmc-config",
        scenarioId: "test-bmc-config",
        familyId: "bmc-hardware",
        question:
          "Which ipmitool command displays both the IP address and subnet mask of the BMC interface?",
        choices: [
          "ipmitool mc info",
          "ipmitool lan print 1",
          "ipmitool chassis status",
          "ipmitool sensor list",
        ],
        correctAnswer: 1,
        explanation:
          "The 'ipmitool lan print 1' command displays LAN channel 1 configuration including IP address, subnet mask, gateway, and MAC address.",
      },
      {
        id: "gate-test-gpu-monitoring",
        scenarioId: "test-gpu-monitoring",
        familyId: "gpu-monitoring",
        question: "What nvidia-smi flag displays the full GPU topology?",
        choices: [
          "nvidia-smi -L",
          "nvidia-smi topo -m",
          "nvidia-smi --query-gpu=gpu_name",
          "nvidia-smi -q",
        ],
        correctAnswer: 1,
        explanation:
          "The 'nvidia-smi topo -m' command displays the GPU topology matrix showing connections between GPUs via NVLink, PCIe, or NVSwitch.",
      },
    ],
  },
}));

// Mock the learning progress store
const mockRecordExplanationGate = vi.fn();

vi.mock("../../store/learningProgressStore", () => ({
  useLearningProgressStore: vi.fn((selector) =>
    selector({
      recordExplanationGate: mockRecordExplanationGate,
    }),
  ),
}));

describe("ExplanationGate", () => {
  const mockOnComplete = vi.fn();
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Initial Render Tests
  // ============================================================================

  describe("Initial Render", () => {
    it("renders the gate with question and choices", () => {
      render(
        <ExplanationGate
          gateId="gate-test-bmc-config"
          onComplete={mockOnComplete}
        />,
      );

      // Check title
      expect(screen.getByText("Teachable Moment")).toBeInTheDocument();
      expect(screen.getByText("Learning Check")).toBeInTheDocument();

      // Check question
      expect(
        screen.getByText(/Which ipmitool command displays both the IP address/),
      ).toBeInTheDocument();

      // Check all 4 choices are rendered
      expect(screen.getByText("ipmitool mc info")).toBeInTheDocument();
      expect(screen.getByText("ipmitool lan print 1")).toBeInTheDocument();
      expect(screen.getByText("ipmitool chassis status")).toBeInTheDocument();
      expect(screen.getByText("ipmitool sensor list")).toBeInTheDocument();
    });

    it("renders choice letters A through D", () => {
      render(
        <ExplanationGate
          gateId="gate-test-bmc-config"
          onComplete={mockOnComplete}
        />,
      );

      expect(screen.getByText("A")).toBeInTheDocument();
      expect(screen.getByText("B")).toBeInTheDocument();
      expect(screen.getByText("C")).toBeInTheDocument();
      expect(screen.getByText("D")).toBeInTheDocument();
    });

    it("disables submit button when no answer is selected", () => {
      render(
        <ExplanationGate
          gateId="gate-test-bmc-config"
          onComplete={mockOnComplete}
        />,
      );

      const submitButton = screen.getByRole("button", {
        name: /check answer/i,
      });
      expect(submitButton).toBeDisabled();
    });

    it("shows dismiss button when onDismiss is provided", () => {
      render(
        <ExplanationGate
          gateId="gate-test-bmc-config"
          onComplete={mockOnComplete}
          onDismiss={mockOnDismiss}
        />,
      );

      expect(
        screen.getByRole("button", { name: /skip for now/i }),
      ).toBeInTheDocument();
    });

    it("does not show dismiss button when onDismiss is not provided", () => {
      render(
        <ExplanationGate
          gateId="gate-test-bmc-config"
          onComplete={mockOnComplete}
        />,
      );

      expect(
        screen.queryByRole("button", { name: /skip for now/i }),
      ).not.toBeInTheDocument();
    });

    it("shows error state when gate is not found", () => {
      render(
        <ExplanationGate
          gateId="non-existent-gate"
          onComplete={mockOnComplete}
          onDismiss={mockOnDismiss}
        />,
      );

      expect(
        screen.getByText(/Explanation gate not found: non-existent-gate/),
      ).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Answer Selection Tests
  // ============================================================================

  describe("Answer Selection", () => {
    it("allows selecting an answer", () => {
      render(
        <ExplanationGate
          gateId="gate-test-bmc-config"
          onComplete={mockOnComplete}
        />,
      );

      const choice = screen.getByText("ipmitool lan print 1").closest("button");
      expect(choice).not.toBeNull();

      fireEvent.click(choice!);

      // The button should have the selected styling (nvidia-green border)
      expect(choice).toHaveClass("border-nvidia-green");
    });

    it("enables submit button when an answer is selected", () => {
      render(
        <ExplanationGate
          gateId="gate-test-bmc-config"
          onComplete={mockOnComplete}
        />,
      );

      const choice = screen.getByText("ipmitool lan print 1").closest("button");
      fireEvent.click(choice!);

      const submitButton = screen.getByRole("button", {
        name: /check answer/i,
      });
      expect(submitButton).not.toBeDisabled();
    });

    it("allows changing selection before submission", () => {
      render(
        <ExplanationGate
          gateId="gate-test-bmc-config"
          onComplete={mockOnComplete}
        />,
      );

      // Select first choice
      const firstChoice = screen
        .getByText("ipmitool mc info")
        .closest("button");
      fireEvent.click(firstChoice!);
      expect(firstChoice).toHaveClass("border-nvidia-green");

      // Select second choice
      const secondChoice = screen
        .getByText("ipmitool lan print 1")
        .closest("button");
      fireEvent.click(secondChoice!);

      // First choice should no longer be selected
      expect(firstChoice).not.toHaveClass("border-nvidia-green");
      expect(secondChoice).toHaveClass("border-nvidia-green");
    });
  });

  // ============================================================================
  // Correct Answer Tests
  // ============================================================================

  describe("Correct Answer Feedback", () => {
    it("shows correct feedback when right answer is selected", async () => {
      render(
        <ExplanationGate
          gateId="gate-test-bmc-config"
          onComplete={mockOnComplete}
        />,
      );

      // Select the correct answer (index 1)
      const correctChoice = screen
        .getByText("ipmitool lan print 1")
        .closest("button");
      fireEvent.click(correctChoice!);

      // Submit
      const submitButton = screen.getByRole("button", {
        name: /check answer/i,
      });
      fireEvent.click(submitButton);

      // Check correct feedback appears
      await waitFor(() => {
        expect(screen.getByText("Correct!")).toBeInTheDocument();
      });
    });

    it("shows explanation after correct answer", async () => {
      render(
        <ExplanationGate
          gateId="gate-test-bmc-config"
          onComplete={mockOnComplete}
        />,
      );

      // Select correct answer
      const correctChoice = screen
        .getByText("ipmitool lan print 1")
        .closest("button");
      fireEvent.click(correctChoice!);
      fireEvent.click(screen.getByRole("button", { name: /check answer/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/ipmitool lan print 1.*displays LAN channel 1/i),
        ).toBeInTheDocument();
      });
    });

    it("shows first try message when answered correctly on first attempt", async () => {
      render(
        <ExplanationGate
          gateId="gate-test-bmc-config"
          onComplete={mockOnComplete}
        />,
      );

      const correctChoice = screen
        .getByText("ipmitool lan print 1")
        .closest("button");
      fireEvent.click(correctChoice!);
      fireEvent.click(screen.getByRole("button", { name: /check answer/i }));

      await waitFor(() => {
        expect(
          screen.getByText("You got it on the first try!"),
        ).toBeInTheDocument();
      });
    });

    it("calls recordExplanationGate with passed=true on correct answer", async () => {
      render(
        <ExplanationGate
          gateId="gate-test-bmc-config"
          onComplete={mockOnComplete}
        />,
      );

      const correctChoice = screen
        .getByText("ipmitool lan print 1")
        .closest("button");
      fireEvent.click(correctChoice!);
      fireEvent.click(screen.getByRole("button", { name: /check answer/i }));

      await waitFor(() => {
        expect(mockRecordExplanationGate).toHaveBeenCalledWith(
          "gate-test-bmc-config",
          "test-bmc-config",
          true,
        );
      });
    });

    it("calls onComplete when Continue is clicked after correct answer", async () => {
      render(
        <ExplanationGate
          gateId="gate-test-bmc-config"
          onComplete={mockOnComplete}
        />,
      );

      const correctChoice = screen
        .getByText("ipmitool lan print 1")
        .closest("button");
      fireEvent.click(correctChoice!);
      fireEvent.click(screen.getByRole("button", { name: /check answer/i }));

      await waitFor(() => {
        expect(screen.getByText("Correct!")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Incorrect Answer Tests
  // ============================================================================

  describe("Incorrect Answer Feedback", () => {
    it("shows incorrect feedback when wrong answer is selected", async () => {
      render(
        <ExplanationGate
          gateId="gate-test-bmc-config"
          onComplete={mockOnComplete}
        />,
      );

      // Select an incorrect answer (index 0)
      const wrongChoice = screen
        .getByText("ipmitool mc info")
        .closest("button");
      fireEvent.click(wrongChoice!);

      fireEvent.click(screen.getByRole("button", { name: /check answer/i }));

      await waitFor(() => {
        expect(screen.getByText("Not Quite")).toBeInTheDocument();
      });
    });

    it("shows the correct answer after incorrect submission", async () => {
      render(
        <ExplanationGate
          gateId="gate-test-bmc-config"
          onComplete={mockOnComplete}
        />,
      );

      const wrongChoice = screen
        .getByText("ipmitool mc info")
        .closest("button");
      fireEvent.click(wrongChoice!);
      fireEvent.click(screen.getByRole("button", { name: /check answer/i }));

      await waitFor(() => {
        expect(screen.getByText("Correct Answer")).toBeInTheDocument();
        // The correct answer text should appear - look for the green text with correct answer
        const correctAnswerTexts = screen.getAllByText("ipmitool lan print 1");
        // One should be in the correct answer section with green styling
        expect(correctAnswerTexts.length).toBeGreaterThan(0);
      });
    });

    it("shows the user's incorrect answer", async () => {
      render(
        <ExplanationGate
          gateId="gate-test-bmc-config"
          onComplete={mockOnComplete}
        />,
      );

      const wrongChoice = screen
        .getByText("ipmitool mc info")
        .closest("button");
      fireEvent.click(wrongChoice!);
      fireEvent.click(screen.getByRole("button", { name: /check answer/i }));

      await waitFor(() => {
        expect(screen.getByText("Your Answer")).toBeInTheDocument();
        // Look for the user's answer in the red section - should show in the incorrect feedback
        const userAnswerTexts = screen.getAllByText("ipmitool mc info");
        // The answer should appear in the "Your Answer" section with red styling
        expect(userAnswerTexts.length).toBeGreaterThan(0);
      });
    });

    it("shows explanation after incorrect answer", async () => {
      render(
        <ExplanationGate
          gateId="gate-test-bmc-config"
          onComplete={mockOnComplete}
        />,
      );

      const wrongChoice = screen
        .getByText("ipmitool mc info")
        .closest("button");
      fireEvent.click(wrongChoice!);
      fireEvent.click(screen.getByRole("button", { name: /check answer/i }));

      await waitFor(() => {
        expect(screen.getByText("Why?")).toBeInTheDocument();
        expect(
          screen.getByText(/displays LAN channel 1 configuration/),
        ).toBeInTheDocument();
      });
    });

    it("calls recordExplanationGate with passed=false on incorrect answer", async () => {
      render(
        <ExplanationGate
          gateId="gate-test-bmc-config"
          onComplete={mockOnComplete}
        />,
      );

      const wrongChoice = screen
        .getByText("ipmitool mc info")
        .closest("button");
      fireEvent.click(wrongChoice!);
      fireEvent.click(screen.getByRole("button", { name: /check answer/i }));

      await waitFor(() => {
        expect(mockRecordExplanationGate).toHaveBeenCalledWith(
          "gate-test-bmc-config",
          "test-bmc-config",
          false,
        );
      });
    });

    it("shows Try Again button after incorrect answer", async () => {
      render(
        <ExplanationGate
          gateId="gate-test-bmc-config"
          onComplete={mockOnComplete}
        />,
      );

      const wrongChoice = screen
        .getByText("ipmitool mc info")
        .closest("button");
      fireEvent.click(wrongChoice!);
      fireEvent.click(screen.getByRole("button", { name: /check answer/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /try again/i }),
        ).toBeInTheDocument();
      });
    });

    it("shows Continue Anyway button after incorrect answer", async () => {
      render(
        <ExplanationGate
          gateId="gate-test-bmc-config"
          onComplete={mockOnComplete}
        />,
      );

      const wrongChoice = screen
        .getByText("ipmitool mc info")
        .closest("button");
      fireEvent.click(wrongChoice!);
      fireEvent.click(screen.getByRole("button", { name: /check answer/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /continue anyway/i }),
        ).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Retry Tests
  // ============================================================================

  describe("Retry Functionality", () => {
    it("returns to question state when Try Again is clicked", async () => {
      render(
        <ExplanationGate
          gateId="gate-test-bmc-config"
          onComplete={mockOnComplete}
        />,
      );

      // Submit wrong answer
      const wrongChoice = screen
        .getByText("ipmitool mc info")
        .closest("button");
      fireEvent.click(wrongChoice!);
      fireEvent.click(screen.getByRole("button", { name: /check answer/i }));

      await waitFor(() => {
        expect(screen.getByText("Not Quite")).toBeInTheDocument();
      });

      // Click retry
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));

      // Should be back to question state
      await waitFor(() => {
        expect(screen.getByText("Teachable Moment")).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /check answer/i }),
        ).toBeInTheDocument();
      });
    });

    it("clears selection when retrying", async () => {
      render(
        <ExplanationGate
          gateId="gate-test-bmc-config"
          onComplete={mockOnComplete}
        />,
      );

      // Submit wrong answer
      const wrongChoice = screen
        .getByText("ipmitool mc info")
        .closest("button");
      fireEvent.click(wrongChoice!);
      fireEvent.click(screen.getByRole("button", { name: /check answer/i }));

      await waitFor(() => {
        expect(screen.getByText("Not Quite")).toBeInTheDocument();
      });

      // Click retry
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));

      await waitFor(() => {
        // Submit button should be disabled (no selection)
        expect(
          screen.getByRole("button", { name: /check answer/i }),
        ).toBeDisabled();
      });
    });

    it("increments attempt count on each submission", async () => {
      render(
        <ExplanationGate
          gateId="gate-test-bmc-config"
          onComplete={mockOnComplete}
        />,
      );

      // First attempt (wrong)
      const wrongChoice = screen
        .getByText("ipmitool mc info")
        .closest("button");
      fireEvent.click(wrongChoice!);
      fireEvent.click(screen.getByRole("button", { name: /check answer/i }));

      await waitFor(() => {
        expect(screen.getByText("Not Quite")).toBeInTheDocument();
      });

      // Click retry
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));

      // Second attempt (correct)
      await waitFor(() => {
        expect(screen.getByText("Teachable Moment")).toBeInTheDocument();
      });

      const correctChoice = screen
        .getByText("ipmitool lan print 1")
        .closest("button");
      fireEvent.click(correctChoice!);
      fireEvent.click(screen.getByRole("button", { name: /check answer/i }));

      await waitFor(() => {
        expect(screen.getByText("Correct!")).toBeInTheDocument();
        expect(
          screen.getByText("You got it after 2 attempts."),
        ).toBeInTheDocument();
      });
    });

    it("calls onComplete when Continue Anyway is clicked after incorrect answer", async () => {
      render(
        <ExplanationGate
          gateId="gate-test-bmc-config"
          onComplete={mockOnComplete}
        />,
      );

      const wrongChoice = screen
        .getByText("ipmitool mc info")
        .closest("button");
      fireEvent.click(wrongChoice!);
      fireEvent.click(screen.getByRole("button", { name: /check answer/i }));

      await waitFor(() => {
        expect(screen.getByText("Not Quite")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /continue anyway/i }));

      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Dismiss Tests
  // ============================================================================

  describe("Dismiss Functionality", () => {
    it("calls onDismiss when Skip for now is clicked", () => {
      render(
        <ExplanationGate
          gateId="gate-test-bmc-config"
          onComplete={mockOnComplete}
          onDismiss={mockOnDismiss}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /skip for now/i }));

      expect(mockOnDismiss).toHaveBeenCalled();
    });

    it("calls onDismiss when X button is clicked", () => {
      render(
        <ExplanationGate
          gateId="gate-test-bmc-config"
          onComplete={mockOnComplete}
          onDismiss={mockOnDismiss}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /close/i }));

      expect(mockOnDismiss).toHaveBeenCalled();
    });

    it("calls onDismiss when close button is clicked in error state", () => {
      render(
        <ExplanationGate
          gateId="non-existent-gate"
          onComplete={mockOnComplete}
          onDismiss={mockOnDismiss}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /close/i }));

      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Different Gate Data Tests
  // ============================================================================

  describe("Loading Different Gate Data", () => {
    it("loads correct data for different gateId", () => {
      render(
        <ExplanationGate
          gateId="gate-test-gpu-monitoring"
          onComplete={mockOnComplete}
        />,
      );

      expect(
        screen.getByText(/What nvidia-smi flag displays the full GPU topology/),
      ).toBeInTheDocument();
      expect(screen.getByText("nvidia-smi -L")).toBeInTheDocument();
      expect(screen.getByText("nvidia-smi topo -m")).toBeInTheDocument();
    });

    it("uses correct answer index from gate data", async () => {
      render(
        <ExplanationGate
          gateId="gate-test-gpu-monitoring"
          onComplete={mockOnComplete}
        />,
      );

      // For this gate, correct answer is index 1 (nvidia-smi topo -m)
      const correctChoice = screen
        .getByText("nvidia-smi topo -m")
        .closest("button");
      fireEvent.click(correctChoice!);
      fireEvent.click(screen.getByRole("button", { name: /check answer/i }));

      await waitFor(() => {
        expect(screen.getByText("Correct!")).toBeInTheDocument();
      });
    });
  });
});
