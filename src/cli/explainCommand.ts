import type { CommandDefinitionRegistry } from "./CommandDefinitionRegistry";
import type { CommandDefinition } from "./types";

export interface ExplainOptions {
  includeErrors?: boolean;
  includeExamples?: boolean;
  includePermissions?: boolean;
}

/**
 * Generate rich explanation output for a command
 * Uses the comprehensive JSON definitions for detailed help
 */
export async function generateExplainOutput(
  input: string,
  registry: CommandDefinitionRegistry,
  options: ExplainOptions = {},
): Promise<string> {
  const parts = input.trim().split(/\s+/);
  const commandName = parts[0];
  const flagOrSub = parts[1];

  const def = registry.getDefinition(commandName);

  if (!def) {
    return (
      `\x1b[31mCommand '${commandName}' not found in documentation.\x1b[0m\n` +
      `Try 'help' to see available commands.`
    );
  }

  // If explaining a specific flag
  if (flagOrSub && flagOrSub.startsWith("-")) {
    return generateFlagExplanation(def, flagOrSub, registry);
  }

  // If explaining a subcommand
  if (flagOrSub && def.subcommands?.some((s) => s.name === flagOrSub)) {
    return generateSubcommandExplanation(def, flagOrSub);
  }

  return generateCommandExplanation(def, options);
}

function generateCommandExplanation(
  def: CommandDefinition,
  options: ExplainOptions,
): string {
  let output = "";

  // Header
  output += `\x1b[1;36m━━━ ${def.command} ━━━\x1b[0m\n\n`;

  // Description
  output += `\x1b[1mDescription:\x1b[0m\n`;
  output += `  ${def.description}\n\n`;

  // Synopsis
  output += `\x1b[1mUsage:\x1b[0m\n`;
  output += `  ${def.synopsis}\n\n`;

  // Common usage examples
  if (def.common_usage_patterns && def.common_usage_patterns.length > 0) {
    output += `\x1b[1mExamples:\x1b[0m\n`;
    for (const pattern of def.common_usage_patterns.slice(0, 5)) {
      output += `\n  \x1b[36m${pattern.command}\x1b[0m\n`;
      output += `    ${pattern.description}\n`;
      if (pattern.requires_root) {
        output += `    \x1b[33m⚠ Requires root privileges\x1b[0m\n`;
      }
    }
    output += "\n";
  }

  // Common flags
  if (def.global_options && def.global_options.length > 0) {
    output += `\x1b[1mCommon Options:\x1b[0m\n`;
    for (const opt of def.global_options.slice(0, 8)) {
      const shortStr = opt.short ? opt.short.replace(/^-*/, "-") : "";
      const longStr = opt.long ? opt.long.replace(/^-*/, "--") : "";
      const combined = [shortStr, longStr].filter(Boolean).join(", ");
      output += `  \x1b[36m${combined.padEnd(25)}\x1b[0m ${opt.description.substring(0, 60)}${opt.description.length > 60 ? "..." : ""}\n`;
    }
    if (def.global_options.length > 8) {
      output += `  ... and ${def.global_options.length - 8} more options\n`;
    }
    output += "\n";
  }

  // Subcommands
  if (def.subcommands && def.subcommands.length > 0) {
    output += `\x1b[1mSubcommands:\x1b[0m\n`;
    for (const sub of def.subcommands.slice(0, 6)) {
      output += `  \x1b[36m${sub.name.padEnd(15)}\x1b[0m ${sub.description.substring(0, 50)}${sub.description.length > 50 ? "..." : ""}\n`;
    }
    if (def.subcommands.length > 6) {
      output += `  ... and ${def.subcommands.length - 6} more\n`;
    }
    output += "\n";
  }

  // Error messages and resolutions
  if (
    options.includeErrors !== false &&
    def.error_messages &&
    def.error_messages.length > 0
  ) {
    output += `\x1b[1mCommon Errors:\x1b[0m\n`;
    for (const err of def.error_messages.slice(0, 3)) {
      const msgPreview =
        err.message.length > 50
          ? err.message.substring(0, 50) + "..."
          : err.message;
      output += `  \x1b[31m${msgPreview}\x1b[0m\n`;
      output += `    Meaning: ${err.meaning}\n`;
      if (err.resolution) {
        const resPreview =
          err.resolution.length > 80
            ? err.resolution.substring(0, 80) + "..."
            : err.resolution;
        output += `    \x1b[32mFix: ${resPreview}\x1b[0m\n`;
      }
    }
    output += "\n";
  }

  // Exit codes
  if (def.exit_codes && def.exit_codes.length > 0) {
    output += `\x1b[1mExit Codes:\x1b[0m\n`;
    for (const ec of def.exit_codes.slice(0, 4)) {
      output += `  \x1b[36m${ec.code.toString().padEnd(5)}\x1b[0m ${ec.meaning}\n`;
    }
    output += "\n";
  }

  // Related commands
  if (def.interoperability?.related_commands) {
    output += `\x1b[1mRelated Commands:\x1b[0m `;
    output += def.interoperability.related_commands.slice(0, 5).join(", ");
    output += "\n\n";
  }

  // Source documentation
  if (def.source_urls && def.source_urls.length > 0) {
    output += `\x1b[90mDocumentation: ${def.source_urls[0]}\x1b[0m\n`;
  }

  return output;
}

