/**
 * Adaptive Learning System
 *
 * Implements dynamic question difficulty adjustment and spaced repetition
 * for optimal learning retention and exam preparation.
 */

import { type DomainId } from './certificationResources';

// Question difficulty levels
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

// Performance thresholds for difficulty adjustment
export const DIFFICULTY_THRESHOLDS = {
  // If accuracy is above this, increase difficulty
  increaseThreshold: 0.8,
  // If accuracy is below this, decrease difficulty
  decreaseThreshold: 0.5,
  // Minimum questions needed before adjusting
  minQuestionsForAdjustment: 5,
};

// Spaced repetition intervals (in hours)
export const SPACED_REPETITION_INTERVALS = {
  // Initial intervals based on performance
  correct: [1, 6, 24, 72, 168, 336, 720], // 1h, 6h, 1d, 3d, 1w, 2w, 1m
  incorrect: [0.5, 1, 6, 24, 72], // More frequent review for incorrect
};

/**
 * Question performance record for spaced repetition
 */
export interface QuestionPerformance {
  questionId: string;
  domain: DomainId;
  difficulty: DifficultyLevel;
  timesAnswered: number;
  timesCorrect: number;
  consecutiveCorrect: number;
  lastAnswered: number; // timestamp
  nextReviewDue: number; // timestamp
  easeFactor: number; // SM-2 algorithm ease factor (default 2.5)
  interval: number; // current interval in hours
}

/**
 * Learner performance profile for adaptive difficulty
 */
export interface LearnerProfile {
  id: string;
  overallAccuracy: number;
  questionHistory: QuestionPerformance[];
  domainPerformance: Record<DomainId, DomainPerformance>;
  currentDifficulty: DifficultyLevel;
  lastDifficultyAdjustment: number;
  totalQuestionsAnswered: number;
  studyStreak: number;
  lastStudyDate: number;
}

export interface DomainPerformance {
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
  averageResponseTime: number; // in seconds
  difficulty: DifficultyLevel;
  weakTopics: string[];
  strongTopics: string[];
}

/**
 * Result of difficulty calculation
 */
export interface DifficultyRecommendation {
  recommendedDifficulty: DifficultyLevel;
  reason: string;
  confidence: number; // 0-1
  shouldAdjust: boolean;
}

/**
 * Questions due for review
 */
export interface ReviewQueue {
  dueNow: QuestionPerformance[];
  dueToday: QuestionPerformance[];
  dueTomorrow: QuestionPerformance[];
  overdue: QuestionPerformance[];
  totalDue: number;
}

/**
 * Calculate recommended difficulty based on recent performance
 */
