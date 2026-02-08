# Multi-Node SSH Scenarios Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make 5 existing scenarios require SSH-ing to the correct node before running diagnostic commands, and wire the Dashboard to show sandbox faults so users know which node to investigate.

**Architecture:** Dashboard reads from ScenarioContext when active (200ms poll for mutation reactivity). Scenario autoFaults target the correct node (not dgx-00). ExpectedCommands include `ssh dgx-XX`. No simulator or sandbox architecture changes needed.

**Tech Stack:** React 18, TypeScript, Zustand, xterm.js

---

## Task 1: Wire Dashboard to ScenarioContext

**Files:**

- Modify: `src/components/Dashboard.tsx`
- Create: `src/components/__tests__/Dashboard.scenarioContext.test.ts`

**Step 1: Write the failing test**

```typescript
// Test that Dashboard uses ScenarioContext cluster when active
import { describe, it, expect, vi } from "vitest";
import {
  scenarioContextManager,
  ScenarioContext,
} from "@/store/scenarioContext";

vi.mock("@/store/simulationStore", () => ({
  useSimulationStore: vi.fn((selector?) =>
    selector ? selector(mockState) : mockState,
  ),
}));

describe("Dashboard ScenarioContext integration", () => {
  it("returns scenario cluster when context is active", () => {
    // Create context with a fault
    const ctx = scenarioContextManager.createContext("test");
    scenarioContextManager.setActiveContext("test");
    ctx.updateGPU("dgx-00", 0, { temperature: 95 });

    const cluster = ctx.getCluster();
    expect(cluster.nodes[0].gpus[0].temperature).toBe(95);

    scenarioContextManager.clearAll();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/Dashboard.scenarioContext.test.ts`

**Step 3: Implement Dashboard context-awareness**

In `Dashboard.tsx` (line 412 area), add:

```typescript
import { useMemo, useState, useEffect } from "react";
import { scenarioContextManager } from "@/store/scenarioContext";

// Inside Dashboard component, after line 413:
const [scenarioVersion, setScenarioVersion] = useState(0);

// Poll for scenario context mutations (200ms)
useEffect(() => {
  const interval = setInterval(() => {
    const ctx = scenarioContextManager.getActiveContext();
    if (ctx) {
      setScenarioVersion(ctx.getMutationCount());
    }
  }, 200);
  return () => clearInterval(interval);
}, []);

const effectiveCluster = useMemo(() => {
  const activeContext = scenarioContextManager.getActiveContext();
  return activeContext ? activeContext.getCluster() : cluster;
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [cluster, scenarioVersion]);
```

Then replace all downstream `cluster` usage with `effectiveCluster`:

- Line 451: `const currentNode = effectiveCluster.nodes.find(...)`
- Line 458-462: MetricsHistory callback — leave as-is (reads from store directly for performance)
- Line 706: `<FabricHealthSummary cluster={effectiveCluster} />`
- Line 708: `<InfiniBandMap cluster={effectiveCluster} ...>`

**Step 4: Wire ClusterHealthSummary and NodeSelector**

Both are inline components that read `useSimulationStore` directly. Add the same pattern:

**ClusterHealthSummary** (line 275):

- Add `scenarioContextManager` import
- Add `scenarioVersion` poll state
- Add `effectiveCluster` useMemo
- Replace `cluster` with `effectiveCluster` in all calculations (lines 280-311)

**NodeSelector** (line 197):

- Add `effectiveCluster` using same pattern
- Replace `cluster.nodes.map` (line 248) with `effectiveCluster.nodes.map`
- Keep `selectNode` from store (it updates `selectedNode` globally, which is fine)

**Step 5: Run tests and verify**

Run: `npx vitest run src/components/__tests__/Dashboard.scenarioContext.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/components/Dashboard.tsx src/components/__tests__/Dashboard.scenarioContext.test.ts
git commit -m "feat: wire Dashboard to ScenarioContext for sandbox-aware rendering"
```

---

## Task 2: Retarget domain5-xid-investigation autoFaults and add SSH steps

**Files:**

- Modify: `src/data/narrativeScenarios.json`

**Current state:** Step 2 has `autoFaults` targeting `dgx-00` GPU 2. Steps 1-8 run commands as if on dgx-05 but from dgx-00.

**Changes:**

1. **Step 1** — Add `ssh dgx-05` to expectedCommands (user SSHs to the problem node first):
   - expectedCommands: `["ssh dgx-05", "dmesg | grep -i xid"]`
   - Update hints to include: `"First SSH to the affected node to check its local logs"`

2. **Step 2** — Retarget autoFaults from `dgx-00` to `dgx-05`:
   - Change `"nodeId": "dgx-00"` to `"nodeId": "dgx-05"` in autoFaults
   - expectedCommands stays `["nvidia-smi"]` (user is already on dgx-05)

3. **Steps 3-8** — No changes needed (commands run on current node, which is dgx-05 after SSH)

4. **Step 9** — `scontrol update nodename=dgx-05 state=drain...` runs from any node, no SSH needed. But the user needs to `ssh dgx-00` first (back to admin node) since scontrol runs from controller:
   - expectedCommands: `["scontrol update nodename=dgx-05 state=drain reason='XID 79 PCIe reseat'"]`
   - No change needed — scontrol targets remote nodes

**Step 1: Make the changes**

Edit the scenario JSON for `domain5-xid-investigation`.

**Step 2: Run data tests**

Run: `npx vitest run src/data/__tests__/narrativeScenarios.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add src/data/narrativeScenarios.json
git commit -m "feat: add SSH switching to domain5-xid-investigation scenario"
```

---

## Task 3: Retarget domain4-silent-cluster and add SSH steps

**Files:**

- Modify: `src/data/narrativeScenarios.json`

