// src/cli/__tests__/formatters.test.ts
import { describe, it, expect } from "vitest";
import { ANSI, formatCommandHelp } from "../formatters";

describe("Formatter Constants", () => {
  it("should export ANSI color codes", () => {
    expect(ANSI.RESET).toBe("\x1b[0m");
    expect(ANSI.BOLD).toBe("\x1b[1m");
    expect(ANSI.RED).toBe("\x1b[31m");
    expect(ANSI.CYAN).toBe("\x1b[36m");
  });
});

describe("formatCommandHelp", () => {
  it("should format a minimal command definition", () => {
    const def = {
      command: "test-cmd",
      category: "general" as const,
      description: "A test command",
      synopsis: "test-cmd [OPTIONS]",
    };

    const output = formatCommandHelp(def);

    expect(output).toContain("test-cmd");
    expect(output).toContain("A test command");
    expect(output).toContain("test-cmd [OPTIONS]");
  });
});

describe("formatCommandHelp with options", () => {
  it("should format global_options", () => {
    const def = {
      command: "test-cmd",
      category: "general" as const,
      description: "A test command",
      synopsis: "test-cmd [OPTIONS]",
      global_options: [
        {
          short: "h",
          long: "help",
          description: "Show help message",
        },
        {
          short: "v",
          long: "verbose",
          description: "Enable verbose output",
        },
      ],
    };

    const output = formatCommandHelp(def);

    expect(output).toContain("Options:");
    expect(output).toContain("-h, --help");
    expect(output).toContain("Show help message");
    expect(output).toContain("-v, --verbose");
  });

  it("should truncate long descriptions at 60 chars", () => {
    const def = {
      command: "test-cmd",
      category: "general" as const,
      description: "Test",
      synopsis: "test-cmd",
      global_options: [
        {
          long: "option",
          description:
            "This is a very long description that should be truncated because it exceeds the maximum allowed width for option descriptions",
        },
      ],
    };

    const output = formatCommandHelp(def);

    expect(output).toContain("...");
    expect(output).not.toContain("exceeds the maximum");
  });

  it("should show count when options exceed limit", () => {
    const options = Array.from({ length: 15 }, (_, i) => ({
      long: `option${i}`,
      description: `Option ${i}`,
    }));

    const def = {
      command: "test-cmd",
      category: "general" as const,
      description: "Test",
      synopsis: "test-cmd",
      global_options: options,
    };

    const output = formatCommandHelp(def);

    expect(output).toContain("... and 5 more options");
  });
});

describe("formatCommandHelp with subcommands", () => {
  it("should format subcommands", () => {
    const def = {
      command: "test-cmd",
      category: "general" as const,
      description: "Test",
      synopsis: "test-cmd <subcommand>",
      subcommands: [
        { name: "start", description: "Start the service" },
        { name: "stop", description: "Stop the service" },
      ],
    };

    const output = formatCommandHelp(def);

    expect(output).toContain("Subcommands:");
    expect(output).toContain("start");
    expect(output).toContain("Start the service");
  });
});

describe("formatCommandHelp with examples", () => {
  it("should format common_usage_patterns", () => {
    const def = {
      command: "test-cmd",
      category: "general" as const,
      description: "Test",
      synopsis: "test-cmd",
      common_usage_patterns: [
        {
          description: "Run with defaults",
          command: "test-cmd",
          requires_root: false,
        },
        {
          description: "Run as admin",
          command: "sudo test-cmd --admin",
          requires_root: true,
        },
      ],
    };

    const output = formatCommandHelp(def);

    expect(output).toContain("Examples:");
    expect(output).toContain("test-cmd");
    expect(output).toContain("Run with defaults");
    expect(output).toContain("⚠ Requires root privileges");
  });
});
