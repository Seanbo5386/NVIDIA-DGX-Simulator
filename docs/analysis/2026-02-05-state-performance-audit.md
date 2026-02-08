# State Management, Data Model & Performance Audit

**Date:** 2026-02-05
**Auditor:** Claude Opus 4.6 (Task 5)
**Scope:** Zustand stores, data models, state interdependencies, performance hotspots, data loading patterns

---

## Executive Summary

The state management layer consists of 4 Zustand stores, 2 singleton class-based state managers, and a debounced storage hook. The architecture has **two overlapping learning stores** (a high-severity design issue), **ExamState uses Map/Set which silently fail with Zustand persist**, and the **relationship JSON files are bundled eagerly but mostly unused at runtime**. The previously flagged Critical #1 (JSON.stringify in hot path) has been **resolved** with a proper `shallowCompare` utility. The previously flagged Critical #4 (localStorage debouncing) has been **partially resolved** -- the hook exists but is not wired into any store.

**Finding Summary:**

- Critical: 2
- High: 4
- Medium: 5
- Low: 3

---

## Findings

### 1. Duplicate/Overlapping Learning Stores

- **Severity:** Critical
- **File(s):**
  - `src/store/learningProgressStore.ts` (entire file)
  - `src/store/learningStore.ts` (entire file)
- **Current State:** Two separate Zustand stores both track learning progress:
  - `useLearningProgressStore` (key: `ncp-aii-learning-progress-v2`) -- tracks tool usage per command family, tier unlock progress, explanation gates, spaced repetition, and gauntlet attempts.
  - `useLearningStore` (key: `ncp-aii-learning-progress`) -- tracks per-command proficiency, per-domain progress, study sessions, streaks, exam attempts, and mastery levels.
    Both are actively imported: `useLearningProgressStore` in 15 files, `useLearningStore` in 9 files.
- **Issue:** These stores have overlapping responsibilities without clear boundaries or synchronization. For example:
  - Both track command usage (`toolsUsed` vs `commandProficiency`)
  - Both track exam/gauntlet data (`gauntletAttempts` vs `examAttempts`)
  - Both have `resetProgress()` actions but no cross-store reset coordination
  - Both persist to localStorage under similar key names, doubling storage consumption
  - A user's "readiness" computed by `learningStore.getReadinessScore()` has no awareness of tier progress from `learningProgressStore`
  - Components like `LearningPaths.tsx` import BOTH stores, leading to fragmented state reads
- **Recommendation:** Merge into a single store or establish a clear facade. `learningProgressStore` handles the tier/family system, while `learningStore` handles the domain/exam system. These should either be unified with a single source of truth, or a coordinator layer should synchronize shared concerns (command tracking, exam history).

---

### 2. ExamState Uses Map/Set with Zustand Persist (Silent Data Loss)

- **Severity:** Critical
- **File(s):** `src/store/simulationStore.ts:489-508`
- **Current State:** The `startExam` action creates an `ExamState` object containing:
  ```typescript
  answers: new Map(),
  flaggedQuestions: new Set(),
  answeredQuestions: new Set(),
  ```
  The `simulationStore` uses `persist` middleware with `partialize` that does NOT include `activeExam`. However, the types (`ExamState` in `src/types/scenarios.ts:315-334`) define these as `Map` and `Set`.
- **Issue:** While `activeExam` is excluded from persistence currently (via `partialize`), the use of `Map` and `Set` in Zustand state is still problematic:
  - Zustand's Immer middleware does not properly track mutations on `Map` and `Set` -- `map.set()` and `set.add()` are called in `submitExamAnswer` (line 503-508) and `startExam`, but Immer support for these depends on `enableMapSet()` being called, which is NOT imported or invoked in this codebase.
  - Without `enableMapSet()`, Immer will silently pass `Map.set()` calls without creating proper drafts, meaning state updates to `answers`, `flaggedQuestions`, and `answeredQuestions` may not trigger re-renders.
  - If persistence scope changes to include `activeExam`, `JSON.stringify` cannot serialize `Map`/`Set`, resulting in empty objects `{}` upon restore.
