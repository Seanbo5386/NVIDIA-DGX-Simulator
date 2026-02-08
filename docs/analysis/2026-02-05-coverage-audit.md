# Exam Domain Coverage & Scenario System Audit

**Date:** 2026-02-05
**Auditor:** Task 4 (Automated)
**Branch:** feature/cli-command-updates
**Scope:** Exam domain coverage, scenario system, quiz quality, tier progression, spaced repetition

---

## 1. Executive Summary

The simulator contains a robust multi-layered learning system with:

- **~56 scenario IDs** mapped in the scenario loader (the code comments say 53, but the actual `getAllScenarios()` lists 14 + 6 + 13 + 15 + 14 = **62 unique scenario IDs**)
- **16 narrative scenarios** in `narrativeScenarios.json` (consolidated story-based format)
- **56 explanation gates** in `explanationGates.json`
- **~142+ exam questions** in `examQuestions.json` (q001 through q143+, with IDs seen up to q143)
- **24 "Which Tool?" quiz questions** in `quizQuestions.json` (4 per family x 6 families)
- **6 command families** with 21 total tools

The scenario count has grown beyond the original 56 target. The scenario loader maps approximately 62 distinct scenario IDs, while the metadata function lists 59 entries. There are counting discrepancies between different functions in `scenarioLoader.ts`.

---

## 2. Scenario Count Per Domain vs. Exam Weights

### Scenario Loader (`getAllScenarios()`) Counts

| Domain                                   | Exam Weight | Scenario Count | Actual % | Gap           |
| ---------------------------------------- | ----------- | -------------- | -------- | ------------- |
| Domain 1: Systems & Server Bring-Up      | 31%         | 14             | 22.6%    | Under by 8.4% |
| Domain 2: Physical Layer Management      | 5%          | 6              | 9.7%     | Over by 4.7%  |
| Domain 3: Control Plane Installation     | 19%         | 13             | 21.0%    | Over by 2.0%  |
| Domain 4: Cluster Test & Verification    | 33%         | 15             | 24.2%    | Under by 8.8% |
| Domain 5: Troubleshooting & Optimization | 12%         | 14             | 22.6%    | Over by 10.6% |
| **Total**                                | **100%**    | **62**         | **100%** |               |

### Analysis of Proportionality

**Domain 4 is significantly underweighted.** It represents 33% of the actual exam but only 24.2% of scenarios. Given it is the heaviest-weighted domain, it needs at least 5-6 more scenarios to reach proportional representation.

**Domain 5 is significantly overweighted.** At 12% exam weight, it has 14 scenarios (22.6%) -- nearly double its proportional share.

**Domain 2 is overweighted** but this is justified since it has the smallest absolute count (6) and needs minimum coverage for the MIG/NVLink topics.

**Domain 1 is slightly underweighted** at 22.6% vs 31% target. The 14 scenarios are substantial but could use 5-6 more for proportionality.

### Narrative Scenarios (16 total in narrativeScenarios.json)

| Domain   | Count | Scenarios                                                                            |
| -------- | ----- | ------------------------------------------------------------------------------------ |
| Domain 1 | 4     | midnight-deployment, firmware-emergency, driver-disaster, rack-expansion             |
| Domain 2 | 2     | nvlink-mystery, pcie-puzzle                                                          |
| Domain 3 | 3     | slurm-setup, container-crisis, storage-showdown                                      |
| Domain 4 | 4     | silent-cluster, bandwidth-bottleneck, nccl-nightmare, (plus 1 HPL scenario inferred) |
| Domain 5 | 3     | (thermal-cycling, memory-phantom, and 1 additional XID-based)                        |

The narrative scenarios serve as a consolidated story-based alternative to the 62 atomic scenarios. Each narrative scenario contains 10 steps with embedded quizzes, making them more engaging than the individual scenario files.

---

## 3. Scenario JSON Schema Compliance

### Type Definition (from `src/types/scenarios.ts`)

The `Scenario` interface requires:

- `id`, `title`, `domain`, `difficulty`, `description`, `learningObjectives`
- `faults: FaultInjectionConfig[]`
- `steps: ScenarioStep[]`
- `successCriteria: string[]`
- `estimatedTime: number`
- Optional: `tier`, `commandFamilies`, `prerequisiteSkills`, `cumulativeSkills`, `explanationGateId`, `toolHints`

