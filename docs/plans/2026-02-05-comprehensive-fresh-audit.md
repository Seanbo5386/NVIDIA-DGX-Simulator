# Comprehensive Fresh Audit — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Perform a comprehensive, read-only audit of the NVIDIA AI Infrastructure Certification Simulator, producing a single detailed report with actionable findings organized by architecture, simulation realism, exam coverage, state management, scenarios, UX, testing, documentation, performance, and packaging.

**Architecture:** Seven parallel research tasks (one per audit domain cluster) followed by a synthesis task that consolidates findings into the final report. Each research task reads source files, runs diagnostics (tests, lint, build), and produces intermediate markdown notes. The synthesis task merges these into `docs/analysis/2026-02-05-FRESH-AUDIT-REPORT.md`.

**Tech Stack:** React 18, TypeScript, Vite, Zustand, TailwindCSS, xterm.js, D3.js, Vitest, Playwright

---

## Context for the Auditor

This is a **browser-based** NCP-AII certification training simulator (React/TypeScript/Vite), not the Python CLI described in the original review prompt. The review prompt's categories still apply — just adapt references from Python/typer/rich/pydantic to React/TypeScript/Zustand/xterm.js.

Key facts:

- **~69k lines of TypeScript** across ~115 source files
- **19 simulator modules** generating terminal output for nvidia-smi, dcgmi, ibstat, slurm, etc.
- **56+ lab scenarios** in JSON across 5 exam domains
- **150+ exam questions**, 6 command families, 56 explanation gates
- **991 tests** (reported passing), 80+ unit test files, e2e via Playwright
- **Prior analysis** exists at `docs/analysis/COMPREHENSIVE-CODEBASE-ANALYSIS.md` (2026-02-02) — this audit should build on it, not duplicate it. Focus on what's changed, what was missed, and fresh perspective.

Large files to note: `Terminal.tsx` (1207 lines), `LearningPaths.tsx` (1665 lines), `LabWorkspace.tsx` (1020 lines), `App.tsx` (741 lines).

---

## Task 1: Run Diagnostics and Capture Baseline

**Files:** Project root, test output, lint output

**Step 1: Run the full test suite and capture results**

Run: `cd "C:/Users/Seanbo/Documents/Projects/Antigravity-Projects/DC-Sim-011126" && npm run test:run 2>&1 | tail -80`
Expected: Test summary with pass/fail counts

**Step 2: Run the linter and capture results**

Run: `cd "C:/Users/Seanbo/Documents/Projects/Antigravity-Projects/DC-Sim-011126" && npm run lint 2>&1 | tail -50`
Expected: Lint output (warnings/errors if any)

**Step 3: Run the build and capture results**

Run: `cd "C:/Users/Seanbo/Documents/Projects/Antigravity-Projects/DC-Sim-011126" && npm run build 2>&1 | tail -30`
Expected: Build output with bundle sizes

**Step 4: Count `any` types across source files**

Run: `grep -r ":\s*any\b\|as\s*any\b" "C:/Users/Seanbo/Documents/Projects/Antigravity-Projects/DC-Sim-011126/src" --include="*.ts" --include="*.tsx" -c | sort -t: -k2 -nr | head -20`
Expected: Files ranked by `any` usage count

**Step 5: Save diagnostics to `docs/analysis/2026-02-05-diagnostics-baseline.md`**

Create a markdown file with all captured outputs for reference.

**Step 6: Commit**

```bash
git add docs/analysis/2026-02-05-diagnostics-baseline.md
git commit -m "chore: capture diagnostics baseline for fresh audit"
```

---

## Task 2: Audit Architecture & Code Organization

**Files to read (minimum):**

- `src/App.tsx` — main orchestrator (741 lines, flagged as God object)
- `src/components/Terminal.tsx` — terminal component (1207 lines)
- `src/components/LearningPaths.tsx` — learning interface (1665 lines)
- `src/components/LabWorkspace.tsx` — lab workspace (1020 lines)
- `src/simulators/BaseSimulator.ts` — base class pattern
- `src/simulators/CommandInterceptor.ts` — command routing
- `src/store/simulationStore.ts` — main state store
- `src/store/learningProgressStore.ts` — learning state
- `src/store/stateManager.ts` — state orchestration
- `src/cli/index.ts` — CLI barrel export
- `src/cli/CommandDefinitionRegistry.ts` — command registry
- `src/cli/StateEngine.ts` — state engine
- `src/utils/commandRegistry.ts` — old registry (duplication?)
- `src/utils/commandParser.ts` — command parsing
- `src/utils/commandValidator.ts` — validation

**Audit checklist:**

