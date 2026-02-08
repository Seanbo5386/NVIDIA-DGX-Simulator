# Narrative Scenario Consolidation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the 64 old step-based scenarios with ~28 immersive narrative-driven scenarios covering all NCP-AII exam commands, with a fully redesigned UI experience.

**Architecture:** A `narrativeToScenario()` adapter converts the clean narrative JSON format into the existing `Scenario` type at load time, so the store, progress tracking, and validation systems work unchanged. The UI gets a narrative overlay: mission briefing intro, situation-based step rendering, inline quizzes, and a resolution summary. The old `src/data/scenarios/` directory and scenarioLoader mappings are removed.

**Tech Stack:** React 18, TypeScript, Zustand, Vitest, existing xterm.js terminal

---

## Phase 1: Type System & Adapter (Tasks 1-3)

### Task 1: Define NarrativeScenario TypeScript Types

**Files:**

- Modify: `src/types/scenarios.ts`
- Test: `src/types/__tests__/narrativeTypes.test.ts` (Create)

**Step 1: Add NarrativeScenario and NarrativeStep interfaces to scenarios.ts**

Add after the existing `Scenario` interface (around line 197):

```typescript
// ─── Narrative Scenario Types ───────────────────────────────────

export interface NarrativeScenario {
  id: string;
  domain: 1 | 2 | 3 | 4 | 5;
  title: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  narrative: {
    hook: string;
    setting: string;
    resolution: string;
  };
  commandFamilies: string[];
  estimatedMinutes: number;
  tier?: 1 | 2 | 3;
  faults?: FaultInjectionConfig[];
  steps: NarrativeStep[];
}

export interface NarrativeStep {
  id: string;
  situation: string;
  task: string;
  expectedCommands: string[];
  hints: string[];
  validation: {
    type: "command" | "output" | "state";
    command?: string;
    pattern?: string;
  };
  quiz?: NarrativeQuiz;
}

export interface NarrativeQuiz {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface NarrativeScenariosFile {
  scenarios: NarrativeScenario[];
}
```

**Step 2: Write a type-validation test**

Create `src/types/__tests__/narrativeTypes.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import type {
  NarrativeScenario,
  NarrativeStep,
  NarrativeQuiz,
} from "../scenarios";
import narrativeData from "../../data/narrativeScenarios.json";

describe("NarrativeScenario types", () => {
  const scenarios = narrativeData.scenarios as NarrativeScenario[];

  it("should have valid scenario structure for all scenarios", () => {
    for (const scenario of scenarios) {
      expect(scenario.id).toBeTruthy();
      expect(scenario.domain).toBeGreaterThanOrEqual(1);
      expect(scenario.domain).toBeLessThanOrEqual(5);
      expect(scenario.title).toBeTruthy();
      expect(scenario.narrative.hook).toBeTruthy();
      expect(scenario.narrative.setting).toBeTruthy();
      expect(scenario.narrative.resolution).toBeTruthy();
      expect(scenario.commandFamilies.length).toBeGreaterThan(0);
      expect(scenario.estimatedMinutes).toBeGreaterThan(0);
      expect(scenario.steps.length).toBeGreaterThan(0);
    }
  });

  it("should have valid step structure for all steps", () => {
    for (const scenario of scenarios) {
      for (const step of scenario.steps) {
        expect(step.id).toBeTruthy();
        expect(step.situation).toBeTruthy();
        expect(step.task).toBeTruthy();
        expect(step.expectedCommands.length).toBeGreaterThan(0);
        expect(step.hints.length).toBeGreaterThan(0);
        expect(step.validation.type).toMatch(/^(command|output|state)$/);
      }
    }
  });

  it("should have valid quiz structure when present", () => {
    let quizCount = 0;
    for (const scenario of scenarios) {
      for (const step of scenario.steps) {
        if (step.quiz) {
          quizCount++;
          expect(step.quiz.question).toBeTruthy();
          expect(step.quiz.options.length).toBe(4);
          expect(step.quiz.correctIndex).toBeGreaterThanOrEqual(0);
          expect(step.quiz.correctIndex).toBeLessThan(4);
          expect(step.quiz.explanation).toBeTruthy();
        }
      }
    }
    expect(quizCount).toBeGreaterThan(0);
  });
});
```

**Step 3: Run test to verify**

Run: `npx vitest run src/types/__tests__/narrativeTypes.test.ts`

Note: The existing narrativeScenarios.json does NOT have `expectedCommands` or `difficulty` fields yet. The test will fail — that's expected. We'll fix the JSON in Task 4.

**Step 4: Commit**

```bash
git add src/types/scenarios.ts src/types/__tests__/narrativeTypes.test.ts
git commit -m "feat: add NarrativeScenario TypeScript types"
```

---

### Task 2: Build narrativeToScenario Adapter

**Files:**

- Create: `src/utils/narrativeAdapter.ts`
- Test: `src/utils/__tests__/narrativeAdapter.test.ts` (Create)

**Step 1: Write tests for the adapter**

