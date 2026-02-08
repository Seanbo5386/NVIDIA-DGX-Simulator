# Comprehensive Testing Re-Evaluation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring test coverage to ~95%+ across all source files, fix realism issues in simulator outputs, validate all data files, and add regression tests for critical paths.

**Architecture:** 6 batches of work covering realism fixes, untested simulators, critical infrastructure, data validation, component tests, and utility/regression tests. Each batch produces runnable tests that verify both correctness and realism.

**Tech Stack:** Vitest, React Testing Library, jsdom, TypeScript

**Current baseline:** 2,284 tests across 105 files, all passing. 0 TS errors, 0 lint warnings.

---

## Batch 1: Simulator Realism Audit & Fixes (Tasks 1-5)

### Task 1: Fix pciToolsSimulator Realism Issues

**Files:**

- Modify: `src/simulators/pciToolsSimulator.ts`
- Test: `src/simulators/__tests__/pciToolsSimulator.test.ts` (CREATE)

**Realism issues to fix:**

1. journalctl timestamp format: add microseconds and hostname between timestamp and service name
   - Current: `toLocaleString()` producing "Jan 15 08:00:00"
   - Fix: `MMM DD HH:MM:SS.ffffff hostname` format
2. XID error messages: include full PCI context with pid and channel
   - Current: `NVRM: Xid (PCI:0000:${pciAddr}): 79`
   - Fix: `NVRM: Xid (PCI:0000:${pciAddr}): 79, pid=1234, Ch 00000001`

**Tests to write (~30 tests):**

- `lspci` basic output: lists GPU and HCA devices with correct PCI format
- `lspci -v`: verbose output includes subsystem, memory regions, capabilities
- `lspci -vv`: very verbose adds link status, NUMA node
- `lspci -d 10de:`: filters to NVIDIA devices only
- Cross-tool fault propagation: GPU with XID errors shows in lspci verbose
- Thermal warning appears in lspci when GPU temp > 90
- `journalctl -b`: shows boot log entries
- `journalctl -k`: shows kernel messages
- `journalctl -u nvidia-fabricmanager`: shows unit-specific logs
- `journalctl -p err`: filters by priority level
- Timestamp format validation: matches `MMM DD HH:MM:SS` pattern
- XID errors appear in journalctl when GPU has faults
- Empty/no-fault state produces clean output

**Verification:** `npx vitest run src/simulators/__tests__/pciToolsSimulator.test.ts`

---

### Task 2: Fix storageSimulator Realism Issues

**Files:**

- Modify: `src/simulators/storageSimulator.ts`
- Test: `src/simulators/__tests__/storageSimulator.test.ts` (CREATE)

**Realism issues to fix:**

1. Lustre UUID format: use proper `filesystem-MDTnnnn_UUID` format
2. df numeric columns: right-align size/used/avail/percent columns
3. Storage sizes: use realistic HPC scale (1PB+ Lustre, not 100TB)

**Tests to write (~25 tests):**

- `df` basic output: shows filesystems with correct columns
- `df -h`: human-readable sizes (K/M/G/T/P suffixes)
- `df -T`: includes filesystem type column
- `df -i`: shows inode usage
- Column alignment: numeric columns are right-aligned
- `mount`: lists all mounted filesystems with options
- Mount options include correct types (ext4, nfs4, lustre)
- `lfs df`: Lustre filesystem status with MDT/OST listing
- `lfs df -h`: human-readable Lustre sizes
- `lfs check servers`: Lustre connectivity check
- Lustre UUID format validation

**Verification:** `npx vitest run src/simulators/__tests__/storageSimulator.test.ts`

---

### Task 3: Fix fabricManagerSimulator Realism Issues + Tests

**Files:**

- Modify: `src/simulators/fabricManagerSimulator.ts`
- Test: `src/simulators/__tests__/fabricManagerSimulator.test.ts` (CREATE)

**Realism issues to fix:**

1. NVSwitch UUID: use 32-digit hex format `NVSwitch-nnnnnnnn-nnnnnnnn-nnnnnnnn-nnnnnnnn`
2. NVSwitch power: use 60-120W range (not 30-50W)

**Tests to write (~35 tests):**

