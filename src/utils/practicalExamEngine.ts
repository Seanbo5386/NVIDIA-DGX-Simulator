/**
 * Practical Lab Exam Engine
 *
 * Provides timed, graded troubleshooting challenges that simulate
 * real-world scenarios with partial credit scoring.
 */

import type { DomainId, FaultInjectionConfig } from '@/types/scenarios';

// ============================================================================
// TYPES
// ============================================================================

export interface PracticalExam {
  id: string;
  title: string;
  description: string;
  domain: DomainId;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  timeLimitMinutes: number;
  passingScore: number; // Percentage (0-100)
  challenges: PracticalChallenge[];
  totalPoints: number;
}

export interface PracticalChallenge {
  id: string;
  title: string;
  description: string;
  points: number;
  partialCredit: boolean;
  faultsToInject: FaultInjectionConfig[];
  objectives: ChallengeObjective[];
  hints: string[];
  timeBonus?: TimeBonusConfig;
}

export interface ChallengeObjective {
  id: string;
  description: string;
  points: number;
  validationPattern: string; // Regex pattern for command/output
  validationType: 'command' | 'output' | 'state';
  requiredCommands?: string[];
  acceptableAnswers?: string[]; // For fill-in-the-blank style
}

export interface TimeBonusConfig {
  /** Time threshold in seconds to earn bonus */
  threshold: number;
  /** Bonus points if completed under threshold */
  bonusPoints: number;
}

export interface PracticalExamSession {
  id: string;
  examId: string;
  startTime: number;
  endTime?: number;
  timeLimitSeconds: number;
  timeRemaining: number;

  // Progress
  currentChallengeIndex: number;
  challengeResults: ChallengeResult[];
  totalPointsEarned: number;
  totalPointsPossible: number;

  // State
  isPaused: boolean;
  isComplete: boolean;
  commandHistory: string[];
}

export interface ChallengeResult {
  challengeId: string;
  startTime: number;
  endTime?: number;
  durationSeconds: number;
  pointsEarned: number;
  pointsPossible: number;
  objectiveResults: ObjectiveResult[];
  timeBonusEarned: number;
  commandsUsed: string[];
  hintsUsed: number;
}

export interface ObjectiveResult {
  objectiveId: string;
  completed: boolean;
  pointsEarned: number;
  pointsPossible: number;
  feedback: string;
}

export interface PracticalExamResult {
  examId: string;
  sessionId: string;
  score: number;
  percentage: number;
  passed: boolean;
  timeTaken: number;
  challengeResults: ChallengeResult[];
  feedback: string[];
  recommendations: string[];
}

// ============================================================================
// PREDEFINED PRACTICAL EXAMS
// ============================================================================

