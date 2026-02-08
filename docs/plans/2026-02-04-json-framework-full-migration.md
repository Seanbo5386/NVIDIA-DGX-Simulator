# JSON Framework Full Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the migration of all 19 simulators to use JSON command definitions as the single source of truth for validation, help text, error messages, exit codes, and state interactions.

**Architecture:** Create a formatter layer that converts structured JSON data into terminal output. Extend BaseSimulator with methods that delegate to the registry. Add a StateEngine for prerequisite checking. Migrate simulators one-by-one, removing hardcoded help methods and replacing them with registry calls.

**Tech Stack:** TypeScript, Vitest, existing CommandDefinitionRegistry, ANSI escape codes for formatting

---

## Phase 1: Foundation - Formatter Layer

### Task 1: Create Formatter Types and Constants

**Files:**

- Create: `src/cli/formatters.ts`
- Test: `src/cli/__tests__/formatters.test.ts`

**Step 1: Write the failing test**

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/cli/__tests__/formatters.test.ts`
Expected: FAIL with "Cannot find module '../formatters'"

**Step 3: Write minimal implementation**

```typescript
// src/cli/formatters.ts
import type {
  CommandDefinition,
  CommandOption,
  Subcommand,
  ExitCode,
  ErrorMessage,
  UsagePattern,
} from "./types";

/**
 * ANSI escape codes for terminal formatting
 * Matches patterns from explainCommand.ts
 */
export const ANSI = {
  RESET: "\x1b[0m",
  BOLD: "\x1b[1m",
  DIM: "\x1b[2m",
  RED: "\x1b[31m",
  GREEN: "\x1b[32m",
  YELLOW: "\x1b[33m",
  CYAN: "\x1b[36m",
  GRAY: "\x1b[90m",
  BOLD_CYAN: "\x1b[1;36m",
  BOLD_WHITE: "\x1b[1;37m",
} as const;

/**
 * Format a complete command help output from JSON definition
 */
