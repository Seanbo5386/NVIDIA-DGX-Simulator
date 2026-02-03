/**
 * Learning Path Engine - Core logic functions
 *
 * Provides functions for navigating, validating, and tracking progress
 * through learning paths for NCP-AII certification.
 */

import type { DomainId, DomainInfo } from '@/types/scenarios';
import { DOMAINS } from '@/types/scenarios';
import type { LearningPath, Module, Lesson, PathProgress, TutorialStep } from './types';
import {
  DOMAIN1_PATH,
  DOMAIN2_PATH,
  DOMAIN3_PATH,
  DOMAIN4_PATH,
  DOMAIN5_PATH,
} from './domains';

// ============================================================================
// ALL LEARNING PATHS
// ============================================================================

export const LEARNING_PATHS: Record<DomainId, LearningPath> = {
  domain1: DOMAIN1_PATH,
  domain2: DOMAIN2_PATH,
  domain3: DOMAIN3_PATH,
  domain4: DOMAIN4_PATH,
  domain5: DOMAIN5_PATH,
};

export const ALL_PATHS = Object.values(LEARNING_PATHS);

// ============================================================================
// PATH ENGINE FUNCTIONS
// ============================================================================

/**
 * Get a specific learning path by domain ID
 */
export function getLearningPath(domainId: DomainId): LearningPath {
  return LEARNING_PATHS[domainId];
}

/**
 * Get all learning paths sorted by exam weight (highest first)
 */
export function getPathsByWeight(): LearningPath[] {
  return ALL_PATHS.sort((a, b) => b.examWeight - a.examWeight);
}

/**
 * Get a specific lesson by its ID
 */
export function getLessonById(lessonId: string): { lesson: Lesson; module: Module; path: LearningPath } | null {
  for (const path of ALL_PATHS) {
    for (const module of path.modules) {
      const lesson = module.lessons.find(l => l.id === lessonId);
      if (lesson) {
        return { lesson, module, path };
      }
    }
  }
  return null;
}

/**
 * Get a specific module by its ID
 */
export function getModuleById(moduleId: string): { module: Module; path: LearningPath } | null {
  for (const path of ALL_PATHS) {
    const module = path.modules.find(m => m.id === moduleId);
    if (module) {
      return { module, path };
    }
  }
  return null;
}

/**
 * Check if a lesson's prerequisites are met
 */
export function areLessonPrerequisitesMet(
  lessonId: string,
  completedLessonIds: Set<string>
): boolean {
  const result = getLessonById(lessonId);
  if (!result) return false;

  const { lesson } = result;
  if (!lesson.prerequisites || lesson.prerequisites.length === 0) {
    return true;
  }

  return lesson.prerequisites.every(prereq => completedLessonIds.has(prereq));
}

/**
 * Check if a module's prerequisites are met
 */
export function areModulePrerequisitesMet(
  moduleId: string,
  completedModuleIds: Set<string>
): boolean {
  const result = getModuleById(moduleId);
  if (!result) return false;

  const { module } = result;
  if (!module.prerequisites || module.prerequisites.length === 0) {
    return true;
  }

  return module.prerequisites.every(prereq => completedModuleIds.has(prereq));
}

/**
 * Get the next recommended lesson for a user
 */
export function getNextLesson(
  completedLessonIds: Set<string>,
  completedModuleIds: Set<string>,
  preferredDomain?: DomainId
): { lesson: Lesson; module: Module; path: LearningPath } | null {
  const paths = preferredDomain
    ? [LEARNING_PATHS[preferredDomain]]
    : getPathsByWeight();

  for (const path of paths) {
    for (const module of path.modules) {
      // Check module prerequisites
      if (!areModulePrerequisitesMet(module.id, completedModuleIds)) {
        continue;
      }

      for (const lesson of module.lessons) {
        // Skip completed lessons
        if (completedLessonIds.has(lesson.id)) {
          continue;
        }

        // Check lesson prerequisites
        if (areLessonPrerequisitesMet(lesson.id, completedLessonIds)) {
          return { lesson, module, path };
        }
      }
    }
  }

  return null;
}

/**
 * Calculate progress for a learning path
 */
export function calculatePathProgress(
  pathId: string,
  completedLessonIds: Set<string>
): PathProgress {
  const path = ALL_PATHS.find(p => p.id === pathId);
  if (!path) {
    return {
      pathId,
      modulesCompleted: 0,
      modulesTotal: 0,
      totalLessons: 0,
      completedLessons: 0,
      overallPercentage: 0,
      totalTimeSpentSeconds: 0,
    };
  }

  let totalLessons = 0;
  let completedLessons = 0;
  let modulesCompleted = 0;

  for (const module of path.modules) {
    let moduleComplete = true;
    for (const lesson of module.lessons) {
      totalLessons++;
      if (completedLessonIds.has(lesson.id)) {
        completedLessons++;
      } else {
        moduleComplete = false;
      }
    }
    if (moduleComplete && module.lessons.length > 0) {
      modulesCompleted++;
    }
  }

  return {
    pathId,
    modulesCompleted,
    modulesTotal: path.modules.length,
    totalLessons,
    completedLessons,
    overallPercentage: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
    totalTimeSpentSeconds: 0, // Will be populated from store
  };
}

/**
 * Validate a command against expected pattern
 */
export function validateCommand(
  userCommand: string,
  step: TutorialStep
): { valid: boolean; message: string } {
  if (step.type !== 'command') {
    return { valid: false, message: 'This step does not expect a command.' };
  }

  const normalizedUserCmd = userCommand.trim().toLowerCase();

  // Check against validation pattern if provided
  if (step.validationPattern) {
    const regex = step.validationPattern;
    if (regex.test(userCommand)) {
      return {
        valid: true,
        message: step.successMessage || 'Correct!'
      };
    }
  }

  // Check against exact expected command
  if (step.expectedCommand) {
    const normalizedExpected = step.expectedCommand.trim().toLowerCase();
    if (normalizedUserCmd === normalizedExpected) {
      return {
        valid: true,
        message: step.successMessage || 'Correct!'
      };
    }

    // Partial match check
    if (normalizedUserCmd.includes(normalizedExpected.split(' ')[0])) {
      return {
        valid: false,
        message: step.failureMessage || `Close! The expected command is: ${step.expectedCommand}`
      };
    }
  }

  return {
    valid: false,
    message: step.failureMessage || `Try: ${step.commandHint || step.expectedCommand}`
  };
}

/**
 * Get total statistics across all paths
 */
export function getTotalPathStats(): {
  totalPaths: number;
  totalModules: number;
  totalLessons: number;
  totalSteps: number;
  totalEstimatedMinutes: number;
} {
  let totalModules = 0;
  let totalLessons = 0;
  let totalSteps = 0;
  let totalEstimatedMinutes = 0;

  for (const path of ALL_PATHS) {
    totalEstimatedMinutes += path.totalEstimatedMinutes;
    for (const module of path.modules) {
      totalModules++;
      for (const lesson of module.lessons) {
        totalLessons++;
        totalSteps += lesson.steps.length;
      }
    }
  }

  return {
    totalPaths: ALL_PATHS.length,
    totalModules,
    totalLessons,
    totalSteps,
    totalEstimatedMinutes,
  };
}

/**
 * Get domain info with learning path data
 */
export function getDomainWithPath(domainId: DomainId): DomainInfo & { path: LearningPath } {
  return {
    ...DOMAINS[domainId],
    path: LEARNING_PATHS[domainId],
  };
}
