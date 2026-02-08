# UI Consolidation & Simplification Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create the implementation plan for this design.

**Goal:** Transform the application from an overwhelming, redundant multi-modal experience into a clean, focused four-tab interface with narrative-driven scenarios and task-centric documentation.

**Architecture:** Four main tabs (Simulator, Labs & Scenarios, Reference, State Management) with domain-focused navigation, ~16 comprehensive narrative scenarios replacing 56 granular ones, and a unified task-centric reference system.

**Tech Stack:** React, TypeScript, Zustand, TailwindCSS (existing stack, no additions)

---

## Problem Statement

The current application suffers from:

1. **Overwhelming redundancy** - Same features accessible via 3-4 different paths
2. **Information fragmentation** - Command help in 4 different formats/locations
3. **Too many small scenarios** - 56 scenarios teaching commands in isolation
4. **Inconsistent UI** - Varied card styles, colors, and patterns across sections
5. **Modal fatigue** - Multiple overlapping modals (LearningPaths, StudyDashboard, quizzes)

Users complete labs but don't build holistic troubleshooting skills.

---

## Solution: Four-Tab Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [Simulator]    [Labs & Scenarios]    [Reference]    [State Management]  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Simulator: Dashboard + Terminal (unchanged)                            │
│                                                                          │
│   Labs & Scenarios: Domain-focused scenario navigation                   │
│   - 5 domain cards → click to see scenarios                              │
│   - ~16 narrative workflow scenarios (consolidated from 56)              │
│   - Progress tracked per scenario and domain                             │
│   - "Final Assessment" (renamed Exam Gauntlet)                           │
│                                                                          │
│   Reference: Task-centric command documentation                          │
│   - "What do I want to do?" categories                                   │
│   - Powers both UI and terminal `explain` command                        │
│   - Single source of truth for all command help                          │
│                                                                          │
│   State Management: Cluster state controls (from Documentation tab)      │
│   - Save/load cluster snapshots                                          │
│   - Export/import configurations                                         │
│   - Reset to defaults                                                    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Component 1: Labs & Scenarios Tab

### Main View (Domain Cards)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Labs & Scenarios                                                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│  │ Domain 1    │ │ Domain 2    │ │ Domain 3    │ │ Domain 4    │  ...   │
│  │ Systems &   │ │ Physical    │ │ Control     │ │ Cluster     │        │
│  │ Bring-Up    │ │ Layer       │ │ Plane       │ │ Test        │        │
│  │             │ │             │ │             │ │             │        │
│  │ ████░░ 2/4  │ │ ░░░░░░ 0/3  │ │ ████░░ 3/5  │ │ ██░░░░ 1/4  │        │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘        │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │ 🎯 Final Assessment                                         │        │
│  │ Timed exam simulation • 10 weighted scenarios • 70% to pass │        │
│  │                                              [Start Exam]   │        │
│  └─────────────────────────────────────────────────────────────┘        │
│                                                                          │
│  📊 Overall Progress: 6/16 scenarios completed (38%)                     │
│  💡 Recommended: "Cluster Health Crisis" (Domain 4)                      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Domain View (Scenario List)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Labs & Scenarios › Domain 4: Cluster Test & Verification                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │ 📖 The Silent Cluster                           ✓ Complete │         │
│  │                                                             │         │
│  │ "Production cluster showing intermittent NCCL timeouts.    │         │
│  │  Users report training jobs hanging without errors..."      │         │
│  │                                                             │         │
│  │ Commands: nvidia-smi, dcgmi, nccl-tests, ibstat, squeue    │         │
│  │ Duration: ~20 min                                           │         │
│  │                                              [Continue →]   │         │
│  └────────────────────────────────────────────────────────────┘         │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │ 📖 Cluster Health Crisis                       ○ Not Started│         │
│  │                                                             │         │
│  │ "Monday morning: 47 GPU errors overnight across 8 nodes.   │         │
│  │  Management wants a full health report by noon..."          │         │
│  │                                                             │         │
│  │ Commands: dcgmi diag, nvidia-smi, ipmitool, ibdiagnet      │         │
│  │ Duration: ~25 min                                           │         │
│  │                                              [Start →]      │         │
│  └────────────────────────────────────────────────────────────┘         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

