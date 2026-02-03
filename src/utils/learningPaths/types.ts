/**
 * Type definitions for the Learning Path Engine
 *
 * Provides type safety for structured learning paths for NCP-AII certification.
 */

import type { DomainId } from '@/types/scenarios';

// ============================================================================
// TYPES
// ============================================================================

export type TutorialStepType =
  | 'concept'      // Explanation/reading material
  | 'command'      // Execute a command
  | 'observe'      // Observe output without action
  | 'quiz'         // Quick comprehension check
  | 'practice';    // Free-form practice

export interface TutorialStep {
  id: string;
  type: TutorialStepType;
  title: string;
  content: string;           // Main instruction/explanation text

  // For 'command' type
  expectedCommand?: string;  // The command user should type
  commandHint?: string;      // Hint shown if user is stuck
  validationPattern?: RegExp; // Pattern to validate command (more flexible than exact match)

  // For 'quiz' type
  quizQuestion?: string;
  quizChoices?: string[];
  quizCorrectIndex?: number;
  quizExplanation?: string;

  // For 'observe' type
  observeCommand?: string;   // Command to auto-execute and show output

  // Feedback messages
  successMessage?: string;
  failureMessage?: string;

  // Optional tips
  tips?: string[];

  // Documentation reference
  docLink?: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  objectives: string[];

  // Tutorial steps (interactive walkthrough)
  steps: TutorialStep[];

  // Prerequisites (other lesson IDs in this module)
  prerequisites?: string[];

  // Estimated completion time (minutes)
  estimatedMinutes: number;

  // Related commands covered
  commands: string[];

  // Difficulty level
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface Module {
  id: string;
  title: string;
  description: string;

  // Lessons in this module
  lessons: Lesson[];

  // Module prerequisites (other module IDs)
  prerequisites?: string[];

  // Icon for UI
  icon: string;

  // Order within the learning path
  order: number;
}

export interface LearningPath {
  id: string;
  domainId: DomainId;
  title: string;
  description: string;

  // Modules in this path
  modules: Module[];

  // Total estimated time (calculated from modules)
  totalEstimatedMinutes: number;

  // Exam weight for this domain
  examWeight: number;

  // Skills/competencies gained
  skills: string[];
}

export interface LessonProgress {
  lessonId: string;
  moduleId: string;
  pathId: string;
  started: boolean;
  completed: boolean;
  currentStepIndex: number;
  completedSteps: string[];
  startedAt?: number;
  completedAt?: number;
  timeSpentSeconds: number;
  quizScores: Record<string, boolean>; // stepId -> correct/incorrect
}

export interface ModuleProgress {
  moduleId: string;
  pathId: string;
  lessonsCompleted: number;
  lessonsTotal: number;
  completedLessonIds: string[];
}

export interface PathProgress {
  pathId: string;
  modulesCompleted: number;
  modulesTotal: number;
  totalLessons: number;
  completedLessons: number;
  overallPercentage: number;
  startedAt?: number;
  lastActivityAt?: number;
  totalTimeSpentSeconds: number;
}