export function calculateRecommendedDifficulty(
  recentAnswers: { correct: boolean; difficulty: DifficultyLevel }[],
  currentDifficulty: DifficultyLevel
): DifficultyRecommendation {
  if (recentAnswers.length < DIFFICULTY_THRESHOLDS.minQuestionsForAdjustment) {
    return {
      recommendedDifficulty: currentDifficulty,
      reason: `Need at least ${DIFFICULTY_THRESHOLDS.minQuestionsForAdjustment} answers to adjust difficulty`,
      confidence: 0,
      shouldAdjust: false,
    };
  }

  const correctCount = recentAnswers.filter(a => a.correct).length;
  const accuracy = correctCount / recentAnswers.length;

  // Weight recent answers more heavily
  const recentWeight = 0.7;
  const recentAnswersSlice = recentAnswers.slice(-5);
  const recentCorrect = recentAnswersSlice.filter(a => a.correct).length;
  const recentAccuracy = recentCorrect / recentAnswersSlice.length;

  const weightedAccuracy = (accuracy * (1 - recentWeight)) + (recentAccuracy * recentWeight);

  let recommendedDifficulty = currentDifficulty;
  let reason = '';
  let shouldAdjust = false;

  if (weightedAccuracy >= DIFFICULTY_THRESHOLDS.increaseThreshold) {
    if (currentDifficulty === 'easy') {
      recommendedDifficulty = 'medium';
      reason = `High accuracy (${(weightedAccuracy * 100).toFixed(0)}%) - ready for medium difficulty`;
      shouldAdjust = true;
    } else if (currentDifficulty === 'medium') {
      recommendedDifficulty = 'hard';
      reason = `Excellent performance (${(weightedAccuracy * 100).toFixed(0)}%) - advancing to hard difficulty`;
      shouldAdjust = true;
    } else {
      reason = `Already at maximum difficulty with ${(weightedAccuracy * 100).toFixed(0)}% accuracy`;
    }
  } else if (weightedAccuracy < DIFFICULTY_THRESHOLDS.decreaseThreshold) {
    if (currentDifficulty === 'hard') {
      recommendedDifficulty = 'medium';
      reason = `Accuracy dropped to ${(weightedAccuracy * 100).toFixed(0)}% - reducing to medium difficulty`;
      shouldAdjust = true;
    } else if (currentDifficulty === 'medium') {
      recommendedDifficulty = 'easy';
      reason = `Struggling at ${(weightedAccuracy * 100).toFixed(0)}% - building foundation with easier questions`;
      shouldAdjust = true;
    } else {
      reason = `At easiest level with ${(weightedAccuracy * 100).toFixed(0)}% accuracy - keep practicing`;
    }
  } else {
    reason = `Maintaining ${currentDifficulty} difficulty at ${(weightedAccuracy * 100).toFixed(0)}% accuracy`;
  }

  return {
    recommendedDifficulty,
    reason,
    confidence: Math.min(recentAnswers.length / 20, 1), // Max confidence at 20 answers
    shouldAdjust,
  };
}

/**
 * Calculate domain-specific difficulty
 */
export function calculateDomainDifficulty(
  domainPerformance: DomainPerformance
): DifficultyRecommendation {
  const { questionsAnswered, accuracy, difficulty } = domainPerformance;

  if (questionsAnswered < DIFFICULTY_THRESHOLDS.minQuestionsForAdjustment) {
    return {
      recommendedDifficulty: difficulty,
      reason: `Need more practice in this domain (${questionsAnswered}/${DIFFICULTY_THRESHOLDS.minQuestionsForAdjustment} questions)`,
      confidence: questionsAnswered / DIFFICULTY_THRESHOLDS.minQuestionsForAdjustment,
      shouldAdjust: false,
    };
  }

  const recentAnswers = Array(questionsAnswered).fill(null).map((_, i) => ({
    correct: i < Math.round(questionsAnswered * accuracy),
    difficulty,
  }));

  return calculateRecommendedDifficulty(recentAnswers, difficulty);
}

/**
 * SM-2 Spaced Repetition Algorithm Implementation
 * Based on SuperMemo SM-2 algorithm
 */
export function calculateNextReview(
  performance: QuestionPerformance,
  wasCorrect: boolean,
  responseQuality: number // 0-5 scale (0=complete blackout, 5=perfect response)
): QuestionPerformance {
  const now = Date.now();
  let { easeFactor, interval, consecutiveCorrect } = performance;

  if (wasCorrect && responseQuality >= 3) {
    // Correct response
    consecutiveCorrect++;

    if (consecutiveCorrect === 1) {
      interval = 1; // 1 hour
    } else if (consecutiveCorrect === 2) {
      interval = 6; // 6 hours
    } else {
      interval = Math.round(interval * easeFactor);
    }

    // Update ease factor (SM-2 formula)
    easeFactor = Math.max(
      1.3,
      easeFactor + (0.1 - (5 - responseQuality) * (0.08 + (5 - responseQuality) * 0.02))
    );
  } else {
    // Incorrect response - reset interval
    consecutiveCorrect = 0;
    interval = 0.5; // 30 minutes

    // Decrease ease factor for incorrect answers
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  }

  const nextReviewDue = now + (interval * 60 * 60 * 1000); // Convert hours to ms

  return {
    ...performance,
    timesAnswered: performance.timesAnswered + 1,
    timesCorrect: performance.timesCorrect + (wasCorrect ? 1 : 0),
    consecutiveCorrect,
    lastAnswered: now,
    nextReviewDue,
    easeFactor,
    interval,
  };
}

