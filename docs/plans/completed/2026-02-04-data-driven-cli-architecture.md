# Data-Driven CLI Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the CLI simulator to use comprehensive JSON command definitions as the single source of truth for validation, help, output formatting, and learning features.

**Architecture:** The 90+ JSON command definitions in `src/data/output/` become the foundation. A new `CommandDefinitionRegistry` loads these at startup and provides APIs for flag validation, help generation, and output templates. Existing simulators become thin handlers that delegate validation to the registry while computing dynamic values from state.

**Tech Stack:** TypeScript, Vite (JSON imports), Vitest for testing, existing Zustand store for state

---

## Phase 1: Foundation - Types and Loader

### Task 1.1: Create TypeScript Types for Command Schema

**Files:**

- Create: `src/cli/types.ts`
- Reference: `src/data/output/schema.json`
- Test: `src/cli/__tests__/types.test.ts`

**Step 1: Write the failing test**

```typescript
// src/cli/__tests__/types.test.ts
import { describe, it, expect } from "vitest";
import type {
  CommandDefinition,
  StateInteraction,
  CommandOption,
} from "../types";

describe("CommandDefinition types", () => {
  it("should allow valid CommandDefinition structure", () => {
    const def: CommandDefinition = {
      command: "nvidia-smi",
      category: "gpu_management",
      description: "NVIDIA System Management Interface",
      synopsis: "nvidia-smi [OPTIONS]",
    };
    expect(def.command).toBe("nvidia-smi");
  });

  it("should allow optional fields", () => {
    const def: CommandDefinition = {
      command: "test",
      category: "general",
      description: "Test command",
      synopsis: "test",
      global_options: [],
      subcommands: [],
      exit_codes: [{ code: 0, meaning: "Success" }],
    };
    expect(def.exit_codes?.[0].code).toBe(0);
  });

  it("should type state_interactions correctly", () => {
    const interaction: StateInteraction = {
      reads_from: [{ state_domain: "gpu_state", fields: ["temperature"] }],
      writes_to: [
        {
          state_domain: "gpu_state",
          fields: ["power_limit"],
          requires_privilege: "root",
        },
      ],
    };
    expect(interaction.reads_from?.[0].state_domain).toBe("gpu_state");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/cli/__tests__/types.test.ts`
Expected: FAIL with "Cannot find module '../types'"

**Step 3: Write minimal implementation**

```typescript
// src/cli/types.ts
/**
 * Command Definition Types
 *
 * TypeScript types matching the JSON schema in src/data/output/schema.json
 * These types are the foundation for the data-driven CLI architecture.
 */

export type CommandCategory =
  | "gpu_management"
  | "diagnostics"
  | "system_info"
  | "cluster_management"
  | "networking"
  | "containers"
  | "firmware"
  | "storage"
  | "mpi"
  | "gpu_fabric"
  | "cuda_tools"
  | "nccl_tests"
  | "monitoring"
  | "general"
  | "rdma_perf"
  | "parallel_shell"
  | "modules";

export type StateDomain =
  | "gpu_state"
  | "gpu_process_state"
  | "job_state"
  | "node_state"
  | "partition_state"
  | "network_ib_state"
  | "network_eth_state"
  | "storage_lustre_state"
  | "storage_local_state"
  | "system_state"
  | "container_state"
  | "firmware_state"
  | "fabric_state";

export interface CommandOption {
  flag?: string;
  short?: string;
  long?: string;
  description: string;
  arguments?: string;
  argument_type?: string;
  default?: string;
  required?: boolean;
  example?: string;
}

export interface Subcommand {
  name: string;
  description: string;
  synopsis?: string;
  options?: CommandOption[];
}

export interface ExitCode {
  code: number;
  meaning: string;
}

export interface UsagePattern {
  description: string;
  command: string;
  output_example?: string;
  requires_root?: boolean;
}

export interface ErrorMessage {
  message: string;
  meaning: string;
  resolution?: string;
}

export interface EnvironmentVariable {
  name: string;
  description: string;
  example?: string;
  affects_command?: string;
}

export interface StateRead {
  state_domain: StateDomain;
  fields?: string[];
  description?: string;
}

export interface StateWrite {
  state_domain: StateDomain;
  fields?: string[];
  description?: string;
  requires_flags?: string[];
  requires_privilege?: string;
}

export interface StateInteraction {
  reads_from?: StateRead[];
  writes_to?: StateWrite[];
  triggered_by?: Array<{ state_change: string; effect: string }>;
  consistent_with?: Array<{ command: string; shared_state: string }>;
}

export interface Interoperability {
  related_commands?: string[];
  uses_library?: string[];
  notes?: string;
}

export interface Permissions {
  read_operations?: string;
  write_operations?: string;
  notes?: string;
}

export interface Installation {
  package?: string;
  notes?: string;
}

export interface CommandDefinition {
  command: string;
  category: CommandCategory;
  description: string;
  synopsis: string;
  version_documented?: string;
  source_urls?: string[];
  installation?: Installation;
  global_options?: CommandOption[];
  subcommands?: Subcommand[];
  output_formats?: Record<string, string>;
  environment_variables?: EnvironmentVariable[];
  exit_codes?: ExitCode[];
  common_usage_patterns?: UsagePattern[];
  error_messages?: ErrorMessage[];
  interoperability?: Interoperability;
  permissions?: Permissions;
  limitations?: string[];
  state_interactions?: StateInteraction;
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/cli/__tests__/types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/cli/types.ts src/cli/__tests__/types.test.ts
git commit -m "feat(cli): add TypeScript types for command definitions

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 1.2: Create Command Definition Loader

**Files:**

- Create: `src/cli/CommandDefinitionLoader.ts`
- Test: `src/cli/__tests__/CommandDefinitionLoader.test.ts`
- Reference: `src/data/output/` (JSON files)

**Step 1: Write the failing test**

```typescript
// src/cli/__tests__/CommandDefinitionLoader.test.ts
import { describe, it, expect } from "vitest";
import { CommandDefinitionLoader } from "../CommandDefinitionLoader";