- **Recommendation:** Either call `enableMapSet()` from Immer at app initialization, or replace `Map`/`Set` with plain objects/arrays (`Record<string, ...>` and `string[]`) which are natively supported by Immer and JSON serialization.

---

### 3. No State Interdependency Enforcement (GPU Temp, Clocks, ECC, MIG, Memory)

- **Severity:** High
- **File(s):**
  - `src/store/simulationStore.ts:204-253` (updateGPU, setMIGMode)
  - `src/utils/metricsSimulator.ts:64-124` (updateGpuMetrics)
- **Current State:** The `metricsSimulator` correctly models some physical correlations:
  - Temperature correlates with utilization (line 81-83)
  - Power draw correlates with utilization (line 86-91)
  - Clock speed reduces with thermal throttling (line 94-98)
    However, the `simulationStore.updateGPU()` action (line 204-213) performs a raw `Object.assign` with NO constraint enforcement.
- **Issue:**
  - **No temperature bounds:** Calling `updateGPU(nodeId, gpuId, { temperature: -50 })` or `{ temperature: 500 }` is accepted. The `state_domains.json` defines min=0, max=120, but this is reference data, not enforced.
  - **No memory bounds:** `updateGPU(nodeId, gpuId, { memoryUsed: 999999 })` is accepted even when `memoryTotal` is 81920 MB.
  - **No GPU count guard:** The cluster factory creates 8 GPUs per node (line 153 of `clusterFactory.ts`), but nothing prevents `addXIDError` from being called with `gpuId: 99`.
  - **ECC errors don't trigger XID errors:** The propagation_rules.json describes that uncorrectable ECC errors should cascade to XID 48 errors, but the metricsSimulator only increments ECC counters (line 100-103) without generating corresponding XID events.
  - **MIG mode change doesn't adjust memory:** `setMIGMode` (line 242-252) clears MIG instances but doesn't adjust `memoryUsed` or validate that the GPU isn't running jobs.
  - **allocateGPUsForJob** (line 264-280) allows allocation even when GPU already has an `allocatedJobId`.
- **Recommendation:** Add a validation layer in `updateGPU` that clamps values to physical bounds. Add a `propagateStateChange` function that enforces the cascade rules defined in `propagation_rules.json`. Guard `allocateGPUsForJob` against double-allocation.

---

### 4. useDebouncedStorage Hook Exists but Is Not Used

- **Severity:** High
- **File(s):**
  - `src/hooks/useDebouncedStorage.ts` (entire file)
  - `src/store/simulationStore.ts:166-167` (persist middleware)
  - `src/store/learningProgressStore.ts:214-215` (persist middleware)
  - `src/store/learningStore.ts:203-204` (persist middleware)
- **Current State:** The `useDebouncedStorage` hook was created to address the Critical #4 finding from a prior analysis. It implements a clean debouncing pattern with a configurable delay. However, a search across the entire `src/` directory shows **zero imports or usages** of this hook.
  All three Zustand stores use `persist` middleware with `createJSONStorage(() => localStorage)` (or the default, which is also localStorage). Zustand's persist middleware writes to localStorage on EVERY state change synchronously.
- **Issue:** The original performance concern -- localStorage writes blocking the main thread during rapid metrics updates -- remains unaddressed. The `simulationStore` persists `cluster` state (which includes all GPU metrics for 8 nodes x 8 GPUs), and this is updated every 1 second via the metrics simulation. Each persist call serializes the full partialized state with `JSON.stringify`. While the `partialize` function limits what is persisted, the `cluster` object (with 64 GPUs, each having NVLink arrays, ECC objects, XID error arrays) is still large.
- **Recommendation:** Either integrate `useDebouncedStorage` as a custom storage adapter for Zustand's persist middleware, or implement a custom `storage` option in the persist config that debounces writes. The current hook's API (React hook) is incompatible with Zustand's storage interface (synchronous get/set), so it would need to be refactored into a class-based adapter.

