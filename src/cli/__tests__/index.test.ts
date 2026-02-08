// src/cli/__tests__/index.test.ts
import { describe, it, expect } from "vitest";

describe("CLI Module Exports", () => {
  it("should export all public types", async () => {
    const cliModule = await import("../index");

    // Types are compile-time only, but we can check the type imports work
    expect(cliModule).toBeDefined();
  });

  it("should export CommandDefinitionLoader", async () => {
    const { CommandDefinitionLoader, getCommandDefinitionLoader } =
      await import("../index");

    expect(CommandDefinitionLoader).toBeDefined();
    expect(getCommandDefinitionLoader).toBeDefined();
  });

  it("should export CommandDefinitionRegistry", async () => {
    const { CommandDefinitionRegistry, getCommandDefinitionRegistry } =
      await import("../index");

    expect(CommandDefinitionRegistry).toBeDefined();
    expect(getCommandDefinitionRegistry).toBeDefined();
  });

  it("should export explainCommand", async () => {
    const { generateExplainOutput } = await import("../index");

    expect(generateExplainOutput).toBeDefined();
  });

  it("should export CommandExerciseGenerator", async () => {
    const { CommandExerciseGenerator } = await import("../index");

    expect(CommandExerciseGenerator).toBeDefined();
  });

  it("should export formatters", async () => {
    const {
      ANSI,
      formatCommandHelp,
      formatFlagHelp,
      formatErrorMessage,
      formatExitCode,
      formatValidationError,
    } = await import("../index");

    expect(ANSI).toBeDefined();
    expect(formatCommandHelp).toBeDefined();
    expect(formatFlagHelp).toBeDefined();
    expect(formatErrorMessage).toBeDefined();
    expect(formatExitCode).toBeDefined();
    expect(formatValidationError).toBeDefined();
  });

  it("should export StateEngine", async () => {
    const { StateEngine } = await import("../index");

    expect(StateEngine).toBeDefined();
  });
});