1. Is `App.tsx` still a God object? Has the extraction recommended in the 02-02 analysis happened?
2. Are there duplicate command registry systems (`src/cli/CommandDefinitionRegistry.ts` vs `src/utils/commandRegistry.ts`)?
3. Is `Terminal.tsx` at 1207 lines too large? Can concerns be separated (rendering, input handling, command dispatch)?
4. Does `LearningPaths.tsx` at 1665 lines violate single responsibility?
5. How do the 19 simulators connect to the command routing? Is the pattern consistent?
6. Are there circular dependencies between stores, simulators, and components?
7. Is `src/cli/` fully integrated into the main app, or is it a parallel system?
8. Check for dead code: components imported but never rendered, utilities exported but never called.

**Deliverable:** Write findings to `docs/analysis/2026-02-05-architecture-audit.md`

**Structure for each finding:**

```
### [Finding Title]
- **Severity:** Critical / High / Medium / Low
- **File(s):** exact paths with line ranges
- **Current State:** what exists today
- **Issue:** what's wrong or suboptimal
- **Recommendation:** concrete fix
```

---

## Task 3: Audit Simulation Realism & Accuracy

**Files to read (minimum):**

- `src/simulators/nvidiaSmiSimulator.ts` — nvidia-smi output
- `src/simulators/dcgmiSimulator.ts` — dcgmi output
- `src/simulators/infinibandSimulator.ts` — ibstat, iblinkinfo, etc.
- `src/simulators/slurmSimulator.ts` — sinfo, squeue, scontrol, etc.
- `src/simulators/bcmSimulator.ts` — BCM commands
- `src/simulators/ipmitoolSimulator.ts` — ipmitool output
- `src/simulators/mellanoxSimulator.ts` — mlxconfig, mlxlink, etc.
- `src/simulators/benchmarkSimulator.ts` — HPL, NCCL tests
- `src/simulators/containerSimulator.ts` — docker, enroot, pyxis
- `src/simulators/clusterKitSimulator.ts` — ClusterKit
- `src/simulators/nemoSimulator.ts` — NeMo
- `src/simulators/nvlinkAuditSimulator.ts` — NVLink diagnostics
- `src/data/output/gpu_management/nvidia-smi.json` — JSON command definition
- `src/data/output/gpu_management/dcgmi.json` — JSON command definition
- `src/data/output/networking/ibstat.json` — JSON command definition

**Audit checklist:**

1. **nvidia-smi**: Does the output match real `nvidia-smi` formatting? Check GPU model names (H100 SXM5 80GB vs A100), driver version format (e.g., 535.129.03), CUDA version (12.2), temperature ranges (25-85C typical), power draw ranges, memory formatting (MiB vs GiB), process table format, topology matrix format.
2. **dcgmi**: Are diagnostic levels 1/2/3 properly differentiated? Does `dcgmi diag -r 1` vs `-r 3` produce different output? Is health check formatting accurate?
3. **InfiniBand**: Are GUIDs formatted correctly (0x prefix, 16 hex chars)? Are LID values realistic (1-65535)? Are link speeds correct for NDR (400 Gb/s)?
4. **Slurm**: Do node states (idle, alloc, mix, drain, down) render correctly? Does `scontrol show node` have realistic fields?
5. **Hardware specs**: Verify H100 specs — 80GB HBM3, 700W TDP, 900 GB/s NVLink 4th gen, PCIe Gen5. Verify A100 specs — 80GB/40GB HBM2e, 400W/300W TDP, 600 GB/s NVLink 3rd gen.
6. **Error scenarios**: Are Xid error codes accurate per NVIDIA documentation? Are ECC error formats correct?
7. Does the JSON command definition system (`src/data/output/`) accurately represent real command flags and options?

**Deliverable:** Write findings to `docs/analysis/2026-02-05-realism-audit.md`

Flag any values as "Needs Verification" if uncertain about real hardware behavior.

---

## Task 4: Audit Exam Domain Coverage & Scenario System

**Files to read:**

- All 56 scenario files in `src/data/scenarios/domain1/` through `domain5/`
- `src/data/commandFamilies.json`
- `src/data/quizQuestions.json`
- `src/data/explanationGates.json`
- `src/data/narrativeScenarios.json`
- `src/data/examQuestions.json`
- `src/utils/scenarioLoader.ts`
- `src/utils/scenarioValidator.ts`
- `src/utils/tierProgressionEngine.ts`
- `src/utils/learningPathEngine.ts`
- `src/utils/learningPaths/` (all files)
- `src/types/scenarios.ts`
- `docs/EXAM_COVERAGE.md`

**Audit checklist:**