- `nv-fabricmanager status`: shows service status, fabric health, NVSwitch count
- `nv-fabricmanager query nvswitch`: lists NVSwitches with UUID, status, temp, power
- NVSwitch UUID format: matches 32-hex-digit pattern
- NVSwitch power values: within 60-120W range
- `nv-fabricmanager query topology`: shows topology information
- `nv-fabricmanager query nvlink`: shows NVLink connections
- `nv-fabricmanager start/stop/restart`: service control messages
- `nv-fabricmanager config`: shows configuration file contents
- `nv-fabricmanager diag quick/full/stress/errors/ports`: each diagnostic type
- `nv-fabricmanager topo`: ASCII topology map output
- Unknown subcommand: shows help text
- Empty/no-args: shows help

**Verification:** `npx vitest run src/simulators/__tests__/fabricManagerSimulator.test.ts`

---

### Task 4: Fix nvsmSimulator Realism + Tests

**Files:**

- Modify: `src/simulators/nvsmSimulator.ts`
- Test: `src/simulators/__tests__/nvsmSimulator.test.ts` (CREATE)

**Realism issues to fix:**

1. Dot-leader width: standardize to 70 chars for all health check lines
2. Prompt format: use `>` not `->` (e.g., `nvsm(/systems/localhost)>`)

**Tests to write (~30 tests):**

- `nvsm show health`: health check output with proper dot-leader alignment
- `nvsm show health --detailed`: includes per-GPU details
- Health check dot-leader: all lines same total width (70 chars)
- GPU health checks: temperature, ECC, utilization, NVLink, XID checks present
- Fault-aware: GPU with XID errors shows FAIL in health check
- Fault-aware: GPU with high temperature shows WARNING
- `nvsm dump health`: generates diagnostic tarball output
- Interactive mode: prompt format validation
- CWT navigation: `cd /systems/localhost/gpus`, `show` commands
- `cd` to valid/invalid targets
- `show` at different CWT levels
- `list` command in various modes

**Verification:** `npx vitest run src/simulators/__tests__/nvsmSimulator.test.ts`

---

### Task 5: Fix Remaining Simulator Realism Issues

**Files:**

- Modify: `src/simulators/bcmSimulator.ts`
- Modify: `src/simulators/cmshSimulator.ts`
- Modify: `src/simulators/nvidiaBugReportSimulator.ts`
- Modify: `src/simulators/dcgmiSimulator.ts` (add missing health subsystems)
- Test: `src/simulators/__tests__/bcmSimulator.test.ts` (CREATE)
- Test: `src/simulators/__tests__/cmshSimulator.test.ts` (CREATE)
- Test: `src/simulators/__tests__/nvidiaBugReportSimulator.test.ts` (CREATE)

**Realism fixes:**

- bcmSimulator: Show GPU model in node list (e.g., "8 x H100" not just "8")
- cmshSimulator: Fix table border format (simple pipes, not markdown-style)
- cmshSimulator: Capitalize JSON field names (Hostname, IPAddress, Category)
- nvidiaBugReportSimulator: Add 10+ more common XID codes (8, 14, 94, 95, etc.)
- dcgmiSimulator: Add missing health subsystems (Driver, CUDA, Volatile DBE, Persistence) to health check

**Tests to write per simulator:**

**bcmSimulator (~25 tests):**

- `bcm-node list`: table output with columns, node entries
- `bcm-node show <id>`: detailed node info
- `bcm ha status`: HA cluster status with Pacemaker output
- `bcm job list`: deployment job listing
- `bcm job logs <id>`: job log entries with timestamps
- `bcm validate pod`: SuperPOD validation checks
- `crm status`: Pacemaker cluster resource status
- GPU model shown in node list

**cmshSimulator (~20 tests):**

- Interactive mode: prompt includes cluster name
- `device` mode: list, use, show commands
- `category` mode: list categories
- `softwareimage` mode: list software images
- `partition` mode: list partitions
- `list -d {}`: JSON output with correct field names
- `list -f <fields>`: filtered field display
- Table border format: simple pipes without box chars

**nvidiaBugReportSimulator (~20 tests):**

- Basic report generation: produces structured output with sections
- `-o <file>`: custom output filename
- `-v`: verbose mode produces more output
- `--no-compress`: uncompressed output
- `--extra-system-data`: additional system info
- Report sections: System Info, GPU Info, Driver Info, XID Summary, Recommendations
- XID database: common codes (79, 74, 48, 63, 43, 8, 14, 94, 95) all have descriptions
- Fault-aware: GPU with faults shows in report recommendations
- Power limit warnings when GPU near limit