function generateFlagExplanation(
  def: CommandDefinition,
  flag: string,
  registry: CommandDefinitionRegistry,
): string {
  const normalizedFlag = flag.replace(/^-+/, "");

  const opt = def.global_options?.find((o) => {
    const shortNorm = o.short?.replace(/^-+/, "");
    const longNorm = o.long?.replace(/^-+/, "").replace(/=$/, "");
    return shortNorm === normalizedFlag || longNorm === normalizedFlag;
  });

  if (!opt) {
    // Check if it's a typo and suggest alternatives
    const validation = registry.validateFlag(def.command, normalizedFlag);
    if (validation.suggestions && validation.suggestions.length > 0) {
      return (
        `\x1b[31mFlag '${flag}' not found for ${def.command}.\x1b[0m\n` +
        `Did you mean: ${validation.suggestions.join(", ")}?\n` +
        `Run 'explain ${def.command}' to see all available options.`
      );
    }
    return (
      `\x1b[31mFlag '${flag}' not found for ${def.command}.\x1b[0m\n` +
      `Run 'explain ${def.command}' to see available options.`
    );
  }

  let output = "";
  output += `\x1b[1;36m━━━ ${def.command} ${flag} ━━━\x1b[0m\n\n`;

  const shortStr = opt.short ? opt.short.replace(/^-*/, "-") : "";
  const longStr = opt.long ? opt.long.replace(/^-*/, "--") : "";
  output += `\x1b[1mFlag:\x1b[0m ${[shortStr, longStr].filter(Boolean).join(", ")}\n\n`;

  output += `\x1b[1mDescription:\x1b[0m\n  ${opt.description}\n\n`;

  if (opt.arguments) {
    output += `\x1b[1mArguments:\x1b[0m ${opt.arguments}`;
    if (opt.argument_type) {
      output += ` (${opt.argument_type})`;
    }
    output += "\n\n";
  }

  if (opt.default) {
    output += `\x1b[1mDefault:\x1b[0m ${opt.default}\n\n`;
  }

  if (opt.example) {
    output += `\x1b[1mExample:\x1b[0m\n  \x1b[36m${opt.example}\x1b[0m\n\n`;
  }

  // Check if requires root
  if (registry.requiresRoot(def.command, normalizedFlag)) {
    output += `\x1b[33m⚠ This option requires root privileges\x1b[0m\n`;
  }

  return output;
}

function generateSubcommandExplanation(
  def: CommandDefinition,
  subcommandName: string,
): string {
  const sub = def.subcommands?.find((s) => s.name === subcommandName);

  if (!sub) {
    return `\x1b[31mSubcommand '${subcommandName}' not found for ${def.command}.\x1b[0m\n`;
  }

  let output = "";
  output += `\x1b[1;36m━━━ ${def.command} ${sub.name} ━━━\x1b[0m\n\n`;

  output += `\x1b[1mDescription:\x1b[0m\n  ${sub.description}\n\n`;

  if (sub.synopsis) {
    output += `\x1b[1mUsage:\x1b[0m\n  ${sub.synopsis}\n\n`;
  }

  if (sub.options && sub.options.length > 0) {
    output += `\x1b[1mOptions:\x1b[0m\n`;
    for (const opt of sub.options) {
      const shortStr = opt.short ? opt.short.replace(/^-*/, "-") : "";
      const longStr = opt.long ? opt.long.replace(/^-*/, "--") : "";
      const combined = [shortStr, longStr].filter(Boolean).join(", ");
      output += `  \x1b[36m${combined.padEnd(20)}\x1b[0m ${opt.description}\n`;
    }
    output += "\n";
  }

  return output;
}
