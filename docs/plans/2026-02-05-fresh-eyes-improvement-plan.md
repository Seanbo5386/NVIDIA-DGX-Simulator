# Fresh Eyes Improvement Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address the highest-impact findings from the 2026-02-05 comprehensive audit across all seven audit dimensions -- architecture, realism, coverage, state management, testing, UX, and performance -- to deliver a more reliable, realistic, and maintainable simulator.

**Architecture:** The plan is organized into three phases: Phase 1 fixes Critical/High bugs and removes dead weight (tasks 1-8), Phase 2 improves simulation realism and state management integrity (tasks 9-16), and Phase 3 tackles structural refactoring and UX polish (tasks 17-24). Each task is self-contained and can be committed independently. Tasks within a phase can generally be done in order, but tasks across phases are independent unless noted.

**Tech Stack:** React 18, TypeScript, Vite, Zustand, TailwindCSS, xterm.js, D3.js, Vitest

---

## Prior Analysis Summary

Seven audit reports were produced on 2026-02-05, plus a prior comprehensive analysis from 2026-02-02. Below are the cross-referenced findings that inform this plan:

| Source                  | Critical | High | Medium | Low |
| ----------------------- | -------- | ---- | ------ | --- |
| Architecture Audit      | 1        | 3    | 2      | 1   |
| Realism Audit           | 3        | 6    | 10     | 7   |
| Coverage Audit          | 1        | 3    | 3      | 2   |
| State/Performance Audit | 2        | 4    | 5      | 3   |
| Testing Audit           | 0        | 5    | 4      | 3   |
| UX/Docs Audit           | 0        | 3    | 6      | 5   |
| Diagnostics Baseline    | 0        | 1    | 2      | 0   |

**Aggregate:** 7 Critical, 25 High, 32 Medium, 21 Low

---

## Phase 1: Critical Fixes and Dead Code Removal (Tasks 1-8)

### Task 1: Fix nvidia-smi -q Driver Version Display Bug

**Priority:** Critical (Realism Audit Finding 1.1)
**Impact:** Students reading `nvidia-smi -q` output see the GPU name where the driver version should be. This is a data-corruption bug that directly misleads certification candidates.

**Files:**

- Modify: `src/simulators/nvidiaSmiSimulator.ts` (around line 1678)

**Step 1: Write the failing test**

Add a test in `src/simulators/__tests__/nvidiaSmiSimulator.test.ts`:

```typescript
it("should display numeric driver version in -q output, not GPU name", () => {
  const result = simulator.execute(
    { command: "nvidia-smi", subcommand: "", flags: { q: true }, args: [] },
    mockContext,
  );
  // Should show a numeric driver version like "535.129.03"
  expect(result.output).toContain("Driver Version");
  expect(result.output).not.toContain("NVIDIA H100 80GB HBM3");
  // The driver version line should contain a numeric version string
  const driverLine = result.output
    .split("\n")
    .find((l) => l.includes("Driver Version"));
  expect(driverLine).toMatch(/Driver Version\s+:\s+\d+\.\d+/);
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/simulators/__tests__/nvidiaSmiSimulator.test.ts --reporter=verbose`
Expected: FAIL -- the output currently shows the GPU name instead of driver version.

**Step 3: Fix the bug**

In `nvidiaSmiSimulator.ts` around line 1678, find the line that reads `${g.name}` in the Driver Version field and replace it with the node's driver version. The node object should have an `nvidiaDriverVersion` field or similar. If no such field exists on the node context, add a sensible default like `"535.129.03"` and map it from the hardware type:

```typescript
// Before (buggy):
// Driver Version                            : ${g.name}

// After (fixed):
// Derive driver version from context or use realistic default
const driverVersion = node?.nvidiaDriverVersion || "535.129.03";
// Driver Version                            : ${driverVersion}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/simulators/__tests__/nvidiaSmiSimulator.test.ts --reporter=verbose`
Expected: PASS

**Step 5: Run full test suite to check for regressions**

Run: `npx vitest run`
Expected: All 2106+ tests pass.

**Step 6: Commit**

```bash
git add src/simulators/nvidiaSmiSimulator.ts src/simulators/__tests__/nvidiaSmiSimulator.test.ts
git commit -m "fix: display numeric driver version in nvidia-smi -q output instead of GPU name"
```

---

### Task 2: Fix nvidia-smi -q Hardcoded "Ampere" Architecture

**Priority:** High (Realism Audit Finding 1.2)
**Impact:** All GPUs incorrectly show "Ampere" architecture regardless of actual type (H100 should show "Hopper", B200 should show "Blackwell").

**Files:**

- Modify: `src/simulators/nvidiaSmiSimulator.ts` (around line 1684)
- Read (for reference): `src/types/hardware.ts` -- to understand the `GPUType` enum

**Step 1: Write the failing test**

```typescript
it("should display correct architecture based on GPU type", () => {
  // Test with H100 context (should be Hopper, not Ampere)
  const result = simulator.execute(
    { command: "nvidia-smi", subcommand: "", flags: { q: true }, args: [] },
    mockH100Context,
  );
  const archLine = result.output
    .split("\n")
    .find((l) => l.includes("Product Architecture"));
  expect(archLine).toContain("Hopper");
  expect(archLine).not.toContain("Ampere");
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/simulators/__tests__/nvidiaSmiSimulator.test.ts --reporter=verbose`
Expected: FAIL -- currently hardcodes "Ampere".

**Step 3: Implement the fix**

Create a mapping function from GPU type to architecture name:

```typescript
function getArchitecture(gpuType: string): string {
  if (
    gpuType.includes("A100") ||
    gpuType.includes("A30") ||
    gpuType.includes("A40")
  )
    return "Ampere";
  if (gpuType.includes("H100") || gpuType.includes("H200")) return "Hopper";
  if (gpuType.includes("B200") || gpuType.includes("GB200")) return "Blackwell";
  return "Ampere"; // Default fallback
}
```

