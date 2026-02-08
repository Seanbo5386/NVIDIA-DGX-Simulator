# Labs & Scenarios Learning Revamp - Implementation Blueprint

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Labs & Scenarios from step-following exercises into a comprehensive command mastery learning system.

**Architecture:** Hybrid learning approach combining conceptual orientation (command family cards + quizzes) with tiered fault-injection scenarios (Tier 1: Guided → Tier 2: Choice → Tier 3: Realistic) and a retention system (spaced repetition + cumulative scenarios + exam gauntlet).

**Tech Stack:** React components, TypeScript, Zustand store, JSON data files, existing scenario/validation infrastructure.

---

## Executive Summary

This blueprint transforms the Labs & Scenarios system from step-following exercises into a comprehensive command mastery learning system. The architecture integrates brief conceptual orientation (command family cards + quizzes) with tiered fault-injection scenarios and a retention system.

**User Journey:**

1. Learn Command Families → View CommandFamilyCards
2. Test Knowledge → Complete WhichToolQuiz (must pass 3/4)
3. Practice Tier 1 → Guided scenarios with tool suggestions
4. Unlock Tier 2 → Must use every tool in family once
5. Practice Tier 2 → Tool choice scenarios
6. Unlock Tier 3 → Pass ExplanationGate (80%+ accuracy in Tier 2)
7. Practice Tier 3 → Realistic multi-fault scenarios
8. Retention Loop → SpacedReviewDrill pops up based on schedule
9. Final Prep → ExamGauntlet (timed, randomized)

---

## File Reference Summary

### New Files to Create (11 total)

| File                                    | Purpose                                                              |
| --------------------------------------- | -------------------------------------------------------------------- |
| `src/store/learningProgressStore.ts`    | Store for tool coverage, quiz scores, tier progress, review schedule |
| `src/utils/spacedRepetition.ts`         | SM-2 algorithm for review scheduling                                 |
| `src/utils/tierProgressionEngine.ts`    | Unlock logic, gauntlet scenario selection                            |
| `src/components/CommandFamilyCards.tsx` | Visual tool landscape cards                                          |
| `src/components/WhichToolQuiz.tsx`      | Pre-scenario tool selection quiz                                     |
| `src/components/ExplanationGate.tsx`    | Post-scenario understanding check                                    |
| `src/components/SpacedReviewDrill.tsx`  | 2-minute retention drills                                            |
| `src/components/ExamGauntlet.tsx`       | Timed, weighted practice exam                                        |
| `src/data/commandFamilies.json`         | 6 command families with tool definitions                             |
| `src/data/quizQuestions.json`           | 24 quiz questions (4 per family)                                     |
| `src/data/explanationGates.json`        | 30-40 post-scenario questions                                        |

### Files to Modify (3 total)

| File                              | Changes                                             |
| --------------------------------- | --------------------------------------------------- |
| `src/components/LabWorkspace.tsx` | Add tier indicators, tool hints for Tier 1          |
| `src/store/simulationStore.ts`    | Integrate tier progression checks                   |
| `src/types/scenarios.ts`          | Add tier, commandFamilies, explanationGateId fields |

### Scenarios to Migrate

All 56 JSON files in `src/data/scenarios/domain*/` need new fields added.

---

## Data Schemas

### commandFamilies.json

```typescript
interface CommandFamily {
  id: string; // "gpu-monitoring"
  name: string; // "GPU Monitoring Family"
  icon: string; // "🖥️"
  description: string;
  quickRule: string; // Decision heuristic
  tools: Tool[];
}

interface Tool {
  name: string; // "nvidia-smi"
  tagline: string; // "Quick snapshot"
  description: string; // "Current state, memory, utilization, processes"
  bestFor: string; // "Spot checks, seeing what's running"
  exampleCommand: string; // "nvidia-smi -q -i 0 -d MEMORY"
  permissions: "user" | "root";
  relatedTools?: string[];
}
```

### quizQuestions.json

```typescript
interface QuizQuestion {
  id: string; // "gpu-mon-q1"
  familyId: string; // "gpu-monitoring"
  scenario: string; // Situation description
  choices: string[]; // 4 tool options
  correctAnswer: string; // Tool name
  acceptableAnswers?: string[]; // Multiple correct answers
  explanation: string; // Why this is correct
  whyNotOthers: Array<{ tool: string; reason: string }>;
  difficulty: "beginner" | "intermediate" | "advanced";
}
```

