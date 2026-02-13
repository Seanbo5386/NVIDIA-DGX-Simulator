import { describe, it, expect } from "vitest";
import { validateCommandExecuted } from "../commandValidator";

describe("validateCommandExecuted", () => {
  describe("exact match", () => {
    it("matches identical commands", () => {
      expect(validateCommandExecuted("nvidia-smi", ["nvidia-smi"])).toBe(true);
    });

    it("matches case-insensitively", () => {
      expect(validateCommandExecuted("NVIDIA-SMI", ["nvidia-smi"])).toBe(true);
    });

    it("trims whitespace", () => {
      expect(validateCommandExecuted("  nvidia-smi  ", ["nvidia-smi"])).toBe(
        true,
      );
    });

    it("rejects non-matching commands", () => {
      expect(validateCommandExecuted("ibstat", ["nvidia-smi"])).toBe(false);
    });
  });

  describe("flag matching", () => {
    it("matches command with expected flags", () => {
      expect(validateCommandExecuted("nvidia-smi -q", ["nvidia-smi -q"])).toBe(
        true,
      );
    });

    it("matches when executed has extra flags", () => {
      expect(
        validateCommandExecuted("nvidia-smi -q -d MEMORY", ["nvidia-smi -q"]),
      ).toBe(true);
    });

    it("matches base command when expected has no flags", () => {
      expect(validateCommandExecuted("nvidia-smi -q", ["nvidia-smi"])).toBe(
        true,
      );
    });
  });

  describe("piped commands", () => {
    it("matches identical piped commands", () => {
      expect(
        validateCommandExecuted("nvidia-smi | grep GPU", [
          "nvidia-smi | grep GPU",
        ]),
      ).toBe(true);
    });

    it("rejects piped with different segment count", () => {
      expect(
        validateCommandExecuted("nvidia-smi | grep GPU | head", [
          "nvidia-smi | grep GPU",
        ]),
      ).toBe(false);
    });
  });

  describe("shell substitution expansion", () => {
    it("normalizes $(command) in both executed and expected", () => {
      expect(
        validateCommandExecuted("kill $(pgrep hpl)", ["kill $(pgrep hpl)"]),
      ).toBe(true);
    });
  });

  describe("invalid pattern rejection", () => {
    it("rejects negative GPU ID", () => {
      expect(
        validateCommandExecuted("nvidia-smi -i -0", ["nvidia-smi -i 0"]),
      ).toBe(false);
    });
  });

  describe("multiple expected commands", () => {
    it("matches if any expected command matches", () => {
      expect(
        validateCommandExecuted("ibstat", ["nvidia-smi", "ibstat", "ipmitool"]),
      ).toBe(true);
    });

    it("rejects if no expected command matches", () => {
      expect(
        validateCommandExecuted("hostname", ["nvidia-smi", "ibstat"]),
      ).toBe(false);
    });
  });

  describe("scontrol show normalization", () => {
    it("matches 'node' vs 'nodes'", () => {
      expect(
        validateCommandExecuted("scontrol show nodes", ["scontrol show node"]),
      ).toBe(true);
    });

    it("matches 'partition' vs 'partitions'", () => {
      expect(
        validateCommandExecuted("scontrol show partitions", [
          "scontrol show partition",
        ]),
      ).toBe(true);
    });
  });

  describe("sinfo output format", () => {
    it("matches sinfo -o variants", () => {
      expect(
        validateCommandExecuted('sinfo -o "%P %a %D %t"', ['sinfo -o "%N %T"']),
      ).toBe(true);
    });
  });
});