---

### 5. Eager Loading of 150+ JSON Files in Bundle

- **Severity:** High
- **File(s):** `src/cli/CommandDefinitionLoader.ts:4-6`
- **Current State:** The `CommandDefinitionLoader` uses Vite's glob import with `eager: true`:
  ```typescript
  const commandModules = import.meta.glob("../data/output/**/*.json", {
    eager: true,
  });
  ```
  This recursively matches ALL JSON files under `src/data/output/`, including:
  - ~150+ command definition JSON files (gpu_management, cluster_management, containers, general, etc.)
  - 4 relationship files (state_domains.json, state_matrix.json, propagation_rules.json, consistency_groups.json)
  - 9 scenario relationship files (gpu_thermal_throttle.json, etc.)
  - 1 schema.json
    The `loadAll()` method only filters out `schema.json` and `state_domains.json` by name, but ALL files are still included in the JavaScript bundle due to `eager: true`.
- **Issue:** All ~165+ JSON files are compiled into the JavaScript bundle at build time and loaded into memory on page load, even if the user never uses the CLI features. The relationship/scenario files and the schema file are NOT command definitions and add dead weight. The `state_matrix.json` alone is over 28,000 tokens of content.
- **Recommendation:** Change `eager: true` to `eager: false` for lazy loading, so JSON files are only fetched when `loadAll()` is called. Alternatively, narrow the glob pattern to exclude `relationships/` and `schema.json`, or move non-command-definition files out of the `data/output/` directory tree.

---

### 6. Relationship JSON Files Are Reference Data, Not Runtime-Consumed

- **Severity:** High
- **File(s):**
  - `src/data/output/relationships/state_domains.json`
  - `src/data/output/relationships/state_matrix.json`
  - `src/data/output/relationships/propagation_rules.json`
  - `src/data/output/relationships/consistency_groups.json`
  - `src/data/output/relationships/scenarios/*.json` (9 files)