### Findings

1. **Scenario files referenced but not physically present on disk.** The `Glob` search for `src/data/scenarios/**/*.json` returned **zero files**. The `scenarioLoader.ts` maps 62 scenario IDs to file paths like `/src/data/scenarios/domain1/bmc-configuration.json`, but these files do not exist on the filesystem. This means:
   - Scenario loading via `loadScenarioFromFile()` would fail for all scenarios
   - The `fetch(filePath)` calls would return 404 errors
   - **CRITICAL: The scenario file system is broken -- no individual scenario JSON files exist**

2. **Narrative scenarios are well-formed.** The `narrativeScenarios.json` file is valid JSON with consistent structure: each scenario has `id`, `domain`, `title`, `narrative` (hook/setting/resolution), `commandFamilies`, `estimatedMinutes`, and 10 `steps` with `validation` objects.

3. **Schema mismatch between systems.** The narrative scenario format uses a different schema than the `Scenario` TypeScript interface:
   - Narrative: `narrative.hook`, `narrative.setting`, `validation.type/command/pattern`
   - TypeScript: `description`, `faults`, `validationRules`
   - These are two incompatible systems that appear to coexist

---

## 4. Tier Assignments and Command Family Assignments

### Tier System Design (from `tierProgressionEngine.ts`)

- **Tier 1 (Guided):** Always unlocked
- **Tier 2 (Choice):** Requires quiz passed AND all tools in family used
- **Tier 3 (Realistic):** Requires 80%+ accuracy AND explanation gate passed

### Findings

1. **Individual scenario files do not exist**, so tier and commandFamily fields cannot be verified at the file level.

2. **The scenario loader metadata assigns difficulty levels** (beginner/intermediate/advanced) but does not assign explicit tier numbers (1/2/3). The `getScenarioMetadata()` function provides `difficulty` but not `tier`.

3. **The Scenario TypeScript interface includes `tier?: 1 | 2 | 3`** as optional, meaning scenarios may or may not have tier assignments.

4. **Narrative scenarios do not have tier fields.** They have `commandFamilies` arrays but no `tier` field, meaning the tier progression system cannot be applied to narrative scenarios.

5. **Tier enforcement in code.** The `isTierUnlocked()` function correctly implements the tier gate logic. Tier 2 requires `checkTier2Requirements()` (quiz passed + all tools used) and Tier 3 requires `checkTier3Requirements()` (quiz score >= 80% + explanation gate passed). **The logic is sound but depends on data that may not be populated.**

---

## 5. Narrative Scenarios Consolidation Viability

### Current State

The 16 narrative scenarios in `narrativeScenarios.json` represent a viable consolidation from 62 atomic scenarios because:

1. **Each narrative covers 10 steps** spanning multiple command families (typically 3-4 families per scenario)
2. **Embedded quizzes** (2-4 per narrative) replace standalone explanation gates
3. **Story-driven context** provides motivation and realistic workflow
4. **Time estimates are reasonable** (20-28 minutes each)

### Viability Assessment: YES, with caveats

**Strengths:**

- 16 narratives x 10 steps = 160 practice interactions (vs. ~62 individual scenarios with fewer steps each)
- Multi-family coverage per narrative provides cross-domain learning
- Story hooks create engagement that isolated scenarios lack
- Embedded quizzes test understanding in context

**Weaknesses:**

- Domain 2 has only 2 narratives (may need 1 more for MIG depth)
- No narrative covers full Kubernetes GPU Operator workflow
- BCM HA is not represented in narratives
- Narrative format makes tier progression harder to implement
- The narrative schema is incompatible with the TypeScript `Scenario` interface

**Recommendation:** The narrative system IS viable as the primary learning mode, but needs:

- Adapter layer to bridge narrative format with the tier progression engine
- 2-3 additional narratives for underrepresented topics
- Integration with the explanation gate system

---

## 6. Explanation Gates Alignment

### Count: 56 explanation gates

The gates reference scenario IDs matching the loader's mapping:

| Domain   | Gate Count | Sample Gate IDs                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain 1 | 7          | gate-domain1-bmc-config, gate-domain1-bmc-security, gate-domain1-firmware-verification, gate-domain1-driver-troubleshoot, gate-domain1-gpu-discovery, gate-domain1-uefi-validation                                                                                                                                                                                                                                                                                         |
| Domain 2 | 7          | gate-domain2-nvlink-topo, gate-domain2-nvlink-recovery, gate-domain2-mig-setup, gate-domain2-advanced-mig, gate-domain2-gpu-power, gate-domain2-bluefield-dpu                                                                                                                                                                                                                                                                                                              |
| Domain 3 | 13         | gate-domain3-storage, gate-domain3-slurm-config, gate-domain3-slurm-gres, gate-domain3-containers, gate-domain3-nfs-tuning, gate-domain3-dcgm-policy, gate-domain3-k8s-gpu-operator, gate-domain3-mixed-gpu-gres, gate-domain3-slurm-full-setup, gate-domain3-lustre-validation, gate-domain3-bcm-ha, gate-domain3-ngc-pipeline, gate-domain3-pyxis-advanced                                                                                                               |
| Domain 4 | 17         | gate-domain4-perf-baseline, gate-domain4-gpu-reset, gate-domain4-clusterkit, gate-domain4-burn-in, gate-domain4-ecc-investigation, gate-domain4-dcgmi-diag, gate-domain4-ai-validation, gate-domain4-cluster-health, gate-domain4-gpu-bandwidth, gate-domain4-nccl-tuning, gate-domain4-ib-stress, gate-domain4-nccl-test, gate-domain4-nccl-multinode, gate-domain4-multinode-nccl, gate-domain4-gpudirect-rdma, gate-domain4-hpl-optimization, gate-domain4-hpl-workflow |
| Domain 5 | 12         | gate-domain5-physical-inspection, gate-domain5-cable-diagnostics, gate-domain5-container-gpu, gate-domain5-memory-leak, gate-domain5-pcie-diagnosis, gate-domain5-xid-hardware, gate-domain5-xid-nvlink, gate-domain5-xid-triage, gate-domain5-ib-partitioning, gate-domain5-driver-mismatch, gate-domain5-critical-xid, gate-domain5-xid-errors, gate-domain5-sel-analysis, gate-domain5-thermal                                                                          |

### Alignment Issue

Every explanation gate references a `scenarioId` that maps to a scenario in the loader. However, since the actual scenario JSON files do not exist on disk, the gates are aligned with scenario IDs that cannot be loaded. The gates themselves are well-formed and test relevant knowledge per family.

---

## 7. Coverage Gap Analysis -- NCP-AII Exam Objectives

### Domain 1: Systems and Server Bring-Up (31%)

| Objective                              | Covered? | Scenario(s)                                                                  | Gap Notes                                |
| -------------------------------------- | -------- | ---------------------------------------------------------------------------- | ---------------------------------------- |
| Server POST and BIOS verification      | YES      | domain1-server-post, domain1-uefi-validation                                 | Good                                     |
| BMC configuration and monitoring       | YES      | domain1-bmc-config, domain1-bmc-security, domain1-bmc-ipmi                   | Good coverage                            |
| GPU driver installation and validation | YES      | domain1-driver-install, domain1-driver-troubleshoot, domain1-driver-rollback | Good                                     |
| Firmware verification and updates      | YES      | domain1-firmware-verification, domain1-firmware-update                       | Good                                     |
| GPU discovery and topology             | YES      | domain1-gpu-discovery                                                        | Adequate                                 |
| Fabric Manager setup                   | YES      | domain1-fabric-manager                                                       | Covered                                  |
| Hardware inventory                     | YES      | domain1-hw-inventory                                                         | Good                                     |
| NUMA tuning                            | PARTIAL  | Mentioned in narrative HPL scenario                                          | **No dedicated scenario**                |
| Custom power profiles                  | PARTIAL  | domain2-gpu-power covers basics                                              | **No D1-specific power config scenario** |
| Advanced storage setup (NVMe, RAID)    | NO       | None                                                                         | **GAP: No NVMe/RAID bring-up scenario**  |
| Network bonding/IB bring-up            | YES      | domain1-network-bonding                                                      | Added recently                           |

### Domain 2: Physical Layer Management (5%)

