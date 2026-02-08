// src/cli/StateEngine.ts
import type { CommandDefinitionRegistry } from "./CommandDefinitionRegistry";
import type { StateInteraction } from "./types";

export interface ExecutionContext {
  isRoot: boolean;
}

export interface CanExecuteResult {
  valid: boolean;
  reason?: string;
}

/**
 * StateEngine enforces realistic command sequences using state_interactions
 * from JSON definitions.
 */
export class StateEngine {
  constructor(private registry: CommandDefinitionRegistry) {}

  /**
   * Check if a command with given flags requires root privileges
   */
  requiresRoot(command: string, flags: string[]): boolean {
    // Check each flag
    for (const flag of flags) {
      if (this.registry.requiresRoot(command, flag)) {
        return true;
      }
    }

    // Check command-level permissions
    const def = this.registry.getDefinition(command);
    if (!def) return false;

    // Check state_interactions.writes_to for requires_privilege
    const writesTo = def.state_interactions?.writes_to || [];
    for (const write of writesTo) {
      if (write.requires_privilege === "root") {
        // If no specific flags required, command always needs root for writes
        if (!write.requires_flags || write.requires_flags.length === 0) {
          return true;
        }
        // Check if any of the required flags are present
        for (const reqFlag of write.requires_flags) {
          const normalized = reqFlag.replace(/^-+/, "");
          if (flags.includes(normalized)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Get state interactions for a command
   */
  getStateInteractions(command: string): StateInteraction | undefined {
    const def = this.registry.getDefinition(command);
    return def?.state_interactions;
  }

  /**
   * Check if command can execute given current context
   */
  canExecute(
    command: string,
    flags: string[],
    context: ExecutionContext,
  ): CanExecuteResult {
    const error = this.getPrerequisiteError(command, flags, context);
    if (error) {
      return { valid: false, reason: error };
    }
    return { valid: true };
  }

  /**
   * Get human-readable prerequisite error, or null if prerequisites met
   */
  getPrerequisiteError(
    command: string,
    flags: string[],
    context: ExecutionContext,
  ): string | null {
    // Check root requirement
    if (this.requiresRoot(command, flags) && !context.isRoot) {
      return `${command}: Operation requires root privileges. Run with sudo.`;
    }

    // Future: Check state prerequisites from state_interactions.prerequisites
    // For now, just permission checking

    return null;
  }
}
