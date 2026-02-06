import { describe, it, expect, beforeEach, vi } from "vitest";
import { InfiniBandSimulator, getIBStandardName } from "../infinibandSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/types/commands";
import { useSimulationStore } from "@/store/simulationStore";

// Mock the store
vi.mock("@/store/simulationStore");

describe("InfiniBandSimulator", () => {
  let simulator: InfiniBandSimulator;
  let context: CommandContext;

  beforeEach(() => {
    simulator = new InfiniBandSimulator();
    context = {
      currentNode: "dgx-00",
      currentPath: "/root",
      environment: {},
      history: [],
    };

    // Setup default mock with HCA data
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
            gpus: [],
            hcas: [
              {
                caType: "mlx5_0",
                firmwareVersion: "20.35.1012",
                ports: [
                  {
                    portNumber: 1,
                    state: "Active",
                    physicalState: "LinkUp",
                    rate: "200",
                    lid: 123,
                    guid: "0x506b4b0300ab1234",
                    linkLayer: "InfiniBand",
                    errors: {
                      symbolErrors: 0,
                      linkDowned: 0,
                      portRcvErrors: 0,
                      portXmitDiscards: 0,
                      portXmitWait: 0,
                    },
                  },
                ],
              },
            ],
            bmc: {
              sensors: [],
              systemPower: "on",
              chassisStatus: {
                powerOn: true,
                powerFault: false,
                interlock: false,
                overload: false,
                cooling: "ok",
              },
              sel: [],
              fru: {
                chassisType: "Rack Mount Chassis",
                chassisSerial: "DGX-001",
                boardMfg: "NVIDIA",
                boardProduct: "DGX H100",
                boardSerial: "PGX001234",
                productMfg: "NVIDIA",
                productName: "DGX H100",
                productSerial: "DGX-H100-001",
              },
            },
          },
        ],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  describe("Basic Commands", () => {
    it("ibstat should return HCA information", () => {
      const parsed = parse("ibstat");
      const result = simulator.executeIbstat(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("mlx5_0");
      expect(result.output).toContain("Active");
    });

    it("ibstat --version should return version", () => {
      const parsed = parse("ibstat --version");
      const result = simulator.executeIbstat(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ibstat");
    });

    it("ibportstate should return port state", () => {
      const parsed = parse("ibportstate 123 1");
      const result = simulator.executeIbportstate(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Port");
      expect(result.output).toContain("State");
    });

    it("ibporterrors should return error counters", () => {
      const parsed = parse("ibporterrors");
      const result = simulator.executeIbporterrors(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Errors");
    });

    it("iblinkinfo should return link information", () => {
      const parsed = parse("iblinkinfo");
      const result = simulator.executeIblinkinfo(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("InfiniBand Link Information");
    });

    it("perfquery should return performance counters", () => {
      const parsed = parse("perfquery");
      const result = simulator.executePerfquery(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Port counters");
    });

    it("ibdiagnet should return diagnostic information", () => {
      const parsed = parse("ibdiagnet");
      const result = simulator.executeIbdiagnet(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Discovering");
    });

    it("ibnetdiscover should return fabric topology", () => {
      const parsed = parse("ibnetdiscover");
      const result = simulator.executeIbnetdiscover(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Topology");
    });

    it("ibdev2netdev should return device mapping", () => {
      const parsed = parse("ibdev2netdev");
      const result = simulator.executeIbdev2netdev(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("mlx5_0");
    });
  });

  describe("CommandDefinitionRegistry Integration", () => {
    it("should have definition registry initialized after construction", async () => {
      // Wait for async initialization (lazy-loaded JSON imports may take longer)
      await vi.waitFor(
        () => {
          expect(simulator["definitionRegistry"]).not.toBeNull();
        },
        { timeout: 5000 },
      );
    });
  });

  describe("Help from JSON definitions", () => {
    it("ibstat --help should return registry-based help", async () => {
      await vi.waitFor(
        () => {
          expect(simulator["definitionRegistry"]).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const parsed = parse("ibstat --help");
      const result = simulator.executeIbstat(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ibstat");
    });

    it("ibportstate --help should return help", async () => {
      await vi.waitFor(
        () => {
          expect(simulator["definitionRegistry"]).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const parsed = parse("ibportstate --help");
      const result = simulator.executeIbportstate(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ibportstate");
    });

    it("ibporterrors --help should return help", async () => {
      await vi.waitFor(
        () => {
          expect(simulator["definitionRegistry"]).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const parsed = parse("ibporterrors --help");
      const result = simulator.executeIbporterrors(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ibporterrors");
    });

    it("iblinkinfo --help should return help", async () => {
      await vi.waitFor(
        () => {
          expect(simulator["definitionRegistry"]).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const parsed = parse("iblinkinfo --help");
      const result = simulator.executeIblinkinfo(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("iblinkinfo");
    });

    it("perfquery --help should return help", async () => {
      await vi.waitFor(
        () => {
          expect(simulator["definitionRegistry"]).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const parsed = parse("perfquery --help");
      const result = simulator.executePerfquery(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("perfquery");
    });

    it("ibdiagnet --help should return help", async () => {
      await vi.waitFor(
        () => {
          expect(simulator["definitionRegistry"]).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const parsed = parse("ibdiagnet --help");
      const result = simulator.executeIbdiagnet(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ibdiagnet");
    });

    it("ibnetdiscover --help should return help", async () => {
      await vi.waitFor(
        () => {
          expect(simulator["definitionRegistry"]).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const parsed = parse("ibnetdiscover --help");
      const result = simulator.executeIbnetdiscover(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ibnetdiscover");
    });

    it("ibdev2netdev --help should return help", async () => {
      await vi.waitFor(
        () => {
          expect(simulator["definitionRegistry"]).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const parsed = parse("ibdev2netdev --help");
      const result = simulator.executeIbdev2netdev(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ibdev2netdev");
    });
  });

  describe("getIBStandardName helper", () => {
    it("should return QDR for rates below 56 Gb/s", () => {
      expect(getIBStandardName(40)).toBe("QDR");
      expect(getIBStandardName(10)).toBe("QDR");
    });

    it("should return FDR for 56 Gb/s", () => {
      expect(getIBStandardName(56)).toBe("FDR");
    });

    it("should return EDR for 100 Gb/s", () => {
      expect(getIBStandardName(100)).toBe("EDR");
    });

    it("should return HDR for 200 Gb/s", () => {
      expect(getIBStandardName(200)).toBe("HDR");
    });

    it("should return NDR for 400 Gb/s", () => {
      expect(getIBStandardName(400)).toBe("NDR");
    });

    it("should return XDR for 800 Gb/s", () => {
      expect(getIBStandardName(800)).toBe("XDR");
    });
  });

  describe("IB speed labeling in ibdiagnet output", () => {
    it("should label 400 Gb/s as NDR (not HDR) in detailed ibdiagnet output", () => {
      // Set up node with 400 Gb/s port rate
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
              gpus: [],
              hcas: [
                {
                  caType: "mlx5_0",
                  firmwareVersion: "20.35.1012",
                  ports: [
                    {
                      portNumber: 1,
                      state: "Active",
                      physicalState: "LinkUp",
                      rate: 400,
                      lid: 123,
                      guid: "0x506b4b0300ab1234",
                      linkLayer: "InfiniBand",
                      errors: {
                        symbolErrors: 0,
                        linkDowned: 0,
                        portRcvErrors: 0,
                        portXmitDiscards: 0,
                        portXmitWait: 0,
                      },
                    },
                  ],
                },
              ],
              bmc: {
                sensors: [],
                systemPower: "on",
                chassisStatus: {
                  powerOn: true,
                  powerFault: false,
                  interlock: false,
                  overload: false,
                  cooling: "ok",
                },
                sel: [],
                fru: {
                  chassisType: "Rack Mount Chassis",
                  chassisSerial: "DGX-001",
                  boardMfg: "NVIDIA",
                  boardProduct: "DGX H100",
                  boardSerial: "PGX001234",
                  productMfg: "NVIDIA",
                  productName: "DGX H100",
                  productSerial: "DGX-H100-001",
                },
              },
            },
          ],
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const parsed = parse("ibdiagnet --detailed");
      const result = simulator.executeIbdiagnet(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("400 Gb/s (NDR)");
      expect(result.output).not.toContain("400 Gb/s (HDR)");
    });

    it("should label 200 Gb/s as HDR in detailed ibdiagnet output", () => {
      // Default mock already has rate: "200" but we need numeric rate
      vi.mocked(useSimulationStore.getState).mockReturnValue({
        cluster: {
          nodes: [
            {
              id: "dgx-00",
              hostname: "dgx-node01",
              systemType: "A100",
              healthStatus: "OK",
              nvidiaDriverVersion: "535.129.03",
              cudaVersion: "12.2",
              gpus: [],
              hcas: [
                {
                  caType: "mlx5_0",
                  firmwareVersion: "20.35.1012",
                  ports: [
                    {
                      portNumber: 1,
                      state: "Active",
                      physicalState: "LinkUp",
                      rate: 200,
                      lid: 123,
                      guid: "0x506b4b0300ab1234",
                      linkLayer: "InfiniBand",
                      errors: {
                        symbolErrors: 0,
                        linkDowned: 0,
                        portRcvErrors: 0,
                        portXmitDiscards: 0,
                        portXmitWait: 0,
                      },
                    },
                  ],
                },
              ],
              bmc: {
                sensors: [],
                systemPower: "on",
                chassisStatus: {
                  powerOn: true,
                  powerFault: false,
                  interlock: false,
                  overload: false,
                  cooling: "ok",
                },
                sel: [],
                fru: {
                  chassisType: "Rack Mount Chassis",
                  chassisSerial: "DGX-001",
                  boardMfg: "NVIDIA",
                  boardProduct: "DGX A100",
                  boardSerial: "PGX001234",
                  productMfg: "NVIDIA",
                  productName: "DGX A100",
                  productSerial: "DGX-A100-001",
                },
              },
            },
          ],
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const parsed = parse("ibdiagnet --detailed");
      const result = simulator.executeIbdiagnet(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("200 Gb/s (HDR)");
      expect(result.output).not.toContain("200 Gb/s (NDR)");
    });

    it("should label 800 Gb/s as XDR in detailed ibdiagnet output", () => {
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
              gpus: [],
              hcas: [
                {
                  caType: "mlx5_0",
                  firmwareVersion: "20.35.1012",
                  ports: [
                    {
                      portNumber: 1,
                      state: "Active",
                      physicalState: "LinkUp",
                      rate: 800,
                      lid: 123,
                      guid: "0x506b4b0300ab1234",
                      linkLayer: "InfiniBand",
                      errors: {
                        symbolErrors: 0,
                        linkDowned: 0,
                        portRcvErrors: 0,
                        portXmitDiscards: 0,
                        portXmitWait: 0,
                      },
                    },
                  ],
                },
              ],
              bmc: {
                sensors: [],
                systemPower: "on",
                chassisStatus: {
                  powerOn: true,
                  powerFault: false,
                  interlock: false,
                  overload: false,
                  cooling: "ok",
                },
                sel: [],
                fru: {
                  chassisType: "Rack Mount Chassis",
                  chassisSerial: "DGX-001",
                  boardMfg: "NVIDIA",
                  boardProduct: "DGX H100",
                  boardSerial: "PGX001234",
                  productMfg: "NVIDIA",
                  productName: "DGX H100",
                  productSerial: "DGX-H100-001",
                },
              },
            },
          ],
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const parsed = parse("ibdiagnet --detailed");
      const result = simulator.executeIbdiagnet(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("800 Gb/s (XDR)");
    });
  });
});
