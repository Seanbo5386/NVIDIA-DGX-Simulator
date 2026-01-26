# NCP-AII Certification Simulator - Comprehensive Implementation Plan v2

## Executive Summary

**Goal**: Transform this simulator into the **definitive NCP-AII certification learning tool**

**Current State**: 83% complete with solid foundation
**Target State**: 100% feature-complete certification training platform

**Total Scope**: 6 Phases, 24 Major Tasks, ~200 hours of development

---

## Phase 1: Content Excellence (CRITICAL PRIORITY)

### Overview
- **Goal**: Achieve 95%+ exam coverage with comprehensive content
- **Effort**: 50 hours
- **Impact**: Directly improves certification pass rates

---

### Task 1.1: Practice Exam Expansion
**Current**: 53 questions | **Target**: 150+ questions

#### 1.1.1 Domain 1 Questions (Platform Bring-Up - 31%)
**Current**: ~17 | **Target**: 45+ | **Add**: 28+

```
Topics to cover:
- DGX POST procedures and BIOS verification
- BMC configuration (network, users, alerts)
- GPU driver installation and troubleshooting
- Fabric Manager setup and validation
- UEFI settings for AI workloads
- Firmware update procedures
- PCIe topology validation
- Memory configuration verification
```

**File**: `src/data/examQuestions.json`

#### 1.1.2 Domain 2 Questions (Accelerator Config - 5%)
**Current**: ~3 | **Target**: 10 | **Add**: 7

```
Topics to cover:
- MIG profile selection criteria
- MIG instance creation/deletion workflows
- NVLink topology interpretation
- GPU clock and power management
- BlueField DPU modes
- GPU affinity and NUMA
```

#### 1.1.3 Domain 3 Questions (Base Infrastructure - 19%)
**Current**: ~11 | **Target**: 30+ | **Add**: 19+

```
Topics to cover:
- Slurm GRES configuration
- Slurm partitions and QOS
- Container runtime setup (Docker, Enroot)
- NGC container deployment
- Pyxis integration with Slurm
- Storage validation (Lustre, GPFS, NFS)
- Network configuration
- BCM deployment workflows
```

#### 1.1.4 Domain 4 Questions (Validation & Testing - 33%)
**Current**: ~17 | **Target**: 50+ | **Add**: 33+

```
Topics to cover:
- DCGM diagnostic levels (1, 2, 3)
- HPL benchmark interpretation
- NCCL collective operations
- NCCL bandwidth expectations
- GPU-to-GPU bandwidth testing
- InfiniBand fabric validation
- Performance baseline establishment
- Cluster acceptance testing
- Multi-node validation
```

#### 1.1.5 Domain 5 Questions (Troubleshooting - 12%)
**Current**: ~5 | **Target**: 20+ | **Add**: 15+

```
Topics to cover:
- XID error codes (13, 31, 48, 63, 79, 119, etc.)
- Thermal throttling diagnosis
- ECC error interpretation
- NVLink degradation
- PCIe bandwidth issues
- InfiniBand link errors
- Container GPU visibility
- Driver version conflicts
- Performance regression analysis
```

#### 1.1.6 New Question Types
**Files to modify**: `src/types/scenarios.ts`, `src/components/ExamWorkspace.tsx`

```typescript
// New question types to implement
interface ScenarioQuestion {
  type: 'scenario';
  terminalOutput: string;  // Simulated output to analyze
  questionText: string;
  choices: string[];
}

interface ImageQuestion {
  type: 'image';
  imageUrl: string;  // Topology diagram, nvidia-smi screenshot
  questionText: string;
  choices: string[];
}

interface OrderingQuestion {
  type: 'ordering';
  questionText: string;
  items: string[];  // Items to put in correct order
  correctOrder: number[];
}

interface FillBlankQuestion {
  type: 'fill-blank';
  questionText: string;  // "Run ___ to check GPU health"
  correctAnswers: string[];  // Multiple acceptable answers
}
```

**Deliverable**: 150+ exam questions with varied types

---

### Task 1.2: Lab Scenario Expansion
**Current**: 15 labs | **Target**: 30+ labs

#### 1.2.1 New Domain 1 Labs (5 new)
**Location**: `src/data/scenarios/domain1/`