**Verification:** `npx vitest run src/simulators/__tests__/bcmSimulator.test.ts src/simulators/__tests__/cmshSimulator.test.ts src/simulators/__tests__/nvidiaBugReportSimulator.test.ts`

---

## Batch 2: Critical Infrastructure Tests (Tasks 6-9)

### Task 6: scenarioContext Unit Tests

**Files:**

- Test: `src/store/__tests__/scenarioContext.test.ts` (CREATE)

**Tests to write (~35 tests):**

- `ScenarioContext` constructor: deep-clones cluster state
- Mutation isolation: changes to context don't affect source cluster
- `getCluster()`: returns deep-cloned cluster
- `getNode(nodeId)`: finds correct node from cloned cluster
- `updateGPU()`: updates GPU properties in cloned state
- `addXIDError()`: adds XID error to correct GPU
- `updateNodeHealth()`: updates node health status
- Mutation tracking: `getMutations()` lists all mutations made
- `reset()`: restores to original deep-cloned state
- Multiple contexts: different scenarios have independent state
- `ScenarioContextManager.createContext()`: creates new context
- `ScenarioContextManager.getContext()`: retrieves by ID
- `ScenarioContextManager.getActiveContext()`: returns active
- `ScenarioContextManager.setActiveContext()`: sets active
- `ScenarioContextManager.deleteContext()`: removes context
- `ScenarioContextManager.clearAll()`: removes all contexts
- Active context is null after clearAll
- Deep clone includes nested arrays (gpus, nvlinks, xidErrors)

**Verification:** `npx vitest run src/store/__tests__/scenarioContext.test.ts`

---

### Task 7: scenarioLoader Unit Tests

**Files:**

- Test: `src/utils/__tests__/scenarioLoader.test.ts` (CREATE)

**Tests to write (~25 tests):**

- `loadScenarioFromFile()`: returns scenario for valid ID
- `loadScenarioFromFile()`: returns null for invalid ID
- `getAllScenarios()`: returns scenarios grouped by domain
- `getAllScenarios()`: all 5 domains have scenarios
- `getScenarioMetadata()`: returns title, difficulty, estimatedTime
- `getScenarioMetadata()`: returns null for invalid ID
- `getScenariosByDomain()`: returns correct domain scenarios
- `getScenariosByDomain()`: returns empty array for invalid domain
- Cache behavior: multiple calls return same references (cache hit)
- `applyScenarioFaults()`: applies xid-error fault to global store
- `applyScenarioFaults()`: applies thermal fault
- `applyScenarioFaults()`: applies ecc-error fault
- `applyScenarioFaults()`: applies nvlink-failure fault
- `applyScenarioFaults()`: applies gpu-hang fault
- `applyScenarioFaults()`: applies power fault
- `applyScenarioFaults()`: applies memory-full fault
- `applyScenarioFaults()`: ignores fault with undefined gpuId
- `applyFaultsToContext()`: applies faults to ScenarioContext (not global)
- `clearAllFaults()`: resets all GPUs to healthy defaults
- `initializeScenario()`: creates sandbox context and loads scenario
- `initializeScenario()`: applies scenario-level faults
- `initializeScenario()`: applies first step's autoFaults
- `initializeScenario()`: returns false for invalid scenario ID

**Verification:** `npx vitest run src/utils/__tests__/scenarioLoader.test.ts`

---

### Task 8: FaultInjection Component Tests

**Files:**

- Test: `src/components/__tests__/FaultInjection.test.tsx` (CREATE)

**Tests to write (~20 tests):**

- Renders fault injection panel with controls
- Shows node selection dropdown
- Shows GPU selection dropdown
- Shows fault type selection
- Injects XID error: calls correct store/context method
- Injects thermal fault: sets GPU temperature
- Injects ECC error: sets ECC error counts
- Injects NVLink failure: sets GPU health to Warning
- Injects GPU hang: sets utilization to 0
- Clear faults button: resets all GPU states
- Routes to ScenarioContext when active scenario exists
- Routes to global store when no active scenario
- Workload simulation: creates synthetic GPU load
- Scenario injection: applies predefined fault scenario
- Fault type descriptions are shown

**Verification:** `npx vitest run src/components/__tests__/FaultInjection.test.tsx`

---

### Task 9: FreeMode Component Tests

**Files:**

- Test: `src/components/__tests__/FreeMode.test.tsx` (CREATE)