### explanationGates.json

```typescript
interface ExplanationGate {
  id: string; // "gate-nvlink-diagnosis"
  scenarioId: string; // "domain5-nvlink-errors"
  familyId: string; // "gpu-monitoring"
  triggerCondition?: {
    toolsUsed?: string[];
    toolsNotUsed?: string[];
  };
  question: string;
  choices: string[];
  correctAnswer: number; // Index of correct choice
  explanation: string;
}
```

### Enhanced Scenario Schema

```typescript
// Additions to existing Scenario interface
interface Scenario {
  // ... existing fields ...
  tier?: 1 | 2 | 3;
  commandFamilies?: string[];
  prerequisiteSkills?: string[];
  cumulativeSkills?: string[];
  explanationGateId?: string;
  toolHints?: boolean;
}
```

---

## Store Design: learningProgressStore.ts

```typescript
interface LearningProgressState {
  // Command Family Progress
  toolsUsed: Record<string, Set<string>>;
  familyQuizScores: Record<
    string,
    { passed: boolean; score: number; attempts: number }
  >;

  // Tier Unlocking
  unlockedTiers: Record<string, number>;
  tierProgress: Record<
    string,
    {
      tier1Completed: number;
      tier2Completed: number;
      tier3Completed: number;
    }
  >;

  // Explanation Gates
  explanationGateResults: Record<
    string,
    { passed: boolean; scenarioId: string }
  >;

  // Spaced Repetition
  reviewSchedule: Map<
    string,
    {
      familyId: string;
      nextReviewDate: number;
      interval: number;
      consecutiveSuccesses: number;
    }
  >;

  // Exam Gauntlet
  gauntletAttempts: Array<GauntletAttempt>;

  // Actions
  markToolUsed: (familyId: string, toolName: string) => void;
  completeQuiz: (familyId: string, passed: boolean, score: number) => void;
  updateTierProgress: (
    familyId: string,
    tier: number,
    scenarioId: string,
  ) => void;
  checkTierUnlock: (familyId: string) => number;
  recordExplanationGate: (
    gateId: string,
    scenarioId: string,
    passed: boolean,
  ) => void;
  scheduleReview: (familyId: string) => void;
  recordReviewResult: (familyId: string, success: boolean) => void;
  getDueReviews: () => string[];
  recordGauntletAttempt: (result: GauntletAttempt) => void;
}
```

---

## Component Props Interfaces

### CommandFamilyCards

```typescript
interface CommandFamilyCardsProps {
  familyId?: string;
  mode?: "full" | "reference";
  onStartQuiz?: (familyId: string) => void;
  onShowToolExample?: (familyId: string, toolName: string) => void;
}
```

### WhichToolQuiz

```typescript
interface WhichToolQuizProps {
  familyId: string;
  onComplete: (passed: boolean, score: number) => void;
  onClose: () => void;
}
```

### ExplanationGate

```typescript
interface ExplanationGateProps {
  scenarioId: string;
  familyId: string;
  toolsUsed: string[];
  onComplete: (passed: boolean) => void;
}
```

### SpacedReviewDrill

```typescript
interface SpacedReviewDrillProps {
  familyId?: string;
  onComplete: () => void;
  onSnooze?: (days: number) => void;
}
```

### ExamGauntlet

```typescript
interface ExamGauntletProps {
  onExit: () => void;
}
```

---

## Utility Functions

### spacedRepetition.ts

```typescript
// Calculate next review date (SM-2 simplified)
// Intervals: 1d → 3d → 7d → 14d → 30d → 60d → 120d
export function calculateNextReview(
  lastReviewDate: number,
  consecutiveSuccesses: number,
  currentInterval: number,
): { nextReviewDate: number; newInterval: number };

// Get families with due reviews
export function getDueReviews(
  reviewSchedule: Map<string, ReviewScheduleItem>,
): string[];

// Initialize review for newly learned family
export function initializeReview(familyId: string): ReviewScheduleItem;

// Generate a review question
export function generateReviewQuestion(
  familyId: string,
  commandFamilies: CommandFamily[],
): ReviewQuestion;
```