Create `src/utils/__tests__/narrativeAdapter.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  narrativeToScenario,
  narrativeStepToScenarioStep,
} from "../narrativeAdapter";
import type { NarrativeScenario, NarrativeStep } from "../../types/scenarios";

const mockNarrativeStep: NarrativeStep = {
  id: "step-1",
  situation: "The server rack is humming. BMC LEDs are amber.",
  task: "Use ipmitool to check the System Event Log for hardware alerts.",
  expectedCommands: ["ipmitool sel list", "ipmitool sel elist"],
  hints: ["Try ipmitool sel list", "Look for critical events"],
  validation: { type: "command", command: "ipmitool", pattern: "sel" },
  quiz: {
    question: "What does SEL stand for?",
    options: [
      "System Event Log",
      "Serial Error Log",
      "Sensor Entry List",
      "Server Event Ledger",
    ],
    correctIndex: 0,
    explanation: "SEL = System Event Log, the BMC's hardware event journal.",
  },
};

const mockNarrative: NarrativeScenario = {
  id: "test-scenario",
  domain: 1,
  title: "Test Narrative",
  difficulty: "intermediate",
  narrative: {
    hook: "Something has gone wrong.",
    setting: "You're the on-call engineer.",
    resolution: "You fixed it. Well done.",
  },
  commandFamilies: ["bmc-hardware", "gpu-monitoring"],
  estimatedMinutes: 20,
  steps: [mockNarrativeStep],
};

describe("narrativeToScenario", () => {
  it("should convert domain number to domain string", () => {
    const result = narrativeToScenario(mockNarrative);
    expect(result.domain).toBe("domain1");
  });

  it("should preserve id and title", () => {
    const result = narrativeToScenario(mockNarrative);
    expect(result.id).toBe("test-scenario");
    expect(result.title).toBe("Test Narrative");
  });

  it("should map narrative.setting to description", () => {
    const result = narrativeToScenario(mockNarrative);
    expect(result.description).toBe(mockNarrative.narrative.setting);
  });

  it("should map estimatedMinutes to estimatedTime", () => {
    const result = narrativeToScenario(mockNarrative);
    expect(result.estimatedTime).toBe(20);
  });

  it("should generate learningObjectives from steps", () => {
    const result = narrativeToScenario(mockNarrative);
    expect(result.learningObjectives.length).toBeGreaterThan(0);
  });

  it("should pass through commandFamilies", () => {
    const result = narrativeToScenario(mockNarrative);
    expect(result.commandFamilies).toEqual(["bmc-hardware", "gpu-monitoring"]);
  });

  it("should default faults to empty array", () => {
    const result = narrativeToScenario(mockNarrative);
    expect(result.faults).toEqual([]);
  });

  it("should store narrative metadata on the scenario", () => {
    const result = narrativeToScenario(mockNarrative);
    expect(result.narrative).toBeDefined();
    expect(result.narrative!.hook).toBe("Something has gone wrong.");
  });
});

describe("narrativeStepToScenarioStep", () => {
  it("should use task as title", () => {
    const result = narrativeStepToScenarioStep(mockNarrativeStep);
    expect(result.title).toContain("ipmitool");
  });

  it("should use situation as description", () => {
    const result = narrativeStepToScenarioStep(mockNarrativeStep);
    expect(result.description).toBe(mockNarrativeStep.situation);
  });

  it("should convert task into objectives array", () => {
    const result = narrativeStepToScenarioStep(mockNarrativeStep);
    expect(result.objectives.length).toBeGreaterThan(0);
  });

  it("should pass through expectedCommands", () => {
    const result = narrativeStepToScenarioStep(mockNarrativeStep);
    expect(result.expectedCommands).toEqual([
      "ipmitool sel list",
      "ipmitool sel elist",
    ]);
  });

  it("should pass through hints", () => {
    const result = narrativeStepToScenarioStep(mockNarrativeStep);
    expect(result.hints).toEqual(mockNarrativeStep.hints);
  });

  it("should convert validation to validationRules", () => {
    const result = narrativeStepToScenarioStep(mockNarrativeStep);
    expect(result.validationRules).toBeDefined();
    expect(result.validationRules!.length).toBeGreaterThan(0);
  });

  it("should set estimatedDuration from scenario average", () => {
    const result = narrativeStepToScenarioStep(mockNarrativeStep);
    expect(result.estimatedDuration).toBeGreaterThan(0);
  });

  it("should preserve quiz data in narrativeQuiz field", () => {
    const result = narrativeStepToScenarioStep(mockNarrativeStep);
    expect(result.narrativeQuiz).toBeDefined();
    expect(result.narrativeQuiz!.question).toBe("What does SEL stand for?");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/__tests__/narrativeAdapter.test.ts`
Expected: FAIL (module not found)

**Step 3: Implement the adapter**

Create `src/utils/narrativeAdapter.ts`:

```typescript
import type {
  NarrativeScenario,
  NarrativeStep,
  NarrativeQuiz,
  Scenario,
  ScenarioStep,
  ValidationRule,
  DomainId,
} from "../types/scenarios";

/**
 * Convert a NarrativeScenario to the standard Scenario format
 * used by the store, LabWorkspace, and progress tracking.
 */
export function narrativeToScenario(narrative: NarrativeScenario): Scenario & {
  narrative: NarrativeScenario["narrative"];
} {
  const domainStr = `domain${narrative.domain}` as DomainId;
  const avgStepTime = Math.max(
    1,
    Math.round(narrative.estimatedMinutes / narrative.steps.length),
  );

  return {
    id: narrative.id,
    title: narrative.title,
    domain: domainStr,
    difficulty: narrative.difficulty || "intermediate",
    description: narrative.narrative.setting,
    learningObjectives: extractLearningObjectives(narrative),
    faults: narrative.faults || [],
    steps: narrative.steps.map((step) =>
      narrativeStepToScenarioStep(step, avgStepTime),
    ),
    successCriteria: [`Complete all ${narrative.steps.length} steps`],
    estimatedTime: narrative.estimatedMinutes,
    commandFamilies: narrative.commandFamilies,
    tier: narrative.tier,
    toolHints: narrative.tier === 1,
    tags: [`domain${narrative.domain}`, "narrative"],

    // Preserve narrative metadata for immersive UI
    narrative: narrative.narrative,
  };
}

/**
 * Convert a NarrativeStep to the standard ScenarioStep format.
 */
export function narrativeStepToScenarioStep(
  step: NarrativeStep,
  avgStepTime: number = 3,
): ScenarioStep & { narrativeQuiz?: NarrativeQuiz } {
  return {
    id: step.id,
    title: step.task,
    description: step.situation,
    objectives: [step.task],
    expectedCommands: step.expectedCommands,
    validationRules: convertValidation(step.validation, step.expectedCommands),
    hints: step.hints,
    estimatedDuration: avgStepTime,

    // Preserve quiz for narrative UI
    narrativeQuiz: step.quiz,
  };
}

/**
 * Convert the simple narrative validation to ValidationRule[].
 */
function convertValidation(
  validation: NarrativeStep["validation"],
  expectedCommands: string[],
): ValidationRule[] {
  const rules: ValidationRule[] = [];

  if (validation.type === "command" && validation.command) {
    rules.push({
      type: "command-executed",
      description: `Run ${validation.command}`,
      command: validation.command,
      pattern: validation.pattern,
    });
  }

  // Also add rules for each expected command
  for (const cmd of expectedCommands) {
    const baseCmd = cmd.split(" ")[0];
    if (baseCmd !== validation.command) {
      rules.push({
        type: "command-executed",
        description: `Run ${cmd}`,
        command: baseCmd,
      });
    }
  }

  return rules;
}

/**
 * Extract learning objectives from scenario steps.
 */
function extractLearningObjectives(narrative: NarrativeScenario): string[] {
  // Use unique command families as learning objectives
  const objectives: string[] = [];

  const familyNames: Record<string, string> = {
    "bmc-hardware": "BMC and hardware management with ipmitool",
    "gpu-monitoring": "GPU monitoring with nvidia-smi and DCGM",
    "infiniband-tools": "InfiniBand fabric diagnostics",
    "cluster-tools": "Slurm cluster management",
    "container-tools": "Container orchestration with Docker and Enroot",
    diagnostics: "System diagnostics and troubleshooting",
  };

  for (const family of narrative.commandFamilies) {
    if (familyNames[family]) {
      objectives.push(familyNames[family]);
    }
  }

  return objectives;
}

/**
 * Load all narrative scenarios and convert them.
 */
export async function loadAllNarrativeScenarios(): Promise<Scenario[]> {
  const data = await import("../data/narrativeScenarios.json");
  const narratives = (data as { default: { scenarios: NarrativeScenario[] } })
    .default.scenarios;
  return narratives.map(narrativeToScenario);
}
```

**Step 4: Extend the Scenario type to support narrative metadata**

In `src/types/scenarios.ts`, add to the `Scenario` interface:

```typescript
  // Narrative scenario metadata (present only for narrative scenarios)
  narrative?: {
    hook: string;
    setting: string;
    resolution: string;
  };
```

And add to `ScenarioStep`:

```typescript
  // Narrative quiz (present only for narrative scenario steps)
  narrativeQuiz?: NarrativeQuiz;
```

**Step 5: Run tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/narrativeAdapter.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/utils/narrativeAdapter.ts src/utils/__tests__/narrativeAdapter.test.ts src/types/scenarios.ts
git commit -m "feat: add narrativeToScenario adapter with tests"
```

---

### Task 3: Replace scenarioLoader with Narrative Loader

**Files:**

- Modify: `src/utils/scenarioLoader.ts`
- Modify: `src/App.tsx` (handleStartLab)
- Test: Existing tests should still pass

**Step 1: Rewrite scenarioLoader.ts**

Replace the `loadScenarioFromFile` function and the 53-entry file mapping with:

```typescript
import type { Scenario } from "../types/scenarios";
import type { NarrativeScenariosFile } from "../types/scenarios";
import { narrativeToScenario } from "./narrativeAdapter";

// Cache for loaded scenarios
let scenarioCache: Map<string, Scenario> | null = null;

/**
 * Load all narrative scenarios and build lookup cache.
 */
async function ensureCache(): Promise<Map<string, Scenario>> {
  if (scenarioCache) return scenarioCache;

  const data = await import("../data/narrativeScenarios.json");
  const file = data.default as NarrativeScenariosFile;
  scenarioCache = new Map();

  for (const narrative of file.scenarios) {
    const scenario = narrativeToScenario(narrative);
    scenarioCache.set(scenario.id, scenario);
  }

  return scenarioCache;
}

/**
 * Load a single scenario by ID.
 */
export async function loadScenarioFromFile(
  scenarioId: string,
): Promise<Scenario | null> {
  const cache = await ensureCache();
  return cache.get(scenarioId) || null;
}

/**
 * Get all scenario IDs.
 */
export async function getAllScenarioIds(): Promise<string[]> {
  const cache = await ensureCache();
  return Array.from(cache.keys());
}

/**
 * Get scenarios filtered by domain.
 */
