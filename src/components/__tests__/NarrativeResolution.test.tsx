import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NarrativeResolution } from "../NarrativeResolution";

describe("NarrativeResolution", () => {
  it("should show the resolution text", () => {
    render(
      <NarrativeResolution
        resolution="You saved the cluster."
        quizScore={{ correct: 3, total: 4 }}
        timeSpent={15}
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByText(/saved the cluster/i)).toBeInTheDocument();
  });

  it("should show quiz performance", () => {
    render(
      <NarrativeResolution
        resolution="Done."
        quizScore={{ correct: 3, total: 4 }}
        timeSpent={15}
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByText(/3.*4/)).toBeInTheDocument();
  });

  it("should hide quiz score when total is 0", () => {
    render(
      <NarrativeResolution
        resolution="Done."
        quizScore={{ correct: 0, total: 0 }}
        timeSpent={5}
        onExit={vi.fn()}
      />,
    );
    expect(screen.queryByText("Quiz Score")).not.toBeInTheDocument();
  });

  it("should show time spent", () => {
    render(
      <NarrativeResolution
        resolution="Done."
        quizScore={{ correct: 0, total: 0 }}
        timeSpent={15}
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByText("15m")).toBeInTheDocument();
  });

  it("should call onExit when button clicked", () => {
    const onExit = vi.fn();
    render(
      <NarrativeResolution
        resolution="Done."
        quizScore={{ correct: 0, total: 0 }}
        timeSpent={5}
        onExit={onExit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /exit/i }));
    expect(onExit).toHaveBeenCalledOnce();
  });
});
