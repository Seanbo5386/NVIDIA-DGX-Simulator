import { describe, it, expect, beforeEach } from "vitest";
import { CommandInterceptor } from "../CommandInterceptor";

describe("CommandInterceptor", () => {
  let interceptor: CommandInterceptor;

  beforeEach(() => {
    interceptor = new CommandInterceptor();
    interceptor.registerFlags("nvidia-smi", [
      { short: "q", long: "query" },
      { short: "L", long: "list-gpus" },
      { short: "i", long: "id" },
      { long: "help" },
      { long: "version" },
    ]);
    interceptor.registerSubcommands("nvidia-smi", [
      "topo",
      "drain",
      "nvlink",
      "mig",
    ]);
  });

  describe("registerFlags", () => {
    it("should register both short and long flags", () => {
      const flags = interceptor.getRegisteredFlags("nvidia-smi");
      expect(flags).toContain("q");
      expect(flags).toContain("query");
      expect(flags).toContain("L");
      expect(flags).toContain("list-gpus");
    });

    it("should return empty array for unregistered commands", () => {
      const flags = interceptor.getRegisteredFlags("unknown-cmd");
      expect(flags).toEqual([]);
    });
  });

  describe("registerSubcommands", () => {
    it("should register subcommands", () => {
      const subs = interceptor.getRegisteredSubcommands("nvidia-smi");
      expect(subs).toContain("topo");
      expect(subs).toContain("mig");
    });
  });

  describe("validateFlag", () => {
    it("should accept valid flags with exact match", () => {
      const result = interceptor.validateFlag("nvidia-smi", "query");
      expect(result.exactMatch).toBe(true);
      expect(result.confidence).toBe(1.0);
    });

    it("should accept short flags", () => {
      const result = interceptor.validateFlag("nvidia-smi", "q");
      expect(result.exactMatch).toBe(true);
    });

    it("should suggest corrections for misspelled flags", () => {
      const result = interceptor.validateFlag("nvidia-smi", "qurey");
      expect(result.exactMatch).toBe(false);
      expect(result.suggestions).toContain("query");
    });

    it("should return no suggestions for completely unknown flags", () => {
      const result = interceptor.validateFlag("nvidia-smi", "zzzzzzzzzzz");
      expect(result.exactMatch).toBe(false);
      expect(result.suggestions).toHaveLength(0);
    });

    it("should return empty result for unregistered commands", () => {
      const result = interceptor.validateFlag("unknown-cmd", "q");
      expect(result.exactMatch).toBe(false);
      expect(result.confidence).toBe(0);
    });
  });

  describe("validateSubcommand", () => {
    it("should accept valid subcommands", () => {
      const result = interceptor.validateSubcommand("nvidia-smi", "topo");
      expect(result.exactMatch).toBe(true);
    });

    it("should suggest corrections for misspelled subcommands", () => {
      const result = interceptor.validateSubcommand("nvidia-smi", "topoo");
      expect(result.exactMatch).toBe(false);
      expect(result.suggestions).toContain("topo");
    });
  });

  describe("formatSuggestion", () => {
    it("should format single suggestion for flags", () => {
      const result = interceptor.validateFlag("nvidia-smi", "qurey");
      const msg = interceptor.formatSuggestion("nvidia-smi", result, true);
      expect(msg).toContain("Did you mean");
      expect(msg).toContain("--query");
    });

    it("should return empty string for exact matches", () => {
      const result = interceptor.validateFlag("nvidia-smi", "query");
      const msg = interceptor.formatSuggestion("nvidia-smi", result);
      expect(msg).toBe("");
    });

    it("should format subcommand suggestions without -- prefix", () => {
      const result = interceptor.validateSubcommand("nvidia-smi", "topoo");
      const msg = interceptor.formatSuggestion("nvidia-smi", result, false);
      expect(msg).toContain("Did you mean");
      expect(msg).toContain("'topo'");
      expect(msg).not.toContain("--topo");
    });
  });
});