export async function getScenariosByDomain(
  domain: number,
): Promise<Scenario[]> {
  const cache = await ensureCache();
  const domainStr = `domain${domain}`;
  return Array.from(cache.values()).filter((s) => s.domain === domainStr);
}
```

Keep the `initializeScenario`, `applyScenarioFaults`, and state management helper functions unchanged.

**Step 2: Update App.tsx handleStartLab**

The current `handleStartLab` maps domain strings to hardcoded scenario IDs. Update it to load the first scenario for the selected domain dynamically:

```typescript
const handleStartLab = async (scenarioId: string) => {
  const success = await initializeScenario(scenarioId);
  if (success) {
    setCurrentView("simulator");
    setShowLabWorkspace(true);
  }
};
```

The domain-to-scenario mapping moves to LabsAndScenariosView (Task 7).

**Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All pass (existing scenario tests may need updating if they reference old scenario IDs)

**Step 4: Commit**

```bash
git add src/utils/scenarioLoader.ts src/App.tsx
git commit -m "refactor: replace old scenario loader with narrative-based loader"
```

---

## Phase 2: Author Comprehensive Narrative Scenarios (Tasks 4-5)

### Task 4: Update Existing 16 Narratives with Required Fields

**Files:**

- Modify: `src/data/narrativeScenarios.json`
- Test: `src/types/__tests__/narrativeTypes.test.ts`

The existing 16 narratives are missing `expectedCommands` per step and `difficulty`. Update each scenario to include these fields.

**Step 1: Add `difficulty` and `expectedCommands` to all 16 scenarios**

For each scenario, add `difficulty` field at the scenario level and `expectedCommands` array to every step. The `expectedCommands` should list the specific command invocations the user should run.

Example — update step-1 of "domain1-midnight-deployment":

```json
{
  "id": "step-1",
  "situation": "The shipping crates are open. Four pristine DGX H100 nodes sit on the rack rails, power cables ready.",
  "task": "Before powering on, use ipmitool to verify BMC connectivity and check the System Event Log for any shipping damage alerts.",
  "expectedCommands": ["ipmitool sel list", "ipmitool sel elist"],
  "hints": [
    "Use ipmitool to access BMC",
    "Check SEL for hardware events",
    "Look for temperature or vibration alerts"
  ],
  "validation": {
    "type": "command",
    "command": "ipmitool",
    "pattern": "sel|SEL|event"
  }
}
```

Do this for ALL steps in ALL 16 scenarios. Every step must have `expectedCommands` with at least one command.

**Step 2: Run type validation tests**

Run: `npx vitest run src/types/__tests__/narrativeTypes.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add src/data/narrativeScenarios.json
git commit -m "feat: add expectedCommands and difficulty to all 16 narrative scenarios"
```

---

### Task 5: Author Additional Narrative Scenarios to Cover All Exam Commands

**Files:**

- Modify: `src/data/narrativeScenarios.json`

This is the largest content task. Write 12-14 NEW narrative scenarios to achieve full command coverage across all 5 domains, weighted by exam importance.

**Target scenario count by domain:**

| Domain | Exam % | Existing | New | Total | Key Commands to Add                                                                                            |
| ------ | ------ | -------- | --- | ----- | -------------------------------------------------------------------------------------------------------------- |
| 1      | 31%    | 4        | 3   | 7     | systemctl, lspci, mlxconfig, mlxfwmanager, mst, ip, modprobe, efibootmgr                                       |
| 2      | 5%     | 2        | 0   | 2     | (adequate)                                                                                                     |
| 3      | 19%    | 3        | 3   | 6     | sbatch, srun, sacct, kubectl, helm, enroot, lfs, nfsstat, pyxis                                                |
| 4      | 33%    | 4        | 5   | 9     | all_reduce_perf, mpirun, hpl, NCCL env vars, clusterkit, ib_write_bw, ibhosts, ibswitches, dcgmi diag -r 1/2/3 |
| 5      | 12%    | 3        | 1   | 4     | lspci -vv, setpci, mlxlink, mlxcables, ibping, ibtracert, sminfo, ofed_info                                    |

**New scenarios to write:**

**Domain 1 — Platform Bring-Up (3 new):**

1. **"The Fabric Manager Awakening"** — Setting up NVIDIA Fabric Manager on a new DGX cluster. Commands: `systemctl status/start/restart nvidia-fabricmanager`, `journalctl -u nvidia-fabricmanager`, `nvidia-smi`, `lsmod | grep nvidia`, `modprobe nvidia`, `modinfo nvidia`, `dmesg | grep -i nvidia`

2. **"Network Bonding Blues"** — Configuring network bonding and InfiniBand on bring-up. Commands: `ip link show`, `ip addr`, `cat /proc/net/bonding/bond0`, `ibstat`, `mst start`, `mst status`, `mlxconfig -d /dev/mst/mt41686_pciconf0 q`, `mlxfwmanager --query`

3. **"The BIOS Verification"** — UEFI/BIOS settings and firmware validation before first boot. Commands: `dmidecode -t bios`, `dmidecode -t system`, `efibootmgr -v`, `lscpu`, `lspci -tv`, `free -h`, `uname -r`, `cat /proc/driver/nvidia/version`

**Domain 3 — Base Infrastructure (3 new):**

4. **"The Job Scheduler Setup"** — Configuring Slurm from scratch for GPU workloads. Commands: `sinfo -Nel`, `scontrol show config`, `scontrol show partition`, `cat /etc/slurm/gres.conf`, `sbatch --gres=gpu:1`, `squeue`, `sacct -j`, `sacctmgr show assoc`

5. **"Container Orchestration"** — Setting up container infrastructure for AI workloads. Commands: `docker info`, `docker pull nvcr.io/nvidia/pytorch`, `docker run --rm --gpus all`, `enroot import`, `enroot create`, `enroot list`, `srun --container-image`, `ngc config`

6. **"The Storage Architect"** — Configuring and troubleshooting parallel storage. Commands: `lfs df -h`, `lfs check servers`, `lfs getstripe`, `lfs setstripe`, `lctl get_param version`, `nfsstat -c`, `nfsstat -m`, `mount | grep nfs`, `df -hT`, `dd if=/dev/zero`

**Domain 4 — Validation & Testing (5 new):**

7. **"The NCCL Championship"** — Running and optimizing NCCL all-reduce tests across nodes. Commands: `ldconfig -p | grep libnccl`, `all_reduce_perf -b 8 -e 128M`, `mpirun -np 16 -H node1,node2`, `NCCL_DEBUG=INFO`, `NCCL_IB_DISABLE=0`, `NCCL_P2P_DISABLE=0`, `env | grep NCCL`

8. **"Linpack Showdown"** — Running HPL benchmark to validate cluster compute. Commands: `hpl --burn-in`, `cat HPL.dat`, `nvidia-smi dmon`, `dcgmi stats --enable`, `dcgmi stats`, `numactl --hardware`, `mpirun -np 8 ./hpl`

9. **"The Health Inspector"** — Comprehensive DCGM diagnostic sweep. Commands: `dcgmi discovery -l`, `dcgmi discovery -c`, `dcgmi diag -r 1`, `dcgmi diag -r 2`, `dcgmi diag -r 3`, `dcgmi health -c`, `dcgmi group -c`, `dcgmi group -l`, `dcgmi group -a`, `dcgmi dmon`

10. **"Fabric Under Pressure"** — InfiniBand fabric validation and bandwidth testing. Commands: `ibhosts`, `ibswitches`, `ibnetdiscover`, `ibporterrors`, `ibcableerrors`, `ib_write_bw`, `ib_read_bw`, `perfquery -x`, `iblinkinfo -l`, `watch -n 5 ibporterrors`

11. **"The Cluster Certification"** — Full cluster validation using clusterkit and BCM tools. Commands: `clusterkit -v`, `bcm-node list`, `bcm validate pod`, `nvidia-smi -q`, `dcgmi diag -r 3`, `ibdiagnet`, `sinfo -Nel`, `scontrol show node`

**Domain 5 — Troubleshooting (1 new):**

12. **"Cable Detective"** — Diagnosing physical layer and cable issues in InfiniBand fabric. Commands: `ibstat`, `iblinkinfo`, `ibcableerrors`, `mlxlink -d mlx5_0`, `mlxlink --show_eye`, `mlxcables`, `ibping -G`, `ibtracert`, `sminfo`, `ofed_info`, `lspci -vv`, `setpci`

**Each new scenario must follow this structure:**

- 8-12 steps per scenario
- Each step has: `id`, `situation`, `task`, `expectedCommands`, `hints`, `validation`
- 2-4 steps per scenario have a `quiz` object
- Narrative fields: `hook`, `setting`, `resolution`
- `commandFamilies` listing all relevant families
- `difficulty`: beginner for basic operations, intermediate for most, advanced for complex troubleshooting
- `estimatedMinutes`: 15-30 depending on complexity

**Step 1: Write all 12 new scenarios**

Add them to `narrativeScenarios.json` in the `scenarios` array, grouped by domain.

**Step 2: Run validation tests**

Run: `npx vitest run src/types/__tests__/narrativeTypes.test.ts src/data/__tests__/narrativeScenarios.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add src/data/narrativeScenarios.json
git commit -m "feat: add 12 new narrative scenarios for full NCP-AII command coverage"
```

---

## Phase 3: Immersive UI (Tasks 6-10)

### Task 6: Build the NarrativeIntro Component (Mission Briefing)

**Files:**

- Create: `src/components/NarrativeIntro.tsx`
- Test: `src/components/__tests__/NarrativeIntro.test.tsx` (Create)

This component renders when a narrative scenario starts — before the user sees any steps. It shows the story hook, setting, and a "Begin Mission" button.

**Step 1: Write tests**

Create `src/components/__tests__/NarrativeIntro.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NarrativeIntro } from "../NarrativeIntro";