```
1. firmware-verification.json
   - Check current firmware versions
   - Compare against baseline
   - Identify outdated components

2. bmc-security-hardening.json
   - Configure BMC network
   - Set up user accounts
   - Enable alerting
   - Verify security settings

3. uefi-bios-validation.json
   - Check boot order
   - Verify GPU settings
   - Validate memory config

4. fabric-manager-setup.json
   - Start fabric manager service
   - Verify NVSwitch detection
   - Check topology

5. driver-rollback.json
   - Identify driver issues
   - Perform rollback
   - Verify functionality
```

#### 1.2.2 New Domain 2 Labs (4 new)
**Location**: `src/data/scenarios/domain2/`

```
1. advanced-mig-reconfiguration.json
   - Dynamic MIG profile changes
   - Workload migration
   - Resource optimization

2. nvlink-error-recovery.json
   - Identify NVLink errors
   - Reset failed links
   - Verify recovery

3. gpu-power-optimization.json
   - Set power limits
   - Configure clocks
   - Measure impact

4. bluefield-dpu-config.json
   - Switch DPU modes
   - Configure networking
   - Validate operation
```

#### 1.2.3 New Domain 3 Labs (6 new)
**Location**: `src/data/scenarios/domain3/`

```
1. full-slurm-cluster-setup.json
   - Configure slurm.conf
   - Set up partitions
   - Configure GRES
   - Test job submission

2. mixed-gpu-gres.json
   - Multiple GPU types
   - Type-specific GRES
   - Job scheduling

3. ngc-container-pipeline.json
   - NGC authentication
   - Pull containers
   - Run GPU workloads

4. pyxis-enroot-advanced.json
   - Slurm integration
   - Container caching
   - Multi-node containers

5. lustre-client-validation.json
   - Mount filesystem
   - Performance testing
   - Troubleshoot issues

6. nfs-performance-tuning.json
   - Mount options
   - Performance baseline
   - Optimization
```

#### 1.2.4 New Domain 4 Labs (6 new)
**Location**: `src/data/scenarios/domain4/`

```
1. hpl-benchmark-workflow.json
   - Configure HPL
   - Run benchmark
   - Analyze results
   - Compare to baseline

2. nccl-multi-node-optimization.json
   - Configure NCCL
   - Run all_reduce tests
   - Optimize settings
   - Verify bandwidth

3. performance-baseline-establishment.json
   - Define metrics
   - Collect baseline
   - Document expectations

4. gpu-bandwidth-validation.json
   - P2P bandwidth tests
   - NVLink bandwidth
   - PCIe bandwidth

5. infiniband-stress-test.json
   - Fabric diagnostics
   - Performance tests
   - Error checking

6. ai-training-validation.json
   - End-to-end test
   - Multi-GPU training
   - Performance verification
```

#### 1.2.5 New Domain 5 Labs (6 new)
**Location**: `src/data/scenarios/domain5/`

```
1. xid-error-triage-comprehensive.json
   - Multiple XID types
   - Triage workflow
   - Resolution steps

2. pcie-bandwidth-diagnosis.json
   - Identify degradation
   - Root cause analysis
   - Resolution

3. infiniband-fabric-partitioning.json
   - Identify partition issues
   - Diagnose connectivity
   - Resolve problems

4. container-gpu-visibility-debug.json
   - Missing GPU troubleshooting
   - Driver issues
   - Runtime configuration

5. memory-leak-detection.json
   - Identify leaks
   - Process debugging
   - Resolution

6. driver-mismatch-resolution.json
   - Version conflicts
   - Dependency issues
   - Clean installation
```

**Deliverable**: 30+ comprehensive lab scenarios

---

### Task 1.3: Command Simulator Enhancements

#### 1.3.1 Accuracy Improvements
**Files to modify**: `src/simulators/*.ts`

```
- Match real DGX output character-by-character
- Add all nvidia-smi query fields (100+ metrics)
- Implement dcgmi policy management
- Add ipmitool SOL simulation
- Implement ibnetdiscover
- Add nv-fabricmanager CLI
```

#### 1.3.2 New Commands to Implement

**File**: `src/simulators/systemSimulator.ts` (new)

