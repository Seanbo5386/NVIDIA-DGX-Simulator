// src/cli/__tests__/StateEngine.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { StateEngine } from "../StateEngine";
import { getCommandDefinitionRegistry } from "../CommandDefinitionRegistry";
import type { CommandDefinitionRegistry } from "../CommandDefinitionRegistry";

describe("StateEngine", () => {
  let registry: CommandDefinitionRegistry;
  let stateEngine: StateEngine;

  beforeAll(async () => {
    registry = await getCommandDefinitionRegistry();
    stateEngine = new StateEngine(registry);
  });

  describe("requiresRoot", () => {
    it("should return true for power limit flag", () => {
      expect(stateEngine.requiresRoot("nvidia-smi", ["pl"])).toBe(true);
    });

    it("should return false for query flag", () => {
      expect(stateEngine.requiresRoot("nvidia-smi", ["q"])).toBe(false);
    });

    it("should return false for read-only commands", () => {
      expect(stateEngine.requiresRoot("sinfo", [])).toBe(false);
    });
  });

  describe("getStateInteractions", () => {
    it("should return state interactions for a command", () => {
      const interactions = stateEngine.getStateInteractions("sinfo");

      expect(interactions).toBeDefined();
      expect(interactions?.reads_from).toBeDefined();
    });

    it("should return undefined for unknown command", () => {
      const interactions = stateEngine.getStateInteractions("unknown-cmd");

      expect(interactions).toBeUndefined();
    });
  });

  describe("getPrerequisiteError", () => {
    it("should return null when no prerequisites defined", () => {
      const mockContext = { isRoot: false };
      const error = stateEngine.getPrerequisiteError("sinfo", [], mockContext);

      expect(error).toBeNull();
    });

    it("should return error when root required but not provided", () => {
      const mockContext = { isRoot: false };
      const error = stateEngine.getPrerequisiteError(
        "nvidia-smi",
        ["pl"],
        mockContext,
      );

      expect(error).not.toBeNull();
      expect(error).toContain("root");
    });

    it("should return null when root required and provided", () => {
      const mockContext = { isRoot: true };
      const error = stateEngine.getPrerequisiteError(
        "nvidia-smi",
        ["pl"],
        mockContext,
      );

      expect(error).toBeNull();
    });
  });

  describe("canExecute", () => {
    it("should return valid for read-only commands", () => {
      const mockContext = { isRoot: false };
      const result = stateEngine.canExecute("sinfo", [], mockContext);

      expect(result.valid).toBe(true);
    });

    it("should return invalid for privileged commands without root", () => {
      const mockContext = { isRoot: false };
      const result = stateEngine.canExecute("nvidia-smi", ["pl"], mockContext);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("root");
    });
  });
});