| Objective                | Covered? | Scenario(s)                                  | Gap Notes                       |
| ------------------------ | -------- | -------------------------------------------- | ------------------------------- |
| MIG configuration        | YES      | domain2-mig-setup, domain2-advanced-mig      | Excellent                       |
| NVLink topology          | YES      | domain2-nvlink-topo, domain2-nvlink-recovery | Good                            |
| GPU power management     | YES      | domain2-gpu-power                            | Good                            |
| BlueField DPU            | YES      | domain2-bluefield-dpu                        | Covered                         |
| NVSwitch management      | PARTIAL  | Covered within NVLink scenarios              | No standalone NVSwitch scenario |
| PCIe topology validation | PARTIAL  | Covered in domain5-pcie-diagnosis            | Cross-domain                    |

### Domain 3: Control Plane Installation (19%)

| Objective                               | Covered? | Scenario(s)                                                        | Gap Notes                                       |
| --------------------------------------- | -------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| Slurm configuration                     | YES      | domain3-slurm-config, domain3-slurm-full-setup, domain3-slurm-gres | Excellent                                       |
| Container runtime (Docker/Enroot/Pyxis) | YES      | domain3-containers, domain3-ngc-pipeline, domain3-pyxis-advanced   | Excellent                                       |
| Storage validation (Lustre, NFS)        | YES      | domain3-storage, domain3-lustre-validation, domain3-nfs-tuning     | Good                                            |
| BCM HA configuration                    | YES      | domain3-bcm-ha                                                     | Covered                                         |
| Kubernetes GPU Operator                 | YES      | domain3-k8s-gpu-operator                                           | Covered                                         |
| DCGM policy management                  | YES      | domain3-dcgm-policy                                                | Covered                                         |
| Mixed GPU GRES                          | YES      | domain3-mixed-gpu-gres                                             | Good                                            |
| Full K8s GPU Operator lifecycle         | PARTIAL  | domain3-k8s-gpu-operator                                           | **Single scenario, lacks upgrade/troubleshoot** |
| BCM HA complete failover testing        | NO       | None                                                               | **GAP: No BCM failover scenario**               |
| Ansible/automation for deployment       | NO       | None                                                               | **GAP: No automation scenario**                 |

### Domain 4: Cluster Test and Verification (33%)

| Objective                                      | Covered? | Scenario(s)                                                                            | Gap Notes                                        |
| ---------------------------------------------- | -------- | -------------------------------------------------------------------------------------- | ------------------------------------------------ |
| DCGM diagnostics (Levels 1-3)                  | YES      | domain4-dcgmi-diag                                                                     | Good                                             |
| NCCL testing                                   | YES      | domain4-nccl-test, domain4-nccl-multinode, domain4-nccl-tuning, domain4-multinode-nccl | Excellent                                        |
| HPL benchmarking                               | YES      | domain4-hpl-workflow, domain4-hpl-optimization                                         | Good                                             |
| Performance baseline                           | YES      | domain4-perf-baseline                                                                  | Good                                             |
| GPU bandwidth validation                       | YES      | domain4-gpu-bandwidth                                                                  | Good                                             |
| InfiniBand stress testing                      | YES      | domain4-ib-stress                                                                      | Good                                             |
| AI training validation                         | YES      | domain4-ai-validation                                                                  | Good                                             |
| ECC error investigation                        | YES      | domain4-ecc-investigation                                                              | Good                                             |
| GPU reset and recovery                         | YES      | domain4-gpu-reset                                                                      | Good                                             |
| GPUDirect RDMA verification                    | YES      | domain4-gpudirect-rdma                                                                 | Good                                             |
| Cluster health monitoring                      | YES      | domain4-cluster-health                                                                 | Good                                             |
| Comprehensive HPL optimization (NUMA, P-state) | PARTIAL  | domain4-hpl-optimization                                                               | **Lacks detailed NUMA/P-state tuning**           |
| Storage I/O validation for AI                  | PARTIAL  | Touched in domain3-storage                                                             | **No dedicated D4 storage benchmark scenario**   |
| Multi-tenant validation                        | NO       | None                                                                                   | **GAP: No multi-tenant/MIG validation scenario** |

### Domain 5: Troubleshooting and Optimization (12%)

