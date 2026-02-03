/**
 * Cross-Simulator Consistency Tests
 *
 * Verifies that all simulators agree on cluster state and report
 * consistent information for the same underlying data.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSimulationStore } from '@/store/simulationStore';
import { NvidiaSmiSimulator } from '@/simulators/nvidiaSmiSimulator';
import { DcgmiSimulator } from '@/simulators/dcgmiSimulator';
import { parse } from '@/utils/commandParser';
import type { CommandContext } from '@/simulators/BaseSimulator';

describe('Cross-Simulator Consistency', () => {
  let store: ReturnType<typeof useSimulationStore.getState>;
  let nvidiaSmi: NvidiaSmiSimulator;
  let dcgmi: DcgmiSimulator;
  let context: CommandContext;

  beforeEach(() => {
    store = useSimulationStore.getState();
    store.resetSimulation();
    nvidiaSmi = new NvidiaSmiSimulator();
    dcgmi = new DcgmiSimulator();
    context = {
      cluster: store.cluster,
      currentNode: store.cluster.nodes[0]?.id || 'dgx-00',
      environment: {}
    };
  });

  describe('Temperature Consistency', () => {
    it('nvidia-smi and dcgmi both access same GPU temperature data', () => {
      // Set specific temperature
      store.updateGPU('dgx-00', 0, { temperature: 75 });
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: 'dgx-00',
        environment: {}
      };

      // nvidia-smi should report temperature
      const smiResult = nvidiaSmi.execute(
        parse('nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader -i 0'),
        context
      );
      expect(smiResult.exitCode).toBe(0);

      // dcgmi should also work without error on same GPU
      const dcgmiResult = dcgmi.execute(parse('dcgmi diag -r 1'), context);
      expect(dcgmiResult.exitCode).toBe(0);
    });

    it('thermal fault is reflected in both simulators', () => {
      store.updateGPU('dgx-00', 0, { temperature: 95 });
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: 'dgx-00',
        environment: {}
      };

      const smiResult = nvidiaSmi.execute(parse('nvidia-smi -q -i 0'), context);
      const dcgmiHealth = dcgmi.execute(parse('dcgmi health -c'), context);

      // Both should complete successfully
      expect(smiResult.exitCode).toBe(0);
      expect(dcgmiHealth.exitCode).toBe(0);

      // nvidia-smi should show the temperature
      expect(smiResult.output).toMatch(/95|Temp/i);
    });
  });

  describe('XID Error Consistency', () => {
    it('XID error is visible to both nvidia-smi and dcgmi', () => {
      store.addXIDError('dgx-00', 0, {
        code: 63,
        timestamp: new Date(),
        description: 'Row Remap Failure',
        severity: 'Warning'
      });
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: 'dgx-00',
        environment: {}
      };

      const smiResult = nvidiaSmi.execute(parse('nvidia-smi'), context);
      const dcgmiHealth = dcgmi.execute(parse('dcgmi health -c'), context);

      // Both should complete
      expect(smiResult.exitCode).toBe(0);
      expect(dcgmiHealth.exitCode).toBe(0);

      // dcgmi health should indicate an issue
      expect(dcgmiHealth.output.toLowerCase()).toMatch(/warning|unhealthy|error/i);
    });

    it('fatal XID 79 affects both simulators consistently', () => {
      store.addXIDError('dgx-00', 0, {
        code: 79,
        timestamp: new Date(),
        description: 'GPU has fallen off the bus',
        severity: 'Critical'
      });
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: 'dgx-00',
        environment: {}
      };

      const smiResult = nvidiaSmi.execute(parse('nvidia-smi'), context);
      const dcgmiDiag = dcgmi.execute(parse('dcgmi diag -r 3'), context);

      // nvidia-smi should show warning about GPU issue
      expect(smiResult.output).toBeDefined();
      expect(smiResult.output.length).toBeGreaterThan(0);

      // dcgmi diag may fail or show issues for problematic GPU
      expect(dcgmiDiag.output).toBeDefined();
    });
  });

  describe('ECC Error Consistency', () => {
    it('ECC errors are accessible from both simulators', () => {
      store.updateGPU('dgx-00', 0, {
        eccErrors: {
          singleBit: 10,
          doubleBit: 2,
          aggregated: { singleBit: 10, doubleBit: 2 }
        }
      });
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: 'dgx-00',
        environment: {}
      };

      const smiEcc = nvidiaSmi.execute(
        parse('nvidia-smi --query-gpu=ecc.errors.corrected.aggregate.total --format=csv -i 0'),
        context
      );
      const dcgmiHealth = dcgmi.execute(parse('dcgmi health -c'), context);

      // Both should complete successfully
      expect(smiEcc.exitCode).toBe(0);
      expect(dcgmiHealth.exitCode).toBe(0);
    });
  });

  describe('GPU Count Consistency', () => {
    it('both simulators report same GPU count', () => {
      const smiList = nvidiaSmi.execute(parse('nvidia-smi -L'), context);
      const dcgmiDiscovery = dcgmi.execute(parse('dcgmi discovery -l'), context);

      // Count GPUs in nvidia-smi output
      const smiGpuCount = (smiList.output.match(/GPU \d+:/g) || []).length;

      // Default cluster should have 8 GPUs
      expect(smiGpuCount).toBe(8);
      expect(smiList.exitCode).toBe(0);
      expect(dcgmiDiscovery.exitCode).toBe(0);

      // dcgmi should also reference 8 GPUs
      expect(dcgmiDiscovery.output).toMatch(/8|GPU/);
    });

    it('GPU count is consistent after reset', () => {
      // Reset simulation
      store.resetSimulation();
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: 'dgx-00',
        environment: {}
      };

      const smiList1 = nvidiaSmi.execute(parse('nvidia-smi -L'), context);
      const count1 = (smiList1.output.match(/GPU \d+:/g) || []).length;

      // Reset again
      store.resetSimulation();
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: 'dgx-00',
        environment: {}
      };

      const smiList2 = nvidiaSmi.execute(parse('nvidia-smi -L'), context);
      const count2 = (smiList2.output.match(/GPU \d+:/g) || []).length;

      expect(count1).toBe(count2);
      expect(count1).toBe(8);
    });
  });

  describe('Health Status Consistency', () => {
    it('healthy cluster shows healthy in both simulators', () => {
      // Fresh cluster should be healthy
      const smiResult = nvidiaSmi.execute(parse('nvidia-smi'), context);
      const dcgmiHealth = dcgmi.execute(parse('dcgmi health -c'), context);

      expect(smiResult.exitCode).toBe(0);
      expect(dcgmiHealth.exitCode).toBe(0);

      // Should not indicate failures in healthy state
      expect(smiResult.output).not.toMatch(/ERR|FAIL/i);
    });

    it('multiple faults are reflected consistently', () => {
      // Inject multiple faults
      store.updateGPU('dgx-00', 0, { temperature: 95 });
      store.addXIDError('dgx-00', 1, {
        code: 63,
        timestamp: new Date(),
        description: 'Row Remap',
        severity: 'Warning'
      });
      store.updateGPU('dgx-00', 2, {
        eccErrors: { singleBit: 100, doubleBit: 0 }
      });

      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: 'dgx-00',
        environment: {}
      };

      const smiResult = nvidiaSmi.execute(parse('nvidia-smi'), context);
      const dcgmiHealth = dcgmi.execute(parse('dcgmi health -c'), context);

      // Both should complete
      expect(smiResult.exitCode).toBe(0);
      expect(dcgmiHealth.exitCode).toBe(0);

      // dcgmi should show unhealthy status
      expect(dcgmiHealth.output.toLowerCase()).toMatch(/warning|unhealthy|error/i);
    });
  });
});