```typescript
// New system commands
- nvlink-audit: NVLink diagnostic tool
- mlxfwmanager: Firmware management
- mst: Mellanox Software Tools
- hostnamectl: System configuration
- timedatectl: Time configuration
- systemctl: Service management
- journalctl: Log viewing
- dmesg: Kernel messages (filtered for GPU)
```

**Deliverable**: 90+ commands with accurate output

---

## Phase 2: Learning Experience Enhancement (HIGH PRIORITY)

### Overview
- **Goal**: Transform into intelligent tutoring system
- **Effort**: 40 hours
- **Impact**: Accelerates learning, improves retention

---

### Task 2.1: Adaptive Learning System
**Files to create**:
- `src/utils/adaptiveLearning.ts`
- `src/store/learningStore.ts`

```typescript
interface LearnerProfile {
  commandProficiency: Record<string, ProficiencyLevel>;
  topicStrengths: Record<Domain, number>;  // 0-100
  weakAreas: string[];
  learningPath: LearningStep[];
  totalStudyTime: number;
  lastSessionDate: Date;
}

interface ProficiencyLevel {
  command: string;
  successRate: number;
  attemptCount: number;
  lastUsed: Date;
  masteryLevel: 'novice' | 'intermediate' | 'proficient' | 'expert';
}

class AdaptiveLearningEngine {
  // Track command usage and success
  trackCommandExecution(command: string, success: boolean): void;

  // Get recommended next activity
  getRecommendedActivity(): Lab | ExamQuestion | Command;

  // Adjust question difficulty
  selectNextQuestion(domain: Domain): ExamQuestion;

  // Spaced repetition scheduling
  getReviewItems(): ReviewItem[];

  // Learning path generation
  generateLearningPath(targetDate: Date): LearningPath;
}
```

**Deliverable**: Personalized learning recommendations

---

### Task 2.2: Enhanced Feedback System
**Files to modify**:
- `src/utils/commandSuggestions.ts`
- `src/components/Terminal.tsx`

```typescript
interface EnhancedFeedback {
  originalCommand: string;
  errorType: 'syntax' | 'unknown' | 'invalid-args' | 'state';
  suggestion: string;
  didYouMean: string[];
  explanation: string;
  documentationLink: string;
  relatedCommands: string[];
}

class FeedbackEngine {
  // "Did you mean?" for typos
  getSuggestions(command: string): string[];

  // Explain why command failed
  explainError(command: string, error: string): string;

  // Link to documentation
  getDocumentation(command: string): Documentation;

  // Show diff for expected output
  showOutputDiff(actual: string, expected: string): DiffResult;
}
```

**Deliverable**: Intelligent error messages that teach

---

### Task 2.3: Study Modes
**Files to create**:
- `src/components/StudyModes.tsx`
- `src/utils/studyModeEngine.ts`

```typescript
enum StudyMode {
  DOMAIN_DEEP_DIVE = 'domain-deep-dive',
  TIMED_PRACTICE = 'timed-practice',
  REVIEW_MODE = 'review-mode',
  FLASHCARD_MODE = 'flashcard-mode',
  RANDOM_CHALLENGE = 'random-challenge',
}

interface StudySession {
  mode: StudyMode;
  domain?: Domain;
  duration: number;
  questionsCompleted: number;
  correctAnswers: number;
  commandsExecuted: number;
}

// Domain Deep-Dive: Focus on one domain
// Timed Practice: Simulate exam pressure
// Review Mode: Go through wrong answers
// Flashcard Mode: Quick command review
// Random Challenge: Mixed for retention
```

**Deliverable**: 5 distinct study modes

---

### Task 2.4: Progress Analytics
**Files to create**:
- `src/components/ProgressDashboard.tsx`
- `src/utils/analyticsEngine.ts`

```typescript
interface ProgressAnalytics {
  // Time tracking
  totalStudyTime: number;
  timePerDomain: Record<Domain, number>;
  studyStreak: number;

  // Performance
  examScoreHistory: ExamResult[];
  commandSuccessRate: number;
  labCompletionRate: number;

  // Readiness
  domainReadinessScores: Record<Domain, number>;
  overallReadinessScore: number;
  predictedExamScore: number;

  // Trends
  improvementTrend: 'improving' | 'stable' | 'declining';
  weakAreasTrend: string[];
}

// Visualizations
- Study time heatmap (calendar view)
- Domain proficiency radar chart
- Score trend line chart
- Command usage frequency
```