**Tests to write (~15 tests):**

- Renders without crash
- Shows "Free Mode" header/indicator
- Shows "Exit" button that calls onClose
- Creates ScenarioContext on mount
- Cleans up ScenarioContext on unmount
- Shows FaultInjection panel
- Shows Terminal component
- Reset button: calls context.reset() or creates fresh context
- No step progression UI (no "Next Step" buttons)
- No validation/progress tracking visible
- Layout: fault panel and terminal side by side

**Verification:** `npx vitest run src/components/__tests__/FreeMode.test.tsx`

---

## Batch 3: Data Validation Tests (Tasks 10-12)

### Task 10: examQuestions.json Schema Validation

**Files:**

- Test: `src/data/__tests__/examQuestions.test.ts` (CREATE)

**Tests to write (~25 tests):**

- All questions have required fields: id, domain, question, options, correctAnswer
- All question IDs are unique
- All domains are valid (1-5)
- Each domain has questions proportional to exam weight (domain4 33% should have most)
- All options arrays have exactly 4 choices
- correctAnswer is always one of the options
- No duplicate questions (by question text)
- All questions have explanations
- Domain distribution: domain1 ~31%, domain4 ~33%, domain3 ~19%
- Total question count >= 150
- No empty strings in question text or options
- Answer options don't repeat within a question

**Verification:** `npx vitest run src/data/__tests__/examQuestions.test.ts`

---

### Task 11: commandFamilies.json and quizQuestions.json Validation

**Files:**

- Test: `src/data/__tests__/commandFamilies.test.ts` (CREATE)
- Test: `src/data/__tests__/quizQuestions.test.ts` (CREATE)

**commandFamilies tests (~15 tests):**

- All 6 families present: gpu-monitoring, infiniband-tools, bmc-hardware, cluster-tools, container-tools, diagnostics
- Each family has: id, name, tools, tagline, bestFor
- All tools arrays are non-empty
- Tool names match actual simulator commands
- No duplicate family IDs
- bestFor descriptions are non-empty
- Taglines are concise (< 100 chars)

**quizQuestions tests (~15 tests):**

- All questions have: id, familyId, scenario, choices, correctAnswer, explanation, whyNotOthers
- All familyIds reference valid command families
- correctAnswer is in choices array
- whyNotOthers covers all non-correct choices
- Each family has at least 4 quiz questions
- No duplicate question IDs
- Difficulty field is valid (beginner/intermediate/advanced)
- Scenarios are non-empty strings

**Verification:** `npx vitest run src/data/__tests__/commandFamilies.test.ts src/data/__tests__/quizQuestions.test.ts`

---

### Task 12: Existing Data Test Updates

**Files:**

- Modify: `src/data/__tests__/narrativeScenarios.test.ts` (update for 28 scenarios + autoFaults)

**Tests to add (~10 tests):**

- Scenarios with autoFaults: all autoFaults have valid fault types
- autoFaults have valid nodeId and gpuId references
- All expectedCommands match real simulator commands
- Multi-node scenarios: steps reference valid node IDs
- Step validation types are valid (command, output, quiz, multi-command)
- requireAllCommands flag is boolean when present
- commandPattern fields are valid regex strings
- All scenario difficulty levels are valid

**Verification:** `npx vitest run src/data/__tests__/narrativeScenarios.test.ts`

---

## Batch 4: Component Tests - Part 1 (Tasks 13-17)

### Task 13: Documentation Component Tests

**Files:**

- Test: `src/components/__tests__/Documentation.test.tsx` (CREATE)

**Tests to write (~15 tests):**

- Renders with default Architecture tab active
- Tab switching: Architecture, Commands, Troubleshooting, XID Reference, Exam Guide
- Architecture tab: shows system overview content
- Commands tab: shows searchable command list from taskCategories
- Commands tab: search filters commands by name
- Commands tab: categories are collapsible
- Commands tab: expanding a command shows Common Usage, Key Options, Related
- Troubleshooting tab: shows troubleshooting guides
- XID Reference tab: shows XID error codes
- Exam Guide tab: shows exam preparation content
- Tab keyboard navigation works (left/right arrows)

**Verification:** `npx vitest run src/components/__tests__/Documentation.test.tsx`

---

### Task 14: LabsAndScenariosView Tests

**Files:**

- Test: `src/components/__tests__/LabsAndScenariosView.test.tsx` (CREATE)

