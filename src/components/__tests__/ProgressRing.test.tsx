import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressRing, MasteryBadge } from "../ProgressRing";

describe("ProgressRing", () => {
  describe("Basic Rendering", () => {
    it("should render with default props", () => {
      render(<ProgressRing progress={50} />);

      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toBeInTheDocument();
      expect(progressbar).toHaveAttribute("aria-valuenow", "50");
    });

    it("should display the progress percentage label by default", () => {
      render(<ProgressRing progress={75} />);

      expect(screen.getByText("75%")).toBeInTheDocument();
    });

    it("should hide label when showLabel is false", () => {
      render(<ProgressRing progress={75} showLabel={false} />);

      expect(screen.queryByText("75%")).not.toBeInTheDocument();
    });

    it("should have correct aria attributes", () => {
      render(<ProgressRing progress={42} />);

      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toHaveAttribute("aria-valuenow", "42");
      expect(progressbar).toHaveAttribute("aria-valuemin", "0");
      expect(progressbar).toHaveAttribute("aria-valuemax", "100");
      expect(progressbar).toHaveAttribute("aria-label", "Progress: 42%");
    });
  });

  describe("Progress Values", () => {
    it("should clamp progress to minimum 0", () => {
      render(<ProgressRing progress={-10} />);

      expect(screen.getByText("0%")).toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "0",
      );
    });

    it("should clamp progress to maximum 100", () => {
      render(<ProgressRing progress={150} />);

      expect(screen.getByText("100%")).toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "100",
      );
    });

    it("should round decimal progress values", () => {
      render(<ProgressRing progress={33.7} />);

      expect(screen.getByText("34%")).toBeInTheDocument();
    });

    it("should handle 0 progress", () => {
      render(<ProgressRing progress={0} />);

      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("should handle 100 progress", () => {
      render(<ProgressRing progress={100} />);

      expect(screen.getByText("100%")).toBeInTheDocument();
    });
  });

  describe("Size Variants", () => {
    it("should render small size correctly", () => {
      const { container } = render(<ProgressRing progress={50} size="sm" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ width: "40px", height: "40px" });

      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "40");
      expect(svg).toHaveAttribute("height", "40");
    });

    it("should render medium size correctly (default)", () => {
      const { container } = render(<ProgressRing progress={50} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ width: "60px", height: "60px" });

      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "60");
      expect(svg).toHaveAttribute("height", "60");
    });

    it("should render large size correctly", () => {
      const { container } = render(<ProgressRing progress={50} size="lg" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ width: "80px", height: "80px" });

      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "80");
      expect(svg).toHaveAttribute("height", "80");
    });
  });

  describe("Color Behavior", () => {
    it("should use custom color when provided", () => {
      const { container } = render(
        <ProgressRing progress={50} color="#ff0000" />,
      );

      const progressCircle = container.querySelectorAll("circle")[1];
      expect(progressCircle).toHaveAttribute("stroke", "#ff0000");
    });

    it("should use red color for progress < 30%", () => {
      const { container } = render(<ProgressRing progress={25} />);

      const progressCircle = container.querySelectorAll("circle")[1];
      expect(progressCircle).toHaveAttribute("stroke", "#ef4444");
    });

    it("should use yellow color for progress 30-70%", () => {
      const { container } = render(<ProgressRing progress={50} />);

      const progressCircle = container.querySelectorAll("circle")[1];
      expect(progressCircle).toHaveAttribute("stroke", "#eab308");
    });

    it("should use NVIDIA green for progress > 70%", () => {
      const { container } = render(<ProgressRing progress={85} />);

      const progressCircle = container.querySelectorAll("circle")[1];
      expect(progressCircle).toHaveAttribute("stroke", "#76B900");
    });

    it("should use NVIDIA green at exactly 70%", () => {
      const { container } = render(<ProgressRing progress={70} />);

      const progressCircle = container.querySelectorAll("circle")[1];
      expect(progressCircle).toHaveAttribute("stroke", "#76B900");
    });

    it("should use red at exactly 30%", () => {
      const { container } = render(<ProgressRing progress={30} />);

      const progressCircle = container.querySelectorAll("circle")[1];
      expect(progressCircle).toHaveAttribute("stroke", "#eab308");
    });
  });

  describe("SVG Structure", () => {
    it("should render two circles (background and progress)", () => {
      const { container } = render(<ProgressRing progress={50} />);

      const circles = container.querySelectorAll("circle");
      expect(circles).toHaveLength(2);
    });

    it("should have background circle with gray stroke", () => {
      const { container } = render(<ProgressRing progress={50} />);

      const backgroundCircle = container.querySelectorAll("circle")[0];
      expect(backgroundCircle).toHaveAttribute("stroke", "#374151");
    });

    it("should have progress circle with strokeLinecap round", () => {
      const { container } = render(<ProgressRing progress={50} />);

      const progressCircle = container.querySelectorAll("circle")[1];
      expect(progressCircle).toHaveAttribute("stroke-linecap", "round");
    });

    it("should have correct strokeDasharray based on radius", () => {
      const { container } = render(<ProgressRing progress={50} size="md" />);

      const progressCircle = container.querySelectorAll("circle")[1];
      // Circumference = 2 * PI * radius (24 for md) = ~150.8
      const circumference = 2 * Math.PI * 24;
      expect(progressCircle).toHaveAttribute(
        "stroke-dasharray",
        circumference.toString(),
      );
    });
  });

  describe("Animation", () => {
    it("should have transition class when animated is true (default)", () => {
      const { container } = render(<ProgressRing progress={50} />);

      const progressCircle = container.querySelectorAll("circle")[1];
      expect(progressCircle).toHaveClass("transition-all");
      expect(progressCircle).toHaveClass("duration-500");
      expect(progressCircle).toHaveClass("ease-out");
    });

    it("should not have transition class when animated is false", () => {
      const { container } = render(
        <ProgressRing progress={50} animated={false} />,
      );

      const progressCircle = container.querySelectorAll("circle")[1];
      expect(progressCircle).not.toHaveClass("transition-all");
    });
  });

  describe("Custom className", () => {
    it("should apply custom className to wrapper", () => {
      const { container } = render(
        <ProgressRing progress={50} className="my-custom-class" />,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("my-custom-class");
    });
  });
});