const mockNarrative = {
  hook: "A new cluster has arrived at midnight.",
  setting: "You're the lead engineer on call.",
  resolution: "Successfully bring the cluster online.",
};

describe("NarrativeIntro", () => {
  it("should render the story hook", () => {
    render(<NarrativeIntro narrative={mockNarrative} title="The Midnight Deployment" onBegin={vi.fn()} />);
    expect(screen.getByText(/midnight/i)).toBeInTheDocument();
  });

  it("should render the setting", () => {
    render(<NarrativeIntro narrative={mockNarrative} title="The Midnight Deployment" onBegin={vi.fn()} />);
    expect(screen.getByText(/lead engineer/i)).toBeInTheDocument();
  });

  it("should render Begin Mission button", () => {
    render(<NarrativeIntro narrative={mockNarrative} title="The Midnight Deployment" onBegin={vi.fn()} />);
    expect(screen.getByRole("button", { name: /begin mission/i })).toBeInTheDocument();
  });

  it("should call onBegin when button is clicked", () => {
    const onBegin = vi.fn();
    render(<NarrativeIntro narrative={mockNarrative} title="The Midnight Deployment" onBegin={onBegin} />);
    fireEvent.click(screen.getByRole("button", { name: /begin mission/i }));
    expect(onBegin).toHaveBeenCalledOnce();
  });
});
```

**Step 2: Implement the component**

Create `src/components/NarrativeIntro.tsx`:

```tsx
import { Crosshair } from "lucide-react";

interface NarrativeIntroProps {
  title: string;
  narrative: {
    hook: string;
    setting: string;
    resolution: string;
  };
  onBegin: () => void;
}

