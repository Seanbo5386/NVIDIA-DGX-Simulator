# Labs & Scenarios Learning Revamp Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Labs & Scenarios from step-following exercises into a command mastery learning system that builds tool selection skills, conceptual understanding, and long-term retention.

**Architecture:** Hybrid learning approach combining brief conceptual orientation (command family cards + quizzes) with tiered fault-injection scenarios (guided → choice → realistic) and a comprehensive retention system (spaced repetition + cumulative scenarios + exam gauntlet).

**Tech Stack:** React components, TypeScript, Zustand store, JSON data files, existing scenario/validation infrastructure.

---

## Problem Statement

Users complete labs but exhibit four failure modes:

1. **Wrong tool for the job** - Use nvidia-smi when DCGM's persistent monitoring is needed
2. **Incomplete information** - Miss critical details another tool would reveal
3. **Inefficient workflows** - Run 5 commands when 1 would suffice
4. **Permission/context errors** - Try wrong tool for the execution context

Root cause: Labs teach commands in isolation without teaching **command selection** as a skill.

---

## Overall Learning Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: ORIENTATION (5-10 min per command family)            │
│  ┌──────────────┐    ┌──────────────┐                          │
│  │ Command      │ → │ "Which Tool?" │ → Ready for scenarios   │
│  │ Family Cards │    │ Quick Quiz    │                          │
│  └──────────────┘    └──────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2: TIERED SCENARIOS                                      │
│                                                                 │
│  Tier 1: GUIDED         Tier 2: CHOICE        Tier 3: REALISTIC│
│  "Use nvidia-smi to     "GPU 3 has an issue"  "Training jobs    │
│   check GPU 3 temp"     (pick your tools)      are slow"        │
│                                                (figure it out)  │
│       ↓ unlock via           ↓ unlock via                       │
│    tool coverage          accuracy + explain                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 3: RETENTION                                             │
│  ┌────────────┐  ┌─────────────┐  ┌────────────────┐           │
│  │  Spaced    │  │ Cumulative  │  │  Pre-Exam      │           │
│  │  Review    │  │ Scenarios   │  │  Gauntlet      │           │
│  │  Drills    │  │ (later labs │  │  (timed,       │           │
│  │  (2-min)   │  │  use earlier│  │   random)      │           │
│  │            │  │  skills)    │  │                │           │
│  └────────────┘  └─────────────┘  └────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### Command Families to Cover

| Family         | Tools                                    |
| -------------- | ---------------------------------------- |
| GPU Monitoring | nvidia-smi, nvsm, dcgmi, nvtop           |
| Diagnostics    | dcgmi diag, nvidia-bug-report, gpu-burn  |
| InfiniBand     | ibstat, ibdiagnet, iblinkinfo, perfquery |
| BMC/Hardware   | ipmitool, sensors, dmidecode             |
| Cluster        | sinfo, squeue, scontrol, sacct           |
| Containers     | docker, enroot, pyxis                    |

---

## Component 1: Command Family Cards

Visual cards showing the tool landscape at a glance.