**Tests to write (~20 tests):**

- Renders scenario cards for all domains
- Domain filter: clicking domain shows only that domain's scenarios
- Scenario card shows: title, difficulty, estimated time, domain badge
- Start button calls onStartScenario with correct ID
- Learning Paths button calls onOpenLearningPaths
- Study Dashboard button calls onOpenStudyDashboard
- Exam Gauntlet button calls onOpenExamGauntlet
- Free Mode card: locked when < 3 scenarios completed
- Free Mode card: unlocked when >= 3 scenarios completed
- Free Mode button calls onOpenFreeMode when unlocked
- Learning progress indicator shows completed/total
- Begin Exam button calls onBeginExam

**Verification:** `npx vitest run src/components/__tests__/LabsAndScenariosView.test.tsx`

---

### Task 15: ExamWorkspace Tests

**Files:**

- Test: `src/components/__tests__/ExamWorkspace.test.tsx` (CREATE)

**Tests to write (~15 tests):**

- Renders exam workspace with close button
- Close button calls onClose callback
- Shows exam question with options
- Selecting an answer highlights the option
- Submit button advances to next question
- Timer display shows remaining time
- Progress indicator shows current/total questions
- Completing all questions shows results summary
- Results show score percentage
- Results show domain breakdown

**Verification:** `npx vitest run src/components/__tests__/ExamWorkspace.test.tsx`

---

### Task 16: WelcomeScreen and StudyDashboard Tests

**Files:**

- Test: `src/components/__tests__/WelcomeScreen.test.tsx` (CREATE)
- Test: `src/components/__tests__/StudyDashboard.test.tsx` (CREATE)

**WelcomeScreen tests (~10 tests):**

- Renders welcome content
- Shows "Get Started" or close button
- Close button calls onClose
- Focus trap: Tab cycles within modal
- Escape key closes modal
- Animated entrance on mount

**StudyDashboard tests (~12 tests):**

- Renders dashboard with study mode options
- Shows domain progress overview
- Full Practice mode button calls onStartExam("full-practice")
- Quick Quiz mode button calls onStartExam("quick-quiz")
- Close button calls onClose
- Shows accuracy statistics
- Shows command proficiency breakdown

**Verification:** `npx vitest run src/components/__tests__/WelcomeScreen.test.tsx src/components/__tests__/StudyDashboard.test.tsx`

---

### Task 17: Visualization Component Tests

**Files:**

- Test: `src/components/__tests__/ClusterHeatmap.test.tsx` (CREATE)
- Test: `src/components/__tests__/ClusterBuilder.test.tsx` (CREATE)

**ClusterHeatmap tests (~10 tests):**

- Renders heatmap grid for all nodes/GPUs
- Color coding: cool (green) for low util, warm (red) for high util
- Shows GPU utilization percentages
- Updates when GPU state changes
- Shows node labels

**ClusterBuilder tests (~10 tests):**

- Renders cluster configuration UI
- Shows current cluster configuration
- Node count selector
- GPU count per node selector
- Cluster name input
- Apply configuration creates new cluster

**Verification:** `npx vitest run src/components/__tests__/ClusterHeatmap.test.tsx src/components/__tests__/ClusterBuilder.test.tsx`

---

## Batch 5: Component Tests - Part 2 (Tasks 18-21)

### Task 18: Remaining Visualization Components

**Files:**

- Test: `src/components/__tests__/SlurmJobVisualizer.test.tsx` (CREATE)
- Test: `src/components/__tests__/FabricHealthSummary.test.tsx` (CREATE)
- Test: `src/components/__tests__/DomainProgressCards.test.tsx` (CREATE)

**SlurmJobVisualizer tests (~10 tests):**

- Renders GPU allocation grid
- Shows running jobs with names and IDs
- Color-codes jobs
- Shows allocated vs free GPUs
- Job details on click/hover

**FabricHealthSummary tests (~8 tests):**

- Renders fabric health overview
- Shows NVSwitch status
- Shows InfiniBand port status
- Color-codes health: green (OK), yellow (Warning), red (Critical)

**DomainProgressCards tests (~8 tests):**

- Renders cards for all 5 domains
- Shows progress percentage per domain
- Shows domain title and weight
- Progress bar fills correctly

**Verification:** `npx vitest run src/components/__tests__/SlurmJobVisualizer.test.tsx src/components/__tests__/FabricHealthSummary.test.tsx src/components/__tests__/DomainProgressCards.test.tsx`