/**
 * Get questions due for review
 */
export function getReviewQueue(
  questionHistory: QuestionPerformance[]
): ReviewQueue {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const endOfToday = new Date().setHours(23, 59, 59, 999);
  const endOfTomorrow = endOfToday + oneDay;

  const dueNow: QuestionPerformance[] = [];
  const dueToday: QuestionPerformance[] = [];
  const dueTomorrow: QuestionPerformance[] = [];
  const overdue: QuestionPerformance[] = [];

  questionHistory.forEach(q => {
    if (q.nextReviewDue <= now) {
      if (q.nextReviewDue < now - oneDay) {
        overdue.push(q);
      } else {
        dueNow.push(q);
      }
    } else if (q.nextReviewDue <= endOfToday) {
      dueToday.push(q);
    } else if (q.nextReviewDue <= endOfTomorrow) {
      dueTomorrow.push(q);
    }
  });

  // Sort by priority: overdue first, then by next review time
  overdue.sort((a, b) => a.nextReviewDue - b.nextReviewDue);
  dueNow.sort((a, b) => a.nextReviewDue - b.nextReviewDue);
  dueToday.sort((a, b) => a.nextReviewDue - b.nextReviewDue);
  dueTomorrow.sort((a, b) => a.nextReviewDue - b.nextReviewDue);

  return {
    dueNow,
    dueToday,
    dueTomorrow,
    overdue,
    totalDue: overdue.length + dueNow.length,
  };
}

/**
 * Create initial question performance record
 */
export function createQuestionPerformance(
  questionId: string,
  domain: DomainId,
  difficulty: DifficultyLevel
): QuestionPerformance {
  const now = Date.now();
  return {
    questionId,
    domain,
    difficulty,
    timesAnswered: 0,
    timesCorrect: 0,
    consecutiveCorrect: 0,
    lastAnswered: 0,
    nextReviewDue: now, // Due immediately for new questions
    easeFactor: 2.5, // Default SM-2 ease factor
    interval: 0,
  };
}

/**
 * Calculate optimal study order based on spaced repetition
 */
export function getOptimalStudyOrder(
  questionHistory: QuestionPerformance[],
  maxQuestions: number = 20
): QuestionPerformance[] {
  const queue = getReviewQueue(questionHistory);

  // Priority order: overdue > dueNow > lowest accuracy questions
  const priorityQueue: QuestionPerformance[] = [
    ...queue.overdue,
    ...queue.dueNow,
  ];

  if (priorityQueue.length < maxQuestions) {
    // Add questions with lowest accuracy that aren't already in queue
    const queueIds = new Set(priorityQueue.map(q => q.questionId));
    const remainingQuestions = questionHistory
      .filter(q => !queueIds.has(q.questionId))
      .sort((a, b) => {
        const accA = a.timesAnswered > 0 ? a.timesCorrect / a.timesAnswered : 0;
        const accB = b.timesAnswered > 0 ? b.timesCorrect / b.timesAnswered : 0;
        return accA - accB; // Lowest accuracy first
      });

    priorityQueue.push(...remainingQuestions.slice(0, maxQuestions - priorityQueue.length));
  }

  return priorityQueue.slice(0, maxQuestions);
}

/**
 * Calculate response quality (0-5) based on answer and time
 */
export function calculateResponseQuality(
  wasCorrect: boolean,
  responseTimeSeconds: number,
  expectedTimeSeconds: number = 60
): number {
  if (!wasCorrect) {
    // Incorrect answers get 0-2 based on how close they were
    return responseTimeSeconds < expectedTimeSeconds * 0.5 ? 1 : 0;
  }

  // Correct answers get 3-5 based on response time
  const timeRatio = responseTimeSeconds / expectedTimeSeconds;

  if (timeRatio <= 0.5) {
    return 5; // Very fast, perfect recall
  } else if (timeRatio <= 0.75) {
    return 4; // Good recall
  } else if (timeRatio <= 1.0) {
    return 3; // Acceptable recall
  } else {
    return 3; // Slower but still correct
  }
}