**Deliverable**: Comprehensive progress tracking dashboard

---

## Phase 3: Visualization and Interactivity (MEDIUM PRIORITY)

### Overview
- **Goal**: Visual learning for complex concepts
- **Effort**: 35 hours
- **Impact**: Better understanding of datacenter topology

---

### Task 3.1: Topology Visualization (D3.js)
**Files to create**:
- `src/components/TopologyVisualization.tsx`
- `src/utils/topologyRenderer.ts`

```typescript
// Visualizations to implement:

1. DGX Node Internal Topology
   - 8 GPUs arranged in grid
   - NVLink connections between GPUs
   - NVSwitch in center
   - Color-coded health status
   - Click GPU for details

2. Cluster-Wide View
   - Multiple DGX nodes
   - InfiniBand connections
   - Spine/leaf switches
   - Zoom and pan

3. InfiniBand Fat-Tree
   - Hierarchical switch layout
   - Port-level status
   - Bandwidth utilization
   - Error highlighting

4. Animated Data Flow
   - Show NCCL communication patterns
   - Visualize all_reduce operations
   - Bandwidth utilization animation
```

**Deliverable**: Interactive topology visualization

---

### Task 3.2: Metrics Visualization (Recharts)
**Files to create**:
- `src/components/MetricsVisualization.tsx`
- `src/utils/metricsAggregator.ts`

```typescript
// Charts to implement:

1. Real-time GPU Sparklines
   - Per-GPU utilization mini-charts
   - Temperature sparklines
   - Power draw trends

2. Historical Charts (5-minute rolling)
   - Utilization over time
   - Temperature trends
   - Power consumption
   - Memory usage

3. NCCL Bandwidth Graphs
   - Bandwidth during benchmark
   - Latency measurements
   - Comparison to baseline

4. Cluster Heatmaps
   - GPU utilization heatmap (all nodes)
   - Temperature heatmap
   - Error rate heatmap
```

**Deliverable**: Real-time and historical metrics charts

---

### Task 3.3: Terminal Enhancements
**Files to modify**:
- `src/components/Terminal.tsx`
- `src/utils/terminalKeyboardHandler.ts`

```typescript
// Enhancements:

1. Tab Completion
   - Command names
   - Subcommands
   - File paths
   - Argument values

2. Command History Search (Ctrl+R)
   - Incremental search
   - Match highlighting
   - Multiple results navigation

3. Syntax Highlighting
   - Command highlighting
   - Argument highlighting
   - Error highlighting

4. Multiple Terminals
   - Tab-based terminals
   - Split view (horizontal/vertical)
   - Terminal naming

5. Themes
   - Dark (default)
   - Light
   - Solarized Dark
   - Solarized Light
   - Custom theme support
```

**Deliverable**: Professional terminal experience

---

### Task 3.4: Interactive Diagrams
**Files to create**:
- `src/components/MIGConfigurator.tsx`
- `src/components/ClusterBuilder.tsx`

```typescript
// Interactive tools:

1. MIG Partitioning Configurator
   - Visual GPU with slices
   - Drag to create partitions
   - Profile suggestions
   - Validation feedback

2. Cluster Builder
   - Drag-and-drop nodes
   - Connect with InfiniBand
   - Configure topology
   - Export configuration

3. Slurm Job Visualizer
   - Visual job placement
   - Resource allocation
   - Queue visualization

4. Cable Tracing Tool
   - Click port to trace cable
   - Highlight connected devices
   - Show cable specifications
```

**Deliverable**: Interactive configuration tools

---

## Phase 4: Assessment and Certification Readiness (HIGH PRIORITY)

### Overview
- **Goal**: Exam-ready confidence
- **Effort**: 25 hours
- **Impact**: Direct certification preparation

---

### Task 4.1: Exam Simulation Modes
**Files to modify**:
- `src/components/ExamWorkspace.tsx`
- `src/utils/examEngine.ts`