### Card Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  🖥️  GPU MONITORING FAMILY                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  nvidia-smi     "Quick snapshot"                                │
│  ───────────    Current state, memory, utilization, processes   │
│                 Best for: Spot checks, seeing what's running    │
│                                                                 │
│  nvsm           "System health"                                 │
│  ───────────    Health status, alerts, component summary        │
│                 Best for: Overall system OK/not-OK assessment   │
│                                                                 │
│  dcgmi          "Deep diagnostics"                              │
│  ───────────    Health checks, ECC errors, historical data      │
│                 Best for: Root cause analysis, persistent issues│
│                                                                 │
│  nvtop          "Live monitoring"                               │
│  ───────────    Real-time utilization, process tracking         │
│                 Best for: Watching workloads over time          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  💡 Quick Rule: nvidia-smi first → nvsm for health →            │
│                 dcgmi if something's wrong                       │
└─────────────────────────────────────────────────────────────────┘
```

### Key Elements

- **Tool name + tagline** - Memorable 2-word summary
- **One-line description** - What it shows
- **"Best for"** - When to reach for it
- **Quick Rule** - Decision heuristic at the bottom

### Interaction

- Cards are collapsible/expandable
- Clicking a tool name shows example output preview
- Cards accessible from sidebar during scenarios (reference mode)
- Badge shows "✓ Used" once user has successfully used each tool

---

## Component 2: "Which Tool?" Quick Quiz

Short scenario-based questions that prime tool selection thinking. 2-3 minutes per command family.

### Quiz Format

```
┌─────────────────────────────────────────────────────────────────┐
│  WHICH TOOL?  GPU Monitoring Family              Question 1/4   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SCENARIO:                                                      │
│  A user reports their training job is using less GPU memory     │
│  than expected. You want to quickly see current memory usage    │
│  and what processes are running on each GPU.                    │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐                              │
│  │ nvidia-smi  │  │    nvsm     │                              │
│  └─────────────┘  └─────────────┘                              │
│  ┌─────────────┐  ┌─────────────┐                              │
│  │   dcgmi     │  │   nvtop     │                              │
│  └─────────────┘  └─────────────┘                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Answer Feedback

```
┌─────────────────────────────────────────────────────────────────┐
│  ✓ CORRECT - nvidia-smi                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  nvidia-smi shows memory usage AND running processes per GPU    │
│  in one quick command. Perfect for this "what's happening       │
│  right now" question.                                           │
│                                                                 │
│  WHY NOT THE OTHERS:                                            │
│  • nvsm - Shows health status, not process details              │
│  • dcgmi - Overkill for a quick check, better for diagnosis     │
│  • nvtop - Would work, but nvidia-smi is faster for spot check  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Quiz Characteristics

- 4 questions per command family
- Scenarios reflect real situations (not trick questions)
- "Why not others" teaches discrimination, not just correct answer
- Some questions have 2 acceptable answers (explains tradeoffs)
- Must pass 3/4 to proceed (can retry)

### Sample Scenarios by Family

| Family         | Example Scenario                                          |
| -------------- | --------------------------------------------------------- |
| GPU Monitoring | "Need to check if ECC errors are accumulating over time"  |
| InfiniBand     | "Link is slow, need to see error counters on the port"    |
| BMC/Hardware   | "Server won't boot, need to check what happened at POST"  |
| Cluster        | "Job stuck in pending, need to see why it won't schedule" |

---

## Component 3: Tiered Fault-Injection Scenarios

### Tier 1: Guided Discovery

**Unlock:** Complete command family cards + quiz

```
SCENARIO SETUP:
• Fault injected: GPU 2 thermal throttling (85°C)
• User told: "GPU 2 is running hot. Investigate the thermal
  status using nvidia-smi."

GUIDANCE LEVEL:
• Specific tool suggested
• Expected command shown (nvidia-smi -q -i 2 -d TEMPERATURE)
• Output highlighted: "See the 'GPU Current Temp' line"
• Follow-up: "Now check what nvsm shows for comparison"

GOAL: Build familiarity with each tool's output
```

### Tier 2: Tool Choice

**Unlock:** Use every tool in family at least once (Tier 1)

```
SCENARIO SETUP:
• Fault injected: NVLink errors on GPU 0-1 connection
• User told: "GPU 0 and GPU 1 seem to have communication
  issues. Diagnose the problem."

GUIDANCE LEVEL:
• Problem area identified (GPU 0-1)
• No tool specified - user chooses
• Partial-credit feedback: "nvidia-smi topo shows topology
  but try nvidia-smi nvlink --status for error counts"
• Hints available after 90 seconds or 2 wrong attempts

GOAL: Practice tool selection with safety net
```

### Tier 3: Realistic Diagnosis

**Unlock:** 80%+ accuracy in Tier 2 + pass explanation gate

```
SCENARIO SETUP:
• Fault injected: ECC errors + thermal throttling + IB flap
• User told: "Users report NCCL all-reduce is slow across
  the cluster. Find out why."

