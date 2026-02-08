import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSimulationStore } from "../simulationStore";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("simulationStore.updateGPU - Boundary Validation", () => {
  beforeEach(() => {
    // Reset store to default cluster state
    useSimulationStore.getState().resetSimulation();
    localStorageMock.clear();
  });

  /**
   * Helper to get a GPU from the store by node ID and GPU ID.
   */
  function getGPU(nodeId: string, gpuId: number) {
    const state = useSimulationStore.getState();
    const node = state.cluster.nodes.find((n) => n.id === nodeId);
    return node?.gpus.find((g) => g.id === gpuId);
  }

  // Default node/GPU IDs from createDefaultCluster
  const validNodeId = "dgx-00";
  const validGpuId = 0;

  describe("Temperature clamping (0-120)", () => {
    it("should clamp negative temperature to 0", () => {
      useSimulationStore.getState().updateGPU(validNodeId, validGpuId, {
        temperature: -50,
      });

      const gpu = getGPU(validNodeId, validGpuId);
      expect(gpu!.temperature).toBe(0);
    });

    it("should clamp temperature exceeding 120 to 120", () => {
      useSimulationStore.getState().updateGPU(validNodeId, validGpuId, {
        temperature: 200,
      });

      const gpu = getGPU(validNodeId, validGpuId);
      expect(gpu!.temperature).toBe(120);
    });

    it("should allow valid temperature values", () => {
      useSimulationStore.getState().updateGPU(validNodeId, validGpuId, {
        temperature: 65,
      });

      const gpu = getGPU(validNodeId, validGpuId);
      expect(gpu!.temperature).toBe(65);
    });

    it("should allow boundary value 0", () => {
      useSimulationStore.getState().updateGPU(validNodeId, validGpuId, {
        temperature: 0,
      });

      const gpu = getGPU(validNodeId, validGpuId);
      expect(gpu!.temperature).toBe(0);
    });

    it("should allow boundary value 120", () => {
      useSimulationStore.getState().updateGPU(validNodeId, validGpuId, {
        temperature: 120,
      });

      const gpu = getGPU(validNodeId, validGpuId);
      expect(gpu!.temperature).toBe(120);
    });
  });

  describe("Memory clamping (0 to memoryTotal)", () => {
    it("should clamp negative memoryUsed to 0", () => {
      useSimulationStore.getState().updateGPU(validNodeId, validGpuId, {
        memoryUsed: -1000,
      });

      const gpu = getGPU(validNodeId, validGpuId);
      expect(gpu!.memoryUsed).toBe(0);
    });

    it("should clamp memoryUsed exceeding memoryTotal to memoryTotal", () => {
      const gpu = getGPU(validNodeId, validGpuId);
      const memoryTotal = gpu!.memoryTotal; // 81920 MB for A100-80GB

      useSimulationStore.getState().updateGPU(validNodeId, validGpuId, {
        memoryUsed: memoryTotal + 10000,
      });

      const updatedGpu = getGPU(validNodeId, validGpuId);
      expect(updatedGpu!.memoryUsed).toBe(memoryTotal);
    });

    it("should allow valid memoryUsed values", () => {
      useSimulationStore.getState().updateGPU(validNodeId, validGpuId, {
        memoryUsed: 40000,
      });

      const gpu = getGPU(validNodeId, validGpuId);
      expect(gpu!.memoryUsed).toBe(40000);
    });

    it("should allow memoryUsed of 0", () => {
      useSimulationStore.getState().updateGPU(validNodeId, validGpuId, {
        memoryUsed: 0,
      });

      const gpu = getGPU(validNodeId, validGpuId);
      expect(gpu!.memoryUsed).toBe(0);
    });
  });

  describe("Utilization clamping (0-100)", () => {
    it("should clamp negative utilization to 0", () => {
      useSimulationStore.getState().updateGPU(validNodeId, validGpuId, {
        utilization: -10,
      });

      const gpu = getGPU(validNodeId, validGpuId);
      expect(gpu!.utilization).toBe(0);
    });

    it("should clamp utilization exceeding 100 to 100", () => {
      useSimulationStore.getState().updateGPU(validNodeId, validGpuId, {
        utilization: 150,
      });

      const gpu = getGPU(validNodeId, validGpuId);
      expect(gpu!.utilization).toBe(100);
    });

    it("should allow valid utilization values", () => {
      useSimulationStore.getState().updateGPU(validNodeId, validGpuId, {
        utilization: 75,
      });

      const gpu = getGPU(validNodeId, validGpuId);
      expect(gpu!.utilization).toBe(75);
    });

    it("should allow boundary value 0", () => {
      useSimulationStore.getState().updateGPU(validNodeId, validGpuId, {
        utilization: 0,
      });

      const gpu = getGPU(validNodeId, validGpuId);
      expect(gpu!.utilization).toBe(0);
    });

    it("should allow boundary value 100", () => {
      useSimulationStore.getState().updateGPU(validNodeId, validGpuId, {
        utilization: 100,
      });

      const gpu = getGPU(validNodeId, validGpuId);
      expect(gpu!.utilization).toBe(100);
    });
  });

  describe("Power draw clamping (0 to powerLimit * 1.1)", () => {
    it("should clamp negative powerDraw to 0", () => {
      useSimulationStore.getState().updateGPU(validNodeId, validGpuId, {
        powerDraw: -50,
      });

      const gpu = getGPU(validNodeId, validGpuId);
      expect(gpu!.powerDraw).toBe(0);
    });

    it("should clamp powerDraw exceeding powerLimit * 1.1", () => {
      const gpu = getGPU(validNodeId, validGpuId);
      const maxPower = gpu!.powerLimit * 1.1; // 400 * 1.1 = 440

      useSimulationStore.getState().updateGPU(validNodeId, validGpuId, {
        powerDraw: 600,
      });

      const updatedGpu = getGPU(validNodeId, validGpuId);
      expect(updatedGpu!.powerDraw).toBe(maxPower);
    });

    it("should allow valid powerDraw values", () => {
      useSimulationStore.getState().updateGPU(validNodeId, validGpuId, {
        powerDraw: 300,
      });

      const gpu = getGPU(validNodeId, validGpuId);
      expect(gpu!.powerDraw).toBe(300);
    });

    it("should allow powerDraw up to exactly powerLimit * 1.1", () => {
      const gpu = getGPU(validNodeId, validGpuId);
      const maxPower = gpu!.powerLimit * 1.1;

      useSimulationStore.getState().updateGPU(validNodeId, validGpuId, {
        powerDraw: maxPower,
      });

      const updatedGpu = getGPU(validNodeId, validGpuId);
      expect(updatedGpu!.powerDraw).toBe(maxPower);
    });
  });

  describe("Invalid GPU IDs", () => {
    it("should ignore updates for negative GPU IDs", () => {
      const gpuBefore = getGPU(validNodeId, validGpuId);
      const tempBefore = gpuBefore!.temperature;

      // Attempt update with negative GPU ID - should be a no-op
      useSimulationStore.getState().updateGPU(validNodeId, -1, {
        temperature: 99,
      });

      // Original GPU should be unchanged
      const gpuAfter = getGPU(validNodeId, validGpuId);
      expect(gpuAfter!.temperature).toBe(tempBefore);
    });

    it("should ignore updates for GPU IDs beyond array length", () => {
      const gpuBefore = getGPU(validNodeId, validGpuId);
      const tempBefore = gpuBefore!.temperature;

      // Each node has 8 GPUs (IDs 0-7), so ID 99 doesn't exist
      useSimulationStore.getState().updateGPU(validNodeId, 99, {
        temperature: 99,
      });

      // Original GPU should be unchanged
      const gpuAfter = getGPU(validNodeId, validGpuId);
      expect(gpuAfter!.temperature).toBe(tempBefore);
    });
  });

  describe("Invalid node IDs", () => {
    it("should ignore updates for non-existent node IDs", () => {
      const gpuBefore = getGPU(validNodeId, validGpuId);
      const tempBefore = gpuBefore!.temperature;

      useSimulationStore.getState().updateGPU("non-existent-node", validGpuId, {
        temperature: 99,
      });

      // Existing GPU should be unchanged
      const gpuAfter = getGPU(validNodeId, validGpuId);
      expect(gpuAfter!.temperature).toBe(tempBefore);
    });

    it("should ignore updates for empty string node IDs", () => {
      const gpuBefore = getGPU(validNodeId, validGpuId);
      const tempBefore = gpuBefore!.temperature;

      useSimulationStore.getState().updateGPU("", validGpuId, {
        temperature: 99,
      });

      // Existing GPU should be unchanged
      const gpuAfter = getGPU(validNodeId, validGpuId);
      expect(gpuAfter!.temperature).toBe(tempBefore);
    });
  });

  describe("Multiple fields clamped simultaneously", () => {
    it("should clamp all out-of-range fields in a single update", () => {
      useSimulationStore.getState().updateGPU(validNodeId, validGpuId, {
        temperature: -10,
        memoryUsed: -500,
        utilization: 200,
        powerDraw: 9999,
      });

      const gpu = getGPU(validNodeId, validGpuId);
      expect(gpu!.temperature).toBe(0);
      expect(gpu!.memoryUsed).toBe(0);
      expect(gpu!.utilization).toBe(100);
      expect(gpu!.powerDraw).toBe(gpu!.powerLimit * 1.1);
    });
  });
});
