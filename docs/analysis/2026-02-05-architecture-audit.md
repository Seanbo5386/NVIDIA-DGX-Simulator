# Architecture & Code Organization Audit

**Date:** 2026-02-05
**Auditor:** Claude Opus 4.6
**Branch:** feature/cli-command-updates
**Scope:** Architecture, code organization, dependency analysis, dead code detection

---

## Executive Summary

The codebase has a solid foundational architecture with Zustand stores, a BaseSimulator abstraction layer, and a well-structured command parser. However, it suffers from several significant architectural issues: a massive Terminal.tsx acting as a monolithic command router (1207 lines), duplicate command registry systems that are not integrated, an oversized LearningPaths.tsx (1665 lines) with multiple components inlined, and two overlapping progress stores (`learningStore` vs `learningProgressStore`). The `src/cli/` subsystem is only partially integrated -- it is connected via `BaseSimulator` and dynamic imports in Terminal.tsx but the `src/utils/commandRegistry.ts` is entirely dead code. The `stateManager.ts` is used but only in 2 files.

---

## Findings

### 1. App.tsx is a Moderate God Object (Reduced from Prior State)

- **Severity:** Medium
- **File(s):** `src/App.tsx` (lines 1-741)
- **Current State:** App.tsx has 34 imports (13 components, 5 stores/utils, 12 icons, 4 misc), 8 pieces of local state (`useState`), and mixes several responsibilities:
  - Navigation/routing (view switching via `currentView`)
  - 7 modal visibility booleans (`showLabWorkspace`, `showExamWorkspace`, `showWelcome`, `showStudyDashboard`, `showLearningPaths`, `showSpacedReviewDrill`, `showExamGauntlet`)
  - Simulation controls (start/stop/reset/export/import)
  - Lab domain mapping and scenario initialization (lines 113-131)
  - Inline JSX for the entire Labs & Scenarios tab content (lines 312-653, ~340 lines of hardcoded domain cards)
- **Issue:** While App.tsx is not egregiously large at 741 lines, the Labs & Scenarios tab content (lines 312-653) is entirely inlined as hardcoded JSX domain cards rather than being extracted to a dedicated component. The 7 modal visibility booleans suggest missing abstraction for a modal management pattern. The `handleExport` and `handleImport` functions (lines 77-111) contain raw DOM manipulation for file I/O.
- **Recommendation:**
  1. Extract the Labs & Scenarios tab content (lines 312-653) into a `LabsAndScenariosView` component, removing ~340 lines.
  2. Consolidate modal state into a single `activeModal` state variable or a dedicated modal manager.
  3. Extract `handleExport`/`handleImport` into a utility module (e.g., `src/utils/fileIO.ts`).
  4. Move simulation control buttons into a `SimulationControls` component.

---

### 2. Duplicate Command Registry Systems

- **Severity:** High
- **File(s):**
  - `src/utils/commandRegistry.ts` (lines 1-362) -- **DEAD CODE**
  - `src/cli/CommandDefinitionRegistry.ts` (lines 1-343) -- Active, used
  - `src/simulators/CommandInterceptor.ts` (lines 1-270) -- Active, used by BaseSimulator
- **Current State:** There are three separate systems for command registration and validation:
  1. **`src/utils/commandRegistry.ts`** (`CommandRegistry` class): A singleton registry designed to decouple Terminal.tsx from simulators via `CommandDescriptor` objects with categories, aliases, and simulator references. However, **this class is never instantiated or called anywhere in the production code**. The only reference is a type re-export in `src/types/commands.ts:86`. It is pure dead code.
  2. **`src/cli/CommandDefinitionRegistry.ts`** (`CommandDefinitionRegistry`): An async JSON-based command definition system used by `BaseSimulator` for enhanced flag/subcommand validation, help generation, and error resolution. It is integrated via `BaseSimulator.initializeDefinitionRegistry()` and dynamically imported in Terminal.tsx for `explain-json` and `practice` commands.
  3. **`src/simulators/CommandInterceptor.ts`** (`CommandInterceptor`): A fuzzy-matching system for flag and subcommand validation, used directly by `BaseSimulator.registerValidFlags()` and `BaseSimulator.validateFlags()`. It provides Levenshtein distance-based "Did you mean?" suggestions.
