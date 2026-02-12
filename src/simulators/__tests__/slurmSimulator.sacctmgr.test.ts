import { describe, it, expect, beforeEach, vi } from "vitest";
import { SlurmSimulator } from "../slurmSimulator";
import { useSimulationStore } from "@/store/simulationStore";
import { parse } from "@/utils/commandParser";

vi.mock("@/store/simulationStore");

describe("SlurmSimulator sacctmgr", () => {
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
        ],
      },
      setSlurmState: vi.fn(),
      allocateGPUsForJob: vi.fn(),
      deallocateGPUsForJob: vi.fn(),
    } as unknown as ReturnType<typeof useSimulationStore.getState>);
  });

  describe("sacctmgr show assoc", () => {
    it("should display association table with header", () => {
      const parsed = parse("sacctmgr show assoc");
      const result = simulator.executeSacctmgr(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Cluster");
      expect(result.output).toContain("Account");
      expect(result.output).toContain("User");
      expect(result.output).toContain("Partition");
      expect(result.output).toContain("Share");
      expect(result.output).toContain("GrpTRES");
      expect(result.output).toContain("MaxTRES");
      expect(result.output).toContain("QOS");
    });

    it("should include root and compute accounts", () => {
      const parsed = parse("sacctmgr show assoc");
      const result = simulator.executeSacctmgr(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("dgx-clus");
      expect(result.output).toContain("root");
      expect(result.output).toContain("compute");
      expect(result.output).toContain("admin");
    });

    it("should show GPU TRES limits", () => {
      const parsed = parse("sacctmgr show assoc");
      const result = simulator.executeSacctmgr(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("gpu=64");
      expect(result.output).toContain("gpu=16");
      expect(result.output).toContain("gpu=8");
    });

    it("should show QOS assignments", () => {
      const parsed = parse("sacctmgr show assoc");
      const result = simulator.executeSacctmgr(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("normal");
      expect(result.output).toContain("normal,high");
    });

    it("should match scenario validation pattern show|assoc|account", () => {
      const parsed = parse("sacctmgr show assoc");
      const result = simulator.executeSacctmgr(parsed, context);

      expect(result.exitCode).toBe(0);
      // Validation pattern: "show|assoc|account"
      expect(result.output).toMatch(/Account|assoc/i);
    });
  });

  describe("sacctmgr show account", () => {
    it("should list accounts", () => {
      const parsed = parse("sacctmgr show account");
      const result = simulator.executeSacctmgr(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Account");
      expect(result.output).toContain("Descr");
      expect(result.output).toContain("root");
      expect(result.output).toContain("compute");
      expect(result.output).toContain("research");
      expect(result.output).toContain("training");
    });
  });

  describe("sacctmgr show qos", () => {
    it("should list QOS definitions", () => {
      const parsed = parse("sacctmgr show qos");
      const result = simulator.executeSacctmgr(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Name");
      expect(result.output).toContain("Priority");
      expect(result.output).toContain("normal");
      expect(result.output).toContain("high");
      expect(result.output).toContain("low");
    });
  });

  describe("sacctmgr show cluster", () => {
    it("should show cluster information", () => {
      const parsed = parse("sacctmgr show cluster");
      const result = simulator.executeSacctmgr(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Cluster");
      expect(result.output).toContain("dgx-clus");
      expect(result.output).toContain("ControlHost");
    });
  });

  describe("sacctmgr --help", () => {
    it("should show help text", () => {
      const parsed = parse("sacctmgr --help");
      const result = simulator.executeSacctmgr(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Usage:");
      expect(result.output).toContain("show");
      expect(result.output).toContain("add");
      expect(result.output).toContain("assoc");
    });
  });

  describe("sacctmgr --version", () => {
    it("should show slurm version", () => {
      const parsed = parse("sacctmgr --version");
      const result = simulator.executeSacctmgr(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("slurm 23.02.6");
    });
  });

  describe("sacctmgr error handling", () => {
    it("should error with no subcommand", () => {
      const parsed = parse("sacctmgr");
      // Clear subcommands since there are none
      parsed.subcommands = [];
      const result = simulator.executeSacctmgr(parsed, context);

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("Usage:");
    });

    it("should error for invalid show entity", () => {
      const parsed = parse("sacctmgr show invalid");
      const result = simulator.executeSacctmgr(parsed, context);

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("Usage:");
    });

    it("should handle add/modify/delete stubs", () => {
      const parsed = parse("sacctmgr add account");
      const result = simulator.executeSacctmgr(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("add");
      expect(result.output).toContain("account");
      expect(result.output).toContain("completed successfully");
    });
  });
});