describe("CommandDefinitionLoader", () => {
  it("should load nvidia-smi definition", async () => {
    const loader = new CommandDefinitionLoader();
    const def = await loader.load("nvidia-smi");

    expect(def).toBeDefined();
    expect(def.command).toBe("nvidia-smi");
    expect(def.category).toBe("gpu_management");
  });

  it("should return undefined for unknown command", async () => {
    const loader = new CommandDefinitionLoader();
    const def = await loader.load("nonexistent-command");

    expect(def).toBeUndefined();
  });

  it("should load all definitions", async () => {
    const loader = new CommandDefinitionLoader();
    const all = await loader.loadAll();

    expect(all.size).toBeGreaterThan(50);
    expect(all.has("nvidia-smi")).toBe(true);
    expect(all.has("squeue")).toBe(true);
    expect(all.has("ibstat")).toBe(true);
  });

  it("should get commands by category", async () => {
    const loader = new CommandDefinitionLoader();
    await loader.loadAll();

    const gpuCommands = loader.getByCategory("gpu_management");
    expect(gpuCommands.length).toBeGreaterThan(0);
    expect(gpuCommands.some((c) => c.command === "nvidia-smi")).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/cli/__tests__/CommandDefinitionLoader.test.ts`
Expected: FAIL with "Cannot find module '../CommandDefinitionLoader'"

**Step 3: Write minimal implementation**

```typescript
// src/cli/CommandDefinitionLoader.ts
import type { CommandDefinition, CommandCategory } from "./types";

// Import all JSON files from data/output using Vite's glob import
const commandModules = import.meta.glob("../data/output/**/*.json", {
  eager: true,
});

/**
 * Loads command definitions from JSON files in src/data/output/
 *
 * This loader uses Vite's glob import to statically include all JSON files
 * at build time, avoiding runtime file system access.
 */
export class CommandDefinitionLoader {
  private definitions: Map<string, CommandDefinition> = new Map();
  private loaded = false;

  /**
   * Load a single command definition by name
   */
  async load(commandName: string): Promise<CommandDefinition | undefined> {
    if (!this.loaded) {
      await this.loadAll();
    }
    return this.definitions.get(commandName);
  }

  /**
   * Load all command definitions from JSON files
   */
  async loadAll(): Promise<Map<string, CommandDefinition>> {
    if (this.loaded) {
      return this.definitions;
    }

    for (const [path, module] of Object.entries(commandModules)) {
      // Skip schema.json and state_domains.json
      if (path.includes("schema.json") || path.includes("state_domains.json")) {
        continue;
      }

      const def =
        (module as { default?: CommandDefinition }).default ||
        (module as CommandDefinition);

      if (def && typeof def === "object" && "command" in def) {
        this.definitions.set(def.command, def);
      }
    }

    this.loaded = true;
    return this.definitions;
  }

  /**
   * Get all commands in a specific category
   */
  getByCategory(category: CommandCategory): CommandDefinition[] {
    return Array.from(this.definitions.values()).filter(
      (def) => def.category === category,
    );
  }

  /**
   * Get all loaded command names
   */
  getCommandNames(): string[] {
    return Array.from(this.definitions.keys());
  }

  /**
   * Check if a command definition exists
   */
  has(commandName: string): boolean {
    return this.definitions.has(commandName);
  }

  /**
   * Get count of loaded definitions
   */
  get count(): number {
    return this.definitions.size;
  }
}

// Singleton instance
let loaderInstance: CommandDefinitionLoader | null = null;

export function getCommandDefinitionLoader(): CommandDefinitionLoader {
  if (!loaderInstance) {
    loaderInstance = new CommandDefinitionLoader();
  }
  return loaderInstance;
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/cli/__tests__/CommandDefinitionLoader.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/cli/CommandDefinitionLoader.ts src/cli/__tests__/CommandDefinitionLoader.test.ts
git commit -m "feat(cli): add CommandDefinitionLoader for JSON command files

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: Command Definition Registry

### Task 2.1: Create CommandDefinitionRegistry

**Files:**

- Create: `src/cli/CommandDefinitionRegistry.ts`
- Test: `src/cli/__tests__/CommandDefinitionRegistry.test.ts`

**Step 1: Write the failing test**

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/cli/__tests__/CommandDefinitionRegistry.test.ts`
Expected: FAIL with "Cannot find module '../CommandDefinitionRegistry'"

**Step 3: Write minimal implementation**

```typescript
// src/cli/CommandDefinitionRegistry.ts
import type { CommandDefinition, CommandCategory, UsagePattern } from "./types";
import {
  CommandDefinitionLoader,
  getCommandDefinitionLoader,
} from "./CommandDefinitionLoader";

interface ValidationResult {
  valid: boolean;
  suggestions?: string[];
}

/**
 * Central registry for command definitions
 *
 * Provides APIs for:
 * - Flag and subcommand validation
 * - Help text generation
 * - Usage examples and output templates
 * - Permission checking
 * - Error message resolution
 */
export class CommandDefinitionRegistry {
  private loader: CommandDefinitionLoader;
  private initialized = false;

  constructor(loader?: CommandDefinitionLoader) {
    this.loader = loader || getCommandDefinitionLoader();
  }

  /**
   * Initialize the registry by loading all command definitions
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.loader.loadAll();
    this.initialized = true;
  }

  /**
   * Get a command definition
   */
  getDefinition(command: string): CommandDefinition | undefined {
    return this.loader.load(command) as unknown as
      | CommandDefinition
      | undefined;
  }

  /**
   * Validate a flag for a command
   */
  validateFlag(command: string, flag: string): ValidationResult {
    const def = this.getDefinitionSync(command);
    if (!def) {
      return { valid: false, suggestions: [] };
    }

    const validFlags = this.extractValidFlags(def);

    // Exact match (with or without dashes)
    const normalizedFlag = flag.replace(/^-+/, "");
    if (validFlags.some((f) => f.replace(/^-+/, "") === normalizedFlag)) {
      return { valid: true };
    }

    // Fuzzy match for suggestions
    const suggestions = this.fuzzyMatch(normalizedFlag, validFlags);
    return { valid: false, suggestions };
  }

  /**
   * Validate a subcommand for a command
   */
  validateSubcommand(command: string, subcommand: string): ValidationResult {
    const def = this.getDefinitionSync(command);
    if (!def || !def.subcommands) {
      return { valid: false, suggestions: [] };
    }

    const validSubcommands = def.subcommands.map((s) => s.name);

    if (validSubcommands.includes(subcommand)) {
      return { valid: true };
    }

    const suggestions = this.fuzzyMatch(subcommand, validSubcommands);
    return { valid: false, suggestions };
  }

  /**
   * Generate help text for a command
   */
  getCommandHelp(command: string): string {
    const def = this.getDefinitionSync(command);
    if (!def) {
      return `Unknown command: ${command}`;
    }

    let help = `${def.command} - ${def.description}\n\n`;
    help += `Usage: ${def.synopsis}\n\n`;

    if (def.global_options && def.global_options.length > 0) {
      help += "Options:\n";
      for (const opt of def.global_options) {
        const shortPart = opt.short ? `-${opt.short}, ` : "    ";
        const longPart = opt.long ? `--${opt.long}` : opt.flag || "";
        help += `  ${shortPart}${longPart}\n`;
        help += `      ${opt.description}\n`;
      }
      help += "\n";
    }

    if (def.subcommands && def.subcommands.length > 0) {
      help += "Subcommands:\n";
      for (const sub of def.subcommands) {
        help += `  ${sub.name.padEnd(20)} ${sub.description}\n`;
      }
    }

    return help;
  }

  /**
   * Get help for a specific flag
   */
  getFlagHelp(command: string, flag: string): string {
    const def = this.getDefinitionSync(command);
    if (!def || !def.global_options) {
      return `Unknown flag: ${flag}`;
    }

    const normalizedFlag = flag.replace(/^-+/, "");
    const opt = def.global_options.find(
      (o) =>
        o.short === normalizedFlag ||
        o.long === normalizedFlag ||
        o.flag?.replace(/^-+/, "") === normalizedFlag,
    );

    if (!opt) {
      return `Unknown flag: ${flag}`;
    }

    let help = `${opt.short ? `-${opt.short}, ` : ""}${opt.long ? `--${opt.long}` : opt.flag || ""}\n`;
    help += `  ${opt.description}\n`;
    if (opt.example) {
      help += `  Example: ${opt.example}\n`;
    }

    return help;
  }

  /**
   * Get usage examples for a command
   */
  getUsageExamples(command: string): UsagePattern[] {
    const def = this.getDefinitionSync(command);
    return def?.common_usage_patterns || [];
  }

  /**
   * Get exit code meaning
   */
  getExitCodeMeaning(command: string, code: number): string {
    const def = this.getDefinitionSync(command);
    const exitCode = def?.exit_codes?.find((e) => e.code === code);
    return exitCode?.meaning || `Unknown exit code: ${code}`;
  }

  /**
   * Check if a flag/operation requires root
   */
  requiresRoot(command: string, flag: string): boolean {
    const def = this.getDefinitionSync(command);
    if (!def?.state_interactions?.writes_to) {
      return false;
    }

    // Check if this flag is in any writes_to that requires privilege
    for (const write of def.state_interactions.writes_to) {
      if (write.requires_privilege === "root") {
        if (
          write.requires_flags?.some(
            (f) => f.replace(/^-+/, "") === flag.replace(/^-+/, ""),
          )
        ) {
          return true;
        }
      }
    }

    // Also check permissions.write_operations for general guidance
    if (def.permissions?.write_operations?.toLowerCase().includes("root")) {
      // Check if this flag is a write operation
      const opt = def.global_options?.find(
        (o) => o.short === flag || o.long === flag,
      );
      // Flags that typically modify state
      const writeFlags = ["pm", "pl", "c", "e", "r", "mig", "lgc", "rgc"];
      if (writeFlags.includes(flag.replace(/^-+/, ""))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get error resolution suggestion
   */
  getErrorResolution(
    command: string,
    errorMessage: string,
  ): string | undefined {
    const def = this.getDefinitionSync(command);
    if (!def?.error_messages) {
      return undefined;
    }

    // Find matching error message (fuzzy)
    const lowerError = errorMessage.toLowerCase();
    const match = def.error_messages.find((e) =>
      lowerError.includes(e.message.toLowerCase().substring(0, 30)),
    );

    return match?.resolution;
  }

  /**
   * Get all commands by category
   */
  getByCategory(category: CommandCategory): CommandDefinition[] {
    return this.loader.getByCategory(category);
  }

  // Private helpers

  private getDefinitionSync(command: string): CommandDefinition | undefined {
    // The loader caches definitions, so we can access them synchronously after init
    const definitions = (this.loader as any).definitions as Map<
      string,
      CommandDefinition
    >;
    return definitions?.get(command);
  }

  private extractValidFlags(def: CommandDefinition): string[] {
    const flags: string[] = [];

    if (def.global_options) {
      for (const opt of def.global_options) {
        if (opt.short) flags.push(opt.short);
        if (opt.long) flags.push(opt.long);
        if (opt.flag) flags.push(opt.flag.replace(/^-+/, ""));
      }
    }

    return flags;
  }

  private fuzzyMatch(
    input: string,
    candidates: string[],
    maxDistance = 2,
  ): string[] {
    const results: Array<{ candidate: string; distance: number }> = [];

    for (const candidate of candidates) {
      const distance = this.levenshteinDistance(
        input.toLowerCase(),
        candidate.toLowerCase(),
      );
      if (distance <= maxDistance) {
        results.push({ candidate, distance });
      }
    }

    return results
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
      .map((r) => r.candidate);
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}

// Singleton
let registryInstance: CommandDefinitionRegistry | null = null;

export async function getCommandDefinitionRegistry(): Promise<CommandDefinitionRegistry> {
  if (!registryInstance) {
    registryInstance = new CommandDefinitionRegistry();
    await registryInstance.initialize();
  }
  return registryInstance;
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/cli/__tests__/CommandDefinitionRegistry.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/cli/CommandDefinitionRegistry.ts src/cli/__tests__/CommandDefinitionRegistry.test.ts
git commit -m "feat(cli): add CommandDefinitionRegistry for validation and help

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 3: Enhanced explain Command

### Task 3.1: Update explain Command to Use Registry

**Files:**

- Modify: `src/components/Terminal.tsx` (find explain handler)
- Create: `src/cli/explainCommand.ts`
- Test: `src/cli/__tests__/explainCommand.test.ts`

**Step 1: Write the failing test**

```typescript
// src/cli/__tests__/explainCommand.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { generateExplainOutput } from "../explainCommand";
import { CommandDefinitionRegistry } from "../CommandDefinitionRegistry";

describe("explainCommand", () => {
  let registry: CommandDefinitionRegistry;

  beforeAll(async () => {
    registry = new CommandDefinitionRegistry();
    await registry.initialize();
  });

  it("should explain nvidia-smi with rich details", async () => {
    const output = await generateExplainOutput("nvidia-smi", registry);

    expect(output).toContain("nvidia-smi");
    expect(output).toContain("NVIDIA");
    expect(output).toContain("Examples:");
    expect(output).toContain("Common Mistakes:");
  });

  it("should explain nvidia-smi -q flag", async () => {
    const output = await generateExplainOutput("nvidia-smi -q", registry);

    expect(output).toContain("-q");
    expect(output).toContain("query");
  });

  it("should explain squeue with Slurm details", async () => {
    const output = await generateExplainOutput("squeue", registry);

    expect(output).toContain("squeue");
    expect(output).toContain("Slurm");
  });

  it("should show error resolution hints", async () => {
    const output = await generateExplainOutput("nvidia-smi", registry, {
      includeErrors: true,
    });

    expect(output).toContain("Error");
    expect(output).toContain("resolution");
  });

  it("should handle unknown commands gracefully", async () => {
    const output = await generateExplainOutput("nonexistent", registry);

    expect(output).toContain("not found");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/cli/__tests__/explainCommand.test.ts`
Expected: FAIL with "Cannot find module '../explainCommand'"

**Step 3: Write minimal implementation**

```typescript
// src/cli/explainCommand.ts
import type { CommandDefinitionRegistry } from "./CommandDefinitionRegistry";

interface ExplainOptions {
  includeErrors?: boolean;
  includeExamples?: boolean;
  includePermissions?: boolean;
}

/**
 * Generate rich explanation output for a command
 * Uses the comprehensive JSON definitions for detailed help
 */
export async function generateExplainOutput(
  input: string,
  registry: CommandDefinitionRegistry,
  options: ExplainOptions = {},
): Promise<string> {
  const parts = input.trim().split(/\s+/);
  const commandName = parts[0];
  const flagOrSub = parts[1];

  const def = await registry.getDefinition(commandName);

  if (!def) {
    return (
      `\x1b[31mCommand '${commandName}' not found in documentation.\x1b[0m\n` +
      `Try 'help' to see available commands.`
    );
  }

  let output = "";

  // Header
  output += `\x1b[1;36m━━━ ${def.command} ━━━\x1b[0m\n\n`;

  // If explaining a specific flag
  if (flagOrSub && flagOrSub.startsWith("-")) {
    return generateFlagExplanation(def, flagOrSub, registry);
  }

  // Description
  output += `\x1b[1mDescription:\x1b[0m\n`;
  output += `  ${def.description}\n\n`;

  // Synopsis
  output += `\x1b[1mUsage:\x1b[0m\n`;
  output += `  ${def.synopsis}\n\n`;

  // When to use (from our existing commandMetadata, will merge later)
  if (def.common_usage_patterns && def.common_usage_patterns.length > 0) {
    output += `\x1b[1mExamples:\x1b[0m\n`;
    for (const pattern of def.common_usage_patterns.slice(0, 5)) {
      output += `\n  \x1b[36m${pattern.command}\x1b[0m\n`;
      output += `    ${pattern.description}\n`;
      if (pattern.requires_root) {
        output += `    \x1b[33m⚠ Requires root privileges\x1b[0m\n`;
      }
    }
    output += "\n";
  }

  // Common flags
  if (def.global_options && def.global_options.length > 0) {
    output += `\x1b[1mCommon Options:\x1b[0m\n`;
    for (const opt of def.global_options.slice(0, 8)) {
      const flagStr = opt.short ? `-${opt.short}` : "";
      const longStr = opt.long ? `--${opt.long}` : "";
      const combined = [flagStr, longStr].filter(Boolean).join(", ");
      output += `  \x1b[36m${combined.padEnd(20)}\x1b[0m ${opt.description}\n`;
    }
    output += "\n";
  }

  // Subcommands
  if (def.subcommands && def.subcommands.length > 0) {
    output += `\x1b[1mSubcommands:\x1b[0m\n`;
    for (const sub of def.subcommands.slice(0, 6)) {
      output += `  \x1b[36m${sub.name.padEnd(15)}\x1b[0m ${sub.description}\n`;
    }
    if (def.subcommands.length > 6) {
      output += `  ... and ${def.subcommands.length - 6} more\n`;
    }
    output += "\n";
  }

  // Error messages and resolutions
  if (
    options.includeErrors !== false &&
    def.error_messages &&
    def.error_messages.length > 0
  ) {
    output += `\x1b[1mCommon Errors:\x1b[0m\n`;
    for (const err of def.error_messages.slice(0, 3)) {
      output += `  \x1b[31m${err.message.substring(0, 50)}...\x1b[0m\n`;
      output += `    Meaning: ${err.meaning}\n`;
      if (err.resolution) {
        output += `    \x1b[32mFix: ${err.resolution.substring(0, 80)}...\x1b[0m\n`;
      }
    }
    output += "\n";
  }

  // Related commands
  if (def.interoperability?.related_commands) {
    output += `\x1b[1mRelated Commands:\x1b[0m `;
    output += def.interoperability.related_commands.slice(0, 5).join(", ");
    output += "\n\n";
  }

  // Source
  if (def.source_urls && def.source_urls.length > 0) {
    output += `\x1b[90mDocumentation: ${def.source_urls[0]}\x1b[0m\n`;
  }

  return output;
}

function generateFlagExplanation(
  def: any,
  flag: string,
  registry: CommandDefinitionRegistry,
): string {
  const normalizedFlag = flag.replace(/^-+/, "");

  const opt = def.global_options?.find(
    (o: any) =>
      o.short === normalizedFlag ||
      o.long === normalizedFlag ||
      o.flag?.replace(/^-+/, "") === normalizedFlag,
  );

  if (!opt) {
    return (
      `\x1b[31mFlag '${flag}' not found for ${def.command}.\x1b[0m\n` +
      `Run 'explain ${def.command}' to see available options.`
    );
  }

  let output = "";
  output += `\x1b[1;36m━━━ ${def.command} ${flag} ━━━\x1b[0m\n\n`;

  const flagStr = opt.short ? `-${opt.short}` : "";
  const longStr = opt.long ? `--${opt.long}` : "";
  output += `\x1b[1mFlag:\x1b[0m ${[flagStr, longStr].filter(Boolean).join(", ")}\n\n`;

  output += `\x1b[1mDescription:\x1b[0m\n  ${opt.description}\n\n`;

  if (opt.arguments) {
    output += `\x1b[1mArguments:\x1b[0m ${opt.arguments}`;
    if (opt.argument_type) {
      output += ` (${opt.argument_type})`;
    }
    output += "\n\n";
  }

  if (opt.example) {
    output += `\x1b[1mExample:\x1b[0m\n  \x1b[36m${opt.example}\x1b[0m\n\n`;
  }

  // Check if requires root
  if (registry.requiresRoot(def.command, normalizedFlag)) {
    output += `\x1b[33m⚠ This option requires root privileges\x1b[0m\n`;
  }

  return output;
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/cli/__tests__/explainCommand.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/cli/explainCommand.ts src/cli/__tests__/explainCommand.test.ts
git commit -m "feat(cli): add rich explain command using JSON definitions

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 4: Integrate with Existing Simulators

### Task 4.1: Update BaseSimulator to Use Registry for Validation

**Files:**

- Modify: `src/simulators/BaseSimulator.ts`
- Test: `src/simulators/__tests__/BaseSimulator.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/simulators/__tests__/BaseSimulator.test.ts
import { describe, it, expect, beforeAll } from "vitest";

describe("BaseSimulator with CommandDefinitionRegistry", () => {
  it("should validate flags using registry when available", async () => {
    // This test will be added to existing test file
    // Implementation validates that registry-based validation works
  });
});
```

**Step 2: Implementation approach**

Add a method to BaseSimulator that optionally uses the CommandDefinitionRegistry:

```typescript
// Add to BaseSimulator.ts

import { getCommandDefinitionRegistry, CommandDefinitionRegistry } from '@/cli/CommandDefinitionRegistry';

// In BaseSimulator class:

private definitionRegistry: CommandDefinitionRegistry | null = null;

/**
 * Initialize the command definition registry for enhanced validation
 * Call this in simulator constructors to enable JSON-based validation
 */
protected async initializeDefinitionRegistry(): Promise<void> {
  this.definitionRegistry = await getCommandDefinitionRegistry();
}

/**
 * Validate flags using the definition registry (if available)
 * Falls back to existing validation if registry not initialized
 */
protected validateFlagsWithRegistry(
  parsed: ParsedCommand,
  commandName?: string
): CommandResult | null {
  if (!this.definitionRegistry) {
    return this.validateFlags(parsed);
  }

  const name = commandName || this.getMetadata().name;

  for (const [flag] of parsed.flags) {
    const result = this.definitionRegistry.validateFlag(name, flag);
    if (!result.valid) {
      return this.createFlagSuggestionError(name, flag, result.suggestions || []);
    }
  }

  return null;
}
```

**Step 3: Commit after implementation**

```bash
git add src/simulators/BaseSimulator.ts src/simulators/__tests__/BaseSimulator.test.ts
git commit -m "feat(simulators): integrate CommandDefinitionRegistry into BaseSimulator

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 4.2: Update NvidiaSmiSimulator to Use Registry

**Files:**

- Modify: `src/simulators/nvidiaSmiSimulator.ts`
- Test: `src/simulators/__tests__/nvidiaSmiSimulator.test.ts`

This task migrates nvidia-smi as the first simulator to use registry-based validation.

**Step 1: Update constructor to initialize registry**

```typescript
// In NvidiaSmiSimulator constructor:
constructor() {
  super();
  this.registerCommands();
  // Remove hardcoded flag registration, use registry instead
  this.initializeDefinitionRegistry();
}
```

**Step 2: Update execute method to use registry validation**

The existing `registerValidFlagsAndSubcommands` method gets replaced with registry lookup.

**Step 3: Run existing tests to ensure no regression**

Run: `npm run test -- src/simulators/__tests__/nvidiaSmiSimulator.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/simulators/nvidiaSmiSimulator.ts
git commit -m "refactor(nvidia-smi): use CommandDefinitionRegistry for validation

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 5: Learning Tools Enhancement

### Task 5.1: Create Command-Focused Learning Exercises

**Files:**

- Create: `src/cli/CommandExerciseGenerator.ts`
- Test: `src/cli/__tests__/CommandExerciseGenerator.test.ts`

This task creates a system that generates learning exercises from the JSON command definitions.

**Step 1: Write the failing test**

```typescript
// src/cli/__tests__/CommandExerciseGenerator.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { CommandExerciseGenerator } from "../CommandExerciseGenerator";
import { CommandDefinitionRegistry } from "../CommandDefinitionRegistry";

describe("CommandExerciseGenerator", () => {
  let generator: CommandExerciseGenerator;

  beforeAll(async () => {
    const registry = new CommandDefinitionRegistry();
    await registry.initialize();
    generator = new CommandExerciseGenerator(registry);
  });

  it("should generate exercises for nvidia-smi", () => {
    const exercises = generator.generateForCommand("nvidia-smi");

    expect(exercises.length).toBeGreaterThan(0);
    expect(exercises[0].prompt).toBeDefined();
    expect(exercises[0].expectedCommand).toBeDefined();
    expect(exercises[0].hints).toBeDefined();
  });

  it("should generate exercises by category", () => {
    const exercises = generator.generateForCategory("gpu_management", 5);

    expect(exercises.length).toBeLessThanOrEqual(5);
  });

  it("should generate exercises by difficulty", () => {
    const beginnerExercises = generator.generateByDifficulty("beginner", 3);
    const advancedExercises = generator.generateByDifficulty("advanced", 3);

    // Beginner exercises should use simpler commands/flags
    expect(beginnerExercises.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Write minimal implementation**

```typescript
// src/cli/CommandExerciseGenerator.ts
import type { CommandDefinitionRegistry } from "./CommandDefinitionRegistry";
import type { CommandDefinition, UsagePattern } from "./types";

export interface CommandExercise {
  id: string;
  prompt: string;
  expectedCommand: string;
  hints: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  category: string;
  relatedCommand: string;
  outputExample?: string;
}

export class CommandExerciseGenerator {
  constructor(private registry: CommandDefinitionRegistry) {}

  generateForCommand(commandName: string): CommandExercise[] {
    const def = (this.registry as any).getDefinitionSync(commandName);
    if (!def) return [];

    const exercises: CommandExercise[] = [];

    // Generate exercises from usage patterns
    if (def.common_usage_patterns) {
      for (const pattern of def.common_usage_patterns) {
        exercises.push(this.patternToExercise(def, pattern));
      }
    }

    return exercises;
  }

  generateForCategory(category: string, limit: number): CommandExercise[] {
    const commands = this.registry.getByCategory(category as any);
    const exercises: CommandExercise[] = [];

    for (const cmd of commands) {
      const cmdExercises = this.generateForCommand(cmd.command);
      exercises.push(...cmdExercises);
      if (exercises.length >= limit) break;
    }

    return exercises.slice(0, limit);
  }

  generateByDifficulty(difficulty: string, limit: number): CommandExercise[] {
    // Implementation maps command complexity to difficulty
    // Beginner: basic flags, no subcommands
    // Intermediate: subcommands, multiple flags
    // Advanced: complex flag combinations, root operations
    return [];
  }

  private patternToExercise(
    def: CommandDefinition,
    pattern: UsagePattern,
  ): CommandExercise {
    return {
      id: `${def.command}-${this.hashString(pattern.command)}`,
      prompt: pattern.description,
      expectedCommand: pattern.command,
      hints: this.generateHints(def, pattern),
      difficulty: this.assessDifficulty(pattern),
      category: def.category,
      relatedCommand: def.command,
      outputExample: pattern.output_example,
    };
  }

  private generateHints(
    def: CommandDefinition,
    pattern: UsagePattern,
  ): string[] {
    const hints: string[] = [];
    hints.push(`The command starts with '${def.command}'`);

    // Extract flags from the pattern command
    const flags = pattern.command.match(/--?\w+/g) || [];
    if (flags.length > 0) {
      hints.push(`You'll need to use the ${flags[0]} flag`);
    }

    return hints;
  }

  private assessDifficulty(
    pattern: UsagePattern,
  ): "beginner" | "intermediate" | "advanced" {
    const cmd = pattern.command;
    if (pattern.requires_root) return "advanced";
    if (cmd.split(" ").length > 4) return "intermediate";
    if (cmd.includes("|")) return "advanced";
    return "beginner";
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).slice(0, 8);
  }
}
```

**Step 3: Run test to verify**

Run: `npm run test -- src/cli/__tests__/CommandExerciseGenerator.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/cli/CommandExerciseGenerator.ts src/cli/__tests__/CommandExerciseGenerator.test.ts
git commit -m "feat(cli): add CommandExerciseGenerator for learning exercises

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 6: Output Template System (Future)

> **Note:** This phase is outlined but implementation is deferred. The `output_example` fields in JSON definitions can be used as test fixtures to verify simulator output accuracy.

### Task 6.1: Create Output Template Matcher

Creates a system that compares simulator output against expected patterns from JSON.

### Task 6.2: Add Output Accuracy Tests

Uses `common_usage_patterns[].output_example` as test fixtures.

---

## Summary

This plan establishes a data-driven CLI architecture in 5 main phases:

1. **Foundation** - TypeScript types and JSON loader
2. **Registry** - Central command definition registry with validation
3. **Explain Enhancement** - Rich documentation in explain command
4. **Simulator Integration** - Migrate existing simulators to use registry
5. **Learning Tools** - Exercise generation from definitions

**Key Benefits:**

- Single source of truth for command documentation
- Automatic flag validation without hardcoding
- Rich help/explain from official documentation
- Test fixtures from real output examples
- Learning exercises generated from usage patterns

**Files Created:**

- `src/cli/types.ts`
- `src/cli/CommandDefinitionLoader.ts`
- `src/cli/CommandDefinitionRegistry.ts`
- `src/cli/explainCommand.ts`
- `src/cli/CommandExerciseGenerator.ts`
- Tests for each module

**Files Modified:**

- `src/simulators/BaseSimulator.ts`
- `src/simulators/nvidiaSmiSimulator.ts`