- **Issue:** The `CommandRegistry` in `src/utils/commandRegistry.ts` was designed to replace the giant switch statement in Terminal.tsx but was never integrated. Meanwhile, `CommandInterceptor` and `CommandDefinitionRegistry` both do flag validation with their own Levenshtein distance implementations (see `CommandInterceptor.ts:33-58` and `CommandDefinitionRegistry.ts:305-330` -- identical algorithm, duplicated). The original intent of `commandRegistry.ts` (decoupling Terminal from simulators) remains unaddressed.
- **Recommendation:**
  1. Delete `src/utils/commandRegistry.ts` entirely -- it is dead code.
  2. Remove the type re-export from `src/types/commands.ts:86`.
  3. Merge the Levenshtein distance implementation into a shared utility (currently duplicated between `CommandInterceptor.ts` and `CommandDefinitionRegistry.ts`).
  4. If decoupling Terminal from simulators is still desired, extend `CommandDefinitionRegistry` to serve as the single routing registry.

---

### 3. Terminal.tsx: Monolithic 1207-Line Command Router

- **Severity:** Critical
- **File(s):** `src/components/Terminal.tsx` (lines 1-1207)
- **Current State:** Terminal.tsx contains at least 6 distinct concerns tightly coupled into a single component:
  1. **xterm.js Lifecycle** (lines 210-246): Terminal initialization, fit addon, resize observer, cleanup.
  2. **19 Simulator Instantiations** (lines 122-141): All 19 simulator classes instantiated via `useRef`, each one imported individually.
  3. **Command Routing** (lines 279-1063): A 784-line `switch` statement mapping ~50+ command strings to their simulator methods. Each case follows the identical pattern: `const parsed = parseCommand(cmdLine); result = someSimulator.current.execute(parsed, currentContext.current);`
  4. **Scenario Validation** (lines 1077-1156): Post-command validation logic checking active scenarios, recording commands, and running `ScenarioValidator`.
  5. **SSH Simulation** (lines 460-500): SSH connection emulation with node state updates.
  6. **Interactive Shell Management** (lines 300-325, 583-592, 778-792): Shell mode intercepts for nvsm and cmsh.
  7. **Helper Functions** (lines 49-95): `formatPracticeExercises` function that generates ANSI-formatted exercise output.
- **Issue:** The 784-line switch statement is the most critical problem. Every new command requires modifying this file. The pattern is entirely mechanical (parse -> delegate to simulator -> return result) and cries out for a registry-based dispatch. The 19 `useRef` simulator instantiations (lines 122-141) are a code smell -- they should be managed by a factory or registry. The `formatPracticeExercises` helper (lines 49-95) is a pure formatting function that belongs in a utility module.
- **Recommendation:**
  1. **Command Router Extraction:** Create a `CommandRouter` class or registry that maps command names to their simulator and method. Replace the 784-line switch with a lookup: `const handler = commandRouter.resolve(command); result = handler.execute(parsed, context);`
  2. **Simulator Factory:** Create a `SimulatorFactory` that lazily instantiates simulators, eliminating the 19 `useRef` declarations.
  3. **Validation Extraction:** Move scenario validation (lines 1077-1156) into a `useScenarioValidation` hook or a post-execution middleware.
  4. **SSH Extraction:** Move SSH simulation logic into a dedicated `SshSimulator` or into `BasicSystemSimulator`.
  5. **Formatting Extraction:** Move `formatPracticeExercises` to `src/utils/formatters.ts`.

---

### 4. LearningPaths.tsx: 1665 Lines with Multiple Inlined Components