- **Breadcrumb navigation**: Labs > Domain 4 > Scenario Name
- **Narrative previews**: Each card shows story hook, not just title
- **Commands listed upfront**: Users know what they'll practice
- **Duration estimates**: Set expectations (15-30 min per scenario)
- **Progress inline**: No separate dashboard needed
- **"Recommended"**: Replaces spaced repetition popups

---

## Component 2: Narrative Scenario Structure

### Scenario Step View

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Labs › Domain 4 › The Silent Cluster                      Step 3 of 12 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ SITUATION                                                        │    │
│  │                                                                  │    │
│  │ You've confirmed GPU 3 on node dgx-04 is showing ECC errors.    │    │
│  │ The user's NCCL all-reduce is timing out after 300 seconds.     │    │
│  │                                                                  │    │
│  │ Your manager asks: "Is this a single GPU issue or is the        │    │
│  │ whole NVLink mesh affected?"                                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ YOUR TASK                                                        │    │
│  │                                                                  │    │
│  │ Check the NVLink topology and error status to determine if      │    │
│  │ other GPUs are affected.                                         │    │
│  │                                                                  │    │
│  │ 💡 Hint available (click to reveal)                              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ TERMINAL                                                  [dgx-04]│   │
│  │ $ █                                                              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  [← Back]                                              [Validate Step]   │
└──────────────────────────────────────────────────────────────────────────┘
```

### Integrated Quiz (After Key Steps)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ ✓ STEP COMPLETE                                                  │    │
│  │                                                                  │    │
│  │ Good - you found NVLink errors on links 4-7 connecting GPU 3.   │    │
│  │                                                                  │    │
│  │ ─────────────────────────────────────────────────────────────── │    │
│  │                                                                  │    │
│  │ QUICK CHECK: Why did you use `nvidia-smi nvlink --status`       │    │
│  │ instead of `nvidia-smi topo -m` here?                           │    │
│  │                                                                  │    │
│  │ ○ nvlink --status shows error counts, topo only shows topology  │    │
│  │ ○ topo requires root access                                      │    │
│  │ ○ nvlink is faster to execute                                    │    │
│  │                                                                  │    │
│  │                                          [Answer & Continue →]   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

- **Narrative-driven**: Each step has context ("SITUATION") and clear objective ("YOUR TASK")
- **Embedded terminal**: No switching between views
- **Hints available, not forced**: User controls pacing
- **Integrated quizzes**: Appear naturally after key decisions, not as separate modals
- **Step progress**: "Step 3 of 12" shows journey length

---

## Component 3: Reference Tab (Task-Centric)

### Main View

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Reference                                        🔍 Search commands...  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  What do you want to do?                                                 │
│                                                                          │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐│
│  │ 🖥️ Check GPU Health  │ │ 🔗 Diagnose Network │ │ ⚡ Monitor Perf     ││
│  │                      │ │                     │ │                     ││
│  │ nvidia-smi           │ │ ibstat              │ │ nvidia-smi dmon     ││
│  │ dcgmi health         │ │ ibdiagnet           │ │ dcgmi dmon          ││
│  │ nvsm show            │ │ iblinkinfo          │ │ nvtop               ││
│  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘│
│                                                                          │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐│
│  │ 🔧 Troubleshoot GPU  │ │ 🖧 Manage Cluster   │ │ 📦 Run Containers   ││
│  │                      │ │                     │ │                     ││
│  │ dcgmi diag           │ │ sinfo, squeue       │ │ docker, enroot      ││
│  │ nvidia-bug-report    │ │ scontrol            │ │ pyxis               ││
│  │ dmesg + XID lookup   │ │ sacct               │ │ ngc                 ││
│  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘│
│                                                                          │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐│
│  │ 🌡️ Check Hardware    │ │ 🔀 Configure MIG    │ │ ⚠️ Understand Errors ││
│  │                      │ │                     │ │                     ││
│  │ ipmitool sensors     │ │ nvidia-smi mig      │ │ XID Error Reference ││
│  │ ipmitool sel         │ │ dcgmi profile       │ │ Common Error Codes  ││
│  │ dmidecode            │ │                     │ │ Troubleshooting     ││
│  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘│
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Category Detail View

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Reference › Check GPU Health                     🔍 Search commands...  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  When to use these tools:                                                │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ Quick snapshot → nvidia-smi                                      │    │
│  │ Overall health status → nvsm show health                         │    │
│  │ Deep diagnostics → dcgmi health / dcgmi diag                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ▼ nvidia-smi                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ Quick GPU status snapshot - memory, utilization, temperature     │    │
│  │                                                                  │    │
│  │ COMMON USAGE                                                     │    │
│  │ $ nvidia-smi                    # Basic status                   │    │
│  │ $ nvidia-smi -q -i 0            # Detailed query, GPU 0          │    │
│  │ $ nvidia-smi --query-gpu=...    # Custom query                   │    │
│  │                                                                  │    │
│  │ KEY OPTIONS                                                      │    │
│  │ -i <id>     Target specific GPU                                  │    │
│  │ -q          Detailed query mode                                  │    │
│  │ -L          List GPUs                                            │    │
│  │ -d <type>   Display specific info (MEMORY, UTILIZATION, ECC...)  │    │
│  │                                                                  │    │
│  │ RELATED: dcgmi discovery, nvsm show gpu                          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ▶ dcgmi health (click to expand)                                        │
│  ▶ nvsm show (click to expand)                                           │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

- **Task-first**: Organized by user intent, not command names
- **Decision guide**: "When to use these tools" at top of each category
- **Expandable details**: Don't overwhelm, let users drill down
- **Single source of truth**: Same data powers UI and terminal `explain` command
- **Search**: Works across all commands and categories
- **XID Reference**: Accessible from "Understand Errors" category

---

## Component 4: UI Consistency Standards

### Standardized Card Pattern

```
┌────────────────────────────────────────────────────────────┐
│  [Icon] Title                              [Status Badge]  │
│                                                            │
│  Description or preview text goes here, kept to 2-3       │
│  lines maximum for scannability.                           │
│                                                            │
│  [metadata • metadata • metadata]                          │
│                                            [Action Button] │
└────────────────────────────────────────────────────────────┘
```

**CSS Standards:**

- Padding: `p-6`
- Border: `border border-gray-700`
- Background: `bg-gray-800`
- Hover: `hover:border-nvidia-green transition-colors`
- Corner radius: `rounded-lg`

### Accent Color System

| Purpose          | Color        | Tailwind Class                             |
| ---------------- | ------------ | ------------------------------------------ |
| Success/Complete | NVIDIA Green | `text-nvidia-green`, `bg-nvidia-green`     |
| Progress bars    | NVIDIA Green | `bg-nvidia-green`                          |
| Primary CTA      | NVIDIA Green | `bg-nvidia-green hover:bg-nvidia-green/90` |
| Secondary action | Gray         | `bg-gray-600 hover:bg-gray-500`            |
| Warning/Hints    | Yellow       | `text-yellow-500`                          |
| Error/Failure    | Red          | `text-red-500`                             |
| Neutral/Metadata | Gray         | `text-gray-400`                            |

### Typography

- **Headings**: `text-white font-bold`
- **Body**: `text-gray-300`
- **Metadata**: `text-gray-400 text-sm`
- **Code**: `font-mono bg-gray-900 px-2 py-1 rounded`

---

## What Gets Removed

| Component                  | Lines | Reason                             |
| -------------------------- | ----- | ---------------------------------- |
| `LearningPaths.tsx`        | ~1665 | Absorbed into Labs tab             |
| `CommandFamilyCards.tsx`   | ~400  | Content moves to Reference         |
| `WhichToolQuiz.tsx`        | ~350  | Integrated into scenarios          |
| `SpacedReviewDrill.tsx`    | ~300  | Becomes "recommended" label        |
| `ExplanationGate.tsx`      | ~370  | Integrated into scenario steps     |
| `StudyDashboard.tsx`       | ~500  | Progress shown inline              |
| `ProgressRing.tsx`         | ~180  | Simplified to inline progress bars |
| Documentation tab sub-tabs | -     | Consolidated into Reference        |

**Estimated removal:** ~3,700 lines of component code

---

## Scenario Consolidation Plan

### Current: 56 Scenarios → New: ~16 Narrative Workflows

| Domain                       | Current Count | New Count | Example New Scenario                          |
| ---------------------------- | ------------- | --------- | --------------------------------------------- |
| Domain 1: Systems & Bring-Up | 9             | 3-4       | "First Boot: New DGX Deployment"              |
| Domain 2: Physical Layer     | 6             | 2-3       | "The NVLink Mystery"                          |
| Domain 3: Control Plane      | 13            | 3-4       | "Container Chaos"                             |
| Domain 4: Cluster Test       | 17            | 4-5       | "The Silent Cluster", "Cluster Health Crisis" |
| Domain 5: Troubleshooting    | 14            | 3-4       | "XID Investigation", "Thermal Emergency"      |

### Narrative Scenario Requirements

Each scenario must:

1. Have a compelling story hook (1-2 sentences)
2. Cover 3-5 command families
3. Take 15-30 minutes to complete
4. Include 8-15 steps
5. Have 2-3 integrated quiz moments
6. End with a resolution that reinforces learning

---

## Data Structure Changes

### New Scenario Schema

```typescript
interface NarrativeScenario {
  id: string;
  domain: 1 | 2 | 3 | 4 | 5;
  title: string;
  narrative: {
    hook: string; // "Monday morning: 47 GPU errors overnight..."
    setting: string; // Context about the environment
    resolution: string; // What success looks like
  };
  commandFamilies: string[]; // ["gpu-monitoring", "infiniband-tools", ...]
  estimatedMinutes: number;
  steps: NarrativeStep[];
}