---

### Task 19: OverallProgressDashboard and CertificationResources

**Files:**

- Test: `src/components/__tests__/OverallProgressDashboard.test.tsx` (CREATE)
- Test: `src/components/__tests__/CertificationResources.test.tsx` (CREATE)

**OverallProgressDashboard tests (~10 tests):**

- Renders overall progress with readiness score
- Shows domain breakdown
- Shows strengths and weaknesses
- Shows study recommendations
- Progress ring displays correctly

**CertificationResources tests (~10 tests):**

- Renders resource categories: overview, domains, tips, quickref, docs
- Shows domain information with weights
- Shows key commands per domain
- Quick reference sheet generation
- Study guide generation

**Verification:** `npx vitest run src/components/__tests__/OverallProgressDashboard.test.tsx src/components/__tests__/CertificationResources.test.tsx`

---

### Task 20: StudyModes and Minor Components

**Files:**

- Test: `src/components/__tests__/StudyModes.test.tsx` (CREATE)
- Test: `src/components/__tests__/MetricsChart.test.tsx` (CREATE)
- Test: `src/components/__tests__/IBCableTracer.test.tsx` (CREATE)

**StudyModes tests (~8 tests):**

- Renders study mode selector
- Shows available modes: guided, practice, timed
- Mode selection callback fires

**MetricsChart tests (~8 tests):**

- Renders chart with GPU metrics
- Shows temperature, power, utilization lines
- Responds to data updates
- Shows legend

**IBCableTracer tests (~8 tests):**

- Renders cable tracing interface
- Shows port connections
- Highlights selected cable path
- Shows cable status

**Verification:** `npx vitest run src/components/__tests__/StudyModes.test.tsx src/components/__tests__/MetricsChart.test.tsx src/components/__tests__/IBCableTracer.test.tsx`

---

### Task 21: Stale Test Cleanup

**Files:**

- Review: `src/components/__tests__/ReferenceTab.test.tsx` - may reference removed ReferenceTab component
- Review: All test files for imports of deleted components (StateManagementPanel, StateManagementTab, stateManager)

**Actions:**

- If ReferenceTab.test.tsx references the old ReferenceTab component that was replaced by Documentation, update or remove it
- Check for any tests importing deleted modules (stateManager, StateManagementPanel, StateManagementTab)
- Fix any broken imports in existing tests
- Remove truly stale tests

**Verification:** `npx vitest run` (full suite must pass)

---

## Batch 6: Utilities, Hooks & Regression Tests (Tasks 22-26)

### Task 22: Untested Utility Tests

**Files:**

- Test: `src/utils/__tests__/commandValidator.test.ts` (CREATE)
- Test: `src/utils/__tests__/hintManager.test.ts` (CREATE)
- Test: `src/utils/__tests__/commandMetadata.test.ts` (CREATE)

**commandValidator tests (~15 tests):**

- Validates correct commands against expected
- Rejects invalid commands
- Partial match handling
- Case sensitivity handling
- Tracks command history per step
- requireAllCommands mode
- commandPattern regex matching

**hintManager tests (~10 tests):**

- Returns hints for current step
- Hint progression (hint 1, hint 2, hint 3)
- No more hints after all shown
- Reset hints on step change
- Hint cooldown timing

**commandMetadata tests (~10 tests):**

- Returns metadata for known commands
- Returns null for unknown commands
- Includes description, usage, examples
- Category mapping is correct

**Verification:** `npx vitest run src/utils/__tests__/commandValidator.test.ts src/utils/__tests__/hintManager.test.ts src/utils/__tests__/commandMetadata.test.ts`

---

### Task 23: Remaining Utility Tests

**Files:**

- Test: `src/utils/__tests__/pipeHandler.test.ts` (CREATE)
- Test: `src/utils/__tests__/outputTemplates.test.ts` (CREATE)
- Test: `src/utils/__tests__/studyProgressTracker.test.ts` (CREATE)
- Test: `src/utils/__tests__/metricsHistory.test.ts` (CREATE)

**pipeHandler tests (~10 tests):**

- Parses `cmd1 | cmd2` pipe syntax
- Chains grep filter on output
- Handles `| head -n N`
- Handles `| tail -n N`
- Handles `| wc -l` (line count)
- Multiple pipes `cmd1 | cmd2 | cmd3`
- Empty output through pipe