1. Count scenarios per domain. Are they weighted proportionally to exam weights (D1:31%, D2:5%, D3:19%, D4:33%, D5:12%)?
2. Are all 56 scenario files well-formed JSON matching the schema in `src/types/scenarios.ts`?
3. Do scenarios have proper tier assignments (1/2/3) and command family assignments?
4. Is the `narrativeScenarios.json` structure viable for the planned consolidation from 56 to ~16 scenarios?
5. Are explanation gates aligned with the scenarios they reference?
6. Coverage gaps: What NCP-AII exam objectives are NOT covered by any scenario?
   - D1: NUMA tuning? Custom power profiles? Advanced storage setup?
   - D3: Full Kubernetes GPU operator workflow? BCM HA complete setup?
   - D4: Comprehensive HPL optimization (not just benchmarking)?
   - D5: RMA procedures? Full log analysis workflows?
7. Quiz question quality: Are the 24 quiz questions (4 per family) discriminating enough?
8. Is the progression system (Tier 1 → 2 → 3) actually enforced in the UI?

**Deliverable:** Write findings to `docs/analysis/2026-02-05-coverage-audit.md`

Include a domain-by-domain gap analysis table.

---

## Task 5: Audit State Management, Data Model & Performance

**Files to read:**

- `src/store/simulationStore.ts` — main cluster state
- `src/store/learningProgressStore.ts` — learning progress
- `src/store/learningStore.ts` — learning state (duplicate?)
- `src/store/stateManager.ts` — state orchestration
- `src/store/scenarioContext.ts` — scenario runtime context
- `src/store/tierNotificationStore.ts` — tier notifications
- `src/types/hardware.ts` — hardware type definitions
- `src/types/commands.ts` — command type definitions
- `src/utils/metricsSimulator.ts` — metrics simulation
- `src/utils/metricsHistory.ts` — metrics history
- `src/hooks/useMetricsSimulation.ts` — metrics simulation hook
- `src/hooks/useDebouncedStorage.ts` — debounced localStorage
- `src/data/output/relationships/` — all relationship/state files
- `src/data/output/schema.json` — JSON schema

**Audit checklist:**

