/**
 * Parses a command into its components
 */
function parseCommand(command: string): {
  baseCommand: string;
  args: string[];
  flags: Map<string, string | boolean>;
  isPiped: boolean;
  pipedCommands?: string[];
} {
  const parts = command.trim().split(/\s+/);
  const baseCommand = parts[0] || "";
  const args: string[] = [];
  const flags = new Map<string, string | boolean>();

  // Check for pipes
  const isPiped = command.includes("|");
  let pipedCommands: string[] | undefined;

  if (isPiped) {
    pipedCommands = command.split("|").map((c) => c.trim());
  }

  // Parse flags and arguments
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];

    if (part.startsWith("--")) {
      // Long flag
      const flagName = part.substring(2);
      const nextPart = parts[i + 1];

      if (nextPart && !nextPart.startsWith("-")) {
        flags.set(flagName, nextPart);
        i++; // Skip the value
      } else {
        flags.set(flagName, true);
      }
    } else if (
      part.startsWith("-") &&
      part.length > 1 &&
      !/^-\d+$/.test(part)
    ) {
      // Short flag(s) - but not negative numbers
      const flagChars = part.substring(1);

      if (flagChars.length === 1) {
        // Single short flag, might have a value
        const nextPart = parts[i + 1];

        if (nextPart && !nextPart.startsWith("-")) {
          flags.set(flagChars, nextPart);
          i++; // Skip the value
        } else {
          flags.set(flagChars, true);
        }
      } else {
        // Multiple short flags combined (e.g., -Nel)
        for (const char of flagChars) {
          flags.set(char, true);
        }
      }
    } else {
      // Regular argument
      args.push(part);
    }
  }

  return { baseCommand, args, flags, isPiped, pipedCommands };
}

/**
 * Expand $(command) shell substitutions to fixed values so that
 * both expected and actual commands normalize to the same form.
 */
function expandShellSubstitutions(cmd: string): string {
  return cmd.replace(/\$\([^)]+\)/g, "12345");
}

/**
 * Validates a command execution against expected commands with improved matching
 */
export function validateCommandExecuted(
  executedCommand: string,
  expectedCommands: string[],
): boolean {
  const normalizedExecuted = expandShellSubstitutions(
    executedCommand.trim().toLowerCase(),
  );

  // Check for common invalid patterns first
  const invalidPatterns = [
    /\s-i\s+-\d+/, // -i -0 (negative GPU ID)
    /\s--id\s+-\d+/, // --id -0
    /nvidia-smi.*\s-gpu\s/, // -gpu instead of -i
    /sinfo\s+help/, // sinfo help (not a valid subcommand)
    /scontrol\s+help(?!\s)/, // scontrol help without proper argument
  ];

  for (const pattern of invalidPatterns) {
    if (pattern.test(normalizedExecuted)) {
      return false;
    }
  }

  const executedParsed = parseCommand(normalizedExecuted);

  return expectedCommands.some((expected) => {
    const normalizedExpected = expandShellSubstitutions(
      expected.trim().toLowerCase(),
    );
    const expectedParsed = parseCommand(normalizedExpected);

    // Strategy 1: Exact match
    if (normalizedExecuted === normalizedExpected) {
      return true;
    }

    // Strategy 2: For piped commands, check each segment matches fully
    if (executedParsed.isPiped && expectedParsed.isPiped) {
      const execPipes = executedParsed.pipedCommands || [];
      const expPipes = expectedParsed.pipedCommands || [];

      // Must have same number of pipe segments
      if (execPipes.length !== expPipes.length) {
        return false;
      }

      // Check each pipe segment matches (in order)
      return expPipes.every((expSegment, idx) => {
        const execSegment = execPipes[idx];
        // Normalize and compare full segments
        return (
          expSegment.trim().toLowerCase() === execSegment.trim().toLowerCase()
        );
      });
    }

    // Strategy 3: Base command and flags matching
    if (executedParsed.baseCommand === expectedParsed.baseCommand) {
      // If expected command has no flags/args, just matching base command is enough
      if (expectedParsed.flags.size === 0 && expectedParsed.args.length === 0) {
        return true;
      }

      // Check if all expected flags are present in executed command
      let allFlagsMatch = true;
      for (const [flag, value] of expectedParsed.flags) {
        if (!executedParsed.flags.has(flag)) {
          allFlagsMatch = false;
          break;
        }

        // If expected flag has a specific value, check it matches
        if (value !== true && executedParsed.flags.get(flag) !== value) {
          allFlagsMatch = false;
          break;
        }
      }

      if (allFlagsMatch) {
        // Check critical arguments if any
        if (expectedParsed.args.length > 0) {
          // For commands like "scontrol show node", check args match
          const argsMatch = expectedParsed.args.every(
            (arg, idx) => executedParsed.args[idx] === arg,
          );
          if (argsMatch) {
            return true;
          }
          // Fall through to Strategy 4 for special normalization
        } else {
          return true;
        }
      }
    }

    // Strategy 4: Special handling for common command patterns
    // Handle "sinfo -o" with format strings
    if (
      executedParsed.baseCommand === "sinfo" &&
      expectedParsed.baseCommand === "sinfo"
    ) {
      const execHasO =
        executedParsed.flags.has("o") ||
        executedParsed.flags.has("output-format");
      const expHasO =
        expectedParsed.flags.has("o") ||
        expectedParsed.flags.has("output-format");

      if (execHasO && expHasO) {
        // Both have output format flag, consider it a match
        return true;
      }
    }

    // Handle "scontrol show <type>" commands
    if (
      executedParsed.baseCommand === "scontrol" &&
      expectedParsed.baseCommand === "scontrol"
    ) {
      if (
        executedParsed.args[0] === "show" &&
        expectedParsed.args[0] === "show"
      ) {
        // If both are show commands, check the target type
        const execTarget = executedParsed.args[1]?.toLowerCase();
        const expTarget = expectedParsed.args[1]?.toLowerCase();

        // Handle variations: "node", "nodes", "partition", "partitions"
        if (execTarget && expTarget) {
          const normalizeTarget = (t: string) => t.replace(/s$/, ""); // Remove trailing 's'
          return normalizeTarget(execTarget) === normalizeTarget(expTarget);
        }
      }
    }

    return false;
  });
}