- **Severity:** High
- **File(s):** `src/components/LearningPaths.tsx` (lines 1-1665)
- **Current State:** This file contains 4 distinct components and 2 helper functions:
  1. **`LearningPaths`** (lines 40-1238): The main component with Learn/Practice/Test tabs, tutorial rendering, quiz handling, and navigation state. Contains ~25 state variables and ~15 handler functions.
  2. **`DomainProgressCards`** (lines 1339-1471): A sub-component for the Practice tab showing domain-based scenario progress cards.
  3. **`OverallProgressDashboard`** (lines 1489-1663): A sub-component showing quiz stats, spaced repetition mastery, and exam gauntlet performance.
  4. **`getDomainColor`** helper (lines 1474-1483): Maps domain IDs to colors.
  5. **`DOMAIN_CONFIG`** constant (lines 1249-1337): 89 lines of configuration data hardcoded in the component file.
- **Issue:** The component manages too many concerns: tutorial step rendering, quiz handling, path navigation, progress tracking, command execution delegation, and three tab panels. The `renderTutorialStep` function alone (lines 316-654) is 338 lines. The 89-line `DOMAIN_CONFIG` constant is configuration data that should live in a data file.
- **Recommendation:**
  1. Extract `DomainProgressCards` to `src/components/DomainProgressCards.tsx`.
  2. Extract `OverallProgressDashboard` to `src/components/OverallProgressDashboard.tsx`.
  3. Extract `renderTutorialStep` to a `TutorialStep` component.
  4. Move `DOMAIN_CONFIG` to `src/data/domainConfig.ts`.
  5. Consider extracting tutorial state management into a `useTutorialState` custom hook.

---

### 5. Simulator-to-Command Routing: Inconsistent Patterns

- **Severity:** Medium
- **File(s):**
  - `src/components/Terminal.tsx` (lines 557-1047)
  - `src/simulators/infinibandSimulator.ts` (multiple entry points)
  - `src/simulators/slurmSimulator.ts` (multiple entry points)
- **Current State:** There are 19 simulator classes, but they connect to Terminal.tsx command routing in two different patterns:
  - **Pattern A (Single Entry):** Most simulators (nvidia-smi, dcgmi, ipmitool, containerSimulator, mellanoxSimulator, bcmSimulator, etc.) use a single `execute()` method. Terminal routes to them with one `case` per command group. The simulator internally dispatches subcommands.
  - **Pattern B (Multiple Entry Points):** `InfiniBandSimulator` exposes 8 separate methods (`executeIbstat`, `executeIbportstate`, `executeIbporterrors`, `executeIblinkinfo`, `executePerfquery`, `executeIbdiagnet`, `executeIbdev2netdev`, `executeIbnetdiscover`), each mapped to its own `case` in Terminal. Similarly, `SlurmSimulator` exposes 7 methods (`executeSinfo`, `executeSqueue`, `executeScontrol`, `executeSbatch`, `executeSrun`, `executeScancel`, `executeSacct`).
  - **Pattern C (Multi-command mapping):** Container tools map 3 commands (`docker`, `ngc`, `enroot`) to the same `containerSimulator.execute()`. Mellanox maps 6 commands to one simulator. BCM maps 3 commands to one.
- **Issue:** Lack of consistency. Pattern B inflates the Terminal.tsx switch statement by creating one case per sub-tool (15 extra cases for InfiniBand + Slurm). Pattern A keeps Terminal cleaner but pushes routing complexity into the simulator. Pattern C is the most elegant but is used inconsistently. Some commands like `lscpu`, `free`, `dmidecode`, `dmesg`, `systemctl`, `hostnamectl`, `timedatectl`, `lsmod`, `modinfo`, `top`, `ps`, `numactl`, `uptime`, `uname`, `hostname` (15 commands!) all map to `basicSystemSimulator.execute()` but each has its own redundant case block (lines 795-948) that does the exact same thing.
- **Recommendation:**
  1. Standardize on Pattern A/C: All simulators should expose a single `execute()` method. `InfiniBandSimulator` and `SlurmSimulator` should accept the base command from the parsed input and internally dispatch.
  2. The 15 identical `basicSystemSimulator` cases should be collapsed into a single `case` with fallthrough or a Set-based lookup.
  3. This consolidation would reduce Terminal.tsx by ~200 lines.

---

### 6. No Circular Dependencies Detected Between Stores, Simulators, and Components