1. Are there duplicate/overlapping stores? (`learningProgressStore` vs `learningStore` — what's the difference?)
2. Does `simulationStore` properly handle state interdependencies (GPU temp → clock speed, ECC errors → Xid events)?
3. Can the state engine reach invalid states? (e.g., GPU temp -10C, memory usage > physical memory, 9 GPUs in an 8-GPU system)
4. Is localStorage usage efficient? Was the debouncing recommendation from 02-02 implemented?
5. Is there still a JSON.stringify in a hot metrics path (flagged as Critical #1 in prior analysis)?
6. Are the `src/data/output/relationships/` files (state_domains, state_matrix, propagation_rules, consistency_groups) actually consumed by the application, or are they dead data?
7. Memory leak potential: Do interval timers (metrics simulation) get properly cleaned up on unmount?
8. Bundle size concerns: Are 150+ JSON data files tree-shaken or all loaded at startup?

**Deliverable:** Write findings to `docs/analysis/2026-02-05-state-performance-audit.md`

---

## Task 6: Audit Testing, Quality & CI/CD

**Files to read:**

- All ~80 test files (sample 15-20 representative ones in detail)
- `vitest.config.ts` — test configuration
- `playwright.config.ts` — e2e test configuration
- `.github/workflows/` — CI/CD if present
- `src/tests/soundness/` — all soundness tests
- `src/tests/generator/` — test generator files
- `src/tests/scenarioValidator.test.ts`

**Audit checklist:**

1. Run `npm run test:run` — how many tests pass? How many fail? What's the actual count vs. claimed 991?
2. Test coverage: What percentage of source files have corresponding test files? List uncovered files.
3. Test quality: Sample 10 test files. Are assertions meaningful or just smoke tests? Are edge cases covered?
4. Are there snapshot tests? Output regression tests comparing simulator output against expected baselines?
5. Integration test depth: Do tests verify command → simulator → output pipelines end-to-end?
6. E2e tests: Are the Playwright tests functional? Do they cover critical user flows?
7. Are the `soundness/` tests (boundary conditions, cross-simulator consistency, flag combinations, state transitions) passing and meaningful?
8. CI/CD: Is there a GitHub Actions workflow? Does it run tests, lint, and build on PR?
9. Test infrastructure: Is `src/__tests__/setup.ts` properly configured? Are mocks realistic?
10. Is there any mutation testing or property-based testing?

**Deliverable:** Write findings to `docs/analysis/2026-02-05-testing-audit.md`

---

## Task 7: Audit UX, Documentation & Packaging

**Files to read:**

- `src/components/WelcomeScreen.tsx` — onboarding
- `src/components/SimulatorView.tsx` — main simulator view
- `src/components/Dashboard.tsx` — metrics dashboard
- `src/components/StudyDashboard.tsx` — study dashboard
- `src/components/StudyModes.tsx` — study modes
- `src/components/ExamWorkspace.tsx` — exam workspace
- `src/components/PracticalExams.tsx` — practical exams
- `src/components/ReferenceTab.tsx` — reference tab
- `src/components/StateManagementTab.tsx` — state management
- `src/components/ErrorBoundary.tsx` — error handling
- `README.md` — main readme
- `CONTRIBUTING.md` — contribution guide
- `docs/USAGE.md` — usage docs
- `docs/testing-guide.md` — testing guide
- `package.json` — packaging config
- `vite.config.ts` — build config
- `index.html` — entry point

**Audit checklist:**

1. **UX Flow**: Launch the app (or read the code flow). Can a new user understand what to do within 30 seconds? Is the WelcomeScreen effective?
2. **Navigation**: How many clicks to reach a lab scenario from the landing page? Is it intuitive?
3. **Terminal UX**: Is tab completion working? Are command suggestions helpful? Does `--help` work for all simulated commands?
4. **Accessibility**: Were the WCAG violations from the 02-02 analysis fixed? (Color-only indicators, missing ARIA labels, keyboard navigation)
5. **Error handling**: Does `ErrorBoundary` catch rendering errors? Are terminal errors displayed clearly?
6. **Documentation**: Is README.md comprehensive? Does it cover installation, quickstart, usage?
7. **CONTRIBUTING.md**: Does it exist and is it helpful?
8. **Build/Deploy**: Can someone clone and run `npm install && npm run dev` and have a working app?
9. **UI redundancy**: The 02-05 UI consolidation plan identified redundancy (same features via 3-4 paths). Has this been addressed or is it still present?
10. **Responsive design**: Does the app work on different screen sizes?

**Deliverable:** Write findings to `docs/analysis/2026-02-05-ux-docs-audit.md`

---

## Task 8: Synthesize Final Report

**Prerequisites:** Tasks 1-7 must be complete.

**Files to read:**

- `docs/analysis/2026-02-05-diagnostics-baseline.md`
- `docs/analysis/2026-02-05-architecture-audit.md`
- `docs/analysis/2026-02-05-realism-audit.md`
- `docs/analysis/2026-02-05-coverage-audit.md`
- `docs/analysis/2026-02-05-state-performance-audit.md`
- `docs/analysis/2026-02-05-testing-audit.md`
- `docs/analysis/2026-02-05-ux-docs-audit.md`
- `docs/analysis/COMPREHENSIVE-CODEBASE-ANALYSIS.md` (prior analysis for delta comparison)

**Step 1: Write the executive summary**

Synthesize a 2-paragraph overall health assessment. Identify the top 5 highest-impact improvements with effort estimates.

**Step 2: Compile detailed findings**

Merge all findings from Tasks 2-7 into a single organized report. De-duplicate where multiple tasks found the same issue. Assign severity (Critical/High/Medium/Low) consistently.

**Step 3: Create prioritized action plan**

- **Phase 1 (Critical & Quick Wins):** Items that can be fixed in < 1 day each and have high impact
- **Phase 2 (Realism & Coverage):** Simulation accuracy improvements and exam coverage gaps
- **Phase 3 (Polish & Scale):** UX consolidation, documentation, testing improvements

**Step 4: Create appendix**

- Full file inventory with brief descriptions (from Task 2 exploration)
- Test results and coverage metrics (from Task 1 and 6)
- Lint/build output (from Task 1)
- Spec discrepancies table (from Task 3)
- Delta from prior analysis (what's improved since 02-02, what's still open)

**Step 5: Write the final report**

Save to: `docs/analysis/2026-02-05-FRESH-AUDIT-REPORT.md`

**Step 6: Commit**

```bash
git add docs/analysis/2026-02-05-*.md
git commit -m "docs: comprehensive fresh audit report (2026-02-05)"
```

---

## Execution Notes

- **This is a READ-ONLY audit.** Do NOT modify any source code, components, or data files.
- **Only create files in `docs/analysis/`.** No changes to `src/`, `tests/`, or config files.
- When uncertain about real NVIDIA hardware behavior, flag it as "Needs Verification" — do not guess.
- Reference specific files and line numbers in all findings.
- Build on the prior analysis at `docs/analysis/COMPREHENSIVE-CODEBASE-ANALYSIS.md` — note what has improved and what remains open since 2026-02-02.
- The primary audience is certification candidates who may not have access to real DGX hardware. Every bit of realism matters.