export function NarrativeIntro({
  title,
  narrative,
  onBegin,
}: NarrativeIntroProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="max-w-lg">
        {/* Mission icon */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-nvidia-green/20 flex items-center justify-center">
          <Crosshair className="w-8 h-8 text-nvidia-green" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-nvidia-green mb-4">{title}</h2>

        {/* Hook — the attention grabber */}
        <p className="text-lg text-white font-medium mb-6 leading-relaxed italic">
          "{narrative.hook}"
        </p>

        {/* Setting — the context */}
        <p className="text-gray-300 mb-8 leading-relaxed">
          {narrative.setting}
        </p>

        {/* Begin button */}
        <button
          onClick={onBegin}
          className="px-8 py-3 bg-nvidia-green text-black font-bold rounded-lg hover:bg-nvidia-darkgreen transition-colors text-lg"
        >
          Begin Mission
        </button>
      </div>
    </div>
  );
}
```

**Step 3: Run tests**

Run: `npx vitest run src/components/__tests__/NarrativeIntro.test.tsx`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/NarrativeIntro.tsx src/components/__tests__/NarrativeIntro.test.tsx
git commit -m "feat: add NarrativeIntro mission briefing component"
```

---

### Task 7: Build the InlineQuiz Component

**Files:**

- Create: `src/components/InlineQuiz.tsx`
- Test: `src/components/__tests__/InlineQuiz.test.tsx` (Create)

**Step 1: Write tests**

Create `src/components/__tests__/InlineQuiz.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InlineQuiz } from "../InlineQuiz";

const mockQuiz = {
  question: "What does SEL stand for?",
  options: ["System Event Log", "Serial Error Log", "Sensor Entry List", "Server Event Ledger"],
  correctIndex: 0,
  explanation: "SEL = System Event Log.",
};

describe("InlineQuiz", () => {
  it("should render the question", () => {
    render(<InlineQuiz quiz={mockQuiz} onComplete={vi.fn()} />);
    expect(screen.getByText(/what does sel stand for/i)).toBeInTheDocument();
  });

  it("should render all 4 options", () => {
    render(<InlineQuiz quiz={mockQuiz} onComplete={vi.fn()} />);
    expect(screen.getByText("System Event Log")).toBeInTheDocument();
    expect(screen.getByText("Serial Error Log")).toBeInTheDocument();
    expect(screen.getByText("Sensor Entry List")).toBeInTheDocument();
    expect(screen.getByText("Server Event Ledger")).toBeInTheDocument();
  });

  it("should show correct feedback on right answer", () => {
    render(<InlineQuiz quiz={mockQuiz} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByText("System Event Log"));
    expect(screen.getByText(/correct/i)).toBeInTheDocument();
    expect(screen.getByText(/SEL = System Event Log/i)).toBeInTheDocument();
  });

  it("should show incorrect feedback on wrong answer", () => {
    render(<InlineQuiz quiz={mockQuiz} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByText("Serial Error Log"));
    expect(screen.getByText(/not quite/i)).toBeInTheDocument();
  });

  it("should call onComplete with result", () => {
    const onComplete = vi.fn();
    render(<InlineQuiz quiz={mockQuiz} onComplete={onComplete} />);
    fireEvent.click(screen.getByText("System Event Log"));
    expect(onComplete).toHaveBeenCalledWith(true);
  });
});
```

**Step 2: Implement the component**

Create `src/components/InlineQuiz.tsx`:

```tsx
import { useState } from "react";
import type { NarrativeQuiz } from "../types/scenarios";
import { Check, X } from "lucide-react";

interface InlineQuizProps {
  quiz: NarrativeQuiz;
  onComplete: (correct: boolean) => void;
}

export function InlineQuiz({ quiz, onComplete }: InlineQuizProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const isAnswered = selectedIndex !== null;
  const isCorrect = selectedIndex === quiz.correctIndex;

  const handleSelect = (index: number) => {
    if (isAnswered) return;
    setSelectedIndex(index);
    onComplete(index === quiz.correctIndex);
  };

  return (
    <div className="bg-indigo-900/30 border border-indigo-500/40 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-indigo-300 mb-3">
        KNOWLEDGE CHECK
      </h4>
      <p className="text-white font-medium mb-4">{quiz.question}</p>

      <div className="space-y-2">
        {quiz.options.map((option, idx) => {
          const isSelected = selectedIndex === idx;
          const isCorrectOption = idx === quiz.correctIndex;

          let className =
            "w-full text-left p-3 rounded-lg text-sm transition-colors ";
          if (!isAnswered) {
            className +=
              "bg-gray-800 hover:bg-gray-700 text-gray-200 cursor-pointer";
          } else if (isSelected && isCorrect) {
            className +=
              "bg-green-900/50 border border-green-500 text-green-200";
          } else if (isSelected && !isCorrect) {
            className += "bg-red-900/50 border border-red-500 text-red-200";
          } else if (isCorrectOption) {
            className +=
              "bg-green-900/30 border border-green-500/50 text-green-300";
          } else {
            className += "bg-gray-800/50 text-gray-500";
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              className={className}
              disabled={isAnswered}
            >
              <span className="flex items-center gap-2">
                {isAnswered && isCorrectOption && (
                  <Check className="w-4 h-4 text-green-400" />
                )}
                {isAnswered && isSelected && !isCorrect && (
                  <X className="w-4 h-4 text-red-400" />
                )}
                {option}
              </span>
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {isAnswered && (
        <div
          className={`mt-4 p-3 rounded-lg text-sm ${isCorrect ? "bg-green-900/20 text-green-200" : "bg-amber-900/20 text-amber-200"}`}
        >
          <p className="font-semibold mb-1">
            {isCorrect ? "Correct!" : "Not quite."}
          </p>
          <p>{quiz.explanation}</p>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Run tests**

Run: `npx vitest run src/components/__tests__/InlineQuiz.test.tsx`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/InlineQuiz.tsx src/components/__tests__/InlineQuiz.test.tsx
git commit -m "feat: add InlineQuiz component for narrative step quizzes"
```

---

### Task 8: Build the NarrativeResolution Component

**Files:**

- Create: `src/components/NarrativeResolution.tsx`
- Test: `src/components/__tests__/NarrativeResolution.test.tsx` (Create)