Replace the hardcoded `"Ampere"` with `getArchitecture(g.type)` or `getArchitecture(g.name)`.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/simulators/__tests__/nvidiaSmiSimulator.test.ts --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add src/simulators/nvidiaSmiSimulator.ts src/simulators/__tests__/nvidiaSmiSimulator.test.ts
git commit -m "fix: derive Product Architecture from GPU type instead of hardcoding Ampere"
```

---

### Task 3: Fix nvidia-smi Default View Memory Unit Display

**Priority:** High (Realism Audit Finding 1.3)
**Impact:** Memory values are divided by 1024 before display, showing ~80MiB for an 80GB GPU instead of ~81920MiB. This makes the simulator output unrecognizable to anyone who has used real hardware.

**Files:**

- Modify: `src/simulators/nvidiaSmiSimulator.ts` (around lines 1605-1610)

**Step 1: Write the failing test**

```typescript
it("should display memory in MiB without dividing by 1024", () => {
  const result = simulator.execute(
    { command: "nvidia-smi", subcommand: "", flags: {}, args: [] },
    mockContext,
  );
  // H100 80GB = 81920 MiB total. Should NOT show ~80 MiB.
  expect(result.output).toContain("81920MiB");
  expect(result.output).not.toMatch(/\b80MiB\b/);
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/simulators/__tests__/nvidiaSmiSimulator.test.ts --reporter=verbose`
Expected: FAIL

**Step 3: Fix the bug**

Remove the `/ 1024` division. The GPU interface stores memory values in MB/MiB already:

```typescript
// Before (buggy):
const memUsed = Math.round(gpu.memoryUsed / 1024)
  .toString()
  .padStart(5);
const memTotal = Math.round(gpu.memoryTotal / 1024)
  .toString()
  .padStart(5);

// After (fixed):
const memUsed = Math.round(gpu.memoryUsed).toString().padStart(5);
const memTotal = Math.round(gpu.memoryTotal).toString().padStart(5);
```

**Step 4: Run tests and verify**

Run: `npx vitest run`
Expected: All tests pass. Some existing tests may need updating if they expected the divided values.

**Step 5: Commit**

```bash
git add src/simulators/nvidiaSmiSimulator.ts src/simulators/__tests__/nvidiaSmiSimulator.test.ts
git commit -m "fix: display memory values in MiB without incorrect /1024 division"
```

---

### Task 4: Fix InfiniBand 400 Gb/s Labeled as "HDR" Instead of "NDR"

**Priority:** Critical (Realism Audit Finding 3.1)
**Impact:** Labeling 400 Gb/s as "HDR" (which is actually 200 Gb/s) is a factual error on an exam-testable topic. NCP-AII candidates will memorize the wrong standard name.

**Files:**

- Modify: `src/simulators/infinibandSimulator.ts` (around line 355 and all references)

**Step 1: Write the failing test**

```typescript
it("should label 400 Gb/s links as NDR, not HDR", () => {
  const result = simulator.executeIbdiagnet(
    { command: "ibdiagnet", subcommand: "", flags: {}, args: [] },
    mockContext,
  );
  expect(result.output).not.toContain("400 Gb/s (HDR)");
  expect(result.output).toContain("NDR");
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/simulators/__tests__/infinibandSimulator.test.ts --reporter=verbose`
Expected: FAIL

**Step 3: Fix the InfiniBand speed standard mapping**

Create a helper function and replace all occurrences:

```typescript
function getIBStandardName(rateGbps: number): string {
  if (rateGbps >= 800) return "XDR";
  if (rateGbps >= 400) return "NDR";
  if (rateGbps >= 200) return "HDR";
  if (rateGbps >= 100) return "EDR";
  if (rateGbps >= 56) return "FDR";
  return "QDR";
}
```

Search the file for all occurrences of "HDR" paired with 400 and replace with "NDR". Also search for any other mismatched speed/standard pairs.

**Step 4: Run tests and verify**

Run: `npx vitest run`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/simulators/infinibandSimulator.ts src/simulators/__tests__/infinibandSimulator.test.ts
git commit -m "fix: label 400 Gb/s InfiniBand links as NDR instead of incorrect HDR"
```

---

### Task 5: Delete Dead Code -- commandRegistry.ts

**Priority:** High (Architecture Audit Finding 8)
**Impact:** 362 lines of unused code that increases cognitive load. A developer reading the codebase may waste time understanding a system that is never called.

**Files:**

- Delete: `src/utils/commandRegistry.ts`
- Modify: `src/types/commands.ts` (remove re-export on line 86 and deprecated `Command` interface on lines 60-66)

**Step 1: Verify the file is truly unused**

Search the codebase for any imports of `commandRegistry`:

Run: `grep -r "commandRegistry" src/ --include="*.ts" --include="*.tsx" -l`

Expected: Only `src/types/commands.ts` (the re-export) and possibly test files. No component or utility should import it.

**Step 2: Delete the file and clean up references**

Remove `src/utils/commandRegistry.ts`. In `src/types/commands.ts`, remove the line that re-exports from it (line ~86) and remove the deprecated `Command` interface (lines ~60-66).

**Step 3: Run tests to verify nothing breaks**

Run: `npx vitest run`
Expected: All tests pass. If any test imports from `commandRegistry`, remove those tests too (they test dead code).

**Step 4: Run the build to verify no import errors**

Run: `npm run build`
Expected: Clean build.

**Step 5: Commit**

```bash
git add -u
git commit -m "chore: remove dead commandRegistry.ts (362 lines) and deprecated Command interface"
```

---

### Task 6: Fix Immer Map/Set Support for ExamState

**Priority:** Critical (State/Performance Audit Finding 2)
**Impact:** `Map.set()` and `Set.add()` mutations in Zustand state are not tracked by Immer because `enableMapSet()` is never called. This means exam answer submissions, question flagging, and answered-question tracking may silently fail to trigger re-renders.

**Files:**

- Modify: `src/store/simulationStore.ts` (add `enableMapSet()` call, OR refactor to plain objects)
- Modify: `src/types/scenarios.ts` (if refactoring types)

**Step 1: Decide on approach**

Read `src/store/simulationStore.ts` to understand how `activeExam` state is used. Two options:

- Option A: Add `import { enableMapSet } from 'immer'; enableMapSet();` at the top of the store.
- Option B: Replace `Map<string, ...>` with `Record<string, ...>` and `Set<string>` with `string[]` in both the store and the type definitions.

Option B is safer because it also solves JSON serialization if persistence scope ever changes.

**Step 2: If choosing Option B, write a migration**

Update `ExamState` in `src/types/scenarios.ts`:

```typescript
// Before:
answers: Map<string, number | number[] | string>;
flaggedQuestions: Set<string>;
answeredQuestions: Set<string>;

// After:
answers: Record<string, number | number[] | string>;
flaggedQuestions: string[];
answeredQuestions: string[];
```

Then update all usages in `simulationStore.ts`:

- `new Map()` -> `{}`
- `map.set(key, value)` -> `state.answers[key] = value`
- `map.get(key)` -> `state.answers[key]`
- `new Set()` -> `[]`
- `set.add(value)` -> `[...state.flaggedQuestions, value]` (or push in Immer draft)
- `set.has(value)` -> `state.flaggedQuestions.includes(value)`

**Step 3: Update all consumers**

Search for all files that reference `ExamState`, `answers`, `flaggedQuestions`, or `answeredQuestions` from the exam state and update their Map/Set API calls to use the plain object/array equivalents.

**Step 4: Write tests to verify exam state operations**

```typescript
it("should track answered questions correctly", () => {
  const { submitExamAnswer } = useSimulationStore.getState();
  submitExamAnswer("q001", 2);
  const state = useSimulationStore.getState();
  expect(state.activeExam?.answers["q001"]).toBe(2);
  expect(state.activeExam?.answeredQuestions).toContain("q001");
});
```

**Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass.

**Step 6: Commit**

```bash
git add src/store/simulationStore.ts src/types/scenarios.ts
git commit -m "fix: replace Map/Set with Record/Array in ExamState for Immer compatibility"
```

---

### Task 7: Fix NVLink Topology Matrix Values

**Priority:** Medium (Realism Audit Finding 1.4)
**Impact:** The `nvidia-smi topo -m` output incorrectly differentiates NVLink counts based on GPU index adjacency rather than actual NVSwitch topology. In a DGX A100/H100 with NVSwitch, all GPU pairs should show the same NVLink count.

**Files:**

- Modify: `src/simulators/nvidiaSmiSimulator.ts` (around lines 1354-1361)

**Step 1: Write the failing test**

```typescript
it("should show uniform NVLink count for DGX NVSwitch topology", () => {
  const result = simulator.execute(
    { command: "nvidia-smi", subcommand: "topo", flags: { m: true }, args: [] },
    mockH100Context,
  );
  // In a full NVSwitch DGX H100, all GPU pairs connect via NVSwitch
  // Should show NV18 (H100) or NV12 (A100) for ALL pairs, not mixed NV12/NV6
  const lines = result.output.split("\n").filter((l) => l.startsWith("GPU"));
  for (const line of lines) {
    // Should not contain "NV6" for a full NVSwitch system
    expect(line).not.toContain("NV6");
  }
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/simulators/__tests__/nvidiaSmiSimulator.test.ts --reporter=verbose`
Expected: FAIL

**Step 3: Implement the fix**

Derive the NVLink count from the system type:

- A100 DGX: 12 NVLinks per GPU pair (via NVSwitch) -> "NV12"
- H100 DGX: 18 NVLinks per GPU pair -> "NV18"

For all GPU-to-GPU pairs in a full NVSwitch system, use the same NVLink value (no differentiation by adjacency).

**Step 4: Run tests and verify**

Run: `npx vitest run`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/simulators/nvidiaSmiSimulator.ts src/simulators/__tests__/nvidiaSmiSimulator.test.ts
git commit -m "fix: use uniform NVLink count for all GPU pairs in DGX NVSwitch topology"
```

---

### Task 8: Reduce Main JS Bundle Size (Lazy-Load JSON Definitions)

**Priority:** High (State/Performance Audit Finding 5)
**Impact:** The main JS chunk is 3,747 kB (7.5x the recommended 500 kB limit). 150+ JSON command definition files are eagerly loaded into the bundle via `eager: true`, even if the user never accesses CLI features.

**Files:**

- Modify: `src/cli/CommandDefinitionLoader.ts` (line ~4-6)

**Step 1: Read the current implementation**

Read `src/cli/CommandDefinitionLoader.ts` to understand how the glob import works and how `loadAll()` consumes the data.

**Step 2: Change eager to lazy loading**

```typescript
// Before:
const commandModules = import.meta.glob("../data/output/**/*.json", {
  eager: true,
});

// After:
const commandModules = import.meta.glob("../data/output/**/*.json", {
  eager: false,
});
```

This changes the import from compile-time bundling to lazy dynamic imports. Each JSON file will only be fetched when accessed.

**Step 3: Update loadAll() to await lazy imports**

The `loadAll()` method currently accesses the glob results synchronously. With `eager: false`, each entry becomes a function that returns a `Promise`. Update the method:

```typescript
async loadAll(): Promise<void> {
  const entries = Object.entries(commandModules);
  const results = await Promise.all(
    entries
      .filter(([path]) => !path.includes('schema.json') && !path.includes('state_domains.json'))
      .map(async ([path, loader]) => {
        const mod = await (loader as () => Promise<{ default: unknown }>)();
        return [path, mod.default] as const;
      })
  );
  for (const [path, data] of results) {
    this.processDefinition(path, data);
  }
}
```

**Step 4: Verify all callers of loadAll() already await it**

Search for `loadAll()` calls and ensure they use `await`.

**Step 5: Run tests and build**

Run: `npx vitest run && npm run build`
Expected: Tests pass. Build succeeds. Main chunk size should decrease significantly (by ~1-2MB). Check the build output for the new chunk size.

**Step 6: Commit**

```bash
git add src/cli/CommandDefinitionLoader.ts
git commit -m "perf: lazy-load 150+ JSON command definitions to reduce initial bundle by ~1-2MB"
```

---

## Phase 2: Simulation Realism and State Integrity (Tasks 9-16)

### Task 9: Fix DCGM Health Check Output Format

**Priority:** Medium (Realism Audit Finding 2.2)
**Impact:** Health check output uses a simplified format instead of the bordered table format that real DCGM produces. Students need to recognize the exact output format for the exam.

**Files:**

- Modify: `src/simulators/dcgmiSimulator.ts` (health check output section)
- Read: `src/data/output/gpu_management/dcgmi.json` (for reference format)

**Step 1: Read the reference format from dcgmi.json**

Read the JSON definition file to see the expected bordered table format.

**Step 2: Write a test for the correct format**

```typescript
it("should display health check in bordered table format", () => {
  const result = simulator.execute(
    { command: "dcgmi", subcommand: "health", flags: {}, args: ["check"] },
    mockContext,
  );
  expect(result.output).toContain("+---"); // Bordered table markers
  expect(result.output).toContain("| System");
  expect(result.output).toContain("| Status");
});
```

**Step 3: Run test to verify it fails**

Run: `npx vitest run src/simulators/__tests__/dcgmiSimulator.test.ts --reporter=verbose`

**Step 4: Update the health check formatter to produce bordered tables**

Match the format:

```
Health Monitor Report
+------------+----------+
| System     | Status   |
+------------+----------+
| PCIe       | Healthy  |
| Memory     | Healthy  |
| ...        | ...      |
+------------+----------+
```

**Step 5: Run tests and verify**

Run: `npx vitest run`
Expected: All tests pass.

**Step 6: Commit**

```bash
git add src/simulators/dcgmiSimulator.ts src/simulators/__tests__/dcgmiSimulator.test.ts
git commit -m "fix: use bordered table format for dcgmi health check output"
```

---

### Task 10: Add State Boundary Validation to simulationStore.updateGPU()

**Priority:** High (State/Performance Audit Finding 3)
**Impact:** The simulation accepts physically impossible values (negative temperatures, memory exceeding physical limits, GPU IDs beyond 8). This can produce nonsensical simulator output.

**Files:**

- Modify: `src/store/simulationStore.ts` (updateGPU action, around line 204-213)
- Read: `src/data/output/relationships/state_domains.json` (for reference bounds)

**Step 1: Write failing tests for boundary violations**

Create `src/store/__tests__/simulationStore.boundaries.test.ts`:

```typescript
describe("GPU state boundary validation", () => {
  it("should clamp temperature to 0-120 range", () => {
    updateGPU(nodeId, 0, { temperature: -50 });
    expect(getGPU(nodeId, 0).temperature).toBeGreaterThanOrEqual(0);

    updateGPU(nodeId, 0, { temperature: 500 });
    expect(getGPU(nodeId, 0).temperature).toBeLessThanOrEqual(120);
  });

  it("should clamp memoryUsed to 0-memoryTotal range", () => {
    updateGPU(nodeId, 0, { memoryUsed: 999999 });
    const gpu = getGPU(nodeId, 0);
    expect(gpu.memoryUsed).toBeLessThanOrEqual(gpu.memoryTotal);
  });

  it("should reject invalid GPU IDs", () => {
    // GPU ID 99 does not exist in an 8-GPU system
    expect(() => updateGPU(nodeId, 99, { temperature: 50 })).not.toThrow();
    // Should be a no-op or log a warning, not create a ghost GPU
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/__tests__/simulationStore.boundaries.test.ts --reporter=verbose`
Expected: FAIL (values currently accepted without clamping)

**Step 3: Add validation to updateGPU**

```typescript
updateGPU: (nodeId, gpuId, updates) =>
  set((state) => {
    const node = state.cluster.nodes.find(n => n.id === nodeId);
    if (!node) return state;
    if (gpuId < 0 || gpuId >= node.gpus.length) return state;
    const gpu = node.gpus[gpuId];

    // Clamp values to physical bounds
    if (updates.temperature !== undefined) {
      updates.temperature = Math.max(0, Math.min(120, updates.temperature));
    }
    if (updates.memoryUsed !== undefined) {
      updates.memoryUsed = Math.max(0, Math.min(gpu.memoryTotal, updates.memoryUsed));
    }
    if (updates.utilization !== undefined) {
      updates.utilization = Math.max(0, Math.min(100, updates.utilization));
    }
    if (updates.powerDraw !== undefined) {
      updates.powerDraw = Math.max(0, Math.min(gpu.powerLimit * 1.1, updates.powerDraw));
    }

    Object.assign(gpu, updates);
    return state;
  }),
```

**Step 4: Run tests and verify**

Run: `npx vitest run`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/store/simulationStore.ts src/store/__tests__/simulationStore.boundaries.test.ts
git commit -m "feat: add boundary validation to updateGPU to prevent physically impossible states"
```

---

### Task 11: Fix Power Max Limit Calculation for SXM Form Factors

**Priority:** Low (Realism Audit Finding 1.5)
**Impact:** Max power limit shows 770W for H100 SXM (700W \* 1.1), but the real hardware max is 700W (TDP = max for SXM modules).

**Files:**

- Modify: `src/simulators/nvidiaSmiSimulator.ts` (around line 981)

**Step 1: Write a test**

```typescript
it("should not exceed hardware TDP for max power limit on SXM GPUs", () => {
  const result = simulator.execute(
    { command: "nvidia-smi", subcommand: "", flags: { q: true }, args: [] },
    mockH100SXMContext,
  );
  // H100 SXM max power = 700W, should NOT show 770W
  expect(result.output).not.toContain("770");
  const maxPowerLine = result.output
    .split("\n")
    .find((l) => l.includes("Max Power Limit"));
  if (maxPowerLine) {
    const value = parseFloat(maxPowerLine.match(/(\d+\.?\d*)/)?.[1] || "0");
    expect(value).toBeLessThanOrEqual(700);
  }
});
```

**Step 2: Fix the calculation**

```typescript
// Before:
const maxPowerLimit = powerLimit * 1.1;

// After: For SXM form factor, max = TDP. For PCIe, allow slight headroom.
const isSXM = gpuType.includes("SXM");
const maxPowerLimit = isSXM ? powerLimit : powerLimit * 1.05;
const minPowerLimit = powerLimit * 0.3; // Realistic minimum
```

**Step 3: Run tests and commit**

Run: `npx vitest run`

```bash
git add src/simulators/nvidiaSmiSimulator.ts src/simulators/__tests__/nvidiaSmiSimulator.test.ts
git commit -m "fix: use hardware-accurate max power limits for SXM form factors"
```

---

### Task 12: Wire Up useDebouncedStorage for Zustand Persist

**Priority:** High (State/Performance Audit Finding 4)
**Impact:** All 3 Zustand stores with persist middleware write to localStorage synchronously on every state change. The metrics simulation updates every 1 second, triggering JSON.stringify on the full cluster state (8 nodes x 8 GPUs). The `useDebouncedStorage` hook was created to address this but is never used.

**Files:**

- Read: `src/hooks/useDebouncedStorage.ts` (understand current API)
- Modify: `src/store/simulationStore.ts` (integrate debounced storage)
- Potentially modify: `src/store/learningProgressStore.ts`, `src/store/learningStore.ts`

**Step 1: Read the existing hook to understand its API**

Read `src/hooks/useDebouncedStorage.ts`.

**Step 2: Create a Zustand-compatible debounced storage adapter**

The existing hook is a React hook (uses `useState`, `useEffect`), which is incompatible with Zustand's `persist` middleware `storage` option (expects a synchronous get/set interface). Create a new utility:

```typescript
// src/utils/debouncedStorage.ts
export function createDebouncedStorage(delay = 1000): StateStorage {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingValue: string | null = null;

  return {
    getItem: (name: string) => localStorage.getItem(name),
    setItem: (name: string, value: string) => {
      pendingValue = value;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        localStorage.setItem(name, pendingValue!);
        pendingValue = null;
        timeoutId = null;
      }, delay);
    },
    removeItem: (name: string) => localStorage.removeItem(name),
  };
}
```

**Step 3: Integrate into simulationStore**

```typescript
import { createDebouncedStorage } from '../utils/debouncedStorage';

// In persist config:
persist(
  (set, get) => ({ ... }),
  {
    name: 'ncp-aii-simulation',
    storage: createJSONStorage(() => createDebouncedStorage(2000)),
    partialize: (state) => ({ cluster: state.cluster }),
  }
)
```

**Step 4: Write tests for the debounced storage**

Test that rapid sequential writes only produce one localStorage.setItem call (after the debounce period).

**Step 5: Run tests and commit**

```bash
git add src/utils/debouncedStorage.ts src/store/simulationStore.ts
git commit -m "perf: integrate debounced localStorage writes for simulationStore (2s delay)"
```

---

### Task 13: Merge Duplicate Levenshtein Distance Implementations

**Priority:** Medium (Architecture Audit Finding 2)
**Impact:** The same algorithm is implemented identically in two files -- `CommandInterceptor.ts` (lines 33-58) and `CommandDefinitionRegistry.ts` (lines 305-330). Bug fixes or improvements must be applied twice.

**Files:**

- Create: `src/utils/stringDistance.ts`
- Modify: `src/simulators/CommandInterceptor.ts` (import shared function)
- Modify: `src/cli/CommandDefinitionRegistry.ts` (import shared function)

**Step 1: Write the test for the shared utility**

```typescript
// src/utils/__tests__/stringDistance.test.ts
import { levenshteinDistance, findSimilar } from "../stringDistance";

describe("levenshteinDistance", () => {
  it("should return 0 for identical strings", () => {
    expect(levenshteinDistance("nvidia-smi", "nvidia-smi")).toBe(0);
  });
  it("should return correct distance for single edit", () => {
    expect(levenshteinDistance("nvidia-smi", "nvidia-sm")).toBe(1);
  });
  it("should find similar commands", () => {
    const candidates = ["nvidia-smi", "ibstat", "dcgmi", "sinfo"];
    const results = findSimilar("nvdia-smi", candidates, 0.6);
    expect(results).toContain("nvidia-smi");
  });
});
```

**Step 2: Extract the shared utility**

Move the Levenshtein distance function and "find similar" logic into `src/utils/stringDistance.ts`.

**Step 3: Update both consumers to import from the shared utility**

Replace the inline implementations in `CommandInterceptor.ts` and `CommandDefinitionRegistry.ts` with imports.

**Step 4: Run tests**

Run: `npx vitest run`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/utils/stringDistance.ts src/utils/__tests__/stringDistance.test.ts src/simulators/CommandInterceptor.ts src/cli/CommandDefinitionRegistry.ts
git commit -m "refactor: extract shared Levenshtein distance utility from two duplicate implementations"
```

---

### Task 14: Fix Port GUID Format Inconsistency in InfiniBand Output

**Priority:** Low (Realism Audit Finding 3.2)
**Impact:** Some InfiniBand commands show GUIDs with `0x` prefix, others without. Real ibstat is consistent.

**Files:**

- Modify: `src/simulators/infinibandSimulator.ts`

**Step 1: Search for GUID formatting in the file**

Find all locations where GUIDs are generated or displayed. Ensure they all use the `0x` prefix consistently.

**Step 2: Write a test**

```typescript
it("should display all GUIDs with 0x prefix", () => {
  const result = simulator.executeIbstat(
    { command: "ibstat", subcommand: "", flags: {}, args: [] },
    mockContext,
  );
  const guidLines = result.output.split("\n").filter((l) => l.includes("GUID"));
  for (const line of guidLines) {
    expect(line).toMatch(/0x[0-9a-f]{16}/i);
  }
});
```

**Step 3: Fix inconsistent formatting**

Ensure all GUID outputs use the format `0x${guid}`.

**Step 4: Run tests and commit**

```bash
git add src/simulators/infinibandSimulator.ts src/simulators/__tests__/infinibandSimulator.test.ts
git commit -m "fix: ensure consistent 0x prefix on all InfiniBand GUID displays"
```

---

### Task 15: Add Missing Tests for High-Risk Untested Files (Part 1: Terminal-Adjacent)

**Priority:** High (Testing Audit)
**Impact:** `CommandInterceptor.ts` (fuzzy matching and flag validation) has zero tests. `clusterFactory.ts` (creates all simulation state) has zero tests. `metricsSimulator.ts` (drives the real-time simulation) has zero tests. These are critical infrastructure files.

**Files:**

- Create: `src/simulators/__tests__/CommandInterceptor.test.ts`
- Create: `src/utils/__tests__/clusterFactory.test.ts`
- Create: `src/utils/__tests__/metricsSimulator.test.ts`

**Step 1: Write CommandInterceptor tests**

```typescript
describe('CommandInterceptor', () => {
  it('should accept valid flags', () => { ... });
  it('should suggest corrections for misspelled flags', () => { ... });
  it('should reject completely unknown flags', () => { ... });
  it('should handle empty flag list gracefully', () => { ... });
});
```

**Step 2: Write clusterFactory tests**

```typescript
describe('clusterFactory', () => {
  it('should create a cluster with 8 nodes', () => { ... });
  it('should create 8 GPUs per node', () => { ... });
  it('should set correct memory for H100 GPUs', () => { ... });
  it('should initialize NVLink arrays', () => { ... });
  it('should create InfiniBand ports', () => { ... });
});
```

**Step 3: Write metricsSimulator tests**

```typescript
describe('MetricsSimulator', () => {
  it('should update GPU temperature based on utilization', () => { ... });
  it('should correlate power draw with utilization', () => { ... });
  it('should reduce clock speed during thermal throttling', () => { ... });
  it('should keep values within physical bounds', () => { ... });
});
```

**Step 4: Run all new tests**

Run: `npx vitest run src/simulators/__tests__/CommandInterceptor.test.ts src/utils/__tests__/clusterFactory.test.ts src/utils/__tests__/metricsSimulator.test.ts --reporter=verbose`
Expected: All pass.

**Step 5: Commit**

```bash
git add src/simulators/__tests__/CommandInterceptor.test.ts src/utils/__tests__/clusterFactory.test.ts src/utils/__tests__/metricsSimulator.test.ts
git commit -m "test: add unit tests for CommandInterceptor, clusterFactory, and metricsSimulator"
```

---

### Task 16: Persist WelcomeScreen Dismissal in localStorage

**Priority:** Medium (UX Audit Finding UX-01)
**Impact:** The welcome screen shows on every page load with no way to suppress it. Returning users face unnecessary friction.

**Files:**

- Modify: `src/components/WelcomeScreen.tsx`
- Modify: `src/App.tsx` (where `showWelcome` state is initialized)

**Step 1: Read WelcomeScreen.tsx**

Understand the current dismissal mechanism.

**Step 2: Add localStorage persistence**

```typescript
// In App.tsx:
const [showWelcome, setShowWelcome] = useState(() => {
  return localStorage.getItem("ncp-aii-welcome-dismissed") !== "true";
});

const handleDismissWelcome = useCallback(() => {
  localStorage.setItem("ncp-aii-welcome-dismissed", "true");
  setShowWelcome(false);
}, []);
```

**Step 3: Add a reset option**

In the State Management tab or a settings area, add a button to reset the welcome screen:

```typescript
<button onClick={() => {
  localStorage.removeItem('ncp-aii-welcome-dismissed');
  setShowWelcome(true);
}}>Show Welcome Screen</button>
```

**Step 4: Run tests and verify**

Run: `npx vitest run`

**Step 5: Commit**

```bash
git add src/App.tsx src/components/WelcomeScreen.tsx
git commit -m "feat: persist welcome screen dismissal in localStorage"
```

---

## Phase 3: Structural Refactoring and UX Polish (Tasks 17-24)

### Task 17: Collapse Redundant basicSystemSimulator Cases in Terminal.tsx

**Priority:** Medium (Architecture Audit Finding 5)
**Impact:** 15 commands (`lscpu`, `free`, `dmidecode`, `dmesg`, `systemctl`, `hostnamectl`, `timedatectl`, `lsmod`, `modinfo`, `top`, `ps`, `numactl`, `uptime`, `uname`, `hostname`) each have their own case block in Terminal.tsx that all do the exact same thing: parse the command and delegate to `basicSystemSimulator.execute()`. This adds ~150 lines of pure duplication.

**Files:**

- Modify: `src/components/Terminal.tsx` (around lines 795-948)

**Step 1: Read the current case blocks to confirm they are identical**

Read `src/components/Terminal.tsx` in the range where these commands are handled.

**Step 2: Collapse into a Set-based lookup**

```typescript
const BASIC_SYSTEM_COMMANDS = new Set([
  "lscpu",
  "free",
  "dmidecode",
  "dmesg",
  "systemctl",
  "hostnamectl",
  "timedatectl",
  "lsmod",
  "modinfo",
  "top",
  "ps",
  "numactl",
  "uptime",
  "uname",
  "hostname",
]);

// In the switch statement, before the main cases:
if (BASIC_SYSTEM_COMMANDS.has(command)) {
  const parsed = parseCommand(cmdLine);
  result = basicSystemSimulator.current.execute(parsed, currentContext.current);
  break;
}
```

**Step 3: Run tests**

Run: `npx vitest run`
Expected: All tests pass. No behavioral change.

**Step 4: Commit**

```bash
git add src/components/Terminal.tsx
git commit -m "refactor: collapse 15 identical basicSystemSimulator cases into Set-based lookup (~150 lines removed)"
```

---

### Task 18: Extract Labs & Scenarios Tab Content from App.tsx

**Priority:** Medium (Architecture Audit Finding 1)
**Impact:** ~340 lines of hardcoded JSX domain cards are inlined in App.tsx. Extracting them improves maintainability and testability.

**Files:**

- Create: `src/components/LabsAndScenariosView.tsx`
- Modify: `src/App.tsx` (replace inline JSX with component)

**Step 1: Read App.tsx lines 312-653**

Understand all the props, state, and handlers the Labs tab content needs.

**Step 2: Extract into a new component**

Create `LabsAndScenariosView.tsx` that receives the necessary props:

```typescript
interface LabsAndScenariosViewProps {
  onStartLab: (domain: string) => void;
  onStartExam: () => void;
  onOpenLearningPaths: () => void;
  onOpenStudyDashboard: () => void;
  onOpenExamGauntlet: () => void;
  dueReviewCount: number;
  learningProgress: { completed: number; total: number };
}
```

**Step 3: Replace inline JSX in App.tsx with the component**

```typescript
{currentView === 'labs' && (
  <LabsAndScenariosView
    onStartLab={handleStartLab}
    onStartExam={handleStartExam}
    onOpenLearningPaths={() => setShowLearningPaths(true)}
    onOpenStudyDashboard={() => setShowStudyDashboard(true)}
    onOpenExamGauntlet={() => setShowExamGauntlet(true)}
    dueReviewCount={dueReviewCount}
    learningProgress={learningProgress}
  />
)}
```

**Step 4: Write a basic rendering test for the new component**

**Step 5: Run tests and commit**

```bash
git add src/components/LabsAndScenariosView.tsx src/App.tsx
git commit -m "refactor: extract Labs & Scenarios tab content from App.tsx into dedicated component"
```

---

### Task 19: Extract DomainProgressCards and OverallProgressDashboard from LearningPaths.tsx

**Priority:** Medium (Architecture Audit Finding 4)
**Impact:** LearningPaths.tsx is 1665 lines with multiple components inlined. Extracting the two sub-components reduces cognitive load.

**Files:**

- Create: `src/components/DomainProgressCards.tsx` (extract from LearningPaths.tsx lines ~1339-1471)
- Create: `src/components/OverallProgressDashboard.tsx` (extract from LearningPaths.tsx lines ~1489-1663)
- Modify: `src/components/LearningPaths.tsx` (import and use the extracted components)

**Step 1: Read the sections to extract**

Read LearningPaths.tsx at the identified line ranges.

**Step 2: Extract DomainProgressCards**

Move the component to its own file. Identify and pass required props.

**Step 3: Extract OverallProgressDashboard**

Move the component to its own file.

**Step 4: Move DOMAIN_CONFIG to a data file**

Move the 89-line `DOMAIN_CONFIG` constant to `src/data/domainConfig.ts`.

**Step 5: Update LearningPaths.tsx to import the extracted components**

**Step 6: Run tests**

Run: `npx vitest run src/components/__tests__/LearningPaths*.test.tsx --reporter=verbose`
Expected: All existing tests pass without modification.

**Step 7: Commit**

```bash
git add src/components/DomainProgressCards.tsx src/components/OverallProgressDashboard.tsx src/data/domainConfig.ts src/components/LearningPaths.tsx
git commit -m "refactor: extract DomainProgressCards and OverallProgressDashboard from LearningPaths.tsx"
```

---

### Task 20: Add ARIA Attributes for Tab Navigation

**Priority:** Medium (UX Audit Finding NAV-03)
**Impact:** Navigation tabs lack `role="tablist"` and `role="tab"` ARIA attributes, making the app less accessible to screen reader users.

**Files:**

- Modify: `src/App.tsx` (nav element)

**Step 1: Read the current nav implementation**

Identify the tab buttons in App.tsx.

**Step 2: Add ARIA roles and attributes**

```tsx
<nav role="tablist" aria-label="Main navigation">
  {tabs.map((tab) => (
    <button
      key={tab.id}
      role="tab"
      aria-selected={currentView === tab.id}
      aria-controls={`panel-${tab.id}`}
      id={`tab-${tab.id}`}
      onClick={() => setCurrentView(tab.id)}
    >
      {tab.label}
    </button>
  ))}
</nav>;

{
  /* Each panel: */
}
<div
  role="tabpanel"
  id={`panel-${currentView}`}
  aria-labelledby={`tab-${currentView}`}
>
  {/* content */}
</div>;
```

**Step 3: Write an accessibility test**

```typescript
it('should have proper tab ARIA roles', () => {
  render(<App />);
  const tablist = screen.getByRole('tablist');
  expect(tablist).toBeInTheDocument();
  const tabs = screen.getAllByRole('tab');
  expect(tabs.length).toBeGreaterThanOrEqual(4);
});
```

**Step 4: Run tests and commit**

```bash
git add src/App.tsx
git commit -m "a11y: add ARIA tablist/tab/tabpanel roles to main navigation"
```

---

### Task 21: Add Missing Tests for High-Risk Untested Files (Part 2: Components)

**Priority:** High (Testing Audit)
**Impact:** `Dashboard.tsx`, `SimulatorView.tsx`, and `ErrorBoundary.tsx` have zero tests. These are core UI components.

**Files:**

- Create: `src/components/__tests__/Dashboard.test.tsx`
- Create: `src/components/__tests__/SimulatorView.test.tsx`
- Create: `src/components/__tests__/ErrorBoundary.test.tsx`

**Step 1: Write Dashboard smoke test**

```typescript
it('should render GPU overview cards', () => {
  render(<Dashboard />);
  expect(screen.getByText(/GPU/i)).toBeInTheDocument();
});
```

**Step 2: Write SimulatorView smoke test**

```typescript
it('should render the simulator view with dashboard and terminal', () => {
  render(<SimulatorView />);
  // Verify both panes are rendered
});
```

**Step 3: Write ErrorBoundary test**

```typescript
it('should catch rendering errors and display fallback', () => {
  const ThrowError = () => { throw new Error('Test error'); };
  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );
  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
});
```

**Step 4: Run tests and commit**

```bash
git add src/components/__tests__/Dashboard.test.tsx src/components/__tests__/SimulatorView.test.tsx src/components/__tests__/ErrorBoundary.test.tsx
git commit -m "test: add smoke tests for Dashboard, SimulatorView, and ErrorBoundary components"
```

---

### Task 22: Implement Ctrl+A and Ctrl+E Readline Shortcuts

**Priority:** Medium (UX Audit Finding TERM-01)
**Impact:** These are basic readline shortcuts that experienced terminal users expect. Currently they just play a bell sound.

**Files:**

- Modify: `src/utils/terminalKeyboardHandler.ts`

**Step 1: Read the current keyboard handler**

Find the Ctrl+A and Ctrl+E cases.

**Step 2: Implement cursor movement**

```typescript
case 'a': // Ctrl+A: move cursor to beginning of line
  if (ctrlKey) {
    // Move cursor to position 0 in the current input
    cursorPosition = 0;
    terminal.write(`\r${prompt}${currentInput}`);
    terminal.write(`\r${prompt}`); // Position cursor at start
  }
  break;

case 'e': // Ctrl+E: move cursor to end of line
  if (ctrlKey) {
    cursorPosition = currentInput.length;
    terminal.write(`\r${prompt}${currentInput}`);
  }
  break;
```

**Step 3: Write tests**

Test that Ctrl+A positions cursor at the beginning and Ctrl+E at the end.

**Step 4: Run tests and commit**

```bash
git add src/utils/terminalKeyboardHandler.ts src/utils/__tests__/terminalKeyboardHandler.test.ts
git commit -m "feat: implement Ctrl+A (beginning of line) and Ctrl+E (end of line) readline shortcuts"
```

---

### Task 23: Fix Nested Interactive Elements in Review Badge

**Priority:** Low (UX Audit Finding NAV-04)
**Impact:** A `<button>` is nested inside another `<button>` in the Labs tab badge, which is invalid HTML and problematic for accessibility.

**Files:**

- Modify: `src/App.tsx` (the review notification badge in the Labs tab)

**Step 1: Read the current badge implementation**

Find the nested button pattern.

**Step 2: Convert the inner button to a span or badge element**

If the inner element is purely decorative (badge count), use a `<span>` instead of `<button>`. If it needs to be clickable independently, restructure so the clickable areas are siblings rather than nested.

**Step 3: Run tests and commit**

```bash
git add src/App.tsx
git commit -m "a11y: replace nested button in review badge with non-interactive span element"
```

---

### Task 24: Move Relationship JSON Files Out of the Bundle Path

**Priority:** Medium (State/Performance Audit Finding 6)
**Impact:** 14 relationship/scenario JSON files under `src/data/output/relationships/` are bundled eagerly but never consumed at runtime. They add dead weight to the JavaScript bundle.

**Files:**

- Move: `src/data/output/relationships/` -> `docs/reference/state-relationships/` (or exclude from glob)
- Modify: `src/cli/CommandDefinitionLoader.ts` (update glob pattern to exclude relationships directory)

**Step 1: Check if any code imports from the relationships directory**

Search: `grep -r "relationships" src/ --include="*.ts" --include="*.tsx"`

**Step 2: If no runtime consumers, move the files**

Move the directory to `docs/reference/state-relationships/` where it serves as documentation rather than bundled code.

**Step 3: Alternatively, update the glob pattern**

If moving files is disruptive, update the glob in `CommandDefinitionLoader.ts`:

```typescript
// Before:
const commandModules = import.meta.glob("../data/output/**/*.json", {
  eager: false,
});

// After:
const commandModules = import.meta.glob(
  [
    "../data/output/**/*.json",
    "!../data/output/relationships/**",
    "!../data/output/schema.json",
  ],
  { eager: false },
);
```

**Step 4: Run build and verify bundle size reduction**

Run: `npm run build`
Check that the main chunk decreased.

**Step 5: Commit**

```bash
git add -A
git commit -m "perf: exclude relationship JSON files from bundle (dead data, reference only)"
```

---

## Summary

| Phase     | Tasks  | Focus                                       | Estimated Effort |
| --------- | ------ | ------------------------------------------- | ---------------- |
| Phase 1   | 1-8    | Critical bugs, dead code, bundle size       | ~8-12 hours      |
| Phase 2   | 9-16   | Realism accuracy, state validation, testing | ~10-14 hours     |
| Phase 3   | 17-24  | Refactoring, accessibility, UX polish       | ~8-12 hours      |
| **Total** | **24** |                                             | **~26-38 hours** |

### Top 5 Highest-Impact Improvements

1. **Fix nvidia-smi -q driver version bug** (Task 1) -- Critical realism fix, ~30 min
2. **Fix InfiniBand NDR/HDR mislabel** (Task 4) -- Critical exam accuracy, ~30 min
3. **Fix Map/Set in ExamState** (Task 6) -- Critical data integrity, ~2 hours
4. **Lazy-load JSON definitions** (Task 8) -- High perf, ~2 hours, reduces bundle by ~1-2MB
5. **Add state boundary validation** (Task 10) -- High integrity, prevents nonsensical output

### Execution Notes

- All tasks follow TDD: write failing test -> implement fix -> verify pass -> commit.
- Each task is self-contained with its own commit message.
- Phase 1 should be completed first as it addresses the most impactful issues.
- Tasks within a phase are ordered by priority but can be reordered if needed.
- No task depends on another task within the same phase (they are independent).
- Cross-phase dependencies: Task 8 (lazy-load) should be done before Task 24 (glob pattern) since both modify `CommandDefinitionLoader.ts`.
