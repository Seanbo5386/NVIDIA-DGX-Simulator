/**
 * Adversarial Input Tests
 *
 * Tests simulators with invalid, malformed, and edge case inputs
 * to ensure robust error handling and realistic behavior.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSimulationStore } from '@/store/simulationStore';
import { NvidiaSmiSimulator } from '../nvidiaSmiSimulator';
import { DcgmiSimulator } from '../dcgmiSimulator';
import { SlurmSimulator } from '../slurmSimulator';
import { InfiniBandSimulator } from '../infinibandSimulator';
import { BenchmarkSimulator } from '../benchmarkSimulator';
import { BasicSystemSimulator } from '../basicSystemSimulator';
import { FabricManagerSimulator } from '../fabricManagerSimulator';
import type { CommandContext } from '../BaseSimulator';

describe('Adversarial Input Tests', () => {
  let context: CommandContext;

  beforeEach(() => {
    useSimulationStore.getState().resetSimulation();
    context = {
      currentNode: 'dgx-00',
      environment: {},
    };
  });

  describe('nvidia-smi adversarial inputs', () => {
    let simulator: NvidiaSmiSimulator;

    beforeEach(() => {
      simulator = new NvidiaSmiSimulator();
    });

    it('should handle invalid GPU index gracefully', () => {
      const result = simulator.execute('nvidia-smi -i 999', context);
      expect(result.success).toBe(false);
      expect(result.output).toMatch(/invalid|not found|error/i);
    });

    it('should handle negative GPU index', () => {
      const result = simulator.execute('nvidia-smi -i -1', context);
      expect(result.success).toBe(false);
    });

    it('should handle non-numeric GPU index', () => {
      const result = simulator.execute('nvidia-smi -i abc', context);
      expect(result.success).toBe(false);
    });

    it('should handle extremely large GPU index', () => {
      const result = simulator.execute('nvidia-smi -i 999999999', context);
      expect(result.success).toBe(false);
    });

    it('should handle empty string after flag', () => {
      const result = simulator.execute('nvidia-smi -i ""', context);
      // Should either fail gracefully or treat as invalid
      expect(result.output).toBeDefined();
    });

    it('should handle special characters in arguments', () => {
      const result = simulator.execute('nvidia-smi -i "$(whoami)"', context);
      expect(result.success).toBe(false);
    });

    it('should handle unknown flags gracefully', () => {
      const result = simulator.execute('nvidia-smi --unknown-flag', context);
      expect(result.success).toBe(false);
      expect(result.output).toMatch(/unknown|invalid|unrecognized/i);
    });

    it('should handle duplicate flags', () => {
      const result = simulator.execute('nvidia-smi -i 0 -i 1', context);
      // Should use last value or report error
      expect(result.output).toBeDefined();
    });

    it('should handle mixed valid and invalid flags', () => {
      const result = simulator.execute('nvidia-smi -q --fake-flag', context);
      expect(result.success).toBe(false);
    });

    it('should handle query with invalid format specifier', () => {
      const result = simulator.execute('nvidia-smi --query-gpu=invalid_metric --format=csv', context);
      expect(result.success).toBe(false);
    });
  });

  describe('dcgmi adversarial inputs', () => {
    let simulator: DcgmiSimulator;

    beforeEach(() => {
      simulator = new DcgmiSimulator();
    });

    it('should handle dcgmi with no subcommand', () => {
      const result = simulator.execute('dcgmi', context);
      // Should show help or usage
      expect(result.output).toMatch(/usage|help|command/i);
    });

    it('should handle invalid subcommand', () => {
      const result = simulator.execute('dcgmi fakecommand', context);
      expect(result.success).toBe(false);
    });

    it('should handle health check with invalid GPU group', () => {
      const result = simulator.execute('dcgmi health -g 9999', context);
      expect(result.success).toBe(false);
    });

    it('should handle diag with invalid test level', () => {
      const result = simulator.execute('dcgmi diag -r 99', context);
      expect(result.success).toBe(false);
    });

    it('should handle negative group ID', () => {
      const result = simulator.execute('dcgmi health -g -1', context);
      expect(result.success).toBe(false);
    });

    it('should handle policy with invalid action', () => {
      const result = simulator.execute('dcgmi policy --set 0,0 --action invalid', context);
      expect(result.success).toBe(false);
    });
  });

  describe('slurm adversarial inputs', () => {
    let simulator: SlurmSimulator;

    beforeEach(() => {
      simulator = new SlurmSimulator();
    });

    it('should handle sinfo with invalid format', () => {
      const result = simulator.execute('sinfo --format="%invalid"', context);
      // Should either ignore invalid or report error
      expect(result.output).toBeDefined();
    });

    it('should handle scontrol with invalid entity', () => {
      const result = simulator.execute('scontrol show fakeentity', context);
      expect(result.success).toBe(false);
    });

    it('should handle scontrol update with invalid state', () => {
      const result = simulator.execute('scontrol update nodename=dgx-00 state=INVALID', context);
      expect(result.success).toBe(false);
    });

    it('should handle squeue with non-existent job ID', () => {
      const result = simulator.execute('squeue -j 999999', context);
      // Should return empty or "not found"
      expect(result.output).toBeDefined();
    });

    it('should handle sbatch with missing script', () => {
      const result = simulator.execute('sbatch', context);
      expect(result.success).toBe(false);
    });

    it('should handle scancel with invalid job ID', () => {
      const result = simulator.execute('scancel abc', context);
      expect(result.success).toBe(false);
    });

    it('should handle srun with conflicting options', () => {
      const result = simulator.execute('srun -N 100 -n 1 hostname', context);
      // Should handle gracefully even if nodes > available
      expect(result.output).toBeDefined();
    });
  });

  describe('infiniband adversarial inputs', () => {
    let simulator: InfiniBandSimulator;

    beforeEach(() => {
      simulator = new InfiniBandSimulator();
    });

    it('should handle ibstat with invalid device', () => {
      const result = simulator.execute('ibstat mlx5_999', context);
      expect(result.success).toBe(false);
    });

    it('should handle perfquery with invalid LID', () => {
      const result = simulator.execute('perfquery -x 99999', context);
      expect(result.success).toBe(false);
    });

    it('should handle ibportstate with invalid port', () => {
      const result = simulator.execute('ibportstate -D 0 999', context);
      expect(result.success).toBe(false);
    });

    it('should handle iblinkinfo with invalid flags', () => {
      const result = simulator.execute('iblinkinfo --invalid-option', context);
      expect(result.success).toBe(false);
    });
  });

  describe('benchmark adversarial inputs', () => {
    let simulator: BenchmarkSimulator;

    beforeEach(() => {
      simulator = new BenchmarkSimulator();
    });

    it('should handle nccl-test with negative GPU count', () => {
      const result = simulator.execute('nccl-test -g -1', context);
      expect(result.success).toBe(false);
    });

    it('should handle nccl-test with zero GPUs', () => {
      const result = simulator.execute('nccl-test -g 0', context);
      expect(result.success).toBe(false);
    });

    it('should handle hpl with invalid problem size', () => {
      const result = simulator.execute('hpl --problem-size abc', context);
      expect(result.success).toBe(false);
    });

    it('should handle gpu-burn with negative duration', () => {
      const result = simulator.execute('gpu-burn -d -10', context);
      expect(result.success).toBe(false);
    });

    it('should handle nccl-test with invalid operation', () => {
      const result = simulator.execute('nccl-test -t invalid_op', context);
      expect(result.success).toBe(false);
    });

    it('should handle nccl-test with minbytes > maxbytes', () => {
      const result = simulator.execute('nccl-test -b 1G -e 1M', context);
      // Should handle gracefully or report error
      expect(result.output).toBeDefined();
    });
  });

  describe('basic system adversarial inputs', () => {
    let simulator: BasicSystemSimulator;

    beforeEach(() => {
      simulator = new BasicSystemSimulator();
    });

    it('should handle hostname with invalid flag', () => {
      const result = simulator.execute('hostname --invalid', context);
      // Should either ignore or report error
      expect(result.output).toBeDefined();
    });

    it('should handle cat with non-existent file', () => {
      const result = simulator.execute('cat /nonexistent/path/file.txt', context);
      expect(result.success).toBe(false);
      expect(result.output).toMatch(/no such file|not found/i);
    });

    it('should handle dmesg with invalid log level', () => {
      const result = simulator.execute('dmesg --level=invalid', context);
      expect(result.output).toBeDefined();
    });

    it('should handle uname with multiple flags', () => {
      const result = simulator.execute('uname -a -r -m', context);
      // Should handle multiple flags
      expect(result.success).toBe(true);
    });
  });

  describe('fabric manager adversarial inputs', () => {
    let simulator: FabricManagerSimulator;

    beforeEach(() => {
      simulator = new FabricManagerSimulator();
    });

    it('should handle nv-fabricmanager with no subcommand', () => {
      const result = simulator.execute('nv-fabricmanager', context);
      expect(result.output).toBeDefined();
    });

    it('should handle invalid query type', () => {
      const result = simulator.execute('nv-fabricmanager query invalid', context);
      expect(result.success).toBe(false);
    });

    it('should handle fabricmanager with conflicting options', () => {
      const result = simulator.execute('nv-fabricmanager --start --stop', context);
      expect(result.output).toBeDefined();
    });
  });

  describe('boundary value tests', () => {
    let nvidiaSmi: NvidiaSmiSimulator;
    let benchmark: BenchmarkSimulator;

    beforeEach(() => {
      nvidiaSmi = new NvidiaSmiSimulator();
      benchmark = new BenchmarkSimulator();
    });

    it('should handle GPU index at boundary (7 for 8-GPU system)', () => {
      const result = nvidiaSmi.execute('nvidia-smi -i 7', context);
      expect(result.success).toBe(true);
    });

    it('should handle GPU index just past boundary (8 for 8-GPU system)', () => {
      const result = nvidiaSmi.execute('nvidia-smi -i 8', context);
      expect(result.success).toBe(false);
    });

    it('should handle maximum reasonable GPU count in nccl-test', () => {
      const result = benchmark.execute('nccl-test -g 8', context);
      expect(result.success).toBe(true);
    });

    it('should handle unreasonably large GPU count', () => {
      const result = benchmark.execute('nccl-test -g 1000', context);
      // Should either cap at available or report error
      expect(result.output).toBeDefined();
    });
  });

  describe('special character handling', () => {
    let simulator: BasicSystemSimulator;

    beforeEach(() => {
      simulator = new BasicSystemSimulator();
    });

    it('should handle arguments with spaces', () => {
      const result = simulator.execute('echo "hello world"', context);
      expect(result.output).toContain('hello world');
    });

    it('should handle arguments with newlines', () => {
      const result = simulator.execute('echo "line1\\nline2"', context);
      expect(result.output).toBeDefined();
    });

    it('should handle empty command', () => {
      const result = simulator.execute('', context);
      expect(result.output).toBeDefined();
    });

    it('should handle whitespace-only command', () => {
      const result = simulator.execute('   ', context);
      expect(result.output).toBeDefined();
    });
  });
});
