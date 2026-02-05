// src/cli/formatters.ts
import type {
  CommandDefinition,
  CommandOption,
  Subcommand,
  ExitCode,
  ErrorMessage,
  UsagePattern,
} from "./types";

/**
 * ANSI escape codes for terminal formatting
 * Matches patterns from explainCommand.ts
 */
export const ANSI = {
  RESET: "\x1b[0m",
  BOLD: "\x1b[1m",
  DIM: "\x1b[2m",
  RED: "\x1b[31m",
  GREEN: "\x1b[32m",
  YELLOW: "\x1b[33m",
  CYAN: "\x1b[36m",
  GRAY: "\x1b[90m",
  BOLD_CYAN: "\x1b[1;36m",
  BOLD_WHITE: "\x1b[1;37m",
} as const;

/**
 * Format a complete command help output from JSON definition
 */
export function formatCommandHelp(def: CommandDefinition): string {
  let output = "";

  // Header
  output += `${ANSI.BOLD_CYAN}━━━ ${def.command} ━━━${ANSI.RESET}\n\n`;

  // Description
  output += `${ANSI.BOLD}Description:${ANSI.RESET}\n`;
  output += `  ${def.description}\n\n`;

  // Synopsis
  output += `${ANSI.BOLD}Usage:${ANSI.RESET}\n`;
  output += `  ${def.synopsis}\n\n`;

  // Options
  if (def.global_options && def.global_options.length > 0) {
    output += `${ANSI.BOLD}Options:${ANSI.RESET}\n`;
    const maxOptions = 10;

    for (const opt of def.global_options.slice(0, maxOptions)) {
      const shortStr = opt.short ? `-${opt.short.replace(/^-+/, "")}` : "";
      const longStr = opt.long ? `--${opt.long.replace(/^-+/, "")}` : "";
      const combined = [shortStr, longStr].filter(Boolean).join(", ");

      let desc = opt.description;
      if (desc.length > 60) {
        desc = desc.substring(0, 57) + "...";
      }

      output += `  ${ANSI.CYAN}${combined.padEnd(25)}${ANSI.RESET} ${desc}\n`;
    }

    if (def.global_options.length > maxOptions) {
      output += `  ... and ${def.global_options.length - maxOptions} more options\n`;
    }
    output += "\n";
  }

  // Subcommands (add after options section)
  if (def.subcommands && def.subcommands.length > 0) {
    output += `${ANSI.BOLD}Subcommands:${ANSI.RESET}\n`;
    const maxSubs = 8;

    for (const sub of def.subcommands.slice(0, maxSubs)) {
      let desc = sub.description;
      if (desc.length > 50) {
        desc = desc.substring(0, 47) + "...";
      }
      output += `  ${ANSI.CYAN}${sub.name.padEnd(15)}${ANSI.RESET} ${desc}\n`;
    }

    if (def.subcommands.length > maxSubs) {
      output += `  ... and ${def.subcommands.length - maxSubs} more\n`;
    }
    output += "\n";
  }

  // Examples
  if (def.common_usage_patterns && def.common_usage_patterns.length > 0) {
    output += `${ANSI.BOLD}Examples:${ANSI.RESET}\n`;

    for (const pattern of def.common_usage_patterns.slice(0, 5)) {
      output += `\n  ${ANSI.CYAN}${pattern.command}${ANSI.RESET}\n`;
      output += `    ${pattern.description}\n`;
      if (pattern.requires_root) {
        output += `    ${ANSI.YELLOW}⚠ Requires root privileges${ANSI.RESET}\n`;
      }
    }
    output += "\n";
  }

  return output;
}
