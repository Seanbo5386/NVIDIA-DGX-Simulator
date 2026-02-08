import { describe, it, expect, beforeEach, vi } from "vitest";
import { BcmSimulator } from "../bcmSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/types/commands";
import { useSimulationStore } from "@/store/simulationStore";

// Mock the store
vi.mock("@/store/simulationStore");

describe("BcmSimulator", () => {
  let simulator: BcmSimulator;
  let context: CommandContext;

  const makeGpu = (id: number, overrides: Record<string, unknown> = {}) => ({
    id,
    name: "NVIDIA H100 80GB HBM3",
    type: "H100-SXM",
    uuid: `GPU-12345678-1234-1234-1234-12345678901${id}`,
    pciAddress: `0000:${(0x17 + id).toString(16)}:00.0`,
    temperature: 45,
    powerDraw: 250,
    powerLimit: 700,
    memoryTotal: 81920,
    memoryUsed: 1024,
    utilization: 10,
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
    ...overrides,
  });

  const makeNode = (idx: number, overrides: Record<string, unknown> = {}) => ({
    id: `dgx-0${idx}`,
    hostname: `dgx-node0${idx + 1}`,
    systemType: "DGX-H100",
    healthStatus: "OK",
    nvidiaDriverVersion: "535.129.03",
    cudaVersion: "12.2",
    osVersion: "Ubuntu 22.04",
    kernelVersion: "5.15.0-91-generic",
    cpuModel: "AMD EPYC 9654",
    cpuCount: 128,
    ramTotal: 2048,
    ramUsed: 512,
    slurmState: "idle",
    gpus: Array.from({ length: 8 }, (_, i) => makeGpu(i)),
    hcas: [
      {
        id: 0,
        devicePath: "/dev/infiniband/uverbs0",
        caType: "ConnectX-7",
        firmwareVersion: "28.37.1700",
        ports: [
          {
            portNumber: 1,
            state: "Active",
            physicalState: "LinkUp",
            rate: 400,
          },
        ],
      },
    ],
    dpus: [],
    bmc: {
      ipAddress: "10.0.1.1",
      macAddress: "AA:BB:CC:DD:EE:FF",
      firmwareVersion: "1.0",
      manufacturer: "NVIDIA",
      sensors: [],
      powerState: "On",
    },
    ...overrides,
  });

  beforeEach(() => {
    simulator = new BcmSimulator();
    context = {
      currentNode: "dgx-00",
      currentPath: "/root",
      environment: {},
      history: [],
    };

    vi.mocked(useSimulationStore.getState).mockReturnValue({
      cluster: {
        name: "test-cluster",
        nodes: Array.from({ length: 4 }, (_, i) => makeNode(i)),
        fabricTopology: "FatTree",
        bcmHA: {
          enabled: true,
          primary: "dgx-headnode01",
          secondary: "dgx-headnode02",
          state: "Active",
        },
        slurmConfig: {
          controlMachine: "dgx-headnode01",
          partitions: ["gpu", "debug"],
        },
      },
    } as ReturnType<typeof useSimulationStore.getState>);
  });

  // ============================
  // bcm-node list
  // ============================
  describe("bcm-node list", () => {
    it("should show table output with correct column headers", () => {
      const parsed = parse("bcm-node list");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Node ID");
      expect(result.output).toContain("Hostname");
      expect(result.output).toContain("Type");
      expect(result.output).toContain("Status");
      expect(result.output).toContain("GPUs");
    });

    it("should list all nodes from the cluster", () => {
      const parsed = parse("bcm-node list");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("dgx-00");
      expect(result.output).toContain("dgx-01");
      expect(result.output).toContain("dgx-02");
      expect(result.output).toContain("dgx-03");
      expect(result.output).toContain("dgx-node01");
      expect(result.output).toContain("dgx-node04");
    });

    it("should display GPU model info (e.g. '8 x H100')", () => {
      const parsed = parse("bcm-node list");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("8 x NVIDIA H100 80GB HBM3");
    });

    it("should show total node and GPU counts", () => {
      const parsed = parse("bcm-node list");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("Total Nodes: 4");
      expect(result.output).toContain("Total GPUs:  32");
    });

    it("should show BCM Node Inventory header", () => {
      const parsed = parse("bcm-node list");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("BCM Node Inventory");
    });

    it("should display health status for each node", () => {
      const parsed = parse("bcm-node list");
      const result = simulator.execute(parsed, context);

      // Healthy nodes show green "Healthy"
      expect(result.output).toContain("Healthy");
    });
  });

  // ============================
  // bcm-node show <id>
  // ============================
  describe("bcm-node show", () => {
    it("should show detailed node information for a valid node", () => {
      const parsed = parse("bcm-node show dgx-00");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Node Details");
      expect(result.output).toContain("dgx-00");
      expect(result.output).toContain("dgx-node01");
      expect(result.output).toContain("General Information");
      expect(result.output).toContain("Hardware Configuration");
    });

    it("should show GPU summary in node details", () => {
      const parsed = parse("bcm-node show dgx-00");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("GPU Summary");
      expect(result.output).toContain("GPU 0:");
      expect(result.output).toContain("NVIDIA H100 80GB HBM3");
    });

    it("should show Software Versions", () => {
      const parsed = parse("bcm-node show dgx-00");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("Software Versions");
      expect(result.output).toContain("NVIDIA Driver");
      expect(result.output).toContain("CUDA Version");
    });

    it("should show Slurm Status", () => {
      const parsed = parse("bcm-node show dgx-00");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("Slurm Status");
      expect(result.output).toContain("idle");
    });

    it("should show InfiniBand HCAs", () => {
      const parsed = parse("bcm-node show dgx-00");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("InfiniBand HCAs");
      expect(result.output).toContain("ConnectX-7");
    });

    it("should return error for missing node ID", () => {
      const parsed = parse("bcm-node show");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain("Usage");
    });

    it("should return error for unknown node ID", () => {
      const parsed = parse("bcm-node show nonexistent-node");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain("not found");
    });
  });

  // ============================
  // bcm ha status
  // ============================
  describe("bcm ha status", () => {
    it("should display HA configuration", () => {
      const parsed = parse("bcm ha status");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("High Availability");
      expect(result.output).toContain("HA Configuration");
    });

    it("should show primary and secondary nodes", () => {
      const parsed = parse("bcm ha status");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("dgx-headnode01");
      expect(result.output).toContain("dgx-headnode02");
    });

    it("should show enabled status when HA is enabled", () => {
      const parsed = parse("bcm ha status");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("Enabled");
    });

    it("should show shared resources", () => {
      const parsed = parse("bcm ha status");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("Shared Resources");
      expect(result.output).toContain("/cm_shared");
      expect(result.output).toContain("Virtual IP");
    });
  });

  // ============================
  // bcm job list
  // ============================
  describe("bcm job list", () => {
    it("should list deployment jobs", () => {
      const parsed = parse("bcm job list");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("BCM Deployment Jobs");
      expect(result.output).toContain("Job ID");
      expect(result.output).toContain("Type");
      expect(result.output).toContain("Status");
    });

    it("should show predefined jobs", () => {
      const parsed = parse("bcm job list");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("node-discovery");
      expect(result.output).toContain("firmware-update");
      expect(result.output).toContain("completed");
    });
  });

  // ============================
  // bcm job logs <id>
  // ============================
  describe("bcm job logs", () => {
    it("should show logs for node-discovery job", () => {
      const parsed = parse("bcm job logs 1");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Job Logs for Job #1");
      expect(result.output).toContain("node-discovery");
      expect(result.output).toContain("Starting node discovery");
    });

    it("should show logs for firmware-update job", () => {
      const parsed = parse("bcm job logs 2");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("firmware-update");
      expect(result.output).toContain("firmware");
    });

    it("should return error for missing job ID", () => {
      const parsed = parse("bcm job logs");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain("Job ID not specified");
    });

    it("should return error for invalid job ID", () => {
      const parsed = parse("bcm job logs 999");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain("not found");
    });
  });

  // ============================
  // bcm validate pod
  // ============================
  describe("bcm validate pod", () => {
    it("should run SuperPOD validation checks", () => {
      const parsed = parse("bcm validate pod");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("SuperPOD Configuration Validation");
      expect(result.output).toContain("Running validation checks");
    });

    it("should check node count, GPU count, and network", () => {
      const parsed = parse("bcm validate pod");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("Node Count");
      expect(result.output).toContain("GPU Count");
      expect(result.output).toContain("Network Connectivity");
    });

    it("should check InfiniBand, firmware, storage, and Slurm", () => {
      const parsed = parse("bcm validate pod");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("InfiniBand Fabric");
      expect(result.output).toContain("Firmware Versions");
      expect(result.output).toContain("Shared Storage");
      expect(result.output).toContain("Slurm");
    });

    it("should pass validation when all GPUs healthy", () => {
      const parsed = parse("bcm validate pod");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("validation passed");
    });

    it("should warn when some GPUs are unhealthy", () => {
      // Override one GPU to be unhealthy
      vi.mocked(useSimulationStore.getState).mockReturnValue({
        cluster: {
          name: "test-cluster",
          nodes: [
            makeNode(0, {
              gpus: [
                makeGpu(0, { healthStatus: "Warning" }),
                ...Array.from({ length: 7 }, (_, i) => makeGpu(i + 1)),
              ],
            }),
            makeNode(1),
          ],
          fabricTopology: "FatTree",
          bcmHA: {
            enabled: true,
            primary: "dgx-headnode01",
            secondary: "dgx-headnode02",
            state: "Active",
          },
          slurmConfig: {
            controlMachine: "dgx-headnode01",
            partitions: ["gpu"],
          },
        },
      } as ReturnType<typeof useSimulationStore.getState>);

      const parsed = parse("bcm validate pod");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("warnings");
    });
  });

  // ============================
  // crm status
  // ============================
  describe("crm status", () => {
    it("should show Pacemaker cluster status", () => {
      const parsed = parse("crm status");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Cluster name: bcm-ha");
      expect(result.output).toContain("corosync");
    });

    it("should show node list with primary and secondary", () => {
      const parsed = parse("crm status");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("Node List");
      expect(result.output).toContain("dgx-headnode01");
      expect(result.output).toContain("dgx-headnode02");
    });

    it("should show active resources", () => {
      const parsed = parse("crm status");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("Active Resources");
      expect(result.output).toContain("virtual-ip");
      expect(result.output).toContain("bcm-manager");
      expect(result.output).toContain("nfs-server");
      expect(result.output).toContain("drbd-master");
    });

    it("should return error for invalid crm subcommand", () => {
      const parsed = parse("crm invalid");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain("Usage");
    });
  });

  // ============================
  // Unknown commands and help
  // ============================
  describe("Unknown commands and help", () => {
    it("should return error for unknown bcm subcommand", () => {
      const parsed = parse("bcm unknown");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain("unknown command");
    });

    it("should show help for bcm --help", () => {
      const parsed = parse("bcm --help");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Base Command Manager");
      expect(result.output).toContain("bcm-node");
    });

    it("should show BCM shell when running bcm with no args", () => {
      const parsed = parse("bcm");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Base Command Manager (BCM) Shell");
      expect(result.output).toContain("Available commands");
    });

    it("should return error for unknown base tool", () => {
      // Simulate a parsed command with baseCommand 'unknown-tool'
      const parsed = parse("bcm-node list");
      // Override baseCommand to test unknown tool
      parsed.baseCommand = "unknown-tool";
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain("Unknown BCM tool");
    });

    it("should return error for bcm-node with invalid subcommand", () => {
      const parsed = parse("bcm-node invalid");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain("Usage");
    });
  });
});