export const PRACTICAL_EXAMS: PracticalExam[] = [
  // Troubleshooting Challenge
  {
    id: 'troubleshooting-101',
    title: 'GPU Troubleshooting Fundamentals',
    description: 'Diagnose and resolve common GPU issues in a DGX cluster',
    domain: 'domain5',
    difficulty: 'beginner',
    timeLimitMinutes: 30,
    passingScore: 70,
    totalPoints: 100,
    challenges: [
      {
        id: 'tc-gpu-health',
        title: 'Identify Unhealthy GPU',
        description: 'A GPU is reporting errors. Identify which GPU has issues and determine the error type.',
        points: 25,
        partialCredit: true,
        faultsToInject: [
          { nodeId: 'dgx-00', gpuId: 2, type: 'ecc-error', severity: 'warning' }
        ],
        objectives: [
          {
            id: 'obj-1',
            description: 'Run nvidia-smi to check GPU status',
            points: 5,
            validationPattern: 'nvidia-smi',
            validationType: 'command',
          },
          {
            id: 'obj-2',
            description: 'Query ECC error details',
            points: 10,
            validationPattern: 'nvidia-smi.*-q.*ECC|nvidia-smi.*ecc',
            validationType: 'command',
          },
          {
            id: 'obj-3',
            description: 'Identify GPU 2 has the error',
            points: 10,
            validationPattern: 'GPU 2|gpu:2|-i 2',
            validationType: 'output',
          },
        ],
        hints: [
          'Start with nvidia-smi to see an overview of all GPUs',
          'Use nvidia-smi -q -d ECC to see detailed ECC error information',
          'Look for non-zero error counts in the output',
        ],
        timeBonus: { threshold: 300, bonusPoints: 5 },
      },
      {
        id: 'tc-thermal',
        title: 'Diagnose Thermal Throttling',
        description: 'A GPU is experiencing performance degradation. Identify the cause.',
        points: 25,
        partialCredit: true,
        faultsToInject: [
          { nodeId: 'dgx-00', gpuId: 5, type: 'thermal', severity: 'warning', parameters: { temperature: 89 } }
        ],
        objectives: [
          {
            id: 'obj-1',
            description: 'Check GPU temperatures',
            points: 10,
            validationPattern: 'nvidia-smi.*-q.*TEMPERATURE|nvidia-smi.*temperature',
            validationType: 'command',
          },
          {
            id: 'obj-2',
            description: 'Check throttle reasons',
            points: 10,
            validationPattern: 'nvidia-smi.*throttle|PERFORMANCE',
            validationType: 'command',
          },
          {
            id: 'obj-3',
            description: 'Identify thermal throttling',
            points: 5,
            validationPattern: 'thermal|Thermal|temperature',
            validationType: 'output',
          },
        ],
        hints: [
          'Use nvidia-smi -q -d TEMPERATURE to check temperatures',
          'Use nvidia-smi -q -d PERFORMANCE to check for throttling',
          'Normal operating temperature is typically below 80C',
        ],
        timeBonus: { threshold: 240, bonusPoints: 5 },
      },
      {
        id: 'tc-xid-error',
        title: 'Investigate XID Error',
        description: 'System logs show XID errors. Investigate and identify the affected GPU.',
        points: 30,
        partialCredit: true,
        faultsToInject: [
          { nodeId: 'dgx-00', gpuId: 1, type: 'xid-error', severity: 'critical', parameters: { xidCode: 79 } }
        ],
        objectives: [
          {
            id: 'obj-1',
            description: 'Check system logs for XID errors',
            points: 10,
            validationPattern: 'dmesg|journalctl.*nvidia|XID',
            validationType: 'command',
          },
          {
            id: 'obj-2',
            description: 'Run DCGM health check',
            points: 10,
            validationPattern: 'dcgmi.*health|dcgmi.*diag',
            validationType: 'command',
          },
          {
            id: 'obj-3',
            description: 'Identify the specific XID code',
            points: 10,
            validationPattern: 'XID.*79|xid.*79',
            validationType: 'output',
          },
        ],
        hints: [
          'XID errors are logged in dmesg and journalctl',
          'dcgmi health -c provides a quick health overview',
          'XID 79 typically indicates GPU fell off the bus',
        ],
        timeBonus: { threshold: 360, bonusPoints: 10 },
      },
      {
        id: 'tc-nvlink',
        title: 'NVLink Connectivity Issue',
        description: 'A GPU is showing degraded performance. Check NVLink status.',
        points: 20,
        partialCredit: true,
        faultsToInject: [
          { nodeId: 'dgx-00', gpuId: 3, type: 'nvlink-failure', severity: 'warning' }
        ],
        objectives: [
          {
            id: 'obj-1',
            description: 'Check NVLink status',
            points: 10,
            validationPattern: 'nvidia-smi.*nvlink|nvlink-audit',
            validationType: 'command',
          },
          {
            id: 'obj-2',
            description: 'Check GPU topology',
            points: 5,
            validationPattern: 'nvidia-smi.*topo|topology',
            validationType: 'command',
          },
          {
            id: 'obj-3',
            description: 'Identify inactive NVLink',
            points: 5,
            validationPattern: 'inactive|Inactive|disabled|error',
            validationType: 'output',
          },
        ],
        hints: [
          'Use nvidia-smi nvlink --status to check NVLink health',
          'nvidia-smi topo -m shows the connection matrix',
          'Look for any links showing as inactive or with errors',
        ],
      },
    ],
  },

  // Configuration Challenge
  {
    id: 'config-mig-101',
    title: 'MIG Configuration Challenge',
    description: 'Configure Multi-Instance GPU (MIG) for optimal workload partitioning',
    domain: 'domain2',
    difficulty: 'intermediate',
    timeLimitMinutes: 20,
    passingScore: 70,
    totalPoints: 50,
    challenges: [
      {
        id: 'mig-enable',
        title: 'Enable MIG Mode',
        description: 'Enable MIG mode on GPU 0 and create appropriate profiles.',
        points: 25,
        partialCredit: true,
        faultsToInject: [],
        objectives: [
          {
            id: 'obj-1',
            description: 'Check current MIG status',
            points: 5,
            validationPattern: 'nvidia-smi.*-i.*mig|nvidia-smi mig',
            validationType: 'command',
          },
          {
            id: 'obj-2',
            description: 'Enable MIG mode',
            points: 10,
            validationPattern: 'nvidia-smi.*-mig.*1|-mig 1',
            validationType: 'command',
          },
          {
            id: 'obj-3',
            description: 'Create GPU instance',
            points: 10,
            validationPattern: 'nvidia-smi mig.*-cgi|create.*instance',
            validationType: 'command',
          },
        ],
        hints: [
          'First check MIG status with nvidia-smi -i 0 -mig 0',
          'Enable MIG with nvidia-smi -i 0 -mig 1',
          'GPU may need reset after enabling MIG',
        ],
      },
      {
        id: 'mig-profiles',
        title: 'Configure MIG Profiles',
        description: 'List available profiles and create compute instances.',
        points: 25,
        partialCredit: true,
        faultsToInject: [],
        objectives: [
          {
            id: 'obj-1',
            description: 'List available GPU instance profiles',
            points: 10,
            validationPattern: 'nvidia-smi mig.*-lgip',
            validationType: 'command',
          },
          {
            id: 'obj-2',
            description: 'List GPU instances',
            points: 5,
            validationPattern: 'nvidia-smi mig.*-lgi',
            validationType: 'command',
          },
          {
            id: 'obj-3',
            description: 'Create compute instance',
            points: 10,
            validationPattern: 'nvidia-smi mig.*-cci',
            validationType: 'command',
          },
        ],
        hints: [
          'Use nvidia-smi mig -lgip to see available profiles',
          'Common profiles: 1g.5gb, 2g.10gb, 3g.20gb, 7g.40gb',
          'Create compute instances after GPU instances',
        ],
      },
    ],
  },

  // Validation Challenge
  {
    id: 'validation-101',
    title: 'Cluster Validation Fundamentals',
    description: 'Perform comprehensive health checks on a DGX cluster',
    domain: 'domain4',
    difficulty: 'beginner',
    timeLimitMinutes: 25,
    passingScore: 70,
    totalPoints: 75,
    challenges: [
      {
        id: 'dcgm-diag',
        title: 'Run DCGM Diagnostics',
        description: 'Execute DCGM diagnostic levels to validate GPU health.',
        points: 25,
        partialCredit: true,
        faultsToInject: [],
        objectives: [
          {
            id: 'obj-1',
            description: 'Discover GPUs with DCGM',
            points: 5,
            validationPattern: 'dcgmi.*discovery',
            validationType: 'command',
          },
          {
            id: 'obj-2',
            description: 'Run Level 1 diagnostics',
            points: 10,
            validationPattern: 'dcgmi.*diag.*-r.*1',
            validationType: 'command',
          },
          {
            id: 'obj-3',
            description: 'Run Level 2 diagnostics',
            points: 10,
            validationPattern: 'dcgmi.*diag.*-r.*2',
            validationType: 'command',
          },
        ],
        hints: [
          'dcgmi discovery -l lists all GPUs',
          'dcgmi diag -r 1 runs quick diagnostics',
          'Level 2 includes memory tests (takes longer)',
        ],
        timeBonus: { threshold: 300, bonusPoints: 5 },
      },
      {
        id: 'ib-validation',
        title: 'Validate InfiniBand Fabric',
        description: 'Check InfiniBand connectivity and performance.',
        points: 25,
        partialCredit: true,
        faultsToInject: [],
        objectives: [
          {
            id: 'obj-1',
            description: 'Check IB port status',
            points: 10,
            validationPattern: 'ibstat|ibstatus',
            validationType: 'command',
          },
          {
            id: 'obj-2',
            description: 'Check for port errors',
            points: 10,
            validationPattern: 'ibporterrors|ibcheckerrors',
            validationType: 'command',
          },
          {
            id: 'obj-3',
            description: 'Verify active link',
            points: 5,
            validationPattern: 'Active|LinkUp',
            validationType: 'output',
          },
        ],
        hints: [
          'ibstat shows port state and speed',
          'ibporterrors shows error counters',
          'Look for State: Active and Physical state: LinkUp',
        ],
      },
      {
        id: 'slurm-check',
        title: 'Verify Slurm Configuration',
        description: 'Check Slurm cluster status and GPU resources.',
        points: 25,
        partialCredit: true,
        faultsToInject: [],
        objectives: [
          {
            id: 'obj-1',
            description: 'Check node status',
            points: 10,
            validationPattern: 'sinfo',
            validationType: 'command',
          },
          {
            id: 'obj-2',
            description: 'Show GRES configuration',
            points: 10,
            validationPattern: 'scontrol.*show.*node|GRES',
            validationType: 'command',
          },
          {
            id: 'obj-3',
            description: 'Verify nodes are idle/available',
            points: 5,
            validationPattern: 'idle|available|up',
            validationType: 'output',
          },
        ],
        hints: [
          'sinfo shows partition and node status',
          'scontrol show nodes shows detailed node info',
          'Look for GRES configuration showing GPUs',
        ],
      },
    ],
  },
];

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Create a new practical exam session
 */