### tierProgressionEngine.ts

```typescript
// Check if tier is unlocked
export function isTierUnlocked(
  familyId: string,
  tier: 1 | 2 | 3,
  progressStore: LearningProgressState,
): boolean;

// Evaluate if user should unlock next tier
// Tier 1 → 2: Quiz passed AND all tools used
// Tier 2 → 3: 80%+ accuracy AND explanation gates passed
export function evaluateTierUnlock(
  familyId: string,
  currentTier: number,
  progressStore: LearningProgressState,
): number | null;

// Select 10 scenarios for gauntlet (weighted by exam blueprint)
export function selectGauntletScenarios(
  domainWeights: Record<DomainId, number>,
  availableScenarios: Scenario[],
): Scenario[];
```

---

## Build Sequence

### Phase 1: Foundation (Week 1)

- [ ] Create `learningProgressStore.ts`
- [ ] Create `spacedRepetition.ts`
- [ ] Create `tierProgressionEngine.ts`
- [ ] Create `commandFamilies.json` (6 families × 4-5 tools)

### Phase 2: Core Components (Week 2)

- [ ] Build `CommandFamilyCards.tsx`
- [ ] Create `quizQuestions.json` (24 questions)
- [ ] Build `WhichToolQuiz.tsx`

### Phase 3: Tier System (Week 3)

- [ ] Run scenario migration script (add tier, commandFamilies to 56 scenarios)
- [ ] Enhance `LabWorkspace.tsx` with tier indicators
- [ ] Integrate tierProgressionEngine into simulationStore
- [ ] Create `explanationGates.json` (30-40 gates)
- [ ] Build `ExplanationGate.tsx`

### Phase 4: Retention System (Week 4)

- [ ] Build `SpacedReviewDrill.tsx`
- [ ] Add review notification badge
- [ ] Implement review scheduling

### Phase 5: Exam Gauntlet (Week 5)

- [ ] Build `ExamGauntlet.tsx` (setup, timer, results)
- [ ] Add gauntlet launcher to UI
- [ ] Build results breakdown report

### Phase 6: Integration & Polish (Week 6)

- [ ] Add "Learn → Practice → Test" tab structure
- [ ] Add CommandFamilyCards reference sidebar
- [ ] Create tier unlock notifications
- [ ] Add progress visualizations
- [ ] Responsive design testing

### Phase 7: Testing & Documentation (Week 7)

- [ ] Unit tests for stores and utils
- [ ] Integration tests for component flows
- [ ] Update CLAUDE.md
- [ ] Create user guide

---

## Tier Classification Guidelines

### Tier 1 (Guided)

- Simple, single-fault scenarios
- Explicit tool instructions provided
- `toolHints: true`
- Examples: server-post, bmc-config, driver-install

### Tier 2 (Choice)

- Problem area identified but not specific tool
- User picks tools, gets partial feedback
- `explanationGateId` assigned
- Examples: nvlink-errors, gpu-power

### Tier 3 (Realistic)

- Symptom only (e.g., "training is slow")
- Multiple potential causes
- Minimal hints, must explain diagnosis
- Examples: training-slow, cluster-crash

---

## Command Families

| Family ID          | Tools                                    |
| ------------------ | ---------------------------------------- |
| `gpu-monitoring`   | nvidia-smi, nvsm, dcgmi, nvtop           |
| `infiniband-tools` | ibstat, perfquery, ibdiagnet, iblinkinfo |
| `bmc-hardware`     | ipmitool, sensors, dmidecode             |
| `cluster-tools`    | sinfo, squeue, scontrol, sacct           |
| `container-tools`  | docker, enroot, pyxis                    |
| `diagnostics`      | dcgmi diag, nvidia-bug-report, gpu-burn  |

---

## Success Metrics

1. Users can articulate _when_ to use each tool, not just _how_
2. Tier 3 completion rate > 60%
3. Gauntlet scores correlate with exam performance
4. Users report feeling "prepared" not just "practiced"
5. Reduction in "wrong tool" errors in Tier 2+ scenarios
