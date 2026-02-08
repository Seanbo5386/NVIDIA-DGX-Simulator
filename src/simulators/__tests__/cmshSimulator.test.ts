import { describe, it, expect, beforeEach, vi } from "vitest";
import { CmshSimulator } from "../cmshSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/types/commands";
import { useSimulationStore } from "@/store/simulationStore";

// Mock the store
vi.mock("@/store/simulationStore");

describe("CmshSimulator", () => {
  let simulator: CmshSimulator;
  let context: CommandContext;

  const makeGpu = (id: number) => ({
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
  });

  beforeEach(() => {
    simulator = new CmshSimulator();
    context = {
      currentNode: "dgx-00",
      currentPath: "/root",
      environment: {},
      history: [],
    };

    vi.mocked(useSimulationStore.getState).mockReturnValue({
      cluster: {
        name: "test-cluster",
        nodes: [
          {
            id: "dgx-00",
            hostname: "dgx-node01",
            systemType: "DGX-H100",
            healthStatus: "OK",
            nvidiaDriverVersion: "535.129.03",
            cudaVersion: "12.2",
            gpus: Array.from({ length: 8 }, (_, i) => makeGpu(i)),
            hcas: [],
            dpus: [],
            bmc: {
              ipAddress: "10.0.1.1",
              macAddress: "AA:BB:CC:DD:EE:FF",
              firmwareVersion: "1.0",
              manufacturer: "NVIDIA",
              sensors: [],
              powerState: "On",
            },
          },
          {
            id: "dgx-01",
            hostname: "dgx-node02",
            systemType: "DGX-H100",
            healthStatus: "OK",
            nvidiaDriverVersion: "535.129.03",
            cudaVersion: "12.2",
            gpus: Array.from({ length: 8 }, (_, i) => makeGpu(i)),
            hcas: [],
            dpus: [],
            bmc: {
              ipAddress: "10.0.1.2",
              macAddress: "AA:BB:CC:DD:EE:F0",
              firmwareVersion: "1.0",
              manufacturer: "NVIDIA",
              sensors: [],
              powerState: "On",
            },
          },
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
          partitions: ["gpu", "debug"],
        },
      },
    } as ReturnType<typeof useSimulationStore.getState>);
  });

  // ============================
  // Entering interactive mode
  // ============================
  describe("entering interactive mode", () => {
    it("should enter interactive mode with no arguments", () => {
      const parsed = parse("cmsh");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Cluster Management Shell");
      expect(result.prompt).toContain("[root@dgx-headnode]%");
    });

    it("should show help with --help flag", () => {
      const parsed = parse("cmsh --help");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Cluster Management Shell");
      expect(result.output).toContain("Usage");
    });

    it("should show version with --version flag", () => {
      const parsed = parse("cmsh --version");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("cmsh");
      expect(result.output).toContain("version");
    });
  });

  // ============================
  // device mode
  // ============================
  describe("device mode", () => {
    it("should enter device mode", () => {
      simulator.execute(parse("cmsh"), context);
      const result = simulator.executeInteractive("device", context);

      expect(result.prompt).toContain("->device");
    });

    it("should list devices in device mode", () => {
      simulator.execute(parse("cmsh"), context);
      simulator.executeInteractive("device", context);

      const result = simulator.executeInteractive("list", context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Name (key)");
      expect(result.output).toContain("dgx-headnode");
      expect(result.output).toContain("dgx-node01");
    });

    it("should list devices with simple pipe-separated format (no box-drawing chars)", () => {
      simulator.execute(parse("cmsh"), context);
      simulator.executeInteractive("device", context);

      const result = simulator.executeInteractive("list", context);

      // Should use pipe separators
      expect(result.output).toContain("|");
      // Should NOT have markdown-style border decorations
      expect(result.output).not.toMatch(/\| -+/);
      expect(result.output).not.toContain("+--");
    });
  });

  // ============================
  // use and show commands
  // ============================
  describe("use and show commands", () => {
    it("should select a node with use command", () => {
      simulator.execute(parse("cmsh"), context);
      simulator.executeInteractive("device", context);

      const result = simulator.executeInteractive("use dgx-node01", context);

      expect(result.prompt).toContain("[dgx-node01]");
    });

    it("should show details of selected node", () => {
      simulator.execute(parse("cmsh"), context);
      simulator.executeInteractive("device", context);
      simulator.executeInteractive("use dgx-node01", context);

      const result = simulator.executeInteractive("show", context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Parameter");
      expect(result.output).toContain("Value");
      expect(result.output).toContain("dgx-node01");
    });

    it("should show error for unknown object in show", () => {
      simulator.execute(parse("cmsh"), context);
      simulator.executeInteractive("device", context);
      simulator.executeInteractive("use nonexistent-node", context);

      const result = simulator.executeInteractive("show", context);

      expect(result.output).toContain("not found");
    });

    it("should show error when no object selected", () => {
      simulator.execute(parse("cmsh"), context);
      simulator.executeInteractive("device", context);

      const result = simulator.executeInteractive("show", context);

      expect(result.output).toContain("No object selected");
    });
  });

  // ============================
  // category mode
  // ============================
  describe("category mode", () => {
    it("should enter category mode and list categories", () => {
      simulator.execute(parse("cmsh"), context);
      const modeResult = simulator.executeInteractive("category", context);
      expect(modeResult.prompt).toContain("->category");

      const listResult = simulator.executeInteractive("list", context);
      expect(listResult.output).toContain("headnode");
      expect(listResult.output).toContain("dgx-h100");
    });

    it("should show details of selected category", () => {
      simulator.execute(parse("cmsh"), context);
      simulator.executeInteractive("category", context);
      simulator.executeInteractive("use dgx-h100", context);

      const result = simulator.executeInteractive("show", context);

      expect(result.output).toContain("dgx-h100");
      expect(result.output).toContain("Software image");
    });
  });

  // ============================
  // softwareimage mode
  // ============================
  describe("softwareimage mode", () => {
    it("should enter softwareimage mode and list images", () => {
      simulator.execute(parse("cmsh"), context);
      const modeResult = simulator.executeInteractive("softwareimage", context);
      expect(modeResult.prompt).toContain("->softwareimage");

      const listResult = simulator.executeInteractive("list", context);
      expect(listResult.output).toContain("baseos-image-v10");
      expect(listResult.output).toContain("maintenance-image");
    });

    it("should show kernel version in software image listing", () => {
      simulator.execute(parse("cmsh"), context);
      simulator.executeInteractive("softwareimage", context);

      const result = simulator.executeInteractive("list", context);
      expect(result.output).toContain("5.15.0-1035-nvidia");
    });
  });

  // ============================
  // partition mode
  // ============================
  describe("partition mode", () => {
    it("should enter partition mode and list partitions", () => {
      simulator.execute(parse("cmsh"), context);
      const modeResult = simulator.executeInteractive("partition", context);
      expect(modeResult.prompt).toContain("->partition");

      const listResult = simulator.executeInteractive("list", context);
      expect(listResult.output).toContain("gpu");
      expect(listResult.output).toContain("debug");
    });
  });

  // ============================
  // JSON output with capitalized fields
  // ============================
  describe("JSON output (list -d {})", () => {
    it("should produce JSON output with capitalized field names", () => {
      simulator.execute(parse("cmsh"), context);
      simulator.executeInteractive("device", context);

      const result = simulator.executeInteractive("list -d {}", context);

      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.output);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);

      // Check capitalized field names
      const firstItem = parsed[0];
      expect(firstItem).toHaveProperty("Hostname (key)");
      expect(firstItem).toHaveProperty("IPAddress");
      expect(firstItem).toHaveProperty("Category");
    });

    it("should NOT have lowercase field names in JSON output", () => {
      simulator.execute(parse("cmsh"), context);
      simulator.executeInteractive("device", context);

      const result = simulator.executeInteractive("list -d {}", context);
      const parsed = JSON.parse(result.output);
      const firstItem = parsed[0];

      expect(firstItem).not.toHaveProperty("hostname (key)");
      expect(firstItem).not.toHaveProperty("ip");
      expect(firstItem).not.toHaveProperty("category");
    });
  });

  // ============================
  // Table format verification
  // ============================
  describe("table format", () => {
    it("should use simple pipes without box-drawing characters", () => {
      simulator.execute(parse("cmsh"), context);
      simulator.executeInteractive("category", context);

      const result = simulator.executeInteractive("list", context);

      // Should contain pipe separators
      expect(result.output).toContain("|");
      // Should NOT contain box-drawing or markdown border decorations
      expect(result.output).not.toMatch(/\| -+\|/);
      expect(result.output).not.toContain("+-");
    });

    it("should use simple pipes in softwareimage listing", () => {
      simulator.execute(parse("cmsh"), context);
      simulator.executeInteractive("softwareimage", context);

      const result = simulator.executeInteractive("list", context);

      expect(result.output).toContain("|");
      expect(result.output).not.toMatch(/\| -+\|/);
    });

    it("should use simple pipes in partition listing", () => {
      simulator.execute(parse("cmsh"), context);
      simulator.executeInteractive("partition", context);

      const result = simulator.executeInteractive("list", context);

      expect(result.output).toContain("|");
      expect(result.output).not.toMatch(/\| -+\|/);
    });
  });

  // ============================
  // Edge cases
  // ============================
  describe("edge cases", () => {
    it("should handle unknown command in interactive mode", () => {
      simulator.execute(parse("cmsh"), context);
      const result = simulator.executeInteractive("foobar", context);

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("Command not found");
    });

    it("should handle empty input in interactive mode", () => {
      simulator.execute(parse("cmsh"), context);
      const result = simulator.executeInteractive("", context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toBe("");
    });

    it("should handle unknown command in non-interactive execute", () => {
      const parsed = parse("cmsh unknown");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain("unknown command");
    });
  });
});
