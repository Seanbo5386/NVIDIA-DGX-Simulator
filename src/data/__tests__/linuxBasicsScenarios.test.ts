import { describe, it, expect } from "vitest";
import scenariosData from "../narrativeScenarios.json";

interface NarrativeStep {
  id: string;
  type?: string;
  situation: string;
  task: string;
  expectedCommands: string[];
  hints: string[];
  validation: { type: string; command?: string; pattern?: string };
  quiz?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
  conceptContent?: string;
  tips?: string[];
  observeCommand?: string;
}

interface NarrativeScenario {
  id: string;
  domain: number;
  title: string;
  difficulty: string;
  tier?: number;
  narrative: { hook: string; setting: string; resolution: string };
  commandFamilies: string[];
  estimatedMinutes: number;
  steps: NarrativeStep[];
}

const scenarios = scenariosData.scenarios as NarrativeScenario[];
const linuxScenarios = scenarios.filter((s) => s.domain === 0);

describe("Linux Basics Scenarios (domain 0)", () => {
  it("should have 2 Linux scenarios with domain 0", () => {
    expect(linuxScenarios.length).toBe(2);
    linuxScenarios.forEach((s) => expect(s.domain).toBe(0));
  });

  it("should have correct IDs", () => {
    const ids = linuxScenarios.map((s) => s.id);
    expect(ids).toContain("domain0-linux-navigation");
    expect(ids).toContain("domain0-linux-output");
  });

  it("should all be tier 1 beginner", () => {
    linuxScenarios.forEach((s) => {
      expect(s.tier).toBe(1);
      expect(s.difficulty).toBe("beginner");
    });
  });

  it("should have reasonable step counts", () => {
    const nav = linuxScenarios.find(
      (s) => s.id === "domain0-linux-navigation",
    )!;
    const out = linuxScenarios.find((s) => s.id === "domain0-linux-output")!;

    expect(nav.steps.length).toBeGreaterThanOrEqual(8);
    expect(out.steps.length).toBeGreaterThanOrEqual(8);
  });

  it("concept steps should have non-empty conceptContent", () => {
    linuxScenarios.forEach((s) => {
      s.steps
        .filter((step) => step.type === "concept")
        .forEach((step) => {
          expect(step.conceptContent).toBeTruthy();
          expect(step.conceptContent!.length).toBeGreaterThan(20);
        });
    });
  });

  it("observe steps should have non-empty observeCommand", () => {
    linuxScenarios.forEach((s) => {
      s.steps
        .filter((step) => step.type === "observe")
        .forEach((step) => {
          expect(step.observeCommand).toBeTruthy();
          expect(step.observeCommand!.length).toBeGreaterThan(2);
        });
    });
  });

  it("concept/observe steps without expectedCommands should have validation.type of 'none'", () => {
    linuxScenarios.forEach((s) => {
      s.steps
        .filter(
          (step) =>
            (step.type === "concept" || step.type === "observe") &&
            step.expectedCommands.length === 0,
        )
        .forEach((step) => {
          expect(step.validation.type).toBe("none");
        });
    });
  });

  it("concept/observe steps with expectedCommands should have validation", () => {
    linuxScenarios.forEach((s) => {
      s.steps
        .filter(
          (step) =>
            (step.type === "concept" || step.type === "observe") &&
            step.expectedCommands.length > 0,
        )
        .forEach((step) => {
          expect(step.validation.type).not.toBe("none");
        });
    });
  });

  it("command steps should have expectedCommands and validation", () => {
    linuxScenarios.forEach((s) => {
      s.steps
        .filter((step) => step.type === "command")
        .forEach((step) => {
          expect(step.expectedCommands.length).toBeGreaterThan(0);
          expect(step.validation.type).not.toBe("none");
        });
    });
  });

  it("should have at least 2 quizzes across both scenarios", () => {
    const totalQuizzes = linuxScenarios.reduce(
      (count, s) => count + s.steps.filter((step) => step.quiz).length,
      0,
    );
    expect(totalQuizzes).toBeGreaterThanOrEqual(2);
  });

  it("step IDs should be unique within each scenario", () => {
    linuxScenarios.forEach((s) => {
      const ids = s.steps.map((step) => step.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  it("should have linux-basics in commandFamilies", () => {
    linuxScenarios.forEach((s) => {
      expect(s.commandFamilies).toContain("linux-basics");
    });
  });
});