/**
 * Predict exam pass probability based on performance data
 */
export function predictPassProbability(
  domainPerformance: Record<DomainId, DomainPerformance>,
  domainWeights: Record<DomainId, number>,
  passingScore: number = 70
): {
  probability: number;
  predictedScore: number;
  confidence: number;
  weakestDomains: DomainId[];
  recommendations: string[];
} {
  let weightedScore = 0;
  let totalWeight = 0;
  let totalQuestions = 0;
  const weakDomains: { domain: DomainId; gap: number }[] = [];
  const recommendations: string[] = [];

  const domainIds: DomainId[] = ['domain1', 'domain2', 'domain3', 'domain4', 'domain5'];

  domainIds.forEach(domainId => {
    const perf = domainPerformance[domainId];
    const weight = domainWeights[domainId] || 0;

    if (perf && perf.questionsAnswered > 0) {
      const score = perf.accuracy * 100;
      weightedScore += score * (weight / 100);
      totalWeight += weight;
      totalQuestions += perf.questionsAnswered;

      if (score < passingScore) {
        weakDomains.push({ domain: domainId, gap: passingScore - score });
      }
    }
  });

  // Normalize score if not all domains have data
  const predictedScore = totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 0;

  // Calculate confidence based on questions answered
  const minQuestionsForConfidence = 50;
  const confidence = Math.min(totalQuestions / minQuestionsForConfidence, 1);

  // Calculate pass probability using logistic function
  const scoreGap = predictedScore - passingScore;
  const rawProbability = 1 / (1 + Math.exp(-scoreGap / 10));

  // Adjust probability based on confidence
  const probability = confidence * rawProbability + (1 - confidence) * 0.5;

  // Generate recommendations
  if (weakDomains.length > 0) {
    weakDomains.sort((a, b) => b.gap - a.gap);
    const worstDomain = weakDomains[0];
    recommendations.push(
      `Focus on ${worstDomain.domain.replace('domain', 'Domain ')} - ${worstDomain.gap.toFixed(0)}% below passing`
    );
  }

  if (totalQuestions < minQuestionsForConfidence) {
    recommendations.push(
      `Complete ${minQuestionsForConfidence - totalQuestions} more questions for accurate prediction`
    );
  }

  if (predictedScore >= passingScore && probability < 0.8) {
    recommendations.push('Practice more to build confidence and consistency');
  }

  return {
    probability,
    predictedScore,
    confidence,
    weakestDomains: weakDomains.slice(0, 3).map(w => w.domain),
    recommendations,
  };
}

/**
 * Calculate improvement trend over time
 */
export function calculateImprovementTrend(
  performanceHistory: { date: number; accuracy: number }[],
  windowDays: number = 7
): {
  trend: 'improving' | 'stable' | 'declining';
  changePercent: number;
  recentAverage: number;
  previousAverage: number;
} {
  if (performanceHistory.length < 2) {
    return {
      trend: 'stable',
      changePercent: 0,
      recentAverage: performanceHistory[0]?.accuracy || 0,
      previousAverage: performanceHistory[0]?.accuracy || 0,
    };
  }

  const now = Date.now();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;

  // Split into recent and previous periods
  const recentPeriod = performanceHistory.filter(
    p => p.date >= now - windowMs
  );
  const previousPeriod = performanceHistory.filter(
    p => p.date >= now - (windowMs * 2) && p.date < now - windowMs
  );

  const recentAverage = recentPeriod.length > 0
    ? recentPeriod.reduce((sum, p) => sum + p.accuracy, 0) / recentPeriod.length
    : 0;

  const previousAverage = previousPeriod.length > 0
    ? previousPeriod.reduce((sum, p) => sum + p.accuracy, 0) / previousPeriod.length
    : recentAverage;

  const changePercent = previousAverage > 0
    ? ((recentAverage - previousAverage) / previousAverage) * 100
    : 0;

  let trend: 'improving' | 'stable' | 'declining';
  if (changePercent > 5) {
    trend = 'improving';
  } else if (changePercent < -5) {
    trend = 'declining';
  } else {
    trend = 'stable';
  }

  return {
    trend,
    changePercent,
    recentAverage,
    previousAverage,
  };
}