- **Current State:** These files define a rich state interdependency model:
  - `state_domains.json` -- comprehensive field-level schema for 13 state domains (gpu_state, job_state, node_state, etc.)
  - `propagation_rules.json` -- 16 cascading rules (e.g., GPU thermal throttle -> clock reduction, IB link down -> node drain)
  - `consistency_groups.json` -- 18 consistency groups defining which commands must show coherent data
  - Scenario files -- before/after command output examples for fault scenarios
    These are loaded into the bundle via the eager glob import (Finding #5) but are never consumed by the simulation engine, the metrics simulator, or any store logic. The `CommandDefinitionLoader` filters `state_domains.json` by name but the others (propagation_rules, consistency_groups, scenario files) are silently ignored because they lack a `"command"` field.
- **Issue:** The data represents a well-designed state propagation model that could power realistic fault cascading, but it is currently dead data contributing to bundle size. The simulation engine (`metricsSimulator.ts`) hard-codes its own simplified correlation logic rather than referencing these rules.
- **Recommendation:** Either:
  (a) Move these files outside `src/data/output/` (e.g., to `docs/reference/` or a build-excluded directory) to prevent bundle inclusion, or
  (b) Build a runtime state propagation engine that consumes `propagation_rules.json` and `consistency_groups.json` to enforce realistic cascading behavior -- this would address Finding #3 as well.

---

### 7. Singleton Pattern in scenarioContext.ts and stateManager.ts -- Low Usage

- **Severity:** Medium
- **File(s):**
  - `src/store/scenarioContext.ts:364-452` (ScenarioContextManager singleton)
  - `src/store/stateManager.ts:33-323` (StateManager singleton)
- **Current State:** Both files export singleton class instances:
  - `scenarioContextManager` -- manages isolated cluster state for scenarios
  - `stateManager` -- manages snapshots for state restore
    Import analysis shows minimal usage:
  - `scenarioContextManager` is imported in only 2 files: `Terminal.tsx` and `StateManagementPanel.tsx`
  - `stateManager` is imported in only 2 files: `scenarioLoader.ts` (via dynamic import) and `StateManagementPanel.tsx`
- **Issue:**
  - Singletons persist across React component lifecycles and are not cleaned up on hot module reload (HMR), which can cause stale state during development.
  - `stateManager` stores up to 20 snapshots of the full `ClusterConfig` in memory AND in localStorage via `saveSnapshots()`. Each snapshot includes 8 nodes x 8 GPUs with full NVLink arrays -- this can consume significant localStorage quota.
  - `ScenarioContextManager.contexts` Map is never cleaned up -- contexts accumulate as users navigate between scenarios.
  - Neither singleton is scoped to React's lifecycle, so they can reference stale store state.
- **Recommendation:** Add cleanup logic to `ScenarioContextManager` (e.g., `deleteContext` on scenario exit). Consider reducing `maxSnapshots` from 20 to 5. Consider converting to Zustand stores or React context for proper lifecycle management.

---

### 8. Metrics Simulation Timer Cleanup Is Correct

- **Severity:** Low (Positive Finding)
- **File(s):** `src/hooks/useMetricsSimulation.ts:23-57`
- **Current State:** The `useMetricsSimulation` hook correctly:
  - Creates a `MetricsSimulator` instance via `useRef` (line 21)
  - Starts/stops based on `isRunning` dependency (lines 31-51)
  - Returns a cleanup function that calls `simulator.stop()` (lines 54-56)
  - The `MetricsSimulator.stop()` method properly calls `clearInterval` and sets `intervalId = null` (lines 39-45 of metricsSimulator.ts)
- **Issue:** None -- this is well-implemented. The one minor concern is that `MetricsHistory.startCollection()` (a separate static class) also creates intervals but IS properly cleaned via `stopCollection()`. Component-level interval usage (ExamGauntlet, MetricsChart, NCCLBenchmarkChart, PracticalExams, SpacedReviewDrill, StudyModes) all show proper `return () => clearInterval(...)` patterns in their `useEffect` hooks.
- **Recommendation:** No changes needed. Timer cleanup is consistently implemented across the codebase.

---

### 9. Zustand Correctly Uses Immer Middleware (simulationStore Only)

- **Severity:** Medium
- **File(s):**
  - `src/store/simulationStore.ts:3,167` (uses `immer`)
  - `src/store/learningProgressStore.ts` (does NOT use `immer`)
  - `src/store/learningStore.ts` (does NOT use `immer`)
  - `src/store/tierNotificationStore.ts` (does NOT use `immer`)
- **Current State:** Only `simulationStore` uses Immer middleware (`immer` from `zustand/middleware/immer`). The other three stores use manual immutable update patterns (spread operator).
- **Issue:**
  - Inconsistency in state update patterns across stores. `simulationStore` uses Immer's mutable draft syntax (`state.cluster.nodes.find(...)`), while the learning stores use spread-based immutability (`{ ...state.toolsUsed, [familyId]: [...] }`).
  - The `learningProgressStore` and `learningStore` update patterns are correct but verbose -- Immer would simplify them and reduce the risk of accidental mutations.
  - As noted in Finding #2, `simulationStore` uses `Map` and `Set` with Immer without calling `enableMapSet()`, which is a correctness issue.
- **Recommendation:** Either standardize on Immer across all stores (and add `enableMapSet()` import) or standardize on spread-based immutability. Consistency reduces cognitive load and bug risk.

---

### 10. MetricsHistory Uses Static State (Class-Level, Not Scoped)

- **Severity:** Medium
- **File(s):** `src/utils/metricsHistory.ts:34-37`
- **Current State:** `MetricsHistory` is a static-only class with all state stored as static class properties:
  ```typescript
  private static history: MetricSnapshot[] = [];
  private static maxSamples = 300;
  private static isCollecting = false;
  private static collectionInterval: ReturnType<typeof setInterval> | null = null;
  ```
  At maximum capacity: 300 samples x 64 GPUs (8 nodes x 8 GPUs) = 19,200 `MetricSnapshot` objects in memory.
- **Issue:**
  - Static state survives across React re-renders and HMR, potentially accumulating stale data.
  - The array grows unbounded until `addSnapshot` trims it. Each `MetricSnapshot` has 7 fields -- estimated ~150 bytes per object, so max memory is ~2.8 MB. Not critical, but worth monitoring.
  - `startCollection` has no guard against being called from multiple components simultaneously (it checks `isCollecting` but this is a static boolean, not a reference count).
  - The `history` array is reassigned via `slice()` (line 61: `this.history = this.history.slice(-maxEntries)`), creating GC pressure on every trim.
- **Recommendation:** Consider a ring buffer implementation instead of array slice for the rolling window. Add a reference counting mechanism for `startCollection`/`stopCollection` to prevent premature stops when multiple consumers exist.

---

### 11. simulationStore Persists Full Cluster State (Large localStorage Payload)

- **Severity:** Medium
- **File(s):** `src/store/simulationStore.ts:618-627`
- **Current State:** The `partialize` function persists:
  ```typescript
  partialize: (state) => ({
    cluster: state.cluster,
    simulationSpeed: state.simulationSpeed,
    scenarioProgress: state.scenarioProgress,
    completedScenarios: state.completedScenarios,
  }),
  ```
  The `cluster` object contains 8 nodes, each with 8 GPUs (with NVLink arrays of 12 connections each), 8 HCAs, 2 DPUs, 1 BMC with 12 sensors. This serializes to a large JSON string on every state change.
- **Issue:** With the metrics simulation running at 1Hz and updating GPU metrics per tick, the persist middleware triggers a full `JSON.stringify` of the partialized state every second. The cluster object alone is estimated at 50-100 KB of JSON. While `shallowCompare` prevents unnecessary Zustand updates, the persist middleware still fires on EVERY `set()` call that changes any GPU metric.
- **Recommendation:** Either exclude `cluster` from persistence (it can be recreated from `createDefaultCluster()`) or implement a custom storage adapter with debounced writes (connecting to the unused `useDebouncedStorage` hook concept). Alternatively, only persist cluster state on explicit user actions (save/exit) rather than on every metric tick.

---

### 12. stateManager.ts Stores Full ClusterConfig Snapshots in localStorage

- **Severity:** Medium
- **File(s):** `src/store/stateManager.ts:291-305`
- **Current State:** The `StateManager.saveSnapshots()` method serializes ALL snapshots (up to 20) to localStorage:
  ```typescript
  localStorage.setItem("simulator-snapshots", JSON.stringify(snapshotArray));
  ```
  Each snapshot contains a full `structuredClone` of the `ClusterConfig`. With 20 snapshots x ~100KB each, this can consume ~2MB of localStorage.
- **Issue:**
  - localStorage has a ~5-10 MB limit per origin. Between the 3 Zustand stores and snapshot storage, the app could approach this limit.
  - The `catch` handler (line 299-303) handles `QuotaExceededError` by clearing ALL snapshots, which is a destructive fallback.
  - `saveSnapshots()` is called after every `createSnapshot`, `deleteSnapshot`, and `clearAllSnapshots` -- but NOT debounced.
- **Recommendation:** Reduce `maxSnapshots` from 20 to 5. Consider storing only diff-based snapshots rather than full clones. Add a storage budget calculation before writes.

---

### 13. scenarioContext.ts Mutations Array Grows Unbounded

- **Severity:** Low
- **File(s):** `src/store/scenarioContext.ts:37`
- **Current State:** The `ScenarioContext` class tracks all mutations in an array:
  ```typescript
  private mutations: StateChange[] = [];
  ```
  Every `updateGPU`, `updateNodeHealth`, `addXIDError`, `setMIGMode`, and `setSlurmState` call pushes to this array. The `reset()` method clears it, but there is no cap on size during active use.
- **Issue:** In a long-running scenario with frequent state changes, this array could grow large. Each `StateChange` includes a `data` field with a partial GPU/Node object. In practice, scenarios are short-lived and this is unlikely to be a problem, but there is no defensive limit.
- **Recommendation:** Add a maximum mutation count (e.g., 10,000) with oldest-mutation pruning, or implement periodic compaction.

---

### 14. allocateGPUsForJob Does Not Validate Against Physical Constraints

- **Severity:** Low
- **File(s):** `src/store/simulationStore.ts:264-280`
- **Current State:** The `allocateGPUsForJob` action iterates through GPUs matching the provided `gpuIds` and sets utilization, memory, power, temperature, and `allocatedJobId`.
- **Issue:**
  - No check for `gpu.allocatedJobId` being already set -- double-allocation is silently allowed.
  - No validation that `gpuIds` are within the valid range (0-7 for 8-GPU DGX nodes).
  - `gpu.memoryUsed` is set to `Math.floor(gpu.memoryTotal * (0.7 + Math.random() * 0.2))` which could theoretically produce values slightly above `memoryTotal` due to floating-point arithmetic (0.7 + 0.2 = 0.9, so `floor(81920 * 0.9) = 73728` -- actually safe in this range, but the pattern is fragile).
  - No corresponding Slurm state update -- a node with allocated GPUs should transition to `alloc` state, but this is not automated.
- **Recommendation:** Add guard clauses: check `!gpu.allocatedJobId` before allocation, validate `gpuId < node.gpus.length`, and auto-update `node.slurmState` to `'alloc'` when GPUs are allocated.

---

## Summary Table

| #   | Finding                                    | Severity | Status              |
| --- | ------------------------------------------ | -------- | ------------------- |
| 1   | Duplicate learning stores                  | Critical | Open                |
| 2   | Map/Set in ExamState without enableMapSet  | Critical | Open                |
| 3   | No state interdependency enforcement       | High     | Open                |
| 4   | useDebouncedStorage exists but unused      | High     | Partially Addressed |
| 5   | Eager loading of 150+ JSON files           | High     | Open                |
| 6   | Relationship JSON files are dead data      | High     | Open                |
| 7   | Singleton pattern -- low usage, no cleanup | Medium   | Open                |
| 8   | Timer cleanup is correct                   | Low      | Resolved (Positive) |
| 9   | Inconsistent Immer usage across stores     | Medium   | Open                |
| 10  | MetricsHistory static state, GC pressure   | Medium   | Open                |
| 11  | Full cluster persisted on every tick       | Medium   | Open                |
| 12  | stateManager stores 20 full snapshots      | Medium   | Open                |
| 13  | Unbounded mutations array                  | Low      | Open                |
| 14  | allocateGPUsForJob no validation           | Low      | Open                |

## Prior Audit Cross-Reference

| Prior Finding                                   | Status                  | This Audit Finding                                                                                                                                                                                                    |
| ----------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Critical #1: JSON.stringify in hot metrics path | **RESOLVED**            | `shallowCompare.ts` replaces JSON.stringify with field-level comparison (see `src/utils/shallowCompare.ts`). The `useMetricsSimulation` hook uses `shallowCompareGPU` and `shallowCompareHCAs` to skip no-op updates. |
| Critical #4: localStorage debouncing            | **PARTIALLY ADDRESSED** | The `useDebouncedStorage` hook exists (`src/hooks/useDebouncedStorage.ts`) but has zero imports in the codebase. Zustand persist still writes synchronously on every state change. See Finding #4.                    |
