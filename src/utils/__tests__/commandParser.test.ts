import { describe, it, expect } from 'vitest';
import { parse } from '../commandParser';

describe('CommandParser', () => {
  describe('Basic Parsing', () => {
    it('should parse simple command', () => {
      const result = parse('nvidia-smi');
      expect(result.baseCommand).toBe('nvidia-smi');
      expect(result.subcommands).toEqual([]);
      expect(result.positionalArgs).toEqual([]);
      expect(result.flags.size).toBe(0);
    });

    it('should parse command with subcommands', () => {
      const result = parse('dcgmi discovery -l');
      expect(result.baseCommand).toBe('dcgmi');
      expect(result.subcommands).toEqual(['discovery']);
      expect(result.flags.has('l')).toBe(true);
    });

    it('should handle empty input', () => {
      const result = parse('');
      expect(result.baseCommand).toBe('');
      expect(result.subcommands).toEqual([]);
    });

    it('should handle whitespace-only input', () => {
      const result = parse('   ');
      expect(result.baseCommand).toBe('');
      expect(result.subcommands).toEqual([]);
    });
  });

  describe('Flag Parsing', () => {
    it('should parse short flags', () => {
      const result = parse('nvidia-smi -L');
      expect(result.flags.has('L')).toBe(true);
      expect(result.flags.get('L')).toBe(true); // Boolean flag
    });

    it('should parse long flags', () => {
      const result = parse('nvidia-smi --help');
      expect(result.flags.has('help')).toBe(true);
    });

    it('should parse multi-character short flags as single flag', () => {
      // Parser treats -la as a single flag 'la' (not combined -l -a)
      // This is intentional for nvidia-smi flags like -mig, -lgip, -cgi
      const result = parse('ls -la');
      expect(result.flags.has('la')).toBe(true);
      // These would be false since we treat -la as single flag
      expect(result.flags.has('l')).toBe(false);
      expect(result.flags.has('a')).toBe(false);
    });

    it('should parse flags with values', () => {
      const result = parse('dcgmi diag -r 2 -g 0');
      expect(result.flags.get('r')).toBe('2');
      expect(result.flags.get('g')).toBe('0');
    });

    it('should parse long flags with equals', () => {
      const result = parse('command --option=value');
      expect(result.flags.get('option')).toBe('value');
    });

    it('should handle multiple flags', () => {
      const result = parse('command -a -b -c');
      expect(result.flags.has('a')).toBe(true);
      expect(result.flags.has('b')).toBe(true);
      expect(result.flags.has('c')).toBe(true);
    });
  });

  describe('Positional Arguments', () => {
    it('should parse positional args', () => {
      const result = parse('ipmitool sdr list');
      expect(result.subcommands).toEqual(['sdr', 'list']);
    });

    it('should separate flags from positional args', () => {
      const result = parse('command arg1 -f arg2');
      expect(result.subcommands).toContain('arg1');
      expect(result.flags.has('f')).toBe(true);
    });

    it('should handle mixed flags and args', () => {
      const result = parse('dcgmi diag -r 2 --verbose');
      expect(result.subcommands).toEqual(['diag']);
      expect(result.flags.get('r')).toBe('2');
      expect(result.flags.has('verbose')).toBe(true);
    });
  });

  describe('Quoted Arguments', () => {
    it('should handle single-quoted args', () => {
      const result = parse("command 'hello world'");
      expect(result.subcommands).toContain('hello world');
    });

    it('should handle double-quoted args', () => {
      const result = parse('command "hello world"');
      expect(result.subcommands).toContain('hello world');
    });

    it('should handle quoted args with flags', () => {
      const result = parse('echo "test message" -n');
      expect(result.subcommands).toContain('test message');
      expect(result.flags.has('n')).toBe(true);
    });
  });

  describe('Special Characters', () => {
    it('should handle pipe symbols', () => {
      const result = parse('dmesg | grep error');
      expect(result.baseCommand).toBe('dmesg');
      // Pipe handling depends on implementation
    });

    it('should handle paths', () => {
      const result = parse('dmidecode -t bios');
      expect(result.flags.get('t')).toBe('bios');
    });

    it('should handle device paths', () => {
      const result = parse('mlxconfig -d /dev/mst/mt4119_pciconf0 query');
      expect(result.flags.get('d')).toBe('/dev/mst/mt4119_pciconf0');
      // After a flag, further non-flag tokens become positional args, not subcommands
      expect(result.positionalArgs).toContain('query');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long commands', () => {
      const longCmd = 'command ' + 'arg '.repeat(100);
      const result = parse(longCmd);
      expect(result.baseCommand).toBe('command');
      expect(result.subcommands.length).toBe(100);
    });

    it('should handle flags without values', () => {
      const result = parse('command -f');
      expect(result.flags.has('f')).toBe(true);
      expect(result.flags.get('f')).toBe(true); // Boolean flag
    });

    it('should handle double dashes', () => {
      const result = parse('command -- arg');
      // Double dash handling depends on implementation
      expect(result.baseCommand).toBe('command');
    });

    it('should handle equals in flag values', () => {
      const result = parse('command --option=key=value');
      expect(result.flags.get('option')).toBe('key=value');
    });

    it('should preserve case sensitivity', () => {
      const result = parse('Command -A --Help');
      expect(result.baseCommand).toBe('Command');
      expect(result.flags.has('A')).toBe(true);
      expect(result.flags.has('Help')).toBe(true);
    });
  });

  describe('Raw Command Line', () => {
    it('should preserve raw command line', () => {
      const cmdLine = 'nvidia-smi -L --query-gpu=memory.free';
      const result = parse(cmdLine);
      expect(result.raw).toBe(cmdLine); // Property is 'raw', not 'rawCommandLine'
    });
  });
});
