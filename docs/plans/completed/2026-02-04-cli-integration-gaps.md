# CLI Integration Gaps Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the data-driven CLI architecture integration by migrating remaining simulators to use the registry, exposing CLI tools to users, and creating proper module exports.

**Architecture:** Incrementally migrate dcgmiSimulator and ipmitoolSimulator to use CommandDefinitionRegistry for enhanced validation. For Slurm's multi-command architecture, pass the specific command name through to validateFlagsWithRegistry. Expose explainCommand and CommandExerciseGenerator through Terminal.tsx as user-facing commands. Create a barrel export (index.ts) for the CLI module.

**Tech Stack:** TypeScript, Vitest, React (Terminal.tsx), Vite

---

## Task 1: Create CLI Module Barrel Export

**Files:**

- Create: `src/cli/index.ts`
- Test: `src/cli/__tests__/index.test.ts`

**Step 1: Write the failing test**

Create `src/cli/__tests__/index.test.ts`:

```typescript
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
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/cli/__tests__/index.test.ts`
Expected: FAIL with "Cannot find module '../index'"

**Step 3: Write minimal implementation**

Create `src/cli/index.ts`:

```typescript
// src/cli/index.ts
// Barrel export for CLI module

// Types
export type {
  CommandCategory,
  StateDomain,
  CommandOption,
  Subcommand,
  SubcommandOption,
  ExitCode,
  UsagePattern,
  ErrorMessage,
  StateInteraction,
  OutputFormat,
  CommandDefinition,
} from "./types";

// Loader
export {
  CommandDefinitionLoader,
  getCommandDefinitionLoader,
} from "./CommandDefinitionLoader";

// Registry
export {
  CommandDefinitionRegistry,
  getCommandDefinitionRegistry,
} from "./CommandDefinitionRegistry";
export type { ValidationResult } from "./CommandDefinitionRegistry";

// Explain Command
export { generateExplainOutput } from "./explainCommand";
export type { ExplainOptions } from "./explainCommand";

// Exercise Generator
export { CommandExerciseGenerator } from "./CommandExerciseGenerator";
export type { CommandExercise } from "./CommandExerciseGenerator";
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/cli/__tests__/index.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/cli/index.ts src/cli/__tests__/index.test.ts
git commit -m "$(cat <<'EOF'
feat(cli): add barrel export for CLI module

Creates index.ts exporting all public types, classes, and functions
from the CLI module for cleaner imports.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Migrate DcgmiSimulator to Use Registry

**Files:**

- Modify: `src/simulators/dcgmiSimulator.ts` (lines 6-10, ~160)
- Test: `src/simulators/__tests__/dcgmiSimulator.test.ts`

**Step 1: Write the failing test**

Add to `src/simulators/__tests__/dcgmiSimulator.test.ts`:

```typescript
describe("CommandDefinitionRegistry Integration", () => {
  it("should have definition registry initialized after construction", async () => {
    // Wait for async initialization
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(simulator["definitionRegistry"]).not.toBeNull();
  });

  it("should reject unknown flags with suggestion", () => {
    const parsed = parse("dcgmi --queryx");
    const result = simulator.execute(parsed, context);

    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain("unrecognized option");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/simulators/__tests__/dcgmiSimulator.test.ts --grep "CommandDefinitionRegistry"`
Expected: FAIL with "definitionRegistry" is null

**Step 3: Write minimal implementation**

Modify `src/simulators/dcgmiSimulator.ts`:

```typescript
// At line 6-10, update constructor:
export class DcgmiSimulator extends BaseSimulator {
  constructor() {
    super();
    this.registerCommands();
    this.initializeDefinitionRegistry(); // Add this line
  }
```

Then update the execute method (around line 157-188) to use registry validation:

```typescript
execute(parsed: ParsedCommand, context: CommandContext): CommandResult {
  // Check for unknown flags using registry (if available) or fallback
  const flagError = this.validateFlagsWithRegistry(parsed, 'dcgmi');
  if (flagError) return flagError;

  // Handle --version flag
  if (this.hasAnyFlag(parsed, ['version', 'V'])) {
    return this.handleVersion();
  }

  // Handle --help flag at root level
  if (this.hasAnyFlag(parsed, ['help', 'h'])) {
    return this.handleHelp();
  }

  // ... rest of existing execute logic
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/simulators/__tests__/dcgmiSimulator.test.ts`
Expected: PASS

**Step 5: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/simulators/dcgmiSimulator.ts src/simulators/__tests__/dcgmiSimulator.test.ts
git commit -m "$(cat <<'EOF'
feat(dcgmi): integrate CommandDefinitionRegistry for enhanced validation

- Initialize definition registry in constructor
- Use validateFlagsWithRegistry for flag validation with fuzzy matching
- Provides better error messages with suggestions for typos

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Migrate IpmitoolSimulator to Use Registry

**Files:**

- Modify: `src/simulators/ipmitoolSimulator.ts` (lines 19-23, execute method)
- Test: `src/simulators/__tests__/ipmitoolSimulator.test.ts` (if exists, otherwise create)

**Step 1: Check if test file exists and add tests**

First check if test file exists. If not, create it. Add registry integration tests:

```typescript
describe("CommandDefinitionRegistry Integration", () => {
  it("should have definition registry initialized after construction", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(simulator["definitionRegistry"]).not.toBeNull();
  });

  it("should validate flags using registry", () => {
    const parsed = parse("ipmitool sensor list");
    const result = simulator.execute(parsed, context);

    // Valid command should succeed
    expect(result.exitCode).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/simulators/__tests__/ipmitoolSimulator.test.ts --grep "CommandDefinitionRegistry"`
Expected: FAIL with "definitionRegistry" is null

**Step 3: Write minimal implementation**

Modify `src/simulators/ipmitoolSimulator.ts` constructor (lines 19-23):

```typescript
constructor() {
  super();
  this.registerCommands();
  this.registerValidFlagsAndSubcommands();
  this.initializeDefinitionRegistry(); // Add this line
}
```

Update the execute method to use registry validation (find the execute method and add at the start):

```typescript
execute(parsed: ParsedCommand, context: CommandContext): CommandResult {
  // Validate flags using registry (if available) or fallback to registered flags
  const flagError = this.validateFlagsWithRegistry(parsed, 'ipmitool');
  if (flagError) return flagError;

  // ... rest of existing execute logic
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/simulators/__tests__/ipmitoolSimulator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/simulators/ipmitoolSimulator.ts src/simulators/__tests__/ipmitoolSimulator.test.ts
git commit -m "$(cat <<'EOF'
feat(ipmitool): integrate CommandDefinitionRegistry for enhanced validation

- Initialize definition registry in constructor
- Use validateFlagsWithRegistry for improved error messages
- Maintains backward compatibility with registered flags fallback

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Add Registry Support for Slurm Multi-Command Architecture

**Files:**

- Modify: `src/simulators/slurmSimulator.ts` (constructor, each execute method)
- Test: `src/simulators/__tests__/slurmSimulator.test.ts` (add registry tests)

**Step 1: Write the failing test**

Add to existing Slurm test file or create new section:

```typescript
describe("CommandDefinitionRegistry Integration", () => {
  it("should have definition registry initialized", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(simulator["definitionRegistry"]).not.toBeNull();
  });

  it("should validate sinfo flags using registry", () => {
    const parsed = parse("sinfo --partition=gpu");
    const result = simulator.executeSinfo(parsed, context);

    expect(result.exitCode).toBe(0);
  });

  it("should reject unknown sinfo flags", () => {
    const parsed = parse("sinfo --unknownflag");
    const result = simulator.executeSinfo(parsed, context);

    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain("unrecognized option");
  });

  it("should validate squeue flags using registry", () => {
    const parsed = parse("squeue --user=root");
    const result = simulator.executeSqueue(parsed, context);

    expect(result.exitCode).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/simulators/__tests__/slurmSimulator.test.ts --grep "CommandDefinitionRegistry"`
Expected: FAIL

**Step 3: Write minimal implementation**

Modify `src/simulators/slurmSimulator.ts`:

```typescript
// Update constructor (around line 43-45):
constructor() {
  super();
  this.initializeDefinitionRegistry(); // Add this
}
```

Update each execute method to validate with the specific command name:

```typescript
// In executeSinfo (around line 205+):
executeSinfo(parsed: ParsedCommand, context: CommandContext): CommandResult {
  // Validate using the specific command name for this method
  const flagError = this.validateFlagsWithRegistry(parsed, 'sinfo');
  if (flagError) return flagError;

  // Handle help
  if (this.hasAnyFlag(parsed, ['help'])) {
    return this.createSuccess(this.generateSinfoHelp());
  }
  // ... rest of method
}

// In executeSqueue:
executeSqueue(parsed: ParsedCommand, context: CommandContext): CommandResult {
  const flagError = this.validateFlagsWithRegistry(parsed, 'squeue');
  if (flagError) return flagError;
  // ... rest of method
}

// In executeScontrol:
executeScontrol(parsed: ParsedCommand, context: CommandContext): CommandResult {
  const flagError = this.validateFlagsWithRegistry(parsed, 'scontrol');
  if (flagError) return flagError;
  // ... rest of method
}

// In executeSbatch:
executeSbatch(parsed: ParsedCommand, context: CommandContext): CommandResult {
  const flagError = this.validateFlagsWithRegistry(parsed, 'sbatch');
  if (flagError) return flagError;
  // ... rest of method
}

// Similarly for executeSrun, executeScancel, executeSacct
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/simulators/__tests__/slurmSimulator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/simulators/slurmSimulator.ts src/simulators/__tests__/slurmSimulator.test.ts
git commit -m "$(cat <<'EOF'
feat(slurm): integrate CommandDefinitionRegistry for multi-command validation

- Initialize definition registry in constructor
- Pass specific command name (sinfo, squeue, etc.) to validateFlagsWithRegistry
- Enables JSON-based validation for all Slurm commands with fuzzy matching
- Architecture: single simulator, multiple command names for registry lookup

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Expose Explain Command in Terminal

**Files:**

- Modify: `src/components/Terminal.tsx` (add case for 'explain-json' or update existing 'explain')
- Test: Manual testing in browser

**Step 1: Understand current explain implementation**

The Terminal already has an `explain` command using `commandMetadata.ts`. We'll add a new `explain-json` command that uses the JSON-based registry for richer output.

**Step 2: Add the explain-json case**

In `src/components/Terminal.tsx`, find the switch statement (around line 256-735) and add a new case after the existing 'explain' case:

```typescript
case 'explain-json': {
  const args = cmdLine.trim().split(/\s+/).slice(1);
  if (args.length === 0) {
    result.output = `Usage: explain-json <command>\n\nProvides detailed command information from JSON definitions.\nIncludes usage patterns, exit codes, error resolutions, and state interactions.\n\nExample: explain-json nvidia-smi`;
    break;
  }

  const commandName = args[0];

  // Dynamic import to avoid circular dependencies
  const { getCommandDefinitionRegistry } = await import('@/cli');
  const { generateExplainOutput } = await import('@/cli');

  try {
    const registry = await getCommandDefinitionRegistry();
    const output = await generateExplainOutput(commandName, registry, {
      showStateInteractions: true,
      showExitCodes: true,
      showErrorResolutions: true,
    });
    result.output = output;
  } catch (error) {
    result.output = `Error loading command information: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.exitCode = 1;
  }
  break;
}
```

**Step 3: Add import at top of file**

No static import needed - we use dynamic import to avoid circular dependencies.

**Step 4: Test manually**

Run: `npm run dev`
In browser terminal, type: `explain-json nvidia-smi`
Expected: Rich formatted output with synopsis, options, usage patterns, exit codes

**Step 5: Commit**

```bash
git add src/components/Terminal.tsx
git commit -m "$(cat <<'EOF'
feat(terminal): add explain-json command for JSON-based help

- Adds 'explain-json' command using CommandDefinitionRegistry
- Provides rich output including usage patterns, exit codes, error resolutions
- Uses dynamic import to avoid circular dependencies with CLI module

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Expose Practice Command in Terminal

**Files:**

- Modify: `src/components/Terminal.tsx` (add case for 'practice')
- Test: Manual testing in browser

**Step 1: Add the practice case**

In `src/components/Terminal.tsx`, add a new case in the switch statement:

```typescript
case 'practice': {
  const args = cmdLine.trim().split(/\s+/).slice(1);

  // Dynamic import
  const { getCommandDefinitionRegistry, CommandExerciseGenerator } = await import('@/cli');

  try {
    const registry = await getCommandDefinitionRegistry();
    const generator = new CommandExerciseGenerator(registry);

    // Parse subcommand
    const subcommand = args[0];

    if (!subcommand || subcommand === 'random') {
      // Get 3 random exercises
      const exercises = generator.getRandomExercises(3);
      result.output = formatPracticeExercises(exercises);
    } else if (subcommand === 'beginner' || subcommand === 'intermediate' || subcommand === 'advanced') {
      const exercises = generator.generateByDifficulty(subcommand, 3);
      result.output = formatPracticeExercises(exercises);
    } else if (subcommand === 'category') {
      const category = args[1];
      if (!category) {
        result.output = `Usage: practice category <category>\n\nAvailable categories: gpu_management, diagnostics, cluster_management, networking, containers, storage`;
        break;
      }
      const exercises = generator.generateForCategory(category, 3);
      result.output = formatPracticeExercises(exercises);
    } else {
      // Assume it's a command name
      const exercises = generator.generateForCommand(subcommand);
      if (exercises.length === 0) {
        result.output = `No exercises found for command: ${subcommand}\n\nTry: practice random, practice beginner, or practice category gpu_management`;
      } else {
        result.output = formatPracticeExercises(exercises.slice(0, 3));
      }
    }
  } catch (error) {
    result.output = `Error generating exercises: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.exitCode = 1;
  }
  break;
}
```

**Step 2: Add helper function**

Add this helper function inside Terminal.tsx (before the component or as a separate utility):

```typescript
function formatPracticeExercises(
  exercises: Array<{
    id: string;
    prompt: string;
    expectedCommand: string;
    hints: string[];
    difficulty: string;
    category: string;
    relatedCommand: string;
  }>,
): string {
  if (exercises.length === 0) {
    return "No exercises available.";
  }

  let output =
    "\x1b[1;36m═══════════════════════════════════════════════════════════════\x1b[0m\n";
  output += "\x1b[1;33m                    COMMAND PRACTICE EXERCISES\x1b[0m\n";
  output +=
    "\x1b[1;36m═══════════════════════════════════════════════════════════════\x1b[0m\n\n";

  exercises.forEach((exercise, index) => {
    const difficultyColor =
      exercise.difficulty === "beginner"
        ? "32"
        : exercise.difficulty === "intermediate"
          ? "33"
          : "31";

    output += `\x1b[1;37m[Exercise ${index + 1}]\x1b[0m \x1b[${difficultyColor}m(${exercise.difficulty})\x1b[0m\n`;
    output += `\x1b[1;34mCategory:\x1b[0m ${exercise.category}\n`;
    output += `\x1b[1;34mRelated Command:\x1b[0m ${exercise.relatedCommand}\n\n`;
    output += `\x1b[1;37mTask:\x1b[0m ${exercise.prompt}\n\n`;
    output += `\x1b[1;33mHints:\x1b[0m\n`;
    exercise.hints.forEach((hint, i) => {
      output += `  ${i + 1}. ${hint}\n`;
    });
    output += `\n\x1b[2mExpected: ${exercise.expectedCommand}\x1b[0m\n`;
    output +=
      "\n\x1b[1;36m───────────────────────────────────────────────────────────────\x1b[0m\n\n";
  });

  output +=
    "\x1b[2mUsage: practice [random|beginner|intermediate|advanced|category <cat>|<command>]\x1b[0m\n";

  return output;
}
```

**Step 3: Test manually**

Run: `npm run dev`
In browser terminal, try:

- `practice` - Shows random exercises
- `practice beginner` - Shows beginner exercises
- `practice nvidia-smi` - Shows exercises for specific command
- `practice category gpu_management` - Shows exercises for category

**Step 4: Commit**

```bash
git add src/components/Terminal.tsx
git commit -m "$(cat <<'EOF'
feat(terminal): add practice command for learning exercises

- Adds 'practice' command using CommandExerciseGenerator
- Supports: random, difficulty levels, category filtering, command-specific
- Displays formatted exercises with hints and expected commands
- Uses dynamic import to load CLI module

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Update Help Command to Include New Commands

**Files:**

- Modify: `src/utils/commandMetadata.ts` (add entries for explain-json and practice)
- Test: Verify `help` command shows new commands

**Step 1: Add metadata entries**

In `src/utils/commandMetadata.ts`, find the commandMetadata object and add entries:

```typescript
'explain-json': {
  name: 'explain-json',
  aliases: [],
  category: 'general',
  difficulty: 'beginner',
  syntax: 'explain-json <command>',
  flags: {},
  description: 'Get detailed command information from JSON definitions',
  whenToUse: 'When you need comprehensive documentation including usage patterns, exit codes, and error resolutions',
  examples: [
    'explain-json nvidia-smi',
    'explain-json dcgmi',
    'explain-json sinfo',
  ],
  commonMistakes: [],
  relatedCommands: ['help', 'explain', 'practice'],
  domains: [],
},

'practice': {
  name: 'practice',
  aliases: [],
  category: 'general',
  difficulty: 'beginner',
  syntax: 'practice [random|beginner|intermediate|advanced|category <cat>|<command>]',
  flags: {},
  description: 'Generate command learning exercises',
  whenToUse: 'When you want to practice Linux/HPC commands with hints and expected answers',
  examples: [
    'practice',
    'practice beginner',
    'practice nvidia-smi',
    'practice category gpu_management',
  ],
  commonMistakes: [],
  relatedCommands: ['help', 'explain', 'explain-json'],
  domains: [],
},
```

**Step 2: Verify**

Run: `npm run dev`
In browser terminal: `help`
Expected: Should list 'explain-json' and 'practice' in the general category

**Step 3: Commit**

```bash
git add src/utils/commandMetadata.ts
git commit -m "$(cat <<'EOF'
docs(metadata): add explain-json and practice command documentation

- Adds command metadata for explain-json and practice
- Includes syntax, examples, and related commands
- Shows in help command output

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Run Full Test Suite and Fix Any Issues

**Files:**

- All modified files from previous tasks

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 2: Run linter**

Run: `npm run lint`
Expected: No errors

**Step 3: Run type check**

Run: `npm run typecheck` (or `npx tsc --noEmit`)
Expected: No type errors

**Step 4: Fix any issues found**

If any tests fail or lint errors appear, fix them before proceeding.

**Step 5: Final commit (if fixes needed)**

```bash
git add -A
git commit -m "$(cat <<'EOF'
fix: address test failures and lint issues from CLI integration

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Summary

This plan addresses the 5 integration gaps identified:

1. **CLI Module Index** (Task 1) - Creates barrel export for cleaner imports
2. **DcgmiSimulator Migration** (Task 2) - Adds registry initialization and validation
3. **IpmitoolSimulator Migration** (Task 3) - Adds registry initialization and validation
4. **Slurm Multi-Command Support** (Task 4) - Passes specific command names to registry
5. **User-Facing CLI Tools** (Tasks 5-7) - Exposes explain-json and practice commands

**Not addressed (out of scope):**

- FabricManagerSimulator - No JSON definition exists yet
- Creating new JSON definitions - Separate task for content authors

**Total Tasks:** 8
**Estimated Time:** Each task is 2-10 minutes of implementation work
