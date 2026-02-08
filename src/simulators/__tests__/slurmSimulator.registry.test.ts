import { describe, it, expect, beforeEach, vi } from "vitest";
import { SlurmSimulator } from "../slurmSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/types/commands";
import { useSimulationStore } from "@/store/simulationStore";

// Mock the store
vi.mock("@/store/simulationStore");

describe("SlurmSimulator CommandDefinitionRegistry Integration", () => {
  let simulator: SlurmSimulator;
  let context: CommandContext;

  beforeEach(() => {
    simulator = new SlurmSimulator();
    context = {
      currentNode: "dgx-00",
      currentPath: "/root",
      environment: {},
      history: [],
    };

    // Setup default mock with Slurm node data
    vi.mocked(useSimulationStore.getState).mockReturnValue({
      cluster: {
        nodes: [
          {
            id: "dgx-00",
            hostname: "dgx-node01",
            systemType: "H100",
            healthStatus: "OK",
            nvidiaDriverVersion: "535.129.03",
            cudaVersion: "12.2",
            slurmState: "idle",
            slurmReason: "",
            cpuCount: 2,
            ramTotal: 2048,
            gpus: [
              {
                id: 0,
                name: "NVIDIA H100 80GB HBM3",
                type: "H100-SXM",
                uuid: "GPU-12345678-1234-1234-1234-123456789012",
                pciAddress: "0000:17:00.0",
                temperature: 45,
                powerDraw: 250,
                powerLimit: 700,
                memoryTotal: 81920,
                memoryUsed: 1024,
                utilization: 0,
                clocksSM: 1980,
                clocksMem: 2619,
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
              },
            ],
            hcas: [],
          },
        ],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  describe("Registry Initialization", () => {
    it("should have definition registry initialized after construction", async () => {
      // Wait for async initialization
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(simulator["definitionRegistry"]).not.toBeNull();
    });
  });

  describe("sinfo validation", () => {
    it("should accept valid sinfo flags", () => {
      const parsed = parse("sinfo --partition=gpu");
      const result = simulator.executeSinfo(parsed, context);

      expect(result.exitCode).toBe(0);
    });

    it("should show help with --help flag", () => {
      const parsed = parse("sinfo --help");
      const result = simulator.executeSinfo(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("sinfo");
    });
  });

  describe("squeue validation", () => {
    it("should accept valid squeue flags", () => {
      const parsed = parse("squeue --user=root");
      const result = simulator.executeSqueue(parsed, context);

      expect(result.exitCode).toBe(0);
    });

    it("should show help with --help flag", () => {
      const parsed = parse("squeue --help");
      const result = simulator.executeSqueue(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("squeue");
    });
  });

  describe("scontrol validation", () => {
    it("should accept valid scontrol commands", () => {
      const parsed = parse("scontrol show nodes");
      const result = simulator.executeScontrol(parsed, context);

      expect(result.exitCode).toBe(0);
    });

    it("should show help with --help flag", () => {
      const parsed = parse("scontrol --help");
      const result = simulator.executeScontrol(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("scontrol");
    });
  });

  describe("sbatch validation", () => {
    it("should show help with --help flag", () => {
      const parsed = parse("sbatch --help");
      const result = simulator.executeSbatch(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("sbatch");
    });
  });

  describe("Help from JSON definitions", () => {
    it("sinfo --help should return registry-based help", async () => {
      await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for registry

      const parsed = parse("sinfo --help");
      const result = simulator.executeSinfo(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("sinfo");
      expect(result.output).toContain("Description:");
      expect(result.output).toContain("Options:");
    });

    it("squeue --help should return registry-based help", async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const parsed = parse("squeue --help");
      const result = simulator.executeSqueue(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("squeue");
      expect(result.output).toContain("Description:");
    });

    it("scontrol --help should return registry-based help", async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const parsed = parse("scontrol --help");
      const result = simulator.executeScontrol(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("scontrol");
    });

    it("sbatch --help should return registry-based help", async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const parsed = parse("sbatch --help");
      const result = simulator.executeSbatch(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("sbatch");
      expect(result.output).toContain("Description:");
    });

    it("srun --help should return registry-based help", async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const parsed = parse("srun --help");
      const result = simulator.executeSrun(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("srun");
    });

    it("scancel --help should return registry-based help", async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const parsed = parse("scancel --help");
      const result = simulator.executeScancel(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("scancel");
    });

    it("sacct --help should return registry-based help", async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const parsed = parse("sacct --help");
      const result = simulator.executeSacct(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("sacct");
    });
  });
});