/**
 * Get personalized study recommendations
 */
export function getStudyRecommendations(
  profile: LearnerProfile,
  domainWeights: Record<DomainId, number>
): string[] {
  const recommendations: string[] = [];

  // Check review queue
  const queue = getReviewQueue(profile.questionHistory);
  if (queue.overdue.length > 0) {
    recommendations.push(
      `You have ${queue.overdue.length} overdue review items - prioritize these first`
    );
  } else if (queue.totalDue > 0) {
    recommendations.push(
      `${queue.totalDue} questions are due for review today`
    );
  }

  // Check domain performance
  const domainIds: DomainId[] = ['domain1', 'domain2', 'domain3', 'domain4', 'domain5'];
  const weakDomains = domainIds
    .filter(d => profile.domainPerformance[d]?.accuracy < 0.7)
    .sort((a, b) => {
      const weightA = domainWeights[a] || 0;
      const weightB = domainWeights[b] || 0;
      return weightB - weightA; // Higher weight = higher priority
    });

  if (weakDomains.length > 0) {
    const domain = weakDomains[0];
    const weight = domainWeights[domain] || 0;
    recommendations.push(
      `Focus on ${domain.replace('domain', 'Domain ')} (${weight}% of exam) - currently at ${(profile.domainPerformance[domain].accuracy * 100).toFixed(0)}%`
    );
  }

  // Check study streak
  const lastStudy = new Date(profile.lastStudyDate);
  const today = new Date();
  const daysSinceStudy = Math.floor(
    (today.getTime() - lastStudy.getTime()) / (24 * 60 * 60 * 1000)
  );

  if (daysSinceStudy > 1) {
    recommendations.push(
      `It's been ${daysSinceStudy} days since your last study session - consistency is key!`
    );
  } else if (profile.studyStreak > 0) {
    recommendations.push(
      `Keep your ${profile.studyStreak}-day study streak going!`
    );
  }

  // Difficulty recommendation
  const diffRec = calculateRecommendedDifficulty(
    profile.questionHistory
      .slice(-20)
      .map(q => ({
        correct: q.timesCorrect > 0,
        difficulty: q.difficulty,
      })),
    profile.currentDifficulty
  );

  if (diffRec.shouldAdjust) {
    recommendations.push(diffRec.reason);
  }

  return recommendations.slice(0, 5); // Max 5 recommendations
}

/**
 * Create default learner profile
 */
export function createLearnerProfile(id: string): LearnerProfile {
  const now = Date.now();
  return {
    id,
    overallAccuracy: 0,
    questionHistory: [],
    domainPerformance: {
      domain1: createDefaultDomainPerformance(),
      domain2: createDefaultDomainPerformance(),
      domain3: createDefaultDomainPerformance(),
      domain4: createDefaultDomainPerformance(),
      domain5: createDefaultDomainPerformance(),
    },
    currentDifficulty: 'medium',
    lastDifficultyAdjustment: now,
    totalQuestionsAnswered: 0,
    studyStreak: 0,
    lastStudyDate: now,
  };
}

function createDefaultDomainPerformance(): DomainPerformance {
  return {
    questionsAnswered: 0,
    correctAnswers: 0,
    accuracy: 0,
    averageResponseTime: 0,
    difficulty: 'medium',
    weakTopics: [],
    strongTopics: [],
  };
}
