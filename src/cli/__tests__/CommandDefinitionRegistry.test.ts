// src/cli/__tests__/CommandDefinitionRegistry.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { CommandDefinitionRegistry } from "../CommandDefinitionRegistry";

describe("CommandDefinitionRegistry", () => {
  let registry: CommandDefinitionRegistry;

  beforeAll(async () => {
    registry = new CommandDefinitionRegistry();
    await registry.initialize();
  });

  describe("flag validation", () => {
    it("should validate known flags for nvidia-smi", () => {
      const result = registry.validateFlag("nvidia-smi", "q");
      expect(result.valid).toBe(true);
    });

    it("should reject unknown flags", () => {
      const result = registry.validateFlag("nvidia-smi", "zzz");
      expect(result.valid).toBe(false);
      expect(result.suggestions).toBeDefined();
    });

    it("should suggest corrections for typos", () => {
      const result = registry.validateFlag("nvidia-smi", "qurey"); // typo of 'query'
      expect(result.valid).toBe(false);
      expect(result.suggestions).toContain("query");
    });
  });

  describe("subcommand validation", () => {
    it("should validate known subcommands", () => {
      const result = registry.validateSubcommand("nvidia-smi", "mig");
      expect(result.valid).toBe(true);
    });

    it("should reject unknown subcommands", () => {
      const result = registry.validateSubcommand("nvidia-smi", "foobar");
      expect(result.valid).toBe(false);
    });
  });

  describe("help generation", () => {
    it("should generate command help", () => {
      const help = registry.getCommandHelp("nvidia-smi");
      expect(help).toContain("nvidia-smi");
      expect(help).toContain("GPU");
    });

    it("should generate flag help", () => {
      const help = registry.getFlagHelp("nvidia-smi", "q");
      expect(help).toContain("query");
    });
  });

  describe("usage examples", () => {
    it("should return usage examples with output", () => {
      const examples = registry.getUsageExamples("nvidia-smi");
      expect(examples.length).toBeGreaterThan(0);
      expect(examples[0].command).toBeDefined();
    });
  });

  describe("exit codes", () => {
    it("should return exit code meanings", () => {
      const meaning = registry.getExitCodeMeaning("nvidia-smi", 0);
      expect(meaning).toContain("Success");
    });
  });

  describe("permissions", () => {
    it("should identify root-required operations", () => {
      const requiresRoot = registry.requiresRoot("nvidia-smi", "pl");
      expect(requiresRoot).toBe(true);
    });

    it("should identify non-root operations", () => {
      const requiresRoot = registry.requiresRoot("nvidia-smi", "L");
      expect(requiresRoot).toBe(false);
    });
  });
});