This shows when all steps are complete — the narrative resolution, quiz score, and time spent.

**Step 1: Write tests**

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NarrativeResolution } from "../NarrativeResolution";

describe("NarrativeResolution", () => {
  it("should show the resolution text", () => {
    render(
      <NarrativeResolution
        resolution="You saved the cluster."
        quizScore={{ correct: 3, total: 4 }}
        timeSpent={15}
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByText(/saved the cluster/i)).toBeInTheDocument();
  });

  it("should show quiz performance", () => {
    render(
      <NarrativeResolution
        resolution="Done."
        quizScore={{ correct: 3, total: 4 }}
        timeSpent={15}
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByText(/3.*4/)).toBeInTheDocument();
  });

  it("should call onExit when button clicked", () => {
    const onExit = vi.fn();
    render(
      <NarrativeResolution resolution="Done." quizScore={{ correct: 0, total: 0 }} timeSpent={5} onExit={onExit} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /exit/i }));
    expect(onExit).toHaveBeenCalledOnce();
  });
});
```

**Step 2: Implement the component**

Create `src/components/NarrativeResolution.tsx`:

```tsx
import { Trophy, Clock, Brain } from "lucide-react";

interface NarrativeResolutionProps {
  resolution: string;
  quizScore: { correct: number; total: number };
  timeSpent: number;
  onExit: () => void;
}

export function NarrativeResolution({
  resolution,
  quizScore,
  timeSpent,
  onExit,
}: NarrativeResolutionProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="max-w-lg">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-nvidia-green/20 flex items-center justify-center">
          <Trophy className="w-8 h-8 text-nvidia-green" />
        </div>

        <h2 className="text-2xl font-bold text-nvidia-green mb-4">
          Mission Complete
        </h2>

        <p className="text-gray-300 mb-8 leading-relaxed">{resolution}</p>

        {/* Stats */}
        <div className="flex justify-center gap-8 mb-8">
          <div className="text-center">
            <Clock className="w-5 h-5 mx-auto mb-1 text-gray-400" />
            <div className="text-lg font-bold text-white">{timeSpent}m</div>
            <div className="text-xs text-gray-400">Time</div>
          </div>
          {quizScore.total > 0 && (
            <div className="text-center">
              <Brain className="w-5 h-5 mx-auto mb-1 text-gray-400" />
              <div className="text-lg font-bold text-white">
                {quizScore.correct}/{quizScore.total}
              </div>
              <div className="text-xs text-gray-400">Quiz Score</div>
            </div>
          )}
        </div>

        <button
          onClick={onExit}
          className="px-8 py-3 bg-nvidia-green text-black font-bold rounded-lg hover:bg-nvidia-darkgreen transition-colors"
        >
          Exit Mission
        </button>
      </div>
    </div>
  );
}
```

**Step 3: Run tests**

Run: `npx vitest run src/components/__tests__/NarrativeResolution.test.tsx`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/NarrativeResolution.tsx src/components/__tests__/NarrativeResolution.test.tsx
git commit -m "feat: add NarrativeResolution completion screen component"
```

---

### Task 9: Integrate Narrative UI into LabWorkspace

**Files:**

- Modify: `src/components/LabWorkspace.tsx`

This is the core UI integration. LabWorkspace needs to:

