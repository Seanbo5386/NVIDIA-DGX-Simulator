import { describe, it, expect, beforeEach, vi } from "vitest";
import { SlurmSimulator } from "../slurmSimulator";
import { useSimulationStore } from "@/store/simulationStore";
import { parse } from "@/utils/commandParser";

vi.mock("@/store/simulationStore");

describe("SlurmSimulator GRES", () => {
  let simulator: SlurmSimulator;
  const context = {
    currentNode: "dgx-00",
    currentPath: "/root",
    environment: {},
    history: [],
  };

  beforeEach(() => {
    simulator = new SlurmSimulator();
    vi.mocked(useSimulationStore.getState).mockReturnValue({
      cluster: {
        nodes: [
          {
            id: "dgx-00",
            hostname: "dgx-00.cluster.local",
            gpus: Array(8)
              .fill(null)
              .map((_, i) => ({
                id: i,
                name: "NVIDIA H100 80GB HBM3",
              })),
            cpuCount: 2,
            ramTotal: 2048,
            ramUsed: 512,
            slurmState: "idle",
            slurmReason: undefined,
          },
          {
            id: "dgx-01",
            hostname: "dgx-01.cluster.local",
            gpus: Array(8)
              .fill(null)
              .map((_, i) => ({
                id: i,
                name: "NVIDIA H100 80GB HBM3",
              })),
            cpuCount: 2,
            ramTotal: 2048,
            ramUsed: 256,
            slurmState: "alloc",
            slurmReason: undefined,
          },
        ],
      },
      setSlurmState: vi.fn(),
      allocateGPUsForJob: vi.fn(),
      deallocateGPUsForJob: vi.fn(),
    } as unknown as ReturnType<typeof useSimulationStore.getState>);
  });

  describe("sinfo GRES output", () => {
    it("should show GRES in custom format with %G", () => {
      const result = simulator.executeSinfo(parse('sinfo -o "%n %G"'), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("gpu:");
      expect(result.output).toContain("h100:8");
    });

    it("should show GRES for each node", () => {
      const result = simulator.executeSinfo(parse('sinfo -o "%n %G"'), context);
      expect(result.output).toContain("dgx-00");
      expect(result.output).toContain("dgx-01");
    });
  });

  describe("scontrol show node GRES", () => {
    it("should show Gres= in scontrol show node output", () => {
      const result = simulator.executeScontrol(
        parse("scontrol show node dgx-00"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Gres=gpu:h100:8");
    });

    it("should show GresUsed= in scontrol show node output", () => {
      const result = simulator.executeScontrol(
        parse("scontrol show node dgx-00"),
        context,
      );
      expect(result.output).toContain("GresUsed=");
    });

    it("should show allocated GPUs for nodes in alloc state", () => {
      const result = simulator.executeScontrol(
        parse("scontrol show node dgx-01"),
        context,
      );
      expect(result.output).toContain("GresUsed=gpu:h100:");
      // alloc state shows some GPUs in use
      expect(result.output).toMatch(/GresUsed=gpu:h100:\d+/);
    });
  });

  describe("sbatch with GRES", () => {
    it("should accept --gres=gpu:N flag", () => {
      const result = simulator.executeSbatch(
        parse("sbatch --gres=gpu:4 train.sh"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Submitted batch job");
    });

    it("should accept --gres=gpu:type:N format", () => {
      const result = simulator.executeSbatch(
        parse("sbatch --gres=gpu:h100:8 train.sh"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Submitted batch job");
    });

    it("should show GRES help in sbatch --help", async () => {
      // Wait for lazy-loaded JSON definitions to be available
      await vi.waitFor(
        () => {
          expect(simulator["definitionRegistry"]).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const result = simulator.executeSbatch(parse("sbatch --help"), context);
      // Registry-based help shows examples with --gpus or --gres
      // The output should contain GPU-related content
      expect(result.output).toContain("gpu");
      // Check that it's a proper help output
      expect(result.output).toMatch(/sbatch/i);
    });
  });

  describe("scontrol show config", () => {
    it("should show GresTypes in config", () => {
      const result = simulator.executeScontrol(
        parse("scontrol show config"),
        context,
      );
      expect(result.output).toContain("GresTypes = gpu");
    });
  });
});