GUIDANCE LEVEL:
• Symptom only - no hints about cause
• Multiple faults - must triage
• No tool suggestions
• Hints only after 3+ minutes stuck
• Must explain diagnosis at end

GOAL: Full troubleshooting under realistic conditions
```

### Explanation Gate (Tier 2 → Tier 3)

After completing a Tier 2 scenario:

```
┌─────────────────────────────────────────────────────────────────┐
│  QUICK CHECK: Why did you choose those tools?                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  You used: nvidia-smi nvlink --status, then dcgmi health        │
│                                                                 │
│  Why was nvidia-smi nvlink better than nvidia-smi topo here?    │
│                                                                 │
│  ○ nvlink --status shows error counters, topo only shows        │
│    connections                                                  │
│  ○ topo requires root access, nvlink doesn't                    │
│  ○ nvlink is faster to run                                      │
│  ○ They show the same information                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component 4: Retention System

### A. Spaced Repetition Drills

```
┌─────────────────────────────────────────────────────────────────┐
│  🔔 REVIEW DUE                                    2 min drill   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  You learned "GPU Monitoring Family" 3 days ago.                │
│  Quick refresh to keep it sharp.                                │
│                                                                 │
│  SCENARIO: GPU shows "ERR!" in nvidia-smi output.               │
│  You need to see detailed ECC error history.                    │
│                                                                 │
│  Which command? > _                                             │
│                                                                 │
│  [Skip for now]                           [Snooze 1 day]       │
└─────────────────────────────────────────────────────────────────┘
```

**Spaced Repetition Rules:**

- First review: 1 day after learning
- If correct: Next review at 3 days, then 7, then 14
- If wrong: Reset to 1 day, show explanation
- Tracks per command family (not global)
- Dashboard shows "Reviews due: 3" badge
- Can batch reviews or do one at a time

### B. Cumulative Scenarios

Built into Tier 2 and Tier 3 scenarios - later labs require earlier skills.

```
┌─────────────────────────────────────────────────────────────────┐
│  SCENARIO: Multi-Node Training Failure (Tier 3)                 │
│  Domain 4 - Cluster Test & Verification                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SKILLS REQUIRED:                                               │
│  ✓ GPU Monitoring (Domain 2) - check GPU health                │
│  ✓ InfiniBand Tools (Domain 1) - verify network                │
│  ✓ Slurm Commands (Domain 3) - check job allocation            │
│  ○ NCCL Diagnostics (Domain 4) - new skill this scenario       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Cumulative Design:**

- Scenario metadata lists prerequisite skills
- System verifies user has completed those command families
- If user struggles with a prerequisite skill, suggests review
- "Skills Used" summary shown at scenario completion

### C. Pre-Exam Gauntlet

```
┌─────────────────────────────────────────────────────────────────┐
│  🎯 NCP-AII EXAM GAUNTLET                                       │
│  Timed simulation • Random scenarios • All domains              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FORMAT:                                                        │
│  • 10 scenarios drawn randomly from all domains                 │
│  • Weighted by exam blueprint (33% Domain 4, 31% Domain 1...)   │
│  • 45-minute time limit                                         │
│  • Tier 3 difficulty (minimal hints)                            │
│  • No pausing - simulates exam pressure                         │
│                                                                 │
│  YOUR READINESS:                                                │
│  Domain 1 ████████░░ 80%    Domain 4 ██████░░░░ 60%            │
│  Domain 2 ███████░░░ 70%    Domain 5 █████░░░░░ 50%            │
│  Domain 3 █████████░ 90%                                        │
│                                                                 │
│  [Start Gauntlet]                    [Practice Weak Areas]     │
└─────────────────────────────────────────────────────────────────┘
```

**Post-Gauntlet Report:**

```
┌─────────────────────────────────────────────────────────────────┐
│  GAUNTLET RESULTS                              Score: 72%       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TIME: 38:42 / 45:00                                            │
│                                                                 │
│  BY DOMAIN:                                                     │
│  Domain 1 ✓✓✓    3/3 passed                                    │
│  Domain 2 ✓✓     2/2 passed                                    │
│  Domain 3 ✓✗     1/2 passed - struggled with pyxis config      │
│  Domain 4 ✓✓✗    2/3 passed - missed NCCL bandwidth diagnosis  │
│  Domain 5 ✗      0/1 passed - thermal triage took too long     │
│                                                                 │
│  TOOL SELECTION ACCURACY: 68%                                   │
│  • Used dcgmi when nvidia-smi would suffice (2x)               │
│  • Missed ibdiagnet for fabric-wide issues (1x)                │
│                                                                 │
│  RECOMMENDED REVIEW:                                            │
│  1. Domain 5: Thermal troubleshooting workflow                  │
│  2. Domain 4: NCCL diagnostics - bandwidth vs latency          │
│  3. Container commands: pyxis srun integration                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Integration with Existing System

