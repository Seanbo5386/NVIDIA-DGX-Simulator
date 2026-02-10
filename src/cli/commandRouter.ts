import type { CommandContext, CommandResult } from "@/types/commands";

export type CommandHandler = (
  cmdLine: string,
  context: CommandContext,
) => CommandResult | Promise<CommandResult>;

export class CommandRouter {
  private handlers = new Map<string, CommandHandler>();

  register(command: string, handler: CommandHandler): void {
    this.handlers.set(command, handler);
  }

  registerMany(commands: string[], handler: CommandHandler): void {
    commands.forEach((command) => this.register(command, handler));
  }

  get(command: string): CommandHandler | undefined {
    return this.handlers.get(command);
  }

  has(command: string): boolean {
    return this.handlers.has(command);
  }

  list(): string[] {
    return Array.from(this.handlers.keys());
  }
}