export function formatCommandHelp(def: CommandDefinition): string {
  let output = "";

  // Header
  output += `${ANSI.BOLD_CYAN}━━━ ${def.command} ━━━${ANSI.RESET}\n\n`;

  // Description
  output += `${ANSI.BOLD}Description:${ANSI.RESET}\n`;
  output += `  ${def.description}\n\n`;

  // Synopsis
  output += `${ANSI.BOLD}Usage:${ANSI.RESET}\n`;
  output += `  ${def.synopsis}\n\n`;

  return output;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/cli/__tests__/formatters.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/cli/formatters.ts src/cli/__tests__/formatters.test.ts
git commit -m "feat(cli): add formatter layer foundation with ANSI constants

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Add Options Formatting to formatCommandHelp

**Files:**

- Modify: `src/cli/formatters.ts`
- Modify: `src/cli/__tests__/formatters.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/cli/__tests__/formatters.test.ts
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
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/cli/__tests__/formatters.test.ts`
Expected: FAIL - options not rendered

**Step 3: Write minimal implementation**

```typescript
// Update formatCommandHelp in src/cli/formatters.ts
export function formatCommandHelp(def: CommandDefinition): string {
  let output = "";

  // Header
  output += `${ANSI.BOLD_CYAN}━━━ ${def.command} ━━━${ANSI.RESET}\n\n`;

  // Description
  output += `${ANSI.BOLD}Description:${ANSI.RESET}\n`;
  output += `  ${def.description}\n\n`;

  // Synopsis
  output += `${ANSI.BOLD}Usage:${ANSI.RESET}\n`;
  output += `  ${def.synopsis}\n\n`;

  // Options
  if (def.global_options && def.global_options.length > 0) {
    output += `${ANSI.BOLD}Options:${ANSI.RESET}\n`;
    const maxOptions = 10;

    for (const opt of def.global_options.slice(0, maxOptions)) {
      const shortStr = opt.short ? `-${opt.short.replace(/^-+/, "")}` : "";
      const longStr = opt.long ? `--${opt.long.replace(/^-+/, "")}` : "";
      const combined = [shortStr, longStr].filter(Boolean).join(", ");

      let desc = opt.description;
      if (desc.length > 60) {
        desc = desc.substring(0, 57) + "...";
      }

      output += `  ${ANSI.CYAN}${combined.padEnd(25)}${ANSI.RESET} ${desc}\n`;
    }

    if (def.global_options.length > maxOptions) {
      output += `  ... and ${def.global_options.length - maxOptions} more options\n`;
    }
    output += "\n";
  }

  return output;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/cli/__tests__/formatters.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/cli/formatters.ts src/cli/__tests__/formatters.test.ts
git commit -m "feat(cli): add options formatting to formatCommandHelp

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Add Subcommands and Examples Formatting

**Files:**

- Modify: `src/cli/formatters.ts`
- Modify: `src/cli/__tests__/formatters.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/cli/__tests__/formatters.test.ts
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
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/cli/__tests__/formatters.test.ts`
Expected: FAIL - subcommands/examples not rendered

**Step 3: Write minimal implementation**

```typescript
// Update formatCommandHelp in src/cli/formatters.ts - add after options section
// Subcommands
if (def.subcommands && def.subcommands.length > 0) {
  output += `${ANSI.BOLD}Subcommands:${ANSI.RESET}\n`;
  const maxSubs = 8;

  for (const sub of def.subcommands.slice(0, maxSubs)) {
    let desc = sub.description;
    if (desc.length > 50) {
      desc = desc.substring(0, 47) + "...";
    }
    output += `  ${ANSI.CYAN}${sub.name.padEnd(15)}${ANSI.RESET} ${desc}\n`;
  }

  if (def.subcommands.length > maxSubs) {
    output += `  ... and ${def.subcommands.length - maxSubs} more\n`;
  }
  output += "\n";
}

// Examples
if (def.common_usage_patterns && def.common_usage_patterns.length > 0) {
  output += `${ANSI.BOLD}Examples:${ANSI.RESET}\n`;

  for (const pattern of def.common_usage_patterns.slice(0, 5)) {
    output += `\n  ${ANSI.CYAN}${pattern.command}${ANSI.RESET}\n`;
    output += `    ${pattern.description}\n`;
    if (pattern.requires_root) {
      output += `    ${ANSI.YELLOW}⚠ Requires root privileges${ANSI.RESET}\n`;
    }
  }
  output += "\n";
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/cli/__tests__/formatters.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/cli/formatters.ts src/cli/__tests__/formatters.test.ts
git commit -m "feat(cli): add subcommands and examples to formatCommandHelp

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Add Exit Codes and Error Messages Formatting

**Files:**

- Modify: `src/cli/formatters.ts`
- Modify: `src/cli/__tests__/formatters.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/cli/__tests__/formatters.test.ts
describe("formatCommandHelp with exit codes", () => {
  it("should format exit_codes", () => {
    const def = {
      command: "test-cmd",
      category: "general" as const,
      description: "Test",
      synopsis: "test-cmd",
      exit_codes: [
        { code: 0, meaning: "Success" },
        { code: 1, meaning: "General error" },
        { code: 2, meaning: "Invalid arguments" },
      ],
    };

    const output = formatCommandHelp(def);

    expect(output).toContain("Exit Codes:");
    expect(output).toContain("0");
    expect(output).toContain("Success");
    expect(output).toContain("2");
  });
});

describe("formatCommandHelp with error messages", () => {
  it("should format error_messages with resolutions", () => {
    const def = {
      command: "test-cmd",
      category: "general" as const,
      description: "Test",
      synopsis: "test-cmd",
      error_messages: [
        {
          message: "Connection refused",
          meaning: "Cannot connect to server",
          resolution: "Check if server is running",
        },
      ],
    };

    const output = formatCommandHelp(def);

    expect(output).toContain("Common Errors:");
    expect(output).toContain("Connection refused");
    expect(output).toContain("Cannot connect to server");
    expect(output).toContain("Fix:");
  });
});

describe("formatErrorMessage", () => {
  it("should format a single error with resolution", () => {
    const error = {
      message: "File not found",
      meaning: "The specified file does not exist",
      resolution: "Check the file path and try again",
    };

    const output = formatErrorMessage(error);

    expect(output).toContain("File not found");
    expect(output).toContain("The specified file does not exist");
    expect(output).toContain("Check the file path");
  });
});

describe("formatExitCode", () => {
  it("should format an exit code with meaning", () => {
    const exitCode = { code: 13, meaning: "Permission denied" };

    const output = formatExitCode(exitCode);

    expect(output).toContain("13");
    expect(output).toContain("Permission denied");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/cli/__tests__/formatters.test.ts`
Expected: FAIL - exit codes/errors not rendered, functions not exported

**Step 3: Write minimal implementation**

```typescript
// Add to src/cli/formatters.ts

/**
 * Format a single error message with resolution
 */
export function formatErrorMessage(error: ErrorMessage): string {
  let output = `${ANSI.RED}${error.message}${ANSI.RESET}\n`;
  output += `  Meaning: ${error.meaning}\n`;
  if (error.resolution) {
    output += `  ${ANSI.GREEN}Fix: ${error.resolution}${ANSI.RESET}\n`;
  }
  return output;
}

/**
 * Format an exit code with its meaning
 */
export function formatExitCode(exitCode: ExitCode): string {
  return `  ${ANSI.CYAN}${exitCode.code.toString().padEnd(5)}${ANSI.RESET} ${exitCode.meaning}\n`;
}

// Add to formatCommandHelp after examples section:

// Exit Codes
if (def.exit_codes && def.exit_codes.length > 0) {
  output += `${ANSI.BOLD}Exit Codes:${ANSI.RESET}\n`;
  for (const ec of def.exit_codes.slice(0, 6)) {
    output += formatExitCode(ec);
  }
  output += "\n";
}

// Error Messages
if (def.error_messages && def.error_messages.length > 0) {
  output += `${ANSI.BOLD}Common Errors:${ANSI.RESET}\n`;
  for (const err of def.error_messages.slice(0, 3)) {
    const msgPreview =
      err.message.length > 50
        ? err.message.substring(0, 47) + "..."
        : err.message;
    output += `  ${ANSI.RED}${msgPreview}${ANSI.RESET}\n`;
    output += `    Meaning: ${err.meaning}\n`;
    if (err.resolution) {
      const resPreview =
        err.resolution.length > 70
          ? err.resolution.substring(0, 67) + "..."
          : err.resolution;
      output += `    ${ANSI.GREEN}Fix: ${resPreview}${ANSI.RESET}\n`;
    }
  }
  output += "\n";
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/cli/__tests__/formatters.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/cli/formatters.ts src/cli/__tests__/formatters.test.ts
git commit -m "feat(cli): add exit codes and error message formatting

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Add formatFlagHelp and formatValidationError

**Files:**

- Modify: `src/cli/formatters.ts`
- Modify: `src/cli/__tests__/formatters.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/cli/__tests__/formatters.test.ts
import { formatFlagHelp, formatValidationError } from "../formatters";

describe("formatFlagHelp", () => {
  it("should format a flag with all details", () => {
    const opt = {
      short: "i",
      long: "index",
      description: "Specify GPU index",
      arguments: "INDEX",
      argument_type: "integer",
      default: "0",
      example: "nvidia-smi -i 0",
    };

    const output = formatFlagHelp("nvidia-smi", opt);

    expect(output).toContain("-i, --index");
    expect(output).toContain("Specify GPU index");
    expect(output).toContain("Arguments:");
    expect(output).toContain("INDEX");
    expect(output).toContain("integer");
    expect(output).toContain("Default:");
    expect(output).toContain("Example:");
  });

  it("should handle flag with only long form", () => {
    const opt = {
      long: "verbose",
      description: "Enable verbose mode",
    };

    const output = formatFlagHelp("test", opt);

    expect(output).toContain("--verbose");
    expect(output).not.toContain("-,");
  });
});

describe("formatValidationError", () => {
  it("should format unknown flag with suggestions", () => {
    const result = {
      valid: false,
      suggestions: ["query", "quiet"],
    };

    const output = formatValidationError("nvidia-smi", "qurey", result);

    expect(output).toContain("nvidia-smi");
    expect(output).toContain("qurey");
    expect(output).toContain("Did you mean");
    expect(output).toContain("query");
  });

  it("should format unknown flag without suggestions", () => {
    const result = {
      valid: false,
      suggestions: [],
    };

    const output = formatValidationError("test", "xyz", result);

    expect(output).toContain("unrecognized option");
    expect(output).toContain("xyz");
    expect(output).not.toContain("Did you mean");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/cli/__tests__/formatters.test.ts`
Expected: FAIL - functions not defined

**Step 3: Write minimal implementation**

```typescript
// Add to src/cli/formatters.ts
import type { ValidationResult } from "./CommandDefinitionRegistry";

/**
 * Format detailed help for a specific flag
 */
export function formatFlagHelp(command: string, opt: CommandOption): string {
  let output = "";

  // Header
  output += `${ANSI.BOLD_CYAN}━━━ ${command} flag ━━━${ANSI.RESET}\n\n`;

  // Flag name
  const shortStr = opt.short ? `-${opt.short.replace(/^-+/, "")}` : "";
  const longStr = opt.long ? `--${opt.long.replace(/^-+/, "")}` : "";
  const combined = [shortStr, longStr].filter(Boolean).join(", ");
  output += `${ANSI.BOLD}Flag:${ANSI.RESET} ${combined}\n\n`;

  // Description
  output += `${ANSI.BOLD}Description:${ANSI.RESET}\n  ${opt.description}\n\n`;

  // Arguments
  if (opt.arguments) {
    output += `${ANSI.BOLD}Arguments:${ANSI.RESET} ${opt.arguments}`;
    if (opt.argument_type) {
      output += ` (${opt.argument_type})`;
    }
    output += "\n\n";
  }

  // Default
  if (opt.default) {
    output += `${ANSI.BOLD}Default:${ANSI.RESET} ${opt.default}\n\n`;
  }

  // Example
  if (opt.example) {
    output += `${ANSI.BOLD}Example:${ANSI.RESET}\n  ${ANSI.CYAN}${opt.example}${ANSI.RESET}\n\n`;
  }

  return output;
}

/**
 * Format a validation error with suggestions
 */
export function formatValidationError(
  command: string,
  flag: string,
  result: ValidationResult,
): string {
  let output = `${command}: unrecognized option '${flag}'\n`;

  if (result.suggestions && result.suggestions.length > 0) {
    output += `Did you mean: ${result.suggestions.join(", ")}?\n`;
  }

  output += `Try '${command} --help' for more information.\n`;

  return output;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/cli/__tests__/formatters.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/cli/formatters.ts src/cli/__tests__/formatters.test.ts
git commit -m "feat(cli): add formatFlagHelp and formatValidationError

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 6: Export Formatters from CLI Barrel

**Files:**

- Modify: `src/cli/index.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/cli/__tests__/index.test.ts
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
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/cli/__tests__/index.test.ts`
Expected: FAIL - formatters not exported

**Step 3: Write minimal implementation**

```typescript
// Add to src/cli/index.ts after existing exports

// Formatters
export {
  ANSI,
  formatCommandHelp,
  formatFlagHelp,
  formatErrorMessage,
  formatExitCode,
  formatValidationError,
} from "./formatters";
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/cli/__tests__/index.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/cli/index.ts src/cli/__tests__/index.test.ts
git commit -m "feat(cli): export formatters from barrel

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: State Engine

### Task 7: Create StateEngine Foundation

**Files:**

- Create: `src/cli/StateEngine.ts`
- Test: `src/cli/__tests__/StateEngine.test.ts`

**Step 1: Write the failing test**

```typescript
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
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/cli/__tests__/StateEngine.test.ts`
Expected: FAIL with "Cannot find module '../StateEngine'"

**Step 3: Write minimal implementation**

```typescript
// src/cli/StateEngine.ts
import type { CommandDefinitionRegistry } from "./CommandDefinitionRegistry";
import type { StateInteraction } from "./types";

/**
 * StateEngine enforces realistic command sequences using state_interactions
 * from JSON definitions.
 */
export class StateEngine {
  constructor(private registry: CommandDefinitionRegistry) {}

  /**
   * Check if a command with given flags requires root privileges
   */
  requiresRoot(command: string, flags: string[]): boolean {
    // Check each flag
    for (const flag of flags) {
      if (this.registry.requiresRoot(command, flag)) {
        return true;
      }
    }

    // Check command-level permissions
    const def = this.registry.getDefinition(command);
    if (!def) return false;

    // Check state_interactions.writes_to for requires_privilege
    const writesTo = def.state_interactions?.writes_to || [];
    for (const write of writesTo) {
      if (write.requires_privilege === "root") {
        // If no specific flags required, command always needs root for writes
        if (!write.requires_flags || write.requires_flags.length === 0) {
          return true;
        }
        // Check if any of the required flags are present
        for (const reqFlag of write.requires_flags) {
          const normalized = reqFlag.replace(/^-+/, "");
          if (flags.includes(normalized)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Get state interactions for a command
   */
  getStateInteractions(command: string): StateInteraction | undefined {
    const def = this.registry.getDefinition(command);
    return def?.state_interactions;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/cli/__tests__/StateEngine.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/cli/StateEngine.ts src/cli/__tests__/StateEngine.test.ts
git commit -m "feat(cli): add StateEngine for permission checking

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 8: Add Prerequisite Checking to StateEngine

**Files:**

- Modify: `src/cli/StateEngine.ts`
- Modify: `src/cli/__tests__/StateEngine.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/cli/__tests__/StateEngine.test.ts
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
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/cli/__tests__/StateEngine.test.ts`
Expected: FAIL - methods not defined

**Step 3: Write minimal implementation**

```typescript
// Add to src/cli/StateEngine.ts

export interface ExecutionContext {
  isRoot: boolean;
}

export interface CanExecuteResult {
  valid: boolean;
  reason?: string;
}

// Add methods to StateEngine class:

  /**
   * Check if command can execute given current context
   */
  canExecute(command: string, flags: string[], context: ExecutionContext): CanExecuteResult {
    const error = this.getPrerequisiteError(command, flags, context);
    if (error) {
      return { valid: false, reason: error };
    }
    return { valid: true };
  }

  /**
   * Get human-readable prerequisite error, or null if prerequisites met
   */
  getPrerequisiteError(
    command: string,
    flags: string[],
    context: ExecutionContext
  ): string | null {
    // Check root requirement
    if (this.requiresRoot(command, flags) && !context.isRoot) {
      return `${command}: Operation requires root privileges. Run with sudo.`;
    }

    // Future: Check state prerequisites from state_interactions.prerequisites
    // For now, just permission checking

    return null;
  }
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/cli/__tests__/StateEngine.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/cli/StateEngine.ts src/cli/__tests__/StateEngine.test.ts
git commit -m "feat(cli): add prerequisite checking to StateEngine

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 9: Export StateEngine from CLI Barrel

**Files:**

- Modify: `src/cli/index.ts`
- Modify: `src/cli/__tests__/index.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/cli/__tests__/index.test.ts
it("should export StateEngine", async () => {
  const { StateEngine } = await import("../index");

  expect(StateEngine).toBeDefined();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/cli/__tests__/index.test.ts`
Expected: FAIL - StateEngine not exported

**Step 3: Write minimal implementation**

```typescript
// Add to src/cli/index.ts

// State Engine
export { StateEngine } from "./StateEngine";
export type { ExecutionContext, CanExecuteResult } from "./StateEngine";
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/cli/__tests__/index.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/cli/index.ts src/cli/__tests__/index.test.ts
git commit -m "feat(cli): export StateEngine from barrel

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 3: BaseSimulator Integration

### Task 10: Add getHelpFromRegistry to BaseSimulator

**Files:**

- Modify: `src/simulators/BaseSimulator.ts`
- Test: `src/simulators/__tests__/BaseSimulator.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/simulators/__tests__/BaseSimulator.test.ts
describe("getHelpFromRegistry", () => {
  it("should return formatted help from registry", async () => {
    // Create a test simulator that exposes the protected method
    class TestSimulator extends BaseSimulator {
      constructor() {
        super();
        this.initializeDefinitionRegistry();
      }

      public testGetHelp(command: string): CommandResult | null {
        return this.getHelpFromRegistry(command);
      }
    }

    const sim = new TestSimulator();
    await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for registry init

    const result = sim.testGetHelp("nvidia-smi");

    expect(result).not.toBeNull();
    expect(result?.output).toContain("nvidia-smi");
    expect(result?.output).toContain("Description:");
    expect(result?.exitCode).toBe(0);
  });

  it("should return null for unknown command", async () => {
    class TestSimulator extends BaseSimulator {
      constructor() {
        super();
        this.initializeDefinitionRegistry();
      }

      public testGetHelp(command: string): CommandResult | null {
        return this.getHelpFromRegistry(command);
      }
    }

    const sim = new TestSimulator();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = sim.testGetHelp("unknown-command-xyz");

    expect(result).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/simulators/__tests__/BaseSimulator.test.ts`
Expected: FAIL - method not defined

**Step 3: Write minimal implementation**

```typescript
// Add to src/simulators/BaseSimulator.ts after validateFlagsWithRegistry method

import { formatCommandHelp } from "@/cli/formatters";

/**
 * Get help output from JSON definitions instead of hardcoded methods
 * @param commandName - Command name (uses metadata name if not provided)
 * @returns CommandResult with help text, or null if not found
 */
protected getHelpFromRegistry(commandName?: string): CommandResult | null {
  if (!this.definitionRegistry) return null;

  const name = commandName || this.getMetadata().name;
  const def = this.definitionRegistry.getDefinition(name);
  if (!def) return null;

  return this.createSuccess(formatCommandHelp(def));
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/simulators/__tests__/BaseSimulator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/simulators/BaseSimulator.ts src/simulators/__tests__/BaseSimulator.test.ts
git commit -m "feat(simulators): add getHelpFromRegistry to BaseSimulator

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 11: Add getFlagHelpFromRegistry to BaseSimulator

**Files:**

- Modify: `src/simulators/BaseSimulator.ts`
- Modify: `src/simulators/__tests__/BaseSimulator.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/simulators/__tests__/BaseSimulator.test.ts
describe("getFlagHelpFromRegistry", () => {
  it("should return formatted help for a specific flag", async () => {
    class TestSimulator extends BaseSimulator {
      constructor() {
        super();
        this.initializeDefinitionRegistry();
      }

      public testGetFlagHelp(
        command: string,
        flag: string,
      ): CommandResult | null {
        return this.getFlagHelpFromRegistry(command, flag);
      }
    }

    const sim = new TestSimulator();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = sim.testGetFlagHelp("nvidia-smi", "q");

    expect(result).not.toBeNull();
    expect(result?.output).toContain("query");
    expect(result?.exitCode).toBe(0);
  });

  it("should return error with suggestions for unknown flag", async () => {
    class TestSimulator extends BaseSimulator {
      constructor() {
        super();
        this.initializeDefinitionRegistry();
      }

      public testGetFlagHelp(
        command: string,
        flag: string,
      ): CommandResult | null {
        return this.getFlagHelpFromRegistry(command, flag);
      }
    }

    const sim = new TestSimulator();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = sim.testGetFlagHelp("nvidia-smi", "qurey");

    expect(result).not.toBeNull();
    expect(result?.exitCode).not.toBe(0);
    expect(result?.output).toContain("Did you mean");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/simulators/__tests__/BaseSimulator.test.ts`
Expected: FAIL - method not defined

**Step 3: Write minimal implementation**

```typescript
// Add to src/simulators/BaseSimulator.ts

import { formatFlagHelp, formatValidationError } from "@/cli/formatters";

/**
 * Get help for a specific flag from JSON definitions
 * @param commandName - Command name
 * @param flag - Flag to get help for (normalized, no leading dashes)
 * @returns CommandResult with flag help or error with suggestions
 */
protected getFlagHelpFromRegistry(commandName: string, flag: string): CommandResult | null {
  if (!this.definitionRegistry) return null;

  const def = this.definitionRegistry.getDefinition(commandName);
  if (!def) return null;

  // Normalize flag
  const normalizedFlag = flag.replace(/^-+/, "");

  // Find the option
  const opt = def.global_options?.find((o) => {
    const shortNorm = o.short?.replace(/^-+/, "");
    const longNorm = o.long?.replace(/^-+/, "").replace(/=$/, "");
    return shortNorm === normalizedFlag || longNorm === normalizedFlag;
  });

  if (opt) {
    return this.createSuccess(formatFlagHelp(commandName, opt));
  }

  // Flag not found - try to get suggestions
  const validation = this.definitionRegistry.validateFlag(commandName, normalizedFlag);
  return this.createError(formatValidationError(commandName, flag, validation));
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/simulators/__tests__/BaseSimulator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/simulators/BaseSimulator.ts src/simulators/__tests__/BaseSimulator.test.ts
git commit -m "feat(simulators): add getFlagHelpFromRegistry to BaseSimulator

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 12: Add checkStatePrerequisites to BaseSimulator

**Files:**

- Modify: `src/simulators/BaseSimulator.ts`
- Modify: `src/simulators/__tests__/BaseSimulator.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/simulators/__tests__/BaseSimulator.test.ts
describe("checkStatePrerequisites", () => {
  it("should return null for read-only commands", async () => {
    class TestSimulator extends BaseSimulator {
      constructor() {
        super();
        this.initializeDefinitionRegistry();
      }

      public testCheckPrereqs(
        parsed: ParsedCommand,
        context: CommandContext,
      ): CommandResult | null {
        return this.checkStatePrerequisites(parsed, context);
      }
    }

    const sim = new TestSimulator();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const parsed = parse("sinfo");
    const context = { currentNode: "node1", isRoot: false } as CommandContext;

    const result = sim.testCheckPrereqs(parsed, context);

    expect(result).toBeNull();
  });

  it("should return error for privileged command without root", async () => {
    class TestSimulator extends BaseSimulator {
      constructor() {
        super();
        this.initializeDefinitionRegistry();
      }

      public testCheckPrereqs(
        parsed: ParsedCommand,
        context: CommandContext,
      ): CommandResult | null {
        return this.checkStatePrerequisites(parsed, context);
      }
    }

    const sim = new TestSimulator();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const parsed = parse("nvidia-smi -pl 300");
    const context = { currentNode: "node1", isRoot: false } as CommandContext;

    const result = sim.testCheckPrereqs(parsed, context);

    expect(result).not.toBeNull();
    expect(result?.exitCode).not.toBe(0);
    expect(result?.output).toContain("root");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/simulators/__tests__/BaseSimulator.test.ts`
Expected: FAIL - method not defined

**Step 3: Write minimal implementation**

```typescript
// Add to src/simulators/BaseSimulator.ts

import { StateEngine } from "@/cli/StateEngine";

// Add property to class
protected stateEngine: StateEngine | null = null;

// Update initializeDefinitionRegistry to also create StateEngine
protected async initializeDefinitionRegistry(): Promise<void> {
  this.definitionRegistry = await getCommandDefinitionRegistry();
  this.stateEngine = new StateEngine(this.definitionRegistry);
}

/**
 * Check state prerequisites before executing a command
 * @param parsed - Parsed command
 * @param context - Command context with isRoot flag
 * @returns CommandResult with error if prerequisites not met, null if OK
 */
protected checkStatePrerequisites(
  parsed: ParsedCommand,
  context: CommandContext
): CommandResult | null {
  if (!this.stateEngine) return null;

  const commandName = parsed.subcommands.length > 0
    ? parsed.subcommands[0]
    : this.getMetadata().name;

  const flags = Array.from(parsed.flags.keys());

  const error = this.stateEngine.getPrerequisiteError(
    commandName,
    flags,
    { isRoot: context.isRoot ?? false }
  );

  if (error) {
    return this.createPermissionError(commandName, "this operation");
  }

  return null;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/simulators/__tests__/BaseSimulator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/simulators/BaseSimulator.ts src/simulators/__tests__/BaseSimulator.test.ts
git commit -m "feat(simulators): add checkStatePrerequisites to BaseSimulator

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 4: Migrate Slurm Simulator (Highest Impact)

### Task 13: Replace slurmSimulator Help Methods with Registry

**Files:**

- Modify: `src/simulators/slurmSimulator.ts`
- Test: `src/simulators/__tests__/slurmSimulator.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/simulators/__tests__/slurmSimulator.test.ts
describe("Help from JSON definitions", () => {
  it("sinfo --help should return registry-based help", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for registry

    const parsed = parse("sinfo --help");
    const result = simulator.executeSinfo(parsed, context);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("sinfo");
    expect(result.output).toContain("Description:");
    expect(result.output).toContain("Options:");
  });

  it("squeue --help should return registry-based help", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const parsed = parse("squeue --help");
    const result = simulator.executeSqueue(parsed, context);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("squeue");
    expect(result.output).toContain("Description:");
  });

  it("scontrol --help should return registry-based help", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const parsed = parse("scontrol --help");
    const result = simulator.executeScontrol(parsed, context);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("scontrol");
  });
});
```

**Step 2: Run test to verify current behavior**

Run: `npm test -- src/simulators/__tests__/slurmSimulator.test.ts --grep "Help from JSON"`
Note: This may pass with hardcoded help - verify output format is consistent

**Step 3: Modify implementation to use registry**

```typescript
// In src/simulators/slurmSimulator.ts

// Replace the generateSinfoHelp method call in executeSinfo:
// FROM:
if (this.hasAnyFlag(parsed, ["help"])) {
  return this.createSuccess(this.generateSinfoHelp());
}

// TO:
if (this.hasAnyFlag(parsed, ["help"])) {
  const registryHelp = this.getHelpFromRegistry("sinfo");
  if (registryHelp) return registryHelp;
  return this.createSuccess(this.generateSinfoHelp()); // Fallback
}

// Similarly update executeSqueue:
if (this.hasAnyFlag(parsed, ["help"])) {
  const registryHelp = this.getHelpFromRegistry("squeue");
  if (registryHelp) return registryHelp;
  return this.createSuccess(this.generateSqueueHelp());
}

// And executeScontrol:
if (this.hasAnyFlag(parsed, ["help"])) {
  const registryHelp = this.getHelpFromRegistry("scontrol");
  if (registryHelp) return registryHelp;
  return this.createSuccess(this.generateScontrolHelp());
}

// And executeSbatch:
if (this.hasAnyFlag(parsed, ["help"])) {
  const registryHelp = this.getHelpFromRegistry("sbatch");
  if (registryHelp) return registryHelp;
  return this.createSuccess(this.generateSbatchHelp());
}

// And executeSrun:
if (this.hasAnyFlag(parsed, ["help"])) {
  const registryHelp = this.getHelpFromRegistry("srun");
  if (registryHelp) return registryHelp;
  return this.createSuccess(this.generateSrunHelp());
}

// And executeScancel:
if (this.hasAnyFlag(parsed, ["help"])) {
  const registryHelp = this.getHelpFromRegistry("scancel");
  if (registryHelp) return registryHelp;
  return this.createSuccess(this.generateScancelHelp());
}

// And executeSacct:
if (this.hasAnyFlag(parsed, ["help"])) {
  const registryHelp = this.getHelpFromRegistry("sacct");
  if (registryHelp) return registryHelp;
  return this.createSuccess(this.generateSacctHelp());
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/simulators/__tests__/slurmSimulator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/simulators/slurmSimulator.ts src/simulators/__tests__/slurmSimulator.test.ts
git commit -m "feat(slurm): use registry for help output with fallback

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 14: Remove Hardcoded Help Methods from slurmSimulator

**Files:**

- Modify: `src/simulators/slurmSimulator.ts`

**Step 1: Verify registry help works**

Run: `npm test -- src/simulators/__tests__/slurmSimulator.test.ts`
Verify all help tests pass with registry

**Step 2: Remove the fallback code**

```typescript
// Update each help handler to remove fallback:
// FROM:
if (this.hasAnyFlag(parsed, ["help"])) {
  const registryHelp = this.getHelpFromRegistry("sinfo");
  if (registryHelp) return registryHelp;
  return this.createSuccess(this.generateSinfoHelp()); // Remove this fallback
}

// TO:
if (this.hasAnyFlag(parsed, ["help"])) {
  return (
    this.getHelpFromRegistry("sinfo") || this.createError("Help not available")
  );
}
```

**Step 3: Delete the hardcoded help methods**

Delete these methods from slurmSimulator.ts:

- `generateSinfoHelp()` (lines ~69-96)
- `generateSqueueHelp()` (lines ~101-127)
- `generateScontrolHelp()` (lines ~132-151)
- `generateSbatchHelp()` (if exists)
- `generateSrunHelp()` (if exists)
- `generateScancelHelp()` (if exists)
- `generateSacctHelp()` (if exists)

**Step 4: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/simulators/slurmSimulator.ts
git commit -m "refactor(slurm): remove hardcoded help methods (~200 lines)

Help text now sourced entirely from JSON definitions.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 5: Migrate Remaining Simulators

### Task 15: Migrate nvidiaSmiSimulator Help to Registry

**Files:**

- Modify: `src/simulators/nvidiaSmiSimulator.ts`
- Test: `src/simulators/__tests__/nvidiaSmiSimulator.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/simulators/__tests__/nvidiaSmiSimulator.test.ts
describe("Help from JSON definitions", () => {
  it("nvidia-smi --help should return registry-based help", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const parsed = parse("nvidia-smi --help");
    const result = simulator.execute(parsed, context);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("nvidia-smi");
    expect(result.output).toContain("Description:");
    expect(result.output).toContain("Options:");
  });
});
```

**Step 2: Run test to verify current behavior**

Run: `npm test -- src/simulators/__tests__/nvidiaSmiSimulator.test.ts --grep "Help from JSON"`

**Step 3: Update implementation**

```typescript
// In nvidiaSmiSimulator.ts execute method, find help handling and update:
if (this.hasAnyFlag(parsed, ["help", "h"])) {
  return this.getHelpFromRegistry("nvidia-smi") || this.handleHelp();
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/simulators/__tests__/nvidiaSmiSimulator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/simulators/nvidiaSmiSimulator.ts src/simulators/__tests__/nvidiaSmiSimulator.test.ts
git commit -m "feat(nvidia-smi): use registry for help output

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 16: Migrate dcgmiSimulator Help to Registry

**Files:**

- Modify: `src/simulators/dcgmiSimulator.ts`
- Test: `src/simulators/__tests__/dcgmiSimulator.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/simulators/__tests__/dcgmiSimulator.test.ts
describe("Help from JSON definitions", () => {
  it("dcgmi --help should return registry-based help", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const parsed = parse("dcgmi --help");
    const result = simulator.execute(parsed, context);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("dcgmi");
    expect(result.output).toContain("Description:");
  });
});
```

**Step 2: Run test**

Run: `npm test -- src/simulators/__tests__/dcgmiSimulator.test.ts --grep "Help from JSON"`

**Step 3: Update implementation**

```typescript
// In dcgmiSimulator.ts execute method:
if (this.hasAnyFlag(parsed, ["help", "h"])) {
  return this.getHelpFromRegistry("dcgmi") || this.handleHelp();
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/simulators/__tests__/dcgmiSimulator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/simulators/dcgmiSimulator.ts src/simulators/__tests__/dcgmiSimulator.test.ts
git commit -m "feat(dcgmi): use registry for help output

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 17: Migrate ipmitoolSimulator Help to Registry

**Files:**

- Modify: `src/simulators/ipmitoolSimulator.ts`
- Test: `src/simulators/__tests__/ipmitoolSimulator.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/simulators/__tests__/ipmitoolSimulator.test.ts
describe("Help from JSON definitions", () => {
  it("ipmitool help should return registry-based help", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const parsed = parse("ipmitool help");
    const result = simulator.execute(parsed, context);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("ipmitool");
  });
});
```

**Step 2: Run test**

Run: `npm test -- src/simulators/__tests__/ipmitoolSimulator.test.ts --grep "Help from JSON"`

**Step 3: Update implementation**

```typescript
// In ipmitoolSimulator.ts execute method:
if (
  this.hasAnyFlag(parsed, ["help", "h"]) ||
  parsed.subcommands[0] === "help"
) {
  return this.getHelpFromRegistry("ipmitool") || this.showHelp();
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/simulators/__tests__/ipmitoolSimulator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/simulators/ipmitoolSimulator.ts src/simulators/__tests__/ipmitoolSimulator.test.ts
git commit -m "feat(ipmitool): use registry for help output

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 18: Migrate infinibandSimulator Help to Registry

**Files:**

- Modify: `src/simulators/infinibandSimulator.ts`
- Test: `src/simulators/__tests__/infinibandSimulator.test.ts`

**Step 1: Add registry initialization**

```typescript
// In infinibandSimulator.ts constructor:
constructor() {
  super();
  this.initializeDefinitionRegistry(); // Add this
  // ... existing code
}
```

**Step 2: Write the failing test**

```typescript
// Add to src/simulators/__tests__/infinibandSimulator.test.ts
describe("Help from JSON definitions", () => {
  it("ibstat --help should return registry-based help", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const parsed = parse("ibstat --help");
    const result = simulator.executeIbstat(parsed, context);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("ibstat");
  });
});
```

**Step 3: Update help handlers**

Update each execute method (executeIbstat, executeIbporterrors, etc.) to use registry:

```typescript
if (this.hasAnyFlag(parsed, ["help", "h"])) {
  return (
    this.getHelpFromRegistry("ibstat") ||
    this.createSuccess("Usage: ibstat ...")
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/simulators/__tests__/infinibandSimulator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/simulators/infinibandSimulator.ts src/simulators/__tests__/infinibandSimulator.test.ts
git commit -m "feat(infiniband): integrate registry for help output

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 19: Initialize Registry in Remaining Simulators

**Files:**

- Modify: `src/simulators/containerSimulator.ts`
- Modify: `src/simulators/mellanoxSimulator.ts`
- Modify: `src/simulators/nvsmSimulator.ts`
- Modify: `src/simulators/storageSimulator.ts`
- Modify: `src/simulators/benchmarkSimulator.ts`
- Modify: `src/simulators/fabricManagerSimulator.ts`
- Modify: `src/simulators/bcmSimulator.ts`
- Modify: `src/simulators/basicSystemSimulator.ts`
- Modify: `src/simulators/pciToolsSimulator.ts`
- Modify: `src/simulators/nvlinkAuditSimulator.ts`
- Modify: `src/simulators/nvidiaBugReportSimulator.ts`

**Step 1: Add to each constructor**

For each simulator, add registry initialization:

```typescript
constructor() {
  super();
  this.initializeDefinitionRegistry(); // Add this line
  // ... rest of constructor
}
```

**Step 2: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/simulators/*.ts
git commit -m "feat(simulators): initialize registry in all simulators

Prepares all 19 simulators for JSON-based validation and help.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 6: Validation and Cleanup

### Task 20: Run Full Test Suite and Fix Issues

**Step 1: Run full test suite**

Run: `npm test`

**Step 2: Run type check**

Run: `npx tsc --noEmit`

**Step 3: Run linter**

Run: `npm run lint`

**Step 4: Fix any issues found**

Address any test failures, type errors, or lint issues.

**Step 5: Commit fixes**

```bash
git add -A
git commit -m "fix: address test failures and type errors from migration

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 21: Update Documentation

**Files:**

- Modify: `docs/USAGE.md`

**Step 1: Add section about JSON-based help**

```markdown
### Command Documentation from JSON Definitions

All simulator commands now use comprehensive JSON definitions for help output.
This provides:

- Consistent formatting across all commands
- Rich examples with output previews
- Exit code documentation
- Common error messages with resolutions
- Related commands suggestions

Commands like `nvidia-smi --help`, `sinfo --help`, etc. now display
structured documentation sourced from `src/data/output/` JSON files.
```

**Step 2: Commit**

```bash
git add docs/USAGE.md
git commit -m "docs: document JSON-based help system

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

This plan migrates all 19 simulators to use JSON command definitions through:

1. **Phase 1** (Tasks 1-6): Create formatter layer with ANSI color support
2. **Phase 2** (Tasks 7-9): Build StateEngine for permission/prerequisite checking
3. **Phase 3** (Tasks 10-12): Extend BaseSimulator with registry helper methods
4. **Phase 4** (Tasks 13-14): Migrate slurmSimulator (highest impact, ~200 lines removed)
5. **Phase 5** (Tasks 15-19): Migrate remaining simulators
6. **Phase 6** (Tasks 20-21): Validation and documentation

**Total Tasks:** 21
**Estimated Lines Removed:** ~500+ (hardcoded help text)
**New Capabilities:** Consistent help formatting, fuzzy flag matching, permission checking, state prerequisite validation