export function createPracticalExamSession(examId: string): PracticalExamSession {
  const exam = PRACTICAL_EXAMS.find(e => e.id === examId);
  if (!exam) {
    throw new Error(`Exam not found: ${examId}`);
  }

  const sessionId = `practical-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    id: sessionId,
    examId,
    startTime: Date.now(),
    timeLimitSeconds: exam.timeLimitMinutes * 60,
    timeRemaining: exam.timeLimitMinutes * 60,
    currentChallengeIndex: 0,
    challengeResults: [],
    totalPointsEarned: 0,
    totalPointsPossible: exam.totalPoints,
    isPaused: false,
    isComplete: false,
    commandHistory: [],
  };
}

/**
 * Start a challenge within a session
 */
export function startChallenge(session: PracticalExamSession, challengeIndex: number): ChallengeResult {
  const exam = PRACTICAL_EXAMS.find(e => e.id === session.examId);
  if (!exam || challengeIndex >= exam.challenges.length) {
    throw new Error('Invalid challenge index');
  }

  const challenge = exam.challenges[challengeIndex];

  return {
    challengeId: challenge.id,
    startTime: Date.now(),
    durationSeconds: 0,
    pointsEarned: 0,
    pointsPossible: challenge.points,
    objectiveResults: challenge.objectives.map(obj => ({
      objectiveId: obj.id,
      completed: false,
      pointsEarned: 0,
      pointsPossible: obj.points,
      feedback: '',
    })),
    timeBonusEarned: 0,
    commandsUsed: [],
    hintsUsed: 0,
  };
}

/**
 * Evaluate a command against challenge objectives
 */
export function evaluateCommand(
  command: string,
  output: string,
  challenge: PracticalChallenge,
  currentResult: ChallengeResult
): ChallengeResult {
  const updatedObjectives = currentResult.objectiveResults.map(objResult => {
    if (objResult.completed) return objResult;

    const objective = challenge.objectives.find(o => o.id === objResult.objectiveId);
    if (!objective) return objResult;

    // Check validation
    const pattern = new RegExp(objective.validationPattern, 'i');
    let passed = false;

    if (objective.validationType === 'command') {
      passed = pattern.test(command);
    } else if (objective.validationType === 'output') {
      passed = pattern.test(output);
    }

    if (passed) {
      return {
        ...objResult,
        completed: true,
        pointsEarned: objective.points,
        feedback: `Completed: ${objective.description}`,
      };
    }

    return objResult;
  });

  const pointsEarned = updatedObjectives.reduce((sum, obj) => sum + obj.pointsEarned, 0);

  return {
    ...currentResult,
    objectiveResults: updatedObjectives,
    pointsEarned,
    commandsUsed: [...currentResult.commandsUsed, command],
  };
}

/**
 * Complete a challenge and calculate final score including time bonus
 */
export function completeChallenge(
  challenge: PracticalChallenge,
  result: ChallengeResult
): ChallengeResult {
  const endTime = Date.now();
  const durationSeconds = Math.floor((endTime - result.startTime) / 1000);

  let timeBonusEarned = 0;
  if (challenge.timeBonus && durationSeconds <= challenge.timeBonus.threshold) {
    // Only award time bonus if objectives completed
    const completionRate = result.pointsEarned / result.pointsPossible;
    if (completionRate >= 0.5) {
      timeBonusEarned = challenge.timeBonus.bonusPoints;
    }
  }

  return {
    ...result,
    endTime,
    durationSeconds,
    timeBonusEarned,
  };
}

/**
 * Calculate final exam result
 */
export function calculateExamResult(
  session: PracticalExamSession
): PracticalExamResult {
  const exam = PRACTICAL_EXAMS.find(e => e.id === session.examId);
  if (!exam) {
    throw new Error('Exam not found');
  }

  const totalEarned = session.challengeResults.reduce(
    (sum, r) => sum + r.pointsEarned + r.timeBonusEarned,
    0
  );
  const totalPossible = exam.totalPoints;
  const percentage = Math.round((totalEarned / totalPossible) * 100);
  const passed = percentage >= exam.passingScore;

  const timeTaken = session.endTime
    ? Math.floor((session.endTime - session.startTime) / 1000)
    : session.timeLimitSeconds - session.timeRemaining;

  // Generate feedback
  const feedback: string[] = [];
  const recommendations: string[] = [];

  if (passed) {
    feedback.push(`Congratulations! You passed the ${exam.title} with ${percentage}%.`);
  } else {
    feedback.push(`You did not pass. Score: ${percentage}% (needed ${exam.passingScore}%).`);
  }

  // Analyze weak areas
  session.challengeResults.forEach(result => {
    const challenge = exam.challenges.find(c => c.id === result.challengeId);
    if (!challenge) return;

    const completionRate = result.pointsEarned / result.pointsPossible;
    if (completionRate < 0.5) {
      recommendations.push(`Review: ${challenge.title} - completed only ${Math.round(completionRate * 100)}%`);
    }
  });

  if (recommendations.length === 0 && !passed) {
    recommendations.push('Practice timing - try to complete tasks more quickly');
  }

  return {
    examId: session.examId,
    sessionId: session.id,
    score: totalEarned,
    percentage,
    passed,
    timeTaken,
    challengeResults: session.challengeResults,
    feedback,
    recommendations,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get exam by ID
 */
export function getExamById(examId: string): PracticalExam | undefined {
  return PRACTICAL_EXAMS.find(e => e.id === examId);
}

/**
 * Get exams by domain
 */
export function getExamsByDomain(domain: DomainId): PracticalExam[] {
  return PRACTICAL_EXAMS.filter(e => e.domain === domain);
}

/**
 * Get all practical exams
 */
export function getAllPracticalExams(): PracticalExam[] {
  return [...PRACTICAL_EXAMS];
}

/**
 * Format time for display
 */
export function formatExamTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get challenge hint (with penalty tracking)
 */
export function getHint(
  challenge: PracticalChallenge,
  hintIndex: number
): { hint: string; remaining: number } | null {
  if (hintIndex >= challenge.hints.length) {
    return null;
  }

  return {
    hint: challenge.hints[hintIndex],
    remaining: challenge.hints.length - hintIndex - 1,
  };
}

/**
 * Calculate hint penalty (reduces max score)
 */
export function calculateHintPenalty(hintsUsed: number, maxPoints: number): number {
  // 10% penalty per hint, max 30%
  const penalty = Math.min(hintsUsed * 0.1, 0.3);
  return Math.round(maxPoints * penalty);
}
