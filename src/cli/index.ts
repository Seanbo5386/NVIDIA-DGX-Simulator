// src/cli/index.ts
// Barrel export for CLI module

// Types
export type {
  CommandCategory,
  StateDomain,
  CommandOption,
  Subcommand,
  SubcommandOption,
  ExitCode,
  UsagePattern,
  ErrorMessage,
  StateInteraction,
  OutputFormat,
  CommandDefinition,
} from "./types";

// Loader
export {
  CommandDefinitionLoader,
  getCommandDefinitionLoader,
} from "./CommandDefinitionLoader";

// Registry
export {
  CommandDefinitionRegistry,
  getCommandDefinitionRegistry,
} from "./CommandDefinitionRegistry";
export type { ValidationResult } from "./CommandDefinitionRegistry";

// Explain Command
export { generateExplainOutput } from "./explainCommand";
export type { ExplainOptions } from "./explainCommand";

// Exercise Generator
export { CommandExerciseGenerator } from "./CommandExerciseGenerator";
export type { CommandExercise } from "./CommandExerciseGenerator";