- **Severity:** Low (Positive Finding)
- **File(s):** All stores, simulators, and components
- **Current State:** The dependency flow is clean and unidirectional:
  - **Components** import from stores, simulators, and utils
  - **Stores** import from other stores (learningProgressStore from tierNotificationStore, simulationStore from learningProgressStore) but only via `getState()` calls, not at the module level in a circular way
  - **Simulators** import from `simulationStore` and `scenarioContext` for reading cluster state, but stores never import from simulators
  - **`src/cli/`** is imported by `BaseSimulator.ts` and dynamically by `Terminal.tsx`
  - `scenarioContext.ts` imports from `simulationStore.ts` (one-directional)
  - `stateManager.ts` imports from `simulationStore.ts` (one-directional)
- **Issue:** No circular dependencies found. The cross-store reference from `simulationStore` to `learningProgressStore` (line 19, line 449) is done via `getState()` which avoids circular module evaluation. This is a healthy pattern.
- **Recommendation:** Maintain this clean dependency flow. Document the intended dependency graph to prevent future regressions.

---

### 7. src/cli/ is Partially Integrated: 3 Integration Points, Not a Full Replacement

- **Severity:** Medium
- **File(s):**
  - `src/cli/index.ts` (barrel export)
  - `src/simulators/BaseSimulator.ts` (lines 13-26, 480-635)
  - `src/components/Terminal.tsx` (lines 374-451, dynamic imports)
- **Current State:** The `src/cli/` subsystem has 10 source files (plus tests) providing:
  - `CommandDefinitionRegistry`: JSON-based command definitions with flag/subcommand validation
  - `CommandDefinitionLoader`: Loads command YAML/JSON definition files
  - `StateEngine`: Permission/prerequisite checking
  - `CommandExerciseGenerator`: Generates practice exercises from definitions
  - `explainCommand`: Generates detailed command explanations
  - `formatters`: ANSI formatting utilities for help output

  It integrates into the app in exactly 3 places:
  1. **`BaseSimulator.ts`** (lines 18-26): Imports `CommandDefinitionRegistry`, `StateEngine`, and formatter functions. Provides `initializeDefinitionRegistry()`, `validateFlagsWithRegistry()`, `validateSubcommandWithRegistry()`, `getHelpFromRegistry()`, `getFlagHelpFromRegistry()`, and `checkStatePrerequisites()` methods. These are available to all 19 simulators but it is unclear how many actually call `initializeDefinitionRegistry()`.
  2. **`Terminal.tsx`** (lines 384-401): Dynamic `import("@/cli")` for the `explain-json` command.
  3. **`Terminal.tsx`** (lines 410-451): Dynamic `import("@/cli")` for the `practice` command.

- **Issue:** The CLI subsystem was designed to be a comprehensive replacement for hardcoded command metadata, but its adoption is incomplete. The JSON definition files exist but many simulators likely still rely on hardcoded help text rather than calling `getHelpFromRegistry()`. The `StateEngine` prerequisite checking is available but the comment at `StateEngine.ts:93` says "Future: Check state prerequisites" -- it currently only checks root permissions. The system is architecturally sound but under-utilized.
- **Recommendation:**
  1. Audit which simulators actually call `initializeDefinitionRegistry()` in their constructors.
  2. If most simulators don't use it, consider making it opt-in at the command routing level rather than per-simulator.
  3. Complete the `StateEngine` prerequisite checking implementation.
  4. Create a migration plan to move remaining hardcoded help text to JSON definitions.

---

### 8. Dead Code: commandRegistry.ts and Partial Dead Code in Other Files

- **Severity:** High
- **File(s):**
  - `src/utils/commandRegistry.ts` (lines 1-362) -- **Entirely dead code**
  - `src/types/commands.ts` (line 86) -- Dead re-export
  - `src/types/commands.ts` (lines 60-66) -- Deprecated `Command` interface, marked with `@deprecated`
