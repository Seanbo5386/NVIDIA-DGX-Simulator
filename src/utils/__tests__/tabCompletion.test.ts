import { describe, it, expect } from 'vitest';
import {
  AVAILABLE_COMMANDS,
  COMMAND_SUBCOMMANDS,
  COMMON_FLAGS,
  SIMULATED_PATHS,
  parseCompletionContext,
  findCommonPrefix,
  filterCompletions,
  completeCommand,
  completeSubcommand,
  completePath,
  completeSystemctlService,
  getCompletions,
  formatCompletionsForDisplay,
  applyCompletion,
  getCompletionSuffix,
} from '../tabCompletion';

describe('Tab Completion - Data Structures', () => {
  it('should have available commands defined', () => {
    expect(AVAILABLE_COMMANDS.length).toBeGreaterThan(30);
    expect(AVAILABLE_COMMANDS).toContain('nvidia-smi');
    expect(AVAILABLE_COMMANDS).toContain('dcgmi');
    expect(AVAILABLE_COMMANDS).toContain('ipmitool');
    expect(AVAILABLE_COMMANDS).toContain('sinfo');
  });

  it('should have subcommands for major commands', () => {
    expect(COMMAND_SUBCOMMANDS['nvidia-smi']).toBeDefined();
    expect(COMMAND_SUBCOMMANDS['dcgmi']).toBeDefined();
    expect(COMMAND_SUBCOMMANDS['ipmitool']).toBeDefined();
    expect(COMMAND_SUBCOMMANDS['docker']).toBeDefined();
    expect(COMMAND_SUBCOMMANDS['systemctl']).toBeDefined();
  });

  it('should have common flags for major commands', () => {
    expect(COMMON_FLAGS['nvidia-smi']).toContain('-L');
    expect(COMMON_FLAGS['nvidia-smi']).toContain('-q');
    expect(COMMON_FLAGS['dcgmi']).toContain('-l');
  });

  it('should have simulated paths defined', () => {
    expect(SIMULATED_PATHS['/']).toBeDefined();
    expect(SIMULATED_PATHS['/root']).toBeDefined();
    expect(SIMULATED_PATHS['/etc']).toBeDefined();
    expect(SIMULATED_PATHS['/etc/slurm']).toBeDefined();
  });
});

describe('Tab Completion - Context Parsing', () => {
  it('should parse empty line', () => {
    const context = parseCompletionContext('');
    expect(context.line).toBe('');
    expect(context.currentWord).toBe('');
    expect(context.wordIndex).toBe(0);
    expect(context.previousWords).toEqual([]);
  });

  it('should parse single word being typed', () => {
    const context = parseCompletionContext('nvid');
    expect(context.currentWord).toBe('nvid');
    expect(context.wordIndex).toBe(0);
    expect(context.previousWords).toEqual([]);
  });

  it('should parse command with space (ready for next word)', () => {
    const context = parseCompletionContext('nvidia-smi ');
    expect(context.currentWord).toBe('');
    expect(context.wordIndex).toBe(1);
    expect(context.previousWords).toEqual(['nvidia-smi']);
  });

  it('should parse command with partial argument', () => {
    const context = parseCompletionContext('nvidia-smi -');
    expect(context.currentWord).toBe('-');
    expect(context.wordIndex).toBe(1);
    expect(context.previousWords).toEqual(['nvidia-smi']);
  });

  it('should parse multiple words', () => {
    const context = parseCompletionContext('systemctl start nvid');
    expect(context.currentWord).toBe('nvid');
    expect(context.wordIndex).toBe(2);
    expect(context.previousWords).toEqual(['systemctl', 'start']);
  });
});

describe('Tab Completion - Helper Functions', () => {
  describe('findCommonPrefix', () => {
    it('should return empty for empty array', () => {
      expect(findCommonPrefix([])).toBe('');
    });

    it('should return the string for single element', () => {
      expect(findCommonPrefix(['nvidia-smi'])).toBe('nvidia-smi');
    });

    it('should find common prefix', () => {
      expect(findCommonPrefix(['nvidia-smi', 'nvidia-docker'])).toBe('nvidia-');
    });

    it('should return empty when no common prefix', () => {
      expect(findCommonPrefix(['nvidia-smi', 'dcgmi'])).toBe('');
    });
  });

  describe('filterCompletions', () => {
    const candidates = ['nvidia-smi', 'nvidia-docker', 'dcgmi', 'docker'];

    it('should filter by prefix', () => {
      expect(filterCompletions(candidates, 'nv')).toEqual(['nvidia-docker', 'nvidia-smi']);
    });

    it('should be case-insensitive', () => {
      expect(filterCompletions(candidates, 'NV')).toEqual(['nvidia-docker', 'nvidia-smi']);
    });

    it('should return sorted results', () => {
      const result = filterCompletions(candidates, 'd');
      expect(result).toEqual(['dcgmi', 'docker']);
    });

    it('should return empty for no matches', () => {
      expect(filterCompletions(candidates, 'xyz')).toEqual([]);
    });
  });
});

describe('Tab Completion - Command Completion', () => {
  it('should complete command names', () => {
    const result = completeCommand('nvidia-s');
    expect(result.completions).toContain('nvidia-smi');
    expect(result.type).toBe('command');
  });

  it('should return multiple matches', () => {
    const result = completeCommand('s');
    expect(result.completions.length).toBeGreaterThan(1);
    expect(result.isPartial).toBe(true);
  });

  it('should find common prefix for multiple matches', () => {
    const result = completeCommand('sin');
    expect(result.completions).toContain('sinfo');
    // singularity also starts with 'sin'
  });

  it('should return single match', () => {
    const result = completeCommand('nvidia-sm');
    expect(result.completions).toEqual(['nvidia-smi']);
    expect(result.isPartial).toBe(false);
  });

  it('should return empty for no matches', () => {
    const result = completeCommand('xyz123');
    expect(result.completions).toEqual([]);
  });
});