**Current state:** No autoFaults. Steps 3, 9, 10 reference dgx-04 / GPU 3.

**Changes:**

1. **Step 3** — Add SSH and add autoFaults on dgx-04:
   - expectedCommands: `["ssh dgx-04", "nvidia-smi -q -i 3"]`
   - Add autoFaults: `[{"nodeId": "dgx-04", "gpuId": 3, "type": "ecc-error", "severity": "critical", "parameters": {"singleBit": 150, "doubleBit": 8}}]`
   - Update hints: add `"SSH to dgx-04 to inspect the GPU locally"`

2. **Steps 4-8** — No changes needed (user is on dgx-04, commands run locally)

3. **Step 9** — `scontrol update nodename=dgx-04 state=drain...` — no change (targets remote)

4. **Step 10** — `dcgmi diag -r 3 -i 3` — no change (user is still on dgx-04)

**Step 1: Make the changes**

Edit the scenario JSON for `domain4-silent-cluster`.

**Step 2: Run data tests**

Run: `npx vitest run src/data/__tests__/narrativeScenarios.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add src/data/narrativeScenarios.json
git commit -m "feat: add SSH switching to domain4-silent-cluster scenario"
```

---

## Task 4: Retarget domain4-bandwidth-bottleneck and add SSH steps

**Files:**

- Modify: `src/data/narrativeScenarios.json`

**Current state:** No autoFaults. Steps 4, 7, 8, 10 reference dgx-07.

**Changes:**

1. **Step 4** — Add SSH to dgx-07 for local ibstat:
   - expectedCommands: `["ssh dgx-07", "ibstat"]`
   - Update hints: add `"SSH to dgx-07 to check its local port status"`
   - No autoFaults needed (ibstat output is simulated based on currentNode)

2. **Steps 5-6** — No changes (user is on dgx-07, runs local IB diagnostics)

3. **Step 7** — `squeue -w dgx-07` can run from any node, no change needed

4. **Step 8** — `scontrol update nodename=dgx-07 state=drain...` — no change

5. **Step 10** — `scontrol update nodename=dgx-07 state=resume` — no change

**Step 1: Make the changes**

Edit the scenario JSON for `domain4-bandwidth-bottleneck`.

**Step 2: Run data tests**

Run: `npx vitest run src/data/__tests__/narrativeScenarios.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add src/data/narrativeScenarios.json
git commit -m "feat: add SSH switching to domain4-bandwidth-bottleneck scenario"
```

---

## Task 5: Retarget domain5-network-nightmare and add SSH steps

**Files:**

- Modify: `src/data/narrativeScenarios.json`

**Current state:** Step 3 has autoFaults on `dgx-00` GPU 0 (nvlink-failure). Steps 3-4, 8-9 reference dgx-03.

**Changes:**

1. **Step 3** — Retarget autoFaults and add SSH:
   - expectedCommands: `["ssh dgx-03", "perfquery"]`
   - Change autoFaults `nodeId` from `"dgx-00"` to `"dgx-03"`
   - Update hints: add `"SSH to dgx-03 to check its local error counters"`

2. **Step 4** — User is already on dgx-03:
   - expectedCommands stays: `["perfquery -x"]`

3. **Step 8** — `squeue -w dgx-03` runs from any node, no change

4. **Step 9** — `scontrol update nodename=dgx-03 state=drain...` — no change

**Step 1: Make the changes**

Edit the scenario JSON for `domain5-network-nightmare`.

**Step 2: Run data tests**

Run: `npx vitest run src/data/__tests__/narrativeScenarios.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add src/data/narrativeScenarios.json
git commit -m "feat: add SSH switching to domain5-network-nightmare scenario"
```

---

## Task 6: Retarget domain5-cable-detective and add SSH steps

**Files:**

- Modify: `src/data/narrativeScenarios.json`

**Current state:** Step 2 has autoFaults on `dgx-00` GPU 3 (thermal, 92C). Steps 2-3 reference dgx-05.

**Changes:**

1. **Step 2** — Retarget autoFaults and add SSH:
   - expectedCommands: `["ssh dgx-05", "iblinkinfo"]`
   - Change autoFaults `nodeId` from `"dgx-00"` to `"dgx-05"`
   - Change autoFaults `gpuId` from `3` to `3` (keep — simulates local thermal issue near cable)
   - Update hints: add `"SSH to dgx-05 to examine its link from the local perspective"`

2. **Step 3** — User is on dgx-05:
   - expectedCommands stays: `["ibcableerrors"]`

**Step 1: Make the changes**

Edit the scenario JSON for `domain5-cable-detective`.

**Step 2: Run data tests**

Run: `npx vitest run src/data/__tests__/narrativeScenarios.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add src/data/narrativeScenarios.json
git commit -m "feat: add SSH switching to domain5-cable-detective scenario"
```

---

## Task 7: Verify full test suite and build

**Step 1: TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 2: Lint check**

Run: `npx eslint src/`
Expected: 0 warnings

**Step 3: Full test suite**

Run: `npx vitest run`
Expected: All tests pass (2,280+ tests)

**Step 4: Build**

Run: `npm run build`
Expected: Build succeeds

---

## Dependency Order

```
Task 1 (Dashboard) — independent, do first
Tasks 2-6 (Scenarios) — independent of each other, can be parallel, but each modifies narrativeScenarios.json so do sequentially
Task 7 (Verification) — after all above
```

## Verification

After all tasks:

1. `npx tsc --noEmit` — 0 errors
2. `npm run lint` — 0 warnings
3. `npm run test:run` — all tests pass
4. `npm run build` — succeeds
5. Manual: Start domain5-xid-investigation → Dashboard shows dgx-05 fault → SSH to dgx-05 → nvidia-smi shows XID errors → exit → global state clean