interface NarrativeStep {
  id: string;
  situation: string; // Narrative context
  task: string; // Clear objective
  hints: string[];
  validation: StepValidation;
  quiz?: IntegratedQuiz; // Optional, appears after step completion
}

interface IntegratedQuiz {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}
```

### Task-Centric Reference Schema

```typescript
interface TaskCategory {
  id: string;
  title: string; // "Check GPU Health"
  icon: string;
  decisionGuide: string; // "Quick snapshot → nvidia-smi, Deep diagnostics → dcgmi"
  commands: CommandReference[];
}

interface CommandReference {
  name: string;
  summary: string;
  commonUsage: { command: string; description: string }[];
  options: { flag: string; description: string }[];
  related: string[];
  // Same data used by terminal `explain` command
}
```

---

## Migration Strategy

### Phase 1: Foundation

1. Create new tab structure (4 tabs)
2. Build Reference tab with task-centric organization
3. Ensure `explain` command uses same data source

### Phase 2: Labs Rebuild

4. Build domain-focused navigation UI
5. Create new scenario player with narrative structure
6. Build integrated quiz system (inline, not modal)

### Phase 3: Content Migration

7. Write ~16 new narrative scenarios (consolidate from 56)
8. Migrate command reference content to task categories
9. Remove old components

### Phase 4: Polish

10. Apply UI consistency standards everywhere
11. Test all flows end-to-end
12. Remove dead code

---

## Success Criteria

1. **Reduced cognitive load**: Users can navigate entire app without confusion
2. **Single path to features**: No duplicate access points
3. **Narrative engagement**: Users feel like they're solving real problems
4. **Comprehensive scenarios**: Each scenario tests multiple tool families
5. **Unified reference**: `explain` command and Reference tab show identical content
6. **Visual consistency**: All cards, buttons, and colors follow standards
7. **Reduced codebase**: ~3,700 lines removed, cleaner architecture

---

## Open Questions

1. Should Final Assessment (Exam Gauntlet) use the new narrative scenarios or keep question-based format?
2. How to handle users with progress in old scenarios during migration?
3. Should Reference tab include exam study guides or keep those as PDFs?