### What Stays the Same

- 56 existing scenarios remain (content is good)
- Scenario JSON structure (steps, validation, hints)
- LabWorkspace.tsx rendering logic
- Progress tracking in simulationStore
- Fault injection system (already exists)

### New Files to Add

```
src/components/
├── CommandFamilyCards.tsx      # Visual tool landscape
├── WhichToolQuiz.tsx           # Pre-scenario quiz
├── ExplanationGate.tsx         # Post-scenario check
├── SpacedReviewDrill.tsx       # 2-min retention drills
└── ExamGauntlet.tsx            # Timed random scenarios

src/data/
├── commandFamilies.json        # Card content + relationships
├── quizQuestions.json          # "Which tool?" scenarios
└── explanationGates.json       # Post-scenario questions

src/utils/
├── spacedRepetition.ts         # Review scheduling algorithm
└── tierProgressionEngine.ts    # Unlock logic for tiers

src/store/
└── learningProgressStore.ts    # Tool coverage, tier status
```

### Enhanced Scenario Schema

```json
{
  "id": "domain1-server-post",
  "tier": 1,
  "commandFamilies": ["bmc-hardware", "gpu-monitoring"],
  "prerequisiteSkills": [],
  "cumulativeSkills": [],
  "explanationGateId": "gate-bmc-basics",
  "steps": [...]
}
```

### New UI Flow in Labs & Scenarios Tab

```
┌─────────────────────────────────────────────────────────────────┐
│  LABS & SCENARIOS                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │ 📚 LEARN        │  │ 🔧 PRACTICE     │  │ 🎯 TEST       │  │
│  │ Command Cards   │  │ Tiered Labs     │  │ Exam Gauntlet │  │
│  │ & Quizzes       │  │ (Tier 1/2/3)    │  │ & Reviews     │  │
│  └─────────────────┘  └─────────────────┘  └────────────────┘  │
│                                                                 │
│  🔔 3 reviews due    │  Progress: 34/56 scenarios              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Metrics to Track

| Metric                     | Purpose                         |
| -------------------------- | ------------------------------- |
| Tool coverage per family   | Ensure breadth before depth     |
| Tier progression (1→2→3)   | Gate advancement appropriately  |
| Accuracy scores            | Measure tool selection skill    |
| Explanation gate pass rate | Verify conceptual understanding |
| Spaced repetition streaks  | Track retention effort          |
| Gauntlet scores over time  | Measure exam readiness          |

---

## Success Criteria

1. Users can articulate _when_ to use each tool in a family, not just _how_
2. Tier 3 completion rate > 60% (currently untested)
3. Gauntlet scores correlate with actual exam performance
4. Users report feeling "prepared" not just "practiced"
5. Reduction in "wrong tool" errors in Tier 2+ scenarios

---

## Open Questions for Implementation

1. Should command family cards be domain-specific or cross-cutting?
2. How many quiz questions per family is enough without being tedious?
3. What's the right hint delay for Tier 2 (currently 90 sec proposed)?
4. Should gauntlet allow partial completion or require full 45 min?
