/**
 * Study Mode Engine - Core logic for different study modes
 *
 * Provides 5 distinct study modes:
 * 1. Domain Deep-Dive: Focus on one domain at a time
 * 2. Timed Practice: Simulate exam pressure
 * 3. Review Mode: Go through wrong answers with explanations
 * 4. Flashcard Mode: Quick command/concept review
 * 5. Random Challenge: Mixed questions for retention
 */

import type { DomainId, ExamQuestion, Scenario, ExamBreakdown } from '@/types/scenarios';
import { DOMAIN_INFO, selectQuestionsForMode, createExamConfig } from './examEngine';

// ============================================================================
// TYPES
// ============================================================================

export type StudyMode =
  | 'domain-deep-dive'
  | 'timed-practice'
  | 'review-mode'
  | 'flashcard-mode'
  | 'random-challenge';

export interface StudyModeConfig {
  id: StudyMode;
  name: string;
  description: string;
  icon: string;  // Emoji or icon name
  hasTimeLimit: boolean;
  timeLimitMinutes?: number;
  questionCount?: number;
  requiresDomain?: boolean;
  requiresHistory?: boolean;
}

export interface StudySession {
  id: string;
  mode: StudyMode;
  domain?: DomainId;
  startTime: number;
  endTime?: number;
  timeLimitSeconds?: number;

  // Progress
  questionsTotal: number;
  questionsAnswered: number;
  questionsCorrect: number;
  commandsExecuted: number;

  // Current state
  currentQuestionIndex: number;
  isComplete: boolean;
  isPaused: boolean;

