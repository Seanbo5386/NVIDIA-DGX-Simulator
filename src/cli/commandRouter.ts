import type { CommandContext, CommandResult } from "@/types/commands";

export type CommandHandler = (
  cmdLine: string,
  context: CommandContext,
) => CommandResult | Promise<CommandResult>;

/**
 * Registration-based command router.
 * Maps command names to handler functions and resolves
 * them at execution time.
 */
export class CommandRouter {
  private handlers = new Map<string, CommandHandler>();

  /** Register a single command. */
  register(command: string, handler: CommandHandler): void {
    this.handlers.set(command, handler);
  }

  /** Register the same handler for multiple command names. */
  registerMany(commands: string[], handler: CommandHandler): void {
    for (const command of commands) {
      this.handlers.set(command, handler);
    }
  }

  /** Resolve a command name to its handler, or null if not found. */
  resolve(command: string): CommandHandler | null {
    return this.handlers.get(command) ?? null;
  }

  /** Check whether a command name has a registered handler. */
  has(command: string): boolean {
    return this.handlers.has(command);
  }
}