- **Current State:**
  1. **`src/utils/commandRegistry.ts`**: 362 lines of a `CommandRegistry` singleton class with `register()`, `resolve()`, `search()`, `getSuggestions()`, `generateHelp()`, and `getCommandsByCategory()` methods. No file in the codebase imports or uses this class. It was designed to replace the Terminal.tsx switch statement but was never wired up. The only reference is a type re-export: `export type { CommandDescriptor, CommandCategory } from '@/utils/commandRegistry';` in `src/types/commands.ts`.
  2. **`Command` interface** in `src/types/commands.ts` (lines 60-66): Marked as `@deprecated` in favor of `BaseSimulator`. A grep confirms it is not used in any component or simulator implementation.
  3. **Exported functions not used externally:** `debugParsedCommand` in `src/utils/commandParser.ts` (line 337) and `toLegacyArgs` in `src/utils/commandParser.ts` (line 330) appear to be unused outside tests.
- **Issue:** 362 lines of dead production code, a deprecated interface still present, and unused parser utility exports. Dead code increases cognitive load and maintenance burden.
- **Recommendation:**
  1. Delete `src/utils/commandRegistry.ts`.
  2. Remove the re-export from `src/types/commands.ts:86`.
  3. Remove the deprecated `Command` interface from `src/types/commands.ts:60-66` after confirming no external consumers.
  4. Mark `debugParsedCommand` and `toLegacyArgs` as `@internal` or remove if only used in tests.

---

### 9. learningProgressStore vs learningStore: Overlapping but Distinct Purposes

- **Severity:** High
- **File(s):**
  - `src/store/learningProgressStore.ts` (lines 1-491)
  - `src/store/learningStore.ts` (lines 1-438)
- **Current State:** These two stores track related but different facets of learning:

  | Aspect                   | `learningProgressStore`                                                                | `learningStore`                                                 |
  | ------------------------ | -------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
  | **localStorage key**     | `ncp-aii-learning-progress-v2`                                                         | `ncp-aii-learning-progress`                                     |
  | **Tool/Family tracking** | `toolsUsed` (by family ID)                                                             | Not tracked                                                     |
  | **Command proficiency**  | Not tracked                                                                            | `commandProficiency` (per-command mastery)                      |
  | **Quiz scores**          | `familyQuizScores` (per family)                                                        | Not tracked                                                     |
  | **Domain progress**      | `tierProgress` (tier completion counts)                                                | `domainProgress` (questions, labs, study time)                  |
  | **Spaced repetition**    | `reviewSchedule`, `getDueReviews()`                                                    | Not tracked                                                     |
  | **Exam history**         | `gauntletAttempts` (gauntlet only)                                                     | `examAttempts` (full ExamBreakdown)                             |
  | **Session tracking**     | Not tracked                                                                            | `sessionHistory`, `activeSession`                               |
  | **Study streaks**        | Not tracked                                                                            | `currentStreak`, `longestStreak`                                |
  | **Tier unlocking**       | `unlockedTiers`, `explanationGateResults`                                              | Not tracked                                                     |
  | **Readiness score**      | Not tracked                                                                            | `getReadinessScore()`                                           |
  | **Used by**              | App.tsx, LabWorkspace, LearningPaths, ExamGauntlet, SpacedReviewDrill, simulationStore | LearningPaths, StudyDashboard, StudyModes, PerformanceBenchmark |

  The stores have confusingly similar names and overlapping localStorage key names (`ncp-aii-learning-progress` vs `ncp-aii-learning-progress-v2`). Both track exam attempts but in different shapes. Both have `resetProgress()` methods.

  Additionally, `LearningPaths.tsx` imports BOTH stores (line 23: `useLearningStore`, line 24: `useLearningProgressStore`) and manually manages its own progress in localStorage with a THIRD key set (`ncp-aii-completed-lessons`, `ncp-aii-completed-modules`, `ncp-aii-lesson-progress`) via `useState` + `useDebouncedStorage` (lines 88-123).

- **Issue:** Learning progress is fragmented across 3 separate persistence mechanisms:
  1. `learningProgressStore` (Zustand + persist)
  2. `learningStore` (Zustand + persist)
  3. `LearningPaths.tsx` local state + raw `localStorage` calls

  This creates confusion about which store to use for new features, risks data inconsistency, and makes it impossible to get a unified view of learner progress.