1. Show `NarrativeIntro` before steps begin (when `currentStepIndex === 0` and step hasn't started)
2. Replace the step title/description with narrative situation/task styling
3. Show `InlineQuiz` after step validation passes (if the step has a quiz)
4. Show `NarrativeResolution` when all steps complete

**Step 1: Add narrative state and imports**

At the top of LabWorkspace.tsx, add:

```typescript
import { NarrativeIntro } from "./NarrativeIntro";
import { InlineQuiz } from "./InlineQuiz";
import { NarrativeResolution } from "./NarrativeResolution";
```

Add state for narrative flow:

```typescript
const [showIntro, setShowIntro] = useState(true);
const [quizResults, setQuizResults] = useState<Record<string, boolean>>({});

const isNarrative = !!activeScenario.narrative;
const isComplete = progress?.completed;
```

**Step 2: Add NarrativeIntro gate**

Before the main step content (around line 420), add:

```tsx
{
  /* Narrative Mission Briefing */
}
{
  isNarrative && showIntro && !isComplete && (
    <NarrativeIntro
      title={activeScenario.title}
      narrative={activeScenario.narrative!}
      onBegin={() => setShowIntro(false)}
    />
  );
}
```

When `showIntro` is true, hide the step content.

**Step 3: Add narrative step styling**

Replace the step title/description rendering (lines 428-456) with conditional rendering:

```tsx
{
  /* Step title */
}
<h3 className="text-lg font-bold text-white">
  {isNarrative ? `Step ${currentStepIndex + 1}` : currentStep.title}
</h3>;

{
  /* Narrative situation */
}
{
  isNarrative && (
    <div className="bg-gray-800/70 rounded-lg p-4 mb-4 border-l-4 border-nvidia-green">
      <h4 className="text-xs font-semibold text-nvidia-green mb-2 uppercase tracking-wider">
        Situation
      </h4>
      <p className="text-gray-200 leading-relaxed italic">
        {currentStep.description}
      </p>
    </div>
  );
}

{
  /* Task */
}
{
  isNarrative ? (
    <div className="bg-gray-800 rounded-lg p-4 mb-4">
      <h4 className="text-xs font-semibold text-blue-400 mb-2 uppercase tracking-wider">
        Your Task
      </h4>
      <p className="text-white leading-relaxed">{currentStep.title}</p>
    </div>
  ) : (
    <p className="text-gray-300 mb-4 leading-relaxed">
      {currentStep.description}
    </p>
  );
}
```

**Step 4: Add InlineQuiz after validation**

After the expected commands section (around line 610), add:

```tsx
{
  /* Inline Quiz (narrative scenarios only) */
}
{
  isNarrative &&
    currentStep.narrativeQuiz &&
    isStepCompleted &&
    !quizResults[currentStep.id] && (
      <div className="mb-4">
        <InlineQuiz
          quiz={currentStep.narrativeQuiz}
          onComplete={(correct) => {
            setQuizResults((prev) => ({ ...prev, [currentStep.id]: correct }));
          }}
        />
      </div>
    );
}
```

**Step 5: Add NarrativeResolution**

Replace or augment the completion state with:

```tsx
{
  isNarrative && isComplete && (
    <NarrativeResolution
      resolution={activeScenario.narrative!.resolution}
      quizScore={{
        correct: Object.values(quizResults).filter(Boolean).length,
        total: Object.values(quizResults).length,
      }}
      timeSpent={Math.round((progress?.totalTimeSpent || 0) / 60000)}
      onExit={handleExit}
    />
  );
}
```

**Step 6: Update the step overview sidebar**

In the "ALL STEPS" section (lines 770-809), update to show task text for narratives:

```tsx
<span className={`text-sm ${...}`}>
  {isNarrative ? `Step ${idx + 1}: ${step.title.slice(0, 50)}...` : step.title}
</span>
```

**Step 7: Run full test suite**

Run: `npx vitest run`
Expected: All pass

**Step 8: Commit**

```bash
git add src/components/LabWorkspace.tsx
git commit -m "feat: integrate narrative UI into LabWorkspace with intro, quiz, and resolution"
```

---

### Task 10: Redesign LabsAndScenariosView for Narrative Scenarios

**Files:**

- Modify: `src/components/LabsAndScenariosView.tsx`
- Modify: `src/App.tsx`

Replace the hardcoded domain cards with dynamic scenario cards loaded from the narrative data.

**Step 1: Update LabsAndScenariosView to load scenarios dynamically**

```tsx
import { useState, useEffect, useMemo } from "react";
import { getScenariosByDomain } from "../utils/scenarioLoader";
import type { Scenario } from "../types/scenarios";

interface LabsAndScenariosViewProps {
  onStartScenario: (scenarioId: string) => void;
  onBeginExam: () => void;
  onOpenLearningPaths: () => void;
  onOpenStudyDashboard: () => void;
  onOpenExamGauntlet: () => void;
  learningProgress: { completed: number; total: number };
}
```

For each domain, show a card listing its narrative scenarios by title, with the narrative hook as a subtitle. Clicking a scenario triggers `onStartScenario(scenario.id)`.

**Step 2: Update App.tsx to pass scenarioId instead of domain**

Change `onStartLab` to `onStartScenario` and pass the scenario ID directly:

```typescript
const handleStartScenario = async (scenarioId: string) => {
  const success = await initializeScenario(scenarioId);
  if (success) {
    setCurrentView("simulator");
    setShowLabWorkspace(true);
  }
};
```

**Step 3: Run full tests**

Run: `npx vitest run`
Expected: All pass

**Step 4: Commit**

```bash
git add src/components/LabsAndScenariosView.tsx src/App.tsx
git commit -m "feat: redesign Labs tab to show narrative scenarios by domain"
```

---

## Phase 4: Cleanup (Tasks 11-12)

### Task 11: Remove Old Scenario System

**Files:**

- Delete: `src/data/scenarios/` (entire directory — 64 JSON files)
- Modify: `src/utils/scenarioLoader.ts` (remove old helper functions if any remain)
- Modify: `src/data/__tests__/narrativeScenarios.test.ts` (update if referencing old format)

**Step 1: Delete the old scenarios directory**

```bash
git rm -r src/data/scenarios/
```

**Step 2: Remove any remaining references to old scenario paths**

Search for `/data/scenarios/` in the codebase and remove dead references.

**Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All pass (some old scenario tests may need removal too)

**Step 4: Run build**

Run: `npm run build`
Expected: Clean build with no missing file references

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove old step-based scenario system (replaced by narratives)"
```

---

### Task 12: Final Integration Test & Polish

**Files:**

- Various polish items

**Step 1: Manual smoke test**

1. Run `npm run dev`
2. Navigate to Labs & Scenarios tab
3. Click a scenario — verify NarrativeIntro appears
4. Click "Begin Mission" — verify situation/task step rendering
5. Complete a step — verify InlineQuiz appears
6. Complete all steps — verify NarrativeResolution screen

**Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All pass

**Step 3: Run lint**

Run: `npx eslint src/`
Expected: 0 errors, 0 warnings

**Step 4: Run build**

Run: `npm run build`
Expected: Clean build

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: narrative scenario integration complete - final polish"
```

---

## Summary

| Phase   | Tasks | Focus                                                                                        |
| ------- | ----- | -------------------------------------------------------------------------------------------- |
| Phase 1 | 1-3   | Types, adapter, loader replacement                                                           |
| Phase 2 | 4-5   | Author ~28 total narrative scenarios with full command coverage                              |
| Phase 3 | 6-10  | NarrativeIntro, InlineQuiz, NarrativeResolution, LabWorkspace integration, Labs tab redesign |
| Phase 4 | 11-12 | Remove old system, final testing                                                             |

### Command Coverage Target

After all scenarios are authored, the system should exercise **150+ unique command patterns** across all 5 NCP-AII exam domains, weighted by exam importance (31% Domain 1, 5% Domain 2, 19% Domain 3, 33% Domain 4, 12% Domain 5).