```typescript
enum ExamMode {
  FULL_PRACTICE = 'full-practice',      // 90 min, 60 questions, weighted
  QUICK_QUIZ = 'quick-quiz',            // 15 min, 15 questions
  DOMAIN_TEST = 'domain-test',          // All questions from one domain
  WEAK_AREA_FOCUS = 'weak-area-focus',  // Auto-generated from performance
  REVIEW_MODE = 'review-mode',          // Review previous attempts
}

interface ExamConfig {
  mode: ExamMode;
  domain?: Domain;
  questionCount: number;
  timeLimit: number;  // minutes
  shuffleQuestions: boolean;
  showExplanations: 'never' | 'after-answer' | 'after-exam';
}
```

**Deliverable**: Multiple exam modes for varied practice

---

### Task 4.2: Practical Lab Exams
**Files to create**:
- `src/components/PracticalExam.tsx`
- `src/utils/practicalExamEngine.ts`

```typescript
interface PracticalExam {
  id: string;
  title: string;
  description: string;
  timeLimit: number;  // minutes
  scenarios: PracticalScenario[];
  passingScore: number;
}

interface PracticalScenario {
  id: string;
  description: string;
  initialState: ClusterState;  // Fault injected
  objectives: Objective[];
  maxPoints: number;
  partialCredit: boolean;
}

// Example practical exams:
1. Troubleshooting Challenge (30 min)
   - Given: Cluster with injected faults
   - Task: Identify and resolve all issues
   - Grading: Points per fault found/fixed

2. Configuration Task (45 min)
   - Given: Bare cluster
   - Task: Configure MIG, Slurm, containers
   - Grading: Points per correct configuration

3. Performance Validation (30 min)
   - Given: Running cluster
   - Task: Run benchmarks, identify issues
   - Grading: Points per correct analysis
```

**Deliverable**: Timed practical exams with grading

---

### Task 4.3: Performance Benchmarking
**Files to create**:
- `src/components/Leaderboard.tsx`
- `src/utils/benchmarkComparison.ts`

```typescript
interface UserPerformance {
  userId: string;  // Anonymous
  examScores: number[];
  labCompletionRate: number;
  averageTime: number;
  percentile: number;
}

// Features:
- Compare score to aggregate anonymous data
- Identify topics below average
- Track percentile improvement
- Optional leaderboard participation
```

**Deliverable**: Performance comparison and tracking

---

### Task 4.4: Certification Prep Resources
**Files to create**:
- `src/components/StudyGuide.tsx`
- `src/data/studyGuides/*.md`

```
Resources to create:

1. Domain Study Guides
   - Key concepts per domain
   - Essential commands
   - Common pitfalls
   - Practice checklist

2. Quick Reference Sheets
   - Command cheat sheet (printable)
   - XID error reference
   - NCCL environment variables
   - Slurm GRES syntax

3. Exam Tips
   - Time management
   - Question strategies
   - Common mistakes
   - Day-of preparation

4. Documentation Links
   - Official NVIDIA docs
   - DGX user guides
   - DCGM documentation
   - Slurm GPU guide
```

**Deliverable**: Comprehensive study materials

---

## Phase 5: Platform Features (LOW PRIORITY)

### Overview
- **Goal**: Full learning platform
- **Effort**: 35 hours
- **Impact**: Long-term engagement

---

### Task 5.1: User Accounts
**Files to create**:
- `src/components/Auth.tsx`
- `src/utils/authService.ts`
- `src/store/userStore.ts`

```typescript
// Features:
- Local registration/login
- Optional cloud sync
- Profile management
- Progress export/import
- Achievement badges
```

---

### Task 5.2: Reporting and Export
**Files to create**:
- `src/utils/reportGenerator.ts`
- `src/components/ReportViewer.tsx`

```typescript
// Features:
- PDF progress reports
- Lab completion certificates
- Study history export (JSON/CSV)
- Share achievements
```

---

### Task 5.3: Multi-User Features
**Files to create**:
- `src/components/InstructorDashboard.tsx`
- `src/utils/classManagement.ts`

```typescript
// Features:
- Instructor dashboard
- Class progress tracking
- Scenario assignment
- Collaborative sessions (stretch)
```

---

### Task 5.4: Content Management
**Files to create**:
- `src/components/ScenarioEditor.tsx`
- `src/utils/contentValidator.ts`

```typescript
// Features:
- Scenario creation UI
- Question bank management
- Import/export packs
- Community sharing (stretch)
```

---

## Phase 6: Polish and Accessibility (ONGOING)

### Overview
- **Goal**: Production-grade quality
- **Effort**: 20 hours
- **Impact**: Professional deployment