| Objective                        | Covered? | Scenario(s)                                                                                            | Gap Notes                                   |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| XID error analysis               | YES      | domain5-xid-errors, domain5-xid-triage, domain5-critical-xid, domain5-xid-nvlink, domain5-xid-hardware | Excellent -- 5 scenarios                    |
| Thermal troubleshooting          | YES      | domain5-thermal                                                                                        | Good                                        |
| PCIe diagnosis                   | YES      | domain5-pcie-diagnosis                                                                                 | Good                                        |
| Container GPU debugging          | YES      | domain5-container-gpu                                                                                  | Good                                        |
| Memory leak detection            | YES      | domain5-memory-leak                                                                                    | Good                                        |
| Driver mismatch resolution       | YES      | domain5-driver-mismatch                                                                                | Good                                        |
| InfiniBand troubleshooting       | YES      | domain5-ib-partitioning, domain5-cable-diagnostics                                                     | Good                                        |
| SEL log analysis                 | YES      | domain5-sel-analysis                                                                                   | Good                                        |
| Physical inspection              | YES      | domain5-physical-inspection                                                                            | Good                                        |
| RMA procedures                   | NO       | None                                                                                                   | **GAP: No end-to-end RMA scenario**         |
| Full log analysis workflow       | PARTIAL  | Covered across multiple XID scenarios                                                                  | **No centralized log aggregation scenario** |
| Performance regression diagnosis | NO       | None                                                                                                   | **GAP: No dedicated regression workflow**   |

---

## 8. Quiz Question Quality Assessment

### "Which Tool?" Quiz (24 questions in quizQuestions.json)

| Family           | Q Count | Difficulty Spread                      | Quality                                                      |
| ---------------- | ------- | -------------------------------------- | ------------------------------------------------------------ |
| gpu-monitoring   | 4       | 1 beginner, 2 intermediate, 1 advanced | GOOD -- discriminates between nvidia-smi, nvtop, dcgmi, nvsm |
| infiniband-tools | 4       | 1 beginner, 2 intermediate, 1 advanced | GOOD -- clear use-case differentiation                       |
| bmc-hardware     | 4       | 1 beginner, 2 intermediate, 1 advanced | GOOD -- only 3 tools makes some questions obvious            |
| cluster-tools    | 4       | 1 beginner, 2 intermediate, 1 advanced | GOOD -- standard Slurm workflow progression                  |
| container-tools  | 4       | 1 beginner, 2 intermediate, 1 advanced | ADEQUATE -- 3 tools with clear distinct roles                |
| diagnostics      | 4       | 1 beginner, 2 intermediate, 1 advanced | GOOD -- clear severity escalation                            |

### Quality Findings

1. **"whyNotOthers" field is excellent.** Each question explains why each wrong answer is wrong, which is educationally valuable.

2. **Discrimination concern for 3-tool families.** BMC (3 tools), containers (3 tools), and diagnostics (3 tools) have fewer choices, making guessing easier (33% vs 25%). The questions compensate with nuanced scenarios.

3. **No cross-family questions.** All 24 questions test within-family discrimination only. There are no questions like "Should you use ibdiagnet or dcgmi diag for this problem?" which test cross-family reasoning.

4. **24 questions is adequate but not deep.** For 6 families with 21 tools, 24 questions provide basic coverage. Consider adding cross-family questions and scenario-based questions that require choosing between tools from different families.

---

## 9. Exam Question Analysis

### Distribution (from examQuestions.json)

Based on reading through the file, the questions are distributed approximately as:

| Domain    | Question Count (approx) | Target % | Actual % |
| --------- | ----------------------- | -------- | -------- |
| Domain 1  | ~32-35                  | 31%      | ~24%     |
| Domain 2  | ~8-10                   | 5%       | ~7%      |
| Domain 3  | ~20-22                  | 19%      | ~15%     |
| Domain 4  | ~50-55                  | 33%      | ~38%     |
| Domain 5  | ~25-28                  | 12%      | ~19%     |
| **Total** | **~140+**               | **100%** | **100%** |

### Findings

1. **Large question pool.** With 140+ questions, the exam engine can sample different questions per attempt, providing good replay value.

2. **Domain 4 is over-represented** in absolute terms, which partially compensates for the under-representation in scenarios.

3. **Domain 5 over-representation** mirrors the scenario over-representation. XID error knowledge is tested heavily.

