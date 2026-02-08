import { describe, it, expect, beforeEach } from "vitest";
import { MetricsSimulator } from "../metricsSimulator";
import type { GPU } from "@/types/hardware";

function createMockGPU(overrides: Partial<GPU> = {}): GPU {
  return {
    id: 0,
    uuid: "GPU-TEST-0000",
    name: "NVIDIA A100-SXM4-80GB",
    type: "A100-80GB",
    pciAddress: "0000:10:00.0",
    temperature: 40,
    powerDraw: 200,
    powerLimit: 400,
    memoryTotal: 81920,
    memoryUsed: 10000,
    utilization: 50,
    clocksSM: 1410,
    clocksMem: 1215,
    eccEnabled: true,
    eccErrors: {
      singleBit: 0,
      doubleBit: 0,
      aggregated: { singleBit: 0, doubleBit: 0 },
    },
    migMode: false,
    migInstances: [],
    nvlinks: [],
    healthStatus: "OK",
    xidErrors: [],
    persistenceMode: true,
    ...overrides,
  };
}

describe("MetricsSimulator", () => {
  let simulator: MetricsSimulator;

  beforeEach(() => {
    simulator = new MetricsSimulator();
  });

  describe("simulateWorkload", () => {
    it("should set idle utilization near 5%", () => {
      const gpus = [createMockGPU({ utilization: 50 })];
      const result = simulator.simulateWorkload(gpus, "idle");
      expect(result[0].utilization).toBeLessThan(15);
    });

    it("should set training utilization near 95%", () => {
      const gpus = [createMockGPU({ utilization: 0 })];
      const result = simulator.simulateWorkload(gpus, "training");
      expect(result[0].utilization).toBeGreaterThan(80);
    });

    it("should set stress utilization near 100%", () => {
      const gpus = [createMockGPU({ utilization: 0 })];
      const result = simulator.simulateWorkload(gpus, "stress");
      expect(result[0].utilization).toBeGreaterThan(90);
    });

    it("should adjust memory usage based on workload", () => {
      const gpus = [createMockGPU({ memoryTotal: 81920, memoryUsed: 0 })];

      const idle = simulator.simulateWorkload(gpus, "idle");
      const training = simulator.simulateWorkload(gpus, "training");

      expect(training[0].memoryUsed).toBeGreaterThan(idle[0].memoryUsed);
    });
  });

  describe("injectFault", () => {
    it("should inject XID error and set Critical health", () => {
      const gpu = createMockGPU();
      const result = simulator.injectFault(gpu, "xid");

      expect(result.xidErrors.length).toBe(1);
      expect(result.xidErrors[0].code).toBe(48);
      expect(result.healthStatus).toBe("Critical");
    });

    it("should inject ECC error", () => {
      const gpu = createMockGPU();
      const result = simulator.injectFault(gpu, "ecc");

      expect(result.eccErrors.doubleBit).toBe(1);
      expect(result.healthStatus).toBe("Critical");
    });

    it("should inject thermal throttling with reduced clocks", () => {
      const gpu = createMockGPU({ temperature: 40, clocksSM: 1410 });
      const result = simulator.injectFault(gpu, "thermal");

      expect(result.temperature).toBe(85);
      expect(result.clocksSM).toBeLessThan(1410);
      expect(result.healthStatus).toBe("Warning");
    });

    it("should inject NVLink failure", () => {
      const gpu = createMockGPU({
        nvlinks: [
          {
            linkId: 0,
            status: "Active",
            speed: 600,
            txErrors: 0,
            rxErrors: 0,
            replayErrors: 0,
          },
        ],
      });
      const result = simulator.injectFault(gpu, "nvlink");

      expect(result.nvlinks[0].status).toBe("Down");
      expect(result.nvlinks[0].txErrors).toBe(100);
    });

    it("should inject PCIe error", () => {
      const gpu = createMockGPU();
      const result = simulator.injectFault(gpu, "pcie");

      expect(result.xidErrors.length).toBe(1);
      expect(result.xidErrors[0].code).toBe(62);
    });

    it("should inject power warning", () => {
      const gpu = createMockGPU({ powerLimit: 400 });
      const result = simulator.injectFault(gpu, "power");

      expect(result.powerDraw).toBe(400 * 0.95);
      expect(result.healthStatus).toBe("Warning");
    });
  });

  describe("start and stop", () => {
    it("should not start twice", () => {
      let callCount = 0;
      simulator.start(() => {
        callCount++;
      }, 10000);

      // Try starting again - should be no-op
      simulator.start(() => {
        callCount += 100;
      }, 10000);

      simulator.stop();
      // Only one start should have been effective
      expect(callCount).toBe(0); // Never called since interval hasn't fired
    });

    it("should stop cleanly", () => {
      simulator.start(() => {}, 10000);
      simulator.stop();
      // Should not throw when stopping again
      simulator.stop();
    });
  });
});