- **Recommendation:**
  1. **Short-term:** Document which store owns which concerns. Add header comments clarifying: `learningProgressStore` owns tier/family/quiz/spaced-rep data; `learningStore` owns session/streak/domain/proficiency data.
  2. **Medium-term:** Merge `learningStore` into `learningProgressStore` since the latter is the newer store (v2 key suffix) and has broader adoption.
  3. **Long-term:** Migrate the 3 raw localStorage keys used by `LearningPaths.tsx` into the unified store.

---

### 10. stateManager.ts is Used but Marginally

- **Severity:** Low
- **File(s):**
  - `src/store/stateManager.ts` (lines 1-323)
  - `src/utils/scenarioLoader.ts` (lines 226-229)
  - `src/components/StateManagementPanel.tsx` (lines 13, 31, 38, 51, 61, 67, 72)
- **Current State:** `stateManager.ts` is a 323-line singleton class (`StateManager`) that provides snapshot/restore functionality for cluster state. It is imported and used in exactly 2 files:
  1. `src/utils/scenarioLoader.ts` (lines 226-229): Dynamic import, calls `stateManager.snapshotBeforeScenario(scenarioId)` when initializing a scenario.
  2. `src/components/StateManagementPanel.tsx`: Used extensively for the state management UI (create/restore/delete snapshots, create baseline, etc.).

  The `StateManagementPanel` is rendered inside `StateManagementTab`, which is rendered when `currentView === "state"` in App.tsx.

- **Issue:** The `stateManager` overlaps with `scenarioContext.ts` in purpose. Both aim to provide isolated state for scenarios:
  - `ScenarioContext` (used by Terminal.tsx, scenarioContextManager): Creates isolated `structuredClone` copies of cluster state per scenario, tracks mutations, can apply changes back.
  - `StateManager`: Creates snapshots stored in localStorage, provides restore points.

  Both systems coexist but serve slightly different use cases: `ScenarioContext` is for runtime isolation during command execution, while `StateManager` is for user-facing save/restore functionality. The overlap is acceptable but should be documented.

- **Recommendation:**
  1. `stateManager.ts` is NOT orphaned; it is actively used.
  2. Add a header comment to `stateManager.ts` explaining its relationship to `scenarioContext.ts`.
  3. Consider whether `stateManager.restoreAfterScenario()` (line 213) should integrate with `scenarioContextManager.deleteContext()` for cleanup.

---

### 11. LabWorkspace.tsx Contains Embedded Media Query Hook and Utility Functions

- **Severity:** Low
- **File(s):** `src/components/LabWorkspace.tsx` (lines 37-51, 54-68, 71-91)
- **Current State:** LabWorkspace.tsx (1020 lines) contains:
  1. `useMediaQuery` hook (lines 37-51): A generic media query hook that should be in `src/hooks/`.
  2. `getTierBadgeInfo` function (lines 54-68): A pure utility function.
  3. `getUnlockRequirementMessage` function (lines 71-91): A pure utility function with hardcoded family names.
- **Issue:** These are reusable utilities embedded in a component file. `useMediaQuery` is generic and could be used elsewhere. The family name mapping in `getUnlockRequirementMessage` duplicates data that exists in `commandFamilies.json`.
- **Recommendation:**
  1. Move `useMediaQuery` to `src/hooks/useMediaQuery.ts`.
  2. Move `getTierBadgeInfo` and `getUnlockRequirementMessage` to a utility file or a shared constants file.
  3. Use `commandFamilies.json` data instead of hardcoded family names.

---

### 12. Duplicated Levenshtein Distance Implementation

- **Severity:** Medium
- **File(s):**
  - `src/simulators/CommandInterceptor.ts` (lines 33-58)
  - `src/cli/CommandDefinitionRegistry.ts` (lines 305-330)