4. **Question types:** Primarily `multiple-choice` with a few `multiple-select` (e.g., q012 about MIG-capable GPUs). No practical/command-line questions are used in the exam despite the interface supporting `type: "practical"`.

5. **Difficulty spread is reasonable:** Mix of beginner, intermediate, and advanced questions across all domains.

6. **Domain weight enforcement.** The `domainWeights` in the exam config (31/5/19/33/12) match the NCP-AII blueprint. The `examEngine` presumably samples questions proportionally.

---

## 10. Tier 1 -> 2 -> 3 Progression Enforcement

### Code Analysis

**File:** `src/utils/tierProgressionEngine.ts`

The tier progression is **properly implemented in code** with clear requirements:

```
Tier 1: Always unlocked
Tier 2: Quiz passed AND all tools in family used
Tier 3: 80%+ quiz score AND explanation gate passed
```

### Enforcement Gaps

1. **No scenario files exist** to load with tier assignments, so the progression system has no content to gate.

2. **Narrative scenarios bypass tiers.** The narrative format does not include `tier` fields, meaning users could access all narrative content without progressing through tiers.

3. **Tool usage tracking dependency.** Tier 2 requires `toolsUsed[familyId].length >= FAMILY_TOOL_COUNTS[familyId]`. This requires the terminal to track which commands users have run per family. The tracking mechanism exists in `learningProgressStore.ts` but depends on command parsing to map commands to families.

4. **Explanation gate dependency.** Tier 3 requires `explanationGateResults[familyId].passed === true`. The 56 gates exist and are keyed by `familyId`, but the trigger mechanism (when to show the gate) depends on scenario completion events.

5. **The gauntlet correctly uses tiers.** `selectGauntletScenarios()` filters for `tier >= 2` scenarios, meaning the exam gauntlet excludes Tier 1 (guided) scenarios. This is correct design.

**Overall Assessment:** The tier progression logic is sound but **cannot function** because the individual scenario JSON files (which carry tier assignments) do not exist on disk. The system is architecturally complete but data-incomplete.

---

## 11. Spaced Repetition System Assessment

### Code Analysis

**File:** `src/utils/spacedRepetition.ts`

Implements a simplified SM-2 algorithm:

| Consecutive Successes | Next Review Interval |
| --------------------- | -------------------- |
| 0                     | 1 day                |
| 1                     | 3 days               |
| 2                     | 7 days               |
| 3                     | 14 days              |
| 4                     | 30 days              |
| 5                     | 60 days              |
| 6+                    | 120 days             |

### Functional Assessment

1. **`calculateNextReview()`** -- Correctly computes next review date based on consecutive successes. Uses the `REVIEW_INTERVALS` array indexed by success count.

2. **`getDueReviews()`** -- Correctly filters entries where `nextReviewDate <= now` and sorts most overdue first.

3. **`recordReviewResult()`** -- On success: increments consecutive successes and advances interval. On failure: resets to 1-day interval and 0 successes. This is correct SM-2 behavior.

4. **`generateReviewQuestion()`** -- Generates "which tool?" questions from command family data. Randomly selects a tool and builds a scenario from its `bestFor` description.

5. **`getReviewStats()`** and **`getUpcomingReviewCount()`** -- Utility functions for UI display.

### Issues

1. **Review question generation is simplistic.** It uses the tool's `bestFor` text directly as the scenario, producing formulaic questions like "You need to [bestFor]. Which tool should you use?" This lacks the nuance of the 24 curated quiz questions.

2. **No wrong-answer explanations.** Unlike the curated quiz questions which have `whyNotOthers`, generated review questions only provide correct-answer explanations.

3. **Integration dependency.** The spaced repetition system depends on the `learningProgressStore` to persist `reviewSchedule` entries. If no families have been studied, no reviews are scheduled.

4. **The system IS functional** as coded. It correctly implements SM-2 progression, generates questions, and schedules reviews. It simply requires user engagement with the learning system to start generating review schedules.

---

## 12. Critical Issues Summary

### Severity: CRITICAL

1. **Missing scenario JSON files.** The `src/data/scenarios/` directory tree contains zero JSON files. All 62 scenario paths referenced in `scenarioLoader.ts` point to non-existent files. This breaks `loadScenarioFromFile()` entirely.