describe('Tab Completion - Subcommand Completion', () => {
  it('should complete nvidia-smi flags', () => {
    const result = completeSubcommand('nvidia-smi', '-');
    expect(result.completions.length).toBeGreaterThan(0);
    expect(result.completions).toContain('-L');
    expect(result.completions).toContain('-q');
  });

  it('should complete dcgmi subcommands', () => {
    const result = completeSubcommand('dcgmi', 'dis');
    expect(result.completions).toContain('discovery');
  });

  it('should complete docker subcommands', () => {
    const result = completeSubcommand('docker', 'ru');
    expect(result.completions).toContain('run');
  });

  it('should identify flag type', () => {
    const result = completeSubcommand('nvidia-smi', '-');
    expect(result.type).toBe('flag');
  });

  it('should identify subcommand type', () => {
    const result = completeSubcommand('dcgmi', 'd');
    expect(result.type).toBe('subcommand');
  });
});

describe('Tab Completion - Path Completion', () => {
  it('should complete root paths', () => {
    const result = completePath('/');
    expect(result.completions.length).toBeGreaterThan(0);
    expect(result.completions.some(p => p.includes('root'))).toBe(true);
  });

  it('should complete partial paths', () => {
    const result = completePath('/et');
    expect(result.completions).toContain('/etc');
  });

  it('should complete nested paths', () => {
    const result = completePath('/etc/sl');
    expect(result.completions).toContain('/etc/slurm');
  });

  it('should return path type', () => {
    const result = completePath('/');
    expect(result.type).toBe('path');
  });
});

describe('Tab Completion - Systemctl Services', () => {
  it('should complete service names', () => {
    const result = completeSystemctlService('nvid');
    expect(result.completions.some(s => s.includes('nvidia'))).toBe(true);
  });

  it('should complete slurm services', () => {
    const result = completeSystemctlService('slurm');
    expect(result.completions.length).toBeGreaterThan(0);
  });
});

describe('Tab Completion - Main getCompletions', () => {
  it('should complete empty line with commands', () => {
    const result = getCompletions('');
    expect(result.completions.length).toBeGreaterThan(0);
    expect(result.type).toBe('command');
  });

  it('should complete partial command', () => {
    const result = getCompletions('nvid');
    expect(result.completions).toContain('nvidia-smi');
    expect(result.completions).toContain('nvidia-docker');
  });

  it('should complete command subcommands', () => {
    const result = getCompletions('nvidia-smi -');
    expect(result.completions.length).toBeGreaterThan(0);
    expect(result.type).toBe('flag');
  });

  it('should complete systemctl services', () => {
    const result = getCompletions('systemctl start nvid');
    expect(result.completions.some(s => s.includes('nvidia'))).toBe(true);
    expect(result.type).toBe('value');
  });

  it('should complete paths', () => {
    const result = getCompletions('cat /etc/sl');
    expect(result.completions).toContain('/etc/slurm');
    expect(result.type).toBe('path');
  });
});

describe('Tab Completion - Formatting', () => {
  it('should format completions for display', () => {
    const completions = ['nvidia-smi', 'nvidia-docker', 'dcgmi'];
    const display = formatCompletionsForDisplay(completions, 80);
    expect(display).toContain('nvidia-smi');
    expect(display).toContain('dcgmi');
  });

  it('should handle empty completions', () => {
    const display = formatCompletionsForDisplay([], 80);
    expect(display).toBe('');
  });

  it('should format in columns', () => {
    const completions = ['a', 'b', 'c', 'd', 'e', 'f'];
    const display = formatCompletionsForDisplay(completions, 80);
    // Should be on fewer lines than items
    const lines = display.split('\r\n');
    expect(lines.length).toBeLessThan(completions.length);
  });
});

describe('Tab Completion - Apply Completion', () => {
  it('should apply completion to partial word', () => {
    const context = parseCompletionContext('nvid');
    const result = applyCompletion('nvid', 'nvidia-smi', context);
    expect(result).toBe('nvidia-smi');
  });

  it('should apply completion with existing command', () => {
    const context = parseCompletionContext('nvidia-smi -');
    const result = applyCompletion('nvidia-smi -', '-L', context);
    expect(result).toBe('nvidia-smi -L');
  });

  it('should replace current word', () => {
    const context = parseCompletionContext('docker ru');
    const result = applyCompletion('docker ru', 'run', context);
    expect(result).toBe('docker run');
  });
});

describe('Tab Completion - Completion Suffix', () => {
  it('should add space after single command completion', () => {
    const result = { completions: ['nvidia-smi'], commonPrefix: 'nvidia-smi', isPartial: false, type: 'command' as const };
    expect(getCompletionSuffix(result)).toBe(' ');
  });

  it('should not add space for partial completion', () => {
    const result = { completions: ['nvidia-smi', 'nvidia-docker'], commonPrefix: 'nvidia-', isPartial: true, type: 'command' as const };
    expect(getCompletionSuffix(result)).toBe('');
  });

  it('should add space after subcommand', () => {
    const result = { completions: ['discovery'], commonPrefix: 'discovery', isPartial: false, type: 'subcommand' as const };
    expect(getCompletionSuffix(result)).toBe(' ');
  });

  it('should add space after path', () => {
    const result = { completions: ['/etc/slurm'], commonPrefix: '/etc/slurm', isPartial: false, type: 'path' as const };
    expect(getCompletionSuffix(result)).toBe(' ');
  });
});