**outputTemplates tests (~8 tests):**

- Table formatting functions produce aligned columns
- Header/separator generation
- ANSI color code insertion
- Box-drawing character templates

**studyProgressTracker tests (~8 tests):**

- Tracks study session duration
- Records commands practiced
- Calculates accuracy percentage
- Persists to localStorage

**metricsHistory tests (~8 tests):**

- Records metric snapshots
- Retrieves history for time range
- Circular buffer behavior (old entries removed)
- Per-GPU metric tracking

**Verification:** `npx vitest run src/utils/__tests__/pipeHandler.test.ts src/utils/__tests__/outputTemplates.test.ts src/utils/__tests__/studyProgressTracker.test.ts src/utils/__tests__/metricsHistory.test.ts`

---

### Task 24: Hook Tests

**Files:**

- Test: `src/hooks/__tests__/useLabFeedback.test.ts` (CREATE)
- Test: `src/hooks/__tests__/useMetricsSimulation.test.ts` (CREATE)
- Test: `src/hooks/__tests__/useReducedMotion.test.ts` (CREATE)

**useLabFeedback tests (~8 tests):**

- Returns feedback for correct commands
- Returns feedback for incorrect commands
- Feedback includes hints
- Feedback severity levels

**useMetricsSimulation tests (~8 tests):**

- Starts interval when isRunning=true
- Stops interval when isRunning=false
- Updates GPU temperatures within realistic bounds
- Updates GPU utilization
- Cleans up interval on unmount

**useReducedMotion tests (~6 tests):**

- Returns true when prefers-reduced-motion is set
- Returns false when no preference
- Updates on media query change
- Works in jsdom (fallback behavior)

**Verification:** `npx vitest run src/hooks/__tests__/useLabFeedback.test.ts src/hooks/__tests__/useMetricsSimulation.test.ts src/hooks/__tests__/useReducedMotion.test.ts`

---

### Task 25: Regression & Integration Tests

**Files:**

- Test: `src/__tests__/criticalPaths.test.ts` (CREATE)
- Modify: `src/__tests__/sandboxIsolation.test.ts` (add Free Mode tests)

**criticalPaths tests (~20 tests):**

- Scenario start -> step progression -> completion flow
- Exam start -> question answering -> score calculation
- Fault injection -> simulator output reflects fault -> clear fault -> clean output
- Quiz score -> learningProgressStore update -> tier progression check
- Spaced repetition: schedule creation -> due review calculation -> review completion
- Command family card progress: tool usage tracking
- Learning path tier unlock: tier 1 complete -> tier 2 unlock criteria
- Export/import cluster: roundtrip preserves all state

**sandboxIsolation additions (~8 tests):**

- Free Mode: creates sandbox context
- Free Mode: faults don't leak to global
- Free Mode: exit cleans up context
- Free Mode: reset restores clean state
- Free Mode exit -> scenario start has clean state

**Verification:** `npx vitest run src/__tests__/criticalPaths.test.ts src/__tests__/sandboxIsolation.test.ts`

---

### Task 26: Final Verification & Cleanup

**Actions:**

1. Run full test suite: `npx vitest run`
2. Run TypeScript check: `npx tsc --noEmit`
3. Run linter: `npm run lint`
4. Generate coverage report: `npx vitest run --coverage` (if configured)
5. Count total tests and files
6. Update MEMORY.md with new test counts

**Expected outcomes:**

- ~3,000+ tests across ~140+ files
- All tests passing
- 0 TypeScript errors
- 0 lint warnings
- ~90%+ file coverage

---

## Dependency Order

```
Batch 1 (Tasks 1-5): Independent, can run in parallel
Batch 2 (Tasks 6-9): After Batch 1 (realism fixes may affect test expectations)
Batch 3 (Tasks 10-12): Independent of Batches 1-2, can run in parallel
Batch 4 (Tasks 13-17): Independent, can run in parallel
Batch 5 (Tasks 18-21): After Batch 4 (may share mock patterns)
Batch 6 (Tasks 22-26): After all above (regression tests validate everything)
```

Within each batch, tasks are independent and can be parallelized.

---

## Verification

After all tasks:

1. `npx tsc --noEmit` - 0 errors
2. `npm run lint` - 0 warnings
3. `npx vitest run` - all tests pass
4. `npm run build` - succeeds
5. Baseline comparison: new test count vs 2,284 starting baseline
