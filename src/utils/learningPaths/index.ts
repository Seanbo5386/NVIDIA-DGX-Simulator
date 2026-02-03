/**
 * Learning Path Engine - Structured learning paths for NCP-AII certification
 *
 * This is the main entry point for the learning path module.
 * Re-exports all types, data, and functions for backwards compatibility.
 */

// Types
export type {
  TutorialStepType,
  TutorialStep,
  Lesson,
  Module,
  LearningPath,
  LessonProgress,
  ModuleProgress,
  PathProgress,
} from './types';

// Domain data
export {
  DOMAIN1_PATH,
  DOMAIN2_PATH,
  DOMAIN3_PATH,
  DOMAIN4_PATH,
  DOMAIN5_PATH,
} from './domains';

// Engine functions and path data
export {
  LEARNING_PATHS,
  ALL_PATHS,
  getLearningPath,
  getPathsByWeight,
  getLessonById,
  getModuleById,
  areLessonPrerequisitesMet,
  areModulePrerequisitesMet,
  getNextLesson,
  calculatePathProgress,
  validateCommand,
  getTotalPathStats,
  getDomainWithPath,
} from './engine';

// Reference data
export {
  EXAM_COMMAND_REFERENCE,
  XID_REFERENCE,
  DGX_A100_SPECS,
  getStudyPriorities,
} from './reference';