describe("MasteryBadge", () => {
  describe("Mastered State", () => {
    it("should show Mastered badge when threshold is met", () => {
      render(<MasteryBadge consecutiveSuccesses={5} />);

      expect(screen.getByText("Mastered")).toBeInTheDocument();
      expect(screen.getByText("(5)")).toBeInTheDocument();
    });

    it("should show Mastered badge when threshold is exceeded", () => {
      render(<MasteryBadge consecutiveSuccesses={10} />);

      expect(screen.getByText("Mastered")).toBeInTheDocument();
      expect(screen.getByText("(10)")).toBeInTheDocument();
    });

    it("should respect custom threshold", () => {
      render(<MasteryBadge consecutiveSuccesses={3} threshold={3} />);

      expect(screen.getByText("Mastered")).toBeInTheDocument();
    });
  });

  describe("Streak State", () => {
    it("should show streak badge when successes > 0 but < threshold", () => {
      render(<MasteryBadge consecutiveSuccesses={3} />);

      expect(screen.getByText("Streak:")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.queryByText("Mastered")).not.toBeInTheDocument();
    });

    it("should show streak for single success", () => {
      render(<MasteryBadge consecutiveSuccesses={1} />);

      expect(screen.getByText("Streak:")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  describe("No Progress State", () => {
    it("should render nothing when consecutiveSuccesses is 0", () => {
      const { container } = render(<MasteryBadge consecutiveSuccesses={0} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe("Styling", () => {
    it("should have green styling for mastered badge", () => {
      const { container } = render(<MasteryBadge consecutiveSuccesses={5} />);

      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass("bg-nvidia-green/20");
      expect(badge).toHaveClass("border-nvidia-green/50");
    });

    it("should have gray styling for streak badge", () => {
      const { container } = render(<MasteryBadge consecutiveSuccesses={3} />);

      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass("bg-gray-700");
      expect(badge).toHaveClass("border-gray-600");
    });
  });
});