  // Content
  questions: ExamQuestion[];
  labScenarios?: Scenario[];
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  category: 'command' | 'concept' | 'error-code' | 'procedure';
  domain: DomainId;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface StudySessionResult {
  sessionId: string;
  mode: StudyMode;
  domain?: DomainId;
  durationSeconds: number;
  questionsAnswered: number;
  questionsCorrect: number;
  accuracy: number;
  commandsUsed: string[];
  weakAreas: string[];
  recommendations: string[];
}

// ============================================================================
// STUDY MODE CONFIGURATIONS
// ============================================================================

export const STUDY_MODE_CONFIGS: Record<StudyMode, StudyModeConfig> = {
  'domain-deep-dive': {
    id: 'domain-deep-dive',
    name: 'Domain Deep-Dive',
    description: 'Focus intensively on one domain with questions, labs, and command practice',
    icon: '🎯',
    hasTimeLimit: false,
    requiresDomain: true,
    requiresHistory: false,
  },
  'timed-practice': {
    id: 'timed-practice',
    name: 'Timed Practice',
    description: 'Simulate exam pressure with a 30-minute, 20-question challenge',
    icon: '⏱️',
    hasTimeLimit: true,
    timeLimitMinutes: 30,
    questionCount: 20,
    requiresDomain: false,
    requiresHistory: false,
  },
  'review-mode': {
    id: 'review-mode',
    name: 'Review Mistakes',
    description: 'Review questions you previously answered incorrectly',
    icon: '📝',
    hasTimeLimit: false,
    requiresDomain: false,
    requiresHistory: true,
  },
  'flashcard-mode': {
    id: 'flashcard-mode',
    name: 'Flashcard Review',
    description: 'Quick command and concept review with flashcards',
    icon: '🃏',
    hasTimeLimit: false,
    questionCount: 20,
    requiresDomain: false,
    requiresHistory: false,
  },
  'random-challenge': {
    id: 'random-challenge',
    name: 'Random Challenge',
    description: 'Mixed questions from all domains to test retention',
    icon: '🎲',
    hasTimeLimit: true,
    timeLimitMinutes: 15,
    questionCount: 15,
    requiresDomain: false,
    requiresHistory: false,
  },
};

// ============================================================================
// FLASHCARD DATA
// ============================================================================

export const FLASHCARDS: Flashcard[] = [
  // Domain 1 - Platform Bring-Up
  {
    id: 'fc-001',
    front: 'What command shows GPU information including driver version?',
    back: 'nvidia-smi\n\nShows GPU status, temperature, memory usage, and driver version.',
    category: 'command',
    domain: 'domain1',
    difficulty: 'easy',
  },
  {
    id: 'fc-002',
    front: 'How do you check BMC network configuration?',
    back: 'ipmitool lan print 1\n\nShows BMC IP, subnet mask, gateway, and MAC address.',
    category: 'command',
    domain: 'domain1',
    difficulty: 'medium',
  },
  {
    id: 'fc-003',
    front: 'What does POST stand for in server bring-up?',
    back: 'Power-On Self-Test\n\nHardware diagnostic sequence that runs when the server is powered on.',
    category: 'concept',
    domain: 'domain1',
    difficulty: 'easy',
  },
  {
    id: 'fc-004',
    front: 'How do you start the MST (Mellanox Software Tools) driver?',
    back: 'mst start\n\nRequired before using mlxconfig, mlxlink, or mlxfwmanager.',
    category: 'command',
    domain: 'domain1',
    difficulty: 'medium',
  },
  {
    id: 'fc-005',
    front: 'What service manages NVSwitch fabric on DGX systems?',
    back: 'Fabric Manager (nv-fabricmanager)\n\nManages NVSwitch topology and enables GPU-to-GPU communication.',
    category: 'concept',
    domain: 'domain1',
    difficulty: 'medium',
  },

  // Domain 2 - Accelerator Configuration
  {
    id: 'fc-006',
    front: 'What does MIG stand for?',
    back: 'Multi-Instance GPU\n\nAllows partitioning a single GPU into multiple isolated instances.',
    category: 'concept',
    domain: 'domain2',
    difficulty: 'easy',
  },
  {
    id: 'fc-007',
    front: 'How do you enable MIG mode on GPU 0?',
    back: 'nvidia-smi -i 0 -mig 1\n\nRequires GPU reset afterward (nvidia-smi -i 0 -r).',
    category: 'command',
    domain: 'domain2',
    difficulty: 'medium',
  },
  {
    id: 'fc-008',
    front: 'What command shows NVLink topology between GPUs?',
    back: 'nvidia-smi topo -m\n\nDisplays interconnection matrix showing NVLink/PCIe relationships.',
    category: 'command',
    domain: 'domain2',
    difficulty: 'medium',
  },
  {
    id: 'fc-009',
    front: 'What are the three BlueField DPU operating modes?',
    back: '1. DPU Mode - Arm cores own NIC resources\n2. NIC Mode - Host controls NIC\n3. Separated Host Mode - Split control',
    category: 'concept',
    domain: 'domain2',
    difficulty: 'hard',
  },
  {
    id: 'fc-010',
    front: 'How do you set GPU power limit to 400W on GPU 0?',
    back: 'nvidia-smi -i 0 -pl 400\n\nMust be within min/max power limits for the GPU.',
    category: 'command',
    domain: 'domain2',
    difficulty: 'medium',
  },

  // Domain 3 - Base Infrastructure
  {
    id: 'fc-011',
    front: 'What is the Slurm GRES plugin for GPUs?',
    back: 'gres/gpu\n\nGeneric RESource plugin that enables GPU-aware job scheduling.',
    category: 'concept',
    domain: 'domain3',
    difficulty: 'medium',
  },
  {
    id: 'fc-012',
    front: 'How do you run a container with GPU support using nvidia-docker?',
    back: 'docker run --gpus all nvidia/cuda:12.0-base\n\nThe --gpus flag enables GPU access inside the container.',
    category: 'command',
    domain: 'domain3',
    difficulty: 'easy',
  },
  {
    id: 'fc-013',
    front: 'What is Pyxis?',
    back: 'A Slurm plugin for container support\n\nEnables running containers as Slurm jobs using Enroot runtime.',
    category: 'concept',
    domain: 'domain3',
    difficulty: 'medium',
  },
  {
    id: 'fc-014',
    front: 'How do you check Slurm partition status?',
    back: 'sinfo\n\nShows partition names, availability, time limits, and node states.',
    category: 'command',
    domain: 'domain3',
    difficulty: 'easy',
  },
  {
    id: 'fc-015',
    front: 'What is NGC?',
    back: 'NVIDIA GPU Cloud\n\nContainer registry with optimized GPU-accelerated software.',
    category: 'concept',
    domain: 'domain3',
    difficulty: 'easy',
  },

  // Domain 4 - Validation & Testing
  {
    id: 'fc-016',
    front: 'What are the three DCGM diagnostic levels?',
    back: 'Level 1: Quick (2-3 min)\nLevel 2: Medium (10-15 min)\nLevel 3: Long (30+ min)\n\nHigher levels include more thorough GPU testing.',
    category: 'concept',
    domain: 'domain4',
    difficulty: 'medium',
  },
  {
    id: 'fc-017',
    front: 'How do you run DCGM Level 2 diagnostics?',
    back: 'dcgmi diag -r 2\n\nRuns medium-length diagnostics including memory and compute tests.',
    category: 'command',
    domain: 'domain4',
    difficulty: 'medium',
  },
  {
    id: 'fc-018',
    front: 'What does NCCL stand for?',
    back: 'NVIDIA Collective Communications Library\n\nOptimizes multi-GPU and multi-node communication for deep learning.',
    category: 'concept',
    domain: 'domain4',
    difficulty: 'easy',
  },
  {
    id: 'fc-019',
    front: 'What is HPL benchmark?',
    back: 'High Performance Linpack\n\nMeasures floating-point computing power, used for TOP500 rankings.',
    category: 'concept',
    domain: 'domain4',
    difficulty: 'medium',
  },
  {
    id: 'fc-020',
    front: 'How do you check InfiniBand port status?',
    back: 'ibstat\n\nShows CA type, port state, physical state, link speed, and GUIDs.',
    category: 'command',
    domain: 'domain4',
    difficulty: 'medium',
  },

  // Domain 5 - Troubleshooting
  {
    id: 'fc-021',
    front: 'What XID error code indicates GPU memory errors?',
    back: 'XID 48 - Double Bit ECC Error\nXID 63 - Row Remapping Failure\n\nThese indicate hardware issues with GPU memory.',
    category: 'error-code',
    domain: 'domain5',
    difficulty: 'hard',
  },
  {
    id: 'fc-022',
    front: 'What XID error code indicates application caused GPU fall off bus?',
    back: 'XID 79\n\nOften caused by power issues, PCIe problems, or application bugs.',
    category: 'error-code',
    domain: 'domain5',
    difficulty: 'hard',
  },
  {
    id: 'fc-023',
    front: 'How do you check for GPU ECC errors?',
    back: 'nvidia-smi -q -d ECC\n\nShows single-bit and double-bit ECC error counts.',
    category: 'command',
    domain: 'domain5',
    difficulty: 'medium',
  },
  {
    id: 'fc-024',
    front: 'What command shows InfiniBand error counters?',
    back: 'ibporterrors\n\nDisplays symbol errors, link downed, RCV errors, and other port counters.',
    category: 'command',
    domain: 'domain5',
    difficulty: 'medium',
  },
  {
    id: 'fc-025',
    front: 'How do you check GPU thermal throttling status?',
    back: 'nvidia-smi -q -d PERFORMANCE\n\nShows current performance state and any throttle reasons.',
    category: 'command',
    domain: 'domain5',
    difficulty: 'medium',
  },
];

// ============================================================================
// STUDY SESSION FUNCTIONS
// ============================================================================

/**
 * Create a new study session
 */
export function createStudySession(
  mode: StudyMode,
  allQuestions: ExamQuestion[],
  options?: {
    domain?: DomainId;
    incorrectQuestionIds?: string[];
  }
): StudySession {
  const config = STUDY_MODE_CONFIGS[mode];
  const sessionId = `study-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  let questions: ExamQuestion[] = [];

  switch (mode) {
    case 'domain-deep-dive':
      if (!options?.domain) {
        throw new Error('Domain required for domain-deep-dive mode');
      }
      questions = allQuestions.filter(q => q.domain === options.domain);
      break;

    case 'timed-practice':
      // Use exam engine for weighted selection
      const timedConfig = createExamConfig('full-practice');
      timedConfig.questionCount = config.questionCount || 20;
      questions = selectQuestionsForMode(allQuestions, timedConfig);
      break;

    case 'review-mode':
      if (!options?.incorrectQuestionIds || options.incorrectQuestionIds.length === 0) {
        throw new Error('No incorrect questions to review');
      }
      const reviewSet = new Set(options.incorrectQuestionIds);
      questions = allQuestions.filter(q => reviewSet.has(q.id));
      break;

    case 'flashcard-mode':
      // Flashcards are handled separately, but we can include some questions
      questions = shuffleArray(allQuestions).slice(0, 10);
      break;

    case 'random-challenge':
      questions = shuffleArray(allQuestions).slice(0, config.questionCount || 15);
      break;
  }

  return {
    id: sessionId,
    mode,
    domain: options?.domain,
    startTime: Date.now(),
    timeLimitSeconds: config.hasTimeLimit && config.timeLimitMinutes
      ? config.timeLimitMinutes * 60
      : undefined,
    questionsTotal: questions.length,
    questionsAnswered: 0,
    questionsCorrect: 0,
    commandsExecuted: 0,
    currentQuestionIndex: 0,
    isComplete: false,
    isPaused: false,
    questions,
  };
}

/**
 * Get flashcards for a study session
 */
export function getFlashcardsForSession(
  domain?: DomainId,
  count: number = 20
): Flashcard[] {
  let cards = [...FLASHCARDS];

  if (domain) {
    cards = cards.filter(c => c.domain === domain);
  }

  return shuffleArray(cards).slice(0, count);
}

/**
 * Get flashcards by category
 */
export function getFlashcardsByCategory(
  category: Flashcard['category']
): Flashcard[] {
  return FLASHCARDS.filter(c => c.category === category);
}

/**
 * Calculate session results
 */
export function calculateSessionResult(
  session: StudySession,
  commandsUsed: string[]
): StudySessionResult {
  const durationSeconds = session.endTime
    ? Math.floor((session.endTime - session.startTime) / 1000)
    : Math.floor((Date.now() - session.startTime) / 1000);

  const accuracy = session.questionsAnswered > 0
    ? Math.round((session.questionsCorrect / session.questionsAnswered) * 100)
    : 0;

  // Analyze weak areas based on incorrect answers
  const weakAreas: string[] = [];
  const domainScores: Record<DomainId, { correct: number; total: number }> = {
    domain1: { correct: 0, total: 0 },
    domain2: { correct: 0, total: 0 },
    domain3: { correct: 0, total: 0 },
    domain4: { correct: 0, total: 0 },
    domain5: { correct: 0, total: 0 },
  };

  // This would need more detailed tracking in the actual implementation
  // For now, identify domains below 70%
  Object.entries(domainScores).forEach(([domain, stats]) => {
    if (stats.total > 0 && (stats.correct / stats.total) < 0.7) {
      weakAreas.push(DOMAIN_INFO[domain as DomainId].name);
    }
  });

  // Generate recommendations
  const recommendations: string[] = [];
  if (accuracy < 50) {
    recommendations.push('Focus on fundamentals with Domain Deep-Dive mode');
    recommendations.push('Review flashcards for key concepts');
  } else if (accuracy < 70) {
    recommendations.push('Practice more with Timed Practice mode');
    recommendations.push('Use Review Mode to study your mistakes');
  } else if (accuracy < 90) {
    recommendations.push('Try Random Challenge to test retention');
    recommendations.push('Focus on weak domains identified above');
  } else {
    recommendations.push('Excellent progress! Consider taking a full practice exam');
    recommendations.push('Keep using Random Challenge to maintain knowledge');
  }

  return {
    sessionId: session.id,
    mode: session.mode,
    domain: session.domain,
    durationSeconds,
    questionsAnswered: session.questionsAnswered,
    questionsCorrect: session.questionsCorrect,
    accuracy,
    commandsUsed,
    weakAreas,
    recommendations,
  };
}

/**
 * Get study mode suggestions based on learner profile
 */
export function getRecommendedStudyMode(
  examHistory: ExamBreakdown[],
  recentModes: StudyMode[]
): { mode: StudyMode; reason: string }[] {
  const recommendations: { mode: StudyMode; reason: string }[] = [];

  // Check if user has exam history
  if (examHistory.length === 0) {
    recommendations.push({
      mode: 'domain-deep-dive',
      reason: 'Start with Domain Deep-Dive to build foundational knowledge',
    });
    recommendations.push({
      mode: 'flashcard-mode',
      reason: 'Learn key commands and concepts with flashcards',
    });
    return recommendations;
  }

  // Analyze recent exam performance
  const lastExam = examHistory[examHistory.length - 1];
  const weakDomains = Object.entries(lastExam.byDomain)
    .filter(([_, perf]) => perf.percentage < 70)
    .map(([domain]) => domain as DomainId);

  if (weakDomains.length > 0) {
    recommendations.push({
      mode: 'domain-deep-dive',
      reason: `Focus on ${DOMAIN_INFO[weakDomains[0]].name} (${lastExam.byDomain[weakDomains[0]].percentage}% last attempt)`,
    });
    recommendations.push({
      mode: 'review-mode',
      reason: 'Review questions you answered incorrectly',
    });
  }

  // Avoid recommending the same mode repeatedly
  const recentModeSet = new Set(recentModes.slice(-3));
  if (!recentModeSet.has('timed-practice')) {
    recommendations.push({
      mode: 'timed-practice',
      reason: 'Practice under exam time pressure',
    });
  }
  if (!recentModeSet.has('random-challenge')) {
    recommendations.push({
      mode: 'random-challenge',
      reason: 'Test retention across all domains',
    });
  }

  // If passing, encourage variety
  if (lastExam.percentage >= 70) {
    recommendations.push({
      mode: 'random-challenge',
      reason: 'Maintain your knowledge with mixed practice',
    });
  }

  return recommendations.slice(0, 3);
}

/**
 * Format duration for display
 */
export function formatStudyDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Get domain information
 */
export function getDomainInfo(domainId: DomainId): { name: string; weight: number; description: string } {
  return DOMAIN_INFO[domainId];
}

/**
 * Get all study modes
 */
export function getAllStudyModes(): StudyModeConfig[] {
  return Object.values(STUDY_MODE_CONFIGS);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