### Severity: HIGH

2. **Counting discrepancies.** `scenarioLoader.ts` comments say "53 scenarios" but the actual code maps 62 IDs. The `getAllScenarios()` function returns 62 IDs. The `getScenarioMetadata()` function lists 59 entries. These numbers should be consistent.

3. **Schema divergence.** The narrative scenarios (`narrativeScenarios.json`) use a completely different schema from the TypeScript `Scenario` interface. No adapter exists to bridge them.

4. **Tier system is data-starved.** The tier progression engine is correctly coded but has no scenario files with tier assignments to work with.

### Severity: MEDIUM

5. **Domain proportionality.** Domain 4 (33% exam weight) is under-represented in both scenarios (24.2%) and narrative coverage. Domain 5 (12% exam weight) is over-represented at 22.6%.

6. **No practical exam questions.** The exam question schema supports `type: "practical"` but no questions use this type, meaning the practice exam is entirely theoretical.

### Severity: LOW

7. **Cross-family quiz gaps.** No quiz questions test choosing between tools from different families.

8. **Spaced repetition question quality.** Auto-generated review questions are less nuanced than curated ones.

---

## 13. Domain-by-Domain Gap Analysis Table

| Gap ID   | Domain | Exam Topic                                    | Status                        | Priority |
| -------- | ------ | --------------------------------------------- | ----------------------------- | -------- |
| G-D1-01  | D1     | NUMA tuning for GPU performance               | Not covered                   | Medium   |
| G-D1-02  | D1     | NVMe/RAID storage bring-up                    | Not covered                   | Medium   |
| G-D1-03  | D1     | Custom power profiles at system level         | Partial (D2 covers GPU-level) | Low      |
| G-D2-01  | D2     | Standalone NVSwitch management                | Partial (within NVLink)       | Low      |
| G-D3-01  | D3     | BCM HA failover testing                       | Not covered                   | Medium   |
| G-D3-02  | D3     | K8s GPU Operator upgrade/troubleshoot         | Not covered                   | Medium   |
| G-D3-03  | D3     | Deployment automation (Ansible)               | Not covered                   | Low      |
| G-D4-01  | D4     | HPL with NUMA/P-state optimization            | Partial                       | Medium   |
| G-D4-02  | D4     | Storage I/O benchmarking for AI               | Partial (D3 storage)          | Medium   |
| G-D4-03  | D4     | Multi-tenant/MIG validation                   | Not covered                   | High     |
| G-D4-04  | D4     | Additional D4 scenarios (5-6 needed)          | Under-represented             | High     |
| G-D5-01  | D5     | RMA procedures end-to-end                     | Not covered                   | Medium   |
| G-D5-02  | D5     | Centralized log analysis workflow             | Partial                       | Low      |
| G-D5-03  | D5     | Performance regression diagnosis              | Not covered                   | Medium   |
| G-D5-04  | D5     | Reduce D5 over-representation                 | 14 scenarios for 12% weight   | Medium   |
| G-ALL-01 | All    | Scenario JSON files missing from disk         | Critical blocker              | CRITICAL |
| G-ALL-02 | All    | Scenario count inconsistency (53 vs 59 vs 62) | Confusing                     | High     |
| G-ALL-03 | All    | Narrative-to-TypeScript schema bridge         | Missing adapter               | High     |

---

## 14. Recommendations

### Immediate (before next release)

1. **Create the missing scenario JSON files** or remove the file-based loading in favor of the narrative scenario system.
2. **Reconcile scenario counts** across all functions in `scenarioLoader.ts`.

### Short-term

3. **Add 5-6 Domain 4 scenarios** covering multi-tenant validation, storage benchmarking, and comprehensive HPL optimization.
4. **Bridge narrative scenarios with the tier system** by adding `tier` and `commandFamily` metadata to narrative entries.
5. **Add practical exam questions** that launch scenarios within the exam flow.

### Long-term

6. **Rebalance Domain 5** from 14 to ~8 scenarios (consolidate XID scenarios).
7. **Add cross-family quiz questions** that test real-world decision-making between tool families.
8. **Enhance spaced repetition questions** with curated content instead of auto-generated text.
9. **Add missing coverage** for NUMA tuning, RMA procedures, BCM failover, and deployment automation.