---

### Task 6.1: Accessibility (WCAG AA)
```
- Full keyboard navigation
- Screen reader compatibility
- High contrast mode
- Configurable font sizes
- Reduced motion option
- Focus indicators
- ARIA labels
```

---

### Task 6.2: Mobile Support
```
- Responsive layouts (tablet first)
- Touch-friendly controls
- Mobile exam review
- Simplified terminal for mobile
```

---

### Task 6.3: Internationalization
```
- UI translation framework (react-i18next)
- English (default)
- Spanish (future)
- Chinese (future)
- Japanese (future)
```

---

### Task 6.4: Performance
```
- Lazy loading for heavy components
- Code splitting by route
- Bundle size < 400KB initial
- Service worker for offline
- PWA manifest
```

---

## Implementation Timeline

### Sprint 1: Content Foundation (Weeks 1-2)
- Task 1.1: Add 50+ exam questions (Domain 4 & 5 priority)
- Task 1.2: Add 5 new lab scenarios
- Task 4.1: Implement exam modes (Quick Quiz, Domain Test)

### Sprint 2: Content Expansion (Weeks 3-4)
- Task 1.1: Add 50+ more questions (Domains 1, 2, 3)
- Task 1.2: Add 10 more lab scenarios
- Task 1.3: Add missing commands (systemctl, journalctl, dmesg)

### Sprint 3: Learning Experience (Weeks 5-6)
- Task 2.2: Enhanced feedback system
- Task 2.3: Study modes (3 of 5)
- Task 3.3: Tab completion

### Sprint 4: Visualization (Weeks 7-8)
- Task 3.1: NVLink topology visualization
- Task 3.2: Real-time metrics charts
- Task 2.4: Progress analytics (basic)

### Sprint 5: Assessment (Weeks 9-10)
- Task 4.2: Practical lab exams
- Task 4.4: Study guides and reference sheets
- Task 2.1: Adaptive learning (basic)

### Sprint 6: Polish (Weeks 11-12)
- Task 6.1: Accessibility improvements
- Task 6.4: Performance optimization
- Bug fixes and testing

### Future Sprints
- Phase 5 features (user accounts, multi-user)
- Phase 6 remaining (mobile, i18n)

---

## Success Metrics

### Content Metrics
- [ ] 150+ exam questions (currently 53)
- [ ] 30+ lab scenarios (currently 15)
- [ ] 90+ commands simulated (currently 75+)

### Learning Metrics
- [ ] 90%+ user pass rate on actual NCP-AII exam
- [ ] Average 2+ hours per study session
- [ ] 70%+ lab completion rate

### Quality Metrics
- [ ] 95%+ command output accuracy
- [ ] < 1% question error rate
- [ ] 90+ Lighthouse accessibility score
- [ ] < 400KB initial bundle size
- [ ] 169+ tests passing (maintain 100%)

### Engagement Metrics
- [ ] 80%+ user return rate
- [ ] 50%+ feature utilization
- [ ] Positive feedback on learning effectiveness

---

## Risk Assessment

### High Risk
| Risk | Mitigation |
|------|------------|
| Content accuracy | Validate against real DGX systems |
| Scope creep | Strict sprint boundaries |
| Performance | Continuous bundle monitoring |

### Medium Risk
| Risk | Mitigation |
|------|------------|
| D3.js complexity | Fallback to simpler libraries |
| Adaptive learning | Start simple, iterate |
| Mobile support | Tablet-first, phone later |

### Low Risk
| Risk | Mitigation |
|------|------------|
| Test coverage | Maintain existing 100% |
| Accessibility | Use established patterns |

---

## Definition of Done

Each task is complete when:
- [ ] Feature implemented and working
- [ ] Unit tests written and passing
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] No TypeScript errors
- [ ] Accessibility checked
- [ ] Performance verified

---

## Getting Started

```bash
# Create feature branch
git checkout -b feature/phase-1-content

# Start with highest-impact task
# Task 1.1.4: Domain 4 questions (biggest gap)

# Run development server
npm run dev

# Run tests continuously
npm run test:watch

# Check bundle size
npm run build && npm run analyze
```

---

*Document Version: 2.0*
*Last Updated: January 2026*
*Aligned with ROADMAP.md v1.0*