- **Current State:** Both files contain independent implementations of the Levenshtein distance algorithm. The implementations are algorithmically identical (standard dynamic programming approach) but written independently.
- **Issue:** Violated DRY principle. If a bug is found in one implementation, the other may not be fixed. Both are used for "Did you mean?" suggestions in command validation.
- **Recommendation:** Extract Levenshtein distance into `src/utils/stringDistance.ts` and import it in both locations.

---

### 13. simulationStore.ts is a Feature-Rich But Well-Organized Store

- **Severity:** Low (Informational)
- **File(s):** `src/store/simulationStore.ts` (lines 1-628)
- **Current State:** The simulation store is the largest store at 628 lines and manages:
  - Cluster hardware state (GPU, HCA, node health, XID errors, MIG mode, Slurm state)
  - Simulation lifecycle (start/stop/reset/speed)
  - Scenario management (load/complete/exit/progress tracking)
  - Lab panel UI state
  - Validation state and configuration
  - Exam state
  - Visualization navigation
  - Cross-tool state synchronization (GPU allocation/deallocation for jobs)
  - Tool usage tracking (delegates to learningProgressStore)
  - Import/export

  It uses `immer` middleware for immutable state updates and `persist` middleware for localStorage. The `toolFamilyMap` (lines 30-58) duplicates information that could come from `commandFamilies.json`.

- **Issue:** The store is large but each section has a clear purpose. The `toolFamilyMap` hardcoded data (lines 30-58) should reference the `commandFamilies.json` data source. The cross-store call to `learningProgressStore` (line 449) works but creates an implicit coupling.
- **Recommendation:**
  1. Consider splitting into sub-stores if it grows further: `clusterStore`, `scenarioStore`, `examStore`.
  2. Load `toolFamilyMap` from `commandFamilies.json` instead of hardcoding.

---

## Summary Table

| #   | Finding                                                        | Severity | Effort to Fix |
| --- | -------------------------------------------------------------- | -------- | ------------- |
| 1   | App.tsx moderate God object (~340 lines inlined labs view)     | Medium   | Medium        |
| 2   | Duplicate command registries (commandRegistry.ts is dead code) | High     | Low           |
| 3   | Terminal.tsx 784-line switch statement                         | Critical | High          |
| 4   | LearningPaths.tsx 1665 lines with 4 inlined components         | High     | Medium        |
| 5   | Inconsistent simulator routing patterns                        | Medium   | Medium        |
| 6   | No circular dependencies (positive)                            | Low      | N/A           |
| 7   | src/cli/ partially integrated                                  | Medium   | High          |
| 8   | Dead code: commandRegistry.ts (362 lines)                      | High     | Low           |
| 9   | Two overlapping learning stores + raw localStorage             | High     | High          |
| 10  | stateManager.ts is used, not orphaned                          | Low      | Low           |
| 11  | Embedded hooks and utilities in LabWorkspace.tsx               | Low      | Low           |
| 12  | Duplicated Levenshtein distance implementation                 | Medium   | Low           |
| 13  | simulationStore.ts well-organized but large                    | Low      | Medium        |

---

## Prioritized Action Plan

### Phase 1: Quick Wins (Low Effort, High Impact)

1. Delete `src/utils/commandRegistry.ts` and its type re-export (Finding 2, 8)
2. Extract shared Levenshtein distance to `src/utils/stringDistance.ts` (Finding 12)
3. Move `useMediaQuery` to `src/hooks/useMediaQuery.ts` (Finding 11)

### Phase 2: Component Decomposition (Medium Effort)

4. Extract `DomainProgressCards` and `OverallProgressDashboard` from LearningPaths.tsx (Finding 4)
5. Extract Labs & Scenarios view from App.tsx (Finding 1)
6. Collapse redundant Terminal.tsx switch cases for basicSystemSimulator (Finding 5)

### Phase 3: Architectural Refactoring (High Effort)

7. Create CommandRouter to replace Terminal.tsx switch statement (Finding 3)
8. Merge `learningStore` into `learningProgressStore` (Finding 9)
9. Complete `src/cli/` integration across all simulators (Finding 7)
10. Standardize simulator routing to single `execute()` entry point (Finding 5)
