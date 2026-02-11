import type { CommandResult, CommandContext } from "@/types/commands";
import type { ParsedCommand } from "@/utils/commandParser";
import {
  BaseSimulator,
  type SimulatorMetadata,
} from "@/simulators/BaseSimulator";

/**
 * Maps InfiniBand link rate (Gb/s) to the correct standard name.
 * - QDR = 40 Gb/s (10 Gb/s per lane x 4)
 * - FDR = 56 Gb/s (14 Gb/s per lane x 4)
 * - EDR = 100 Gb/s (25 Gb/s per lane x 4)
 * - HDR = 200 Gb/s (50 Gb/s per lane x 4)
 * - NDR = 400 Gb/s (100 Gb/s per lane x 4)
 * - XDR = 800 Gb/s (200 Gb/s per lane x 4)
 */
export function getIBStandardName(rateGbps: number): string {
  if (rateGbps >= 800) return "XDR";
  if (rateGbps >= 400) return "NDR";
  if (rateGbps >= 200) return "HDR";
  if (rateGbps >= 100) return "EDR";
  if (rateGbps >= 56) return "FDR";
  return "QDR";
}

/**
 * InfiniBand Simulator
 *
 * Handles multiple InfiniBand diagnostic commands: ibstat, ibportstate, ibporterrors,
 * iblinkinfo, perfquery, ibdiagnet
 */
export class InfiniBandSimulator extends BaseSimulator {
  constructor() {
    super();
    this.initializeDefinitionRegistry();
  }

  getMetadata(): SimulatorMetadata {
    return {
      name: "infiniband-tools",
      version: "5.9-0",
      description: "InfiniBand Diagnostic Tools",
      commands: [],
    };
  }

  execute(_parsed: ParsedCommand, _context: CommandContext): CommandResult {
    return this.createError(
      "Use specific InfiniBand commands: ibstat, ibportstate, ibporterrors, iblinkinfo, perfquery, ibdiagnet",
    );
  }

  private getNode(context: CommandContext) {
    return this.resolveNode(context);
  }

  /**
   * ibstat - Display HCA status
   */
  executeIbstat(parsed: ParsedCommand, context: CommandContext): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ibstat") ||
        this.createSuccess(`Usage: ibstat [options] [<ca_name>] [portnum]
Options:
  -d, --debug          increase debug level
  -l, --list_of_cas    list all CA names
  -s, --short          short output
  -p, --port_list      show port list
  -V, --version        show version
  -h, --help           show this help`)
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("ibstat 5.9-0");
    }

    const node = this.getNode(context);
    if (!node) {
      return this.createError("Error: Unable to determine current node");
    }

    if (node.hcas.length === 0) {
      return this.createError("No InfiniBand HCAs found");
    }

    let output = "";
    node.hcas.forEach((hca, idx) => {
      if (idx > 0) output += "\n";
      const deviceId = hca.caType.includes("ConnectX-7") ? "MT4129" : "MT4123";
      output += `CA '${hca.caType}'\n`;
      output += `\tCA type: ${deviceId}\n`;
      output += `\tNumber of ports: ${hca.ports.length}\n`;
      output += `\tFirmware version: ${hca.firmwareVersion}\n`;
      output += `\tHardware version: 0\n`;
      output += `\tNode GUID: ${hca.ports[0]?.guid}\n`;
      output += `\tSystem image GUID: ${hca.ports[0]?.guid}\n`;

      hca.ports.forEach((port) => {
        output += `\tPort ${port.portNumber}:\n`;
        output += `\t\tState: ${port.state}\n`;
        output += `\t\tPhysical state: ${port.physicalState}\n`;
        output += `\t\tRate: ${port.rate} Gb/s (${getIBStandardName(port.rate)})\n`;
        output += `\t\tBase lid: ${port.lid}\n`;
        output += `\t\tLMC: 0\n`;
        output += `\t\tSM lid: 1\n`;
        output += `\t\tCapability mask: 0x04010000\n`;
        output += `\t\tPort GUID: ${port.guid}\n`;
        output += `\t\tLink layer: ${port.linkLayer}\n`;
      });
    });

    return this.createSuccess(output);
  }

  /**
   * ibportstate - Get port state
   */
  executeIbportstate(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ibportstate") ||
        this.createSuccess(`Usage: ibportstate [options] <lid|guid> <portnum>
Options:
  -d, --debug          increase debug level
  -V, --version        show version
  -h, --help           show this help`)
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("ibportstate 5.9-0");
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError("Error: No HCA found");
    }

    const port = node.hcas[0].ports[0];
    const output =
      `Port ${port.portNumber} State: ${port.state}\n` +
      `Physical Port State: ${port.physicalState}\n`;

    return this.createSuccess(output);
  }

  /**
   * ibporterrors - Show port error counters
   */
  executeIbporterrors(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ibporterrors") ||
        this.createSuccess(`Usage: ibporterrors [options]
Options:
  -C, --Ca <ca>        CA name
  -P, --Port <port>    port number
  -c, --clear          clear errors after read
  -V, --version        show version
  -h, --help           show this help`)
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("ibporterrors 5.9-0");
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError("Error: No HCA found");
    }

    let output = "Errors for:\n";
    node.hcas.forEach((hca) => {
      hca.ports.forEach((port) => {
        output += `  Port ${port.portNumber} (lid ${port.lid}):\n`;
        output += `    SymbolErrors:            ${port.errors.symbolErrors}\n`;
        output += `    LinkDowned:              ${port.errors.linkDowned}\n`;
        output += `    PortRcvErrors:           ${port.errors.portRcvErrors}\n`;
        output += `    PortXmitDiscards:        ${port.errors.portXmitDiscards}\n`;
        output += `    PortXmitWait:            ${port.errors.portXmitWait}\n`;

        if (port.errors.symbolErrors > 0) {
          output += `    \x1b[33m⚠ Warning: Symbol errors detected - check cable quality\x1b[0m\n`;
        }
        if (port.errors.linkDowned > 0) {
          output += `    \x1b[31m⚠ Critical: Link has gone down ${port.errors.linkDowned} times\x1b[0m\n`;
        }
      });
    });

    return this.createSuccess(output);
  }

  /**
   * iblinkinfo - Show link information
   */
  executeIblinkinfo(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("iblinkinfo") ||
        this.createSuccess(`Usage: iblinkinfo [options]
Options:
  -v, --verbose        verbose output
  -l, --line           line format
  -R, --GNDN           include switches with no link down
  -V, --version        show version
  -h, --help           show this help`)
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("iblinkinfo 5.9-0");
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError("Error: No HCA found");
    }

    const verbose = this.hasAnyFlag(parsed, ["v", "verbose"]);

    let output = `InfiniBand Link Information:\n\n`;

    node.hcas.forEach((hca) => {
      hca.ports.forEach((port) => {
        output += `CA: ${hca.caType}\n`;
        output += `      ${port.guid}\n`;
        output += `         port ${port.portNumber} lid ${port.lid} lmc 0 ${port.state} ${port.rate} Gb/s ${getIBStandardName(port.rate)} (${port.linkLayer})\n`;

        if (verbose) {
          output += `         Link errors:\n`;
          output += `           Symbol errors:      ${port.errors.symbolErrors}\n`;
          output += `           Link downed:        ${port.errors.linkDowned}\n`;
          output += `           Receive errors:     ${port.errors.portRcvErrors}\n`;
        }
      });
    });

    return this.createSuccess(output);
  }

  /**
   * perfquery - Query performance counters
   */
  executePerfquery(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("perfquery") ||
        this
          .createSuccess(`Usage: perfquery [options] [<lid|guid> [[port(s)] [reset_mask]]]
Options:
  -x, --extended       extended counters
  -X, --xmtsl          transmit data
  -r, --reset          reset after read
  -V, --version        show version
  -h, --help           show this help`)
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("perfquery 5.9-0");
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError("Error: No HCA found");
    }

    const port = node.hcas[0].ports[0];

    // Deterministic counters based on port LID (consistent across invocations)
    const seed = port.lid * 7919; // prime multiplier for spread
    const xmitData = 500000000 + (seed % 500000000);
    const rcvData = 450000000 + ((seed * 3) % 500000000);
    const xmitPkts = 5000000 + (seed % 5000000);
    const rcvPkts = 4800000 + ((seed * 3) % 5000000);

    const output =
      `# Port counters: Lid ${port.lid} port ${port.portNumber}\n` +
      `PortSelect:......................${port.portNumber}\n` +
      `PortXmitData:....................${xmitData}\n` +
      `PortRcvData:.....................${rcvData}\n` +
      `PortXmitPkts:....................${xmitPkts}\n` +
      `PortRcvPkts:.....................${rcvPkts}\n` +
      `PortUnicastXmitPkts:.............${xmitPkts}\n` +
      `PortUnicastRcvPkts:..............${rcvPkts}\n` +
      `PortMulticastXmitPkts:...........0\n` +
      `PortMulticastRcvPkts:............0\n` +
      `SymbolErrorCounter:..............${port.errors.symbolErrors}\n` +
      `LinkErrorRecoveryCounter:........0\n` +
      `LinkDownedCounter:...............${port.errors.linkDowned}\n` +
      `PortRcvErrors:...................${port.errors.portRcvErrors}\n` +
      `PortRcvRemotePhysicalErrors:.....0\n` +
      `PortRcvSwitchRelayErrors:........0\n` +
      `PortXmitDiscards:................${port.errors.portXmitDiscards}\n` +
      `PortXmitConstraintErrors:........0\n` +
      `PortRcvConstraintErrors:.........0\n` +
      `LocalLinkIntegrityErrors:........0\n` +
      `ExcessiveBufferOverrunErrors:....0\n` +
      `VL15Dropped:.....................0\n` +
      `PortXmitWait:....................${port.errors.portXmitWait}\n`;

    return this.createSuccess(output);
  }

  /**
   * ibdiagnet - Full fabric diagnostic with optional signal quality metrics
   */
  executeIbdiagnet(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ibdiagnet") ||
        this.createSuccess(`Usage: ibdiagnet [options]
Options:
  -o, --output <dir>   output directory
  -t, --topo <file>    topology file
  -p, --port <num>     port number
  --skip <checks>      skip specific checks
  --detailed           show detailed signal quality metrics
  --signal-quality     show signal quality metrics
  -V, --version        show version
  -h, --help           show this help`)
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("ibdiagnet 2.9.0");
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError("Error: No HCA found");
    }

    const detailed = this.hasAnyFlag(parsed, [
      "detailed",
      "d",
      "signal-quality",
    ]);

    let output =
      `\n-I- Using port 1 as the local port\n` +
      `-I- Discovering ... \n` +
      `-I- Discovering done\n` +
      `-I- # of nodes: ${node.hcas.length}\n` +
      `-I- # of links: ${node.hcas.length}\n` +
      `-I- # of CAs: ${node.hcas.length}\n` +
      `-I- # of switches: 0\n` +
      `-I- Checking fabric health...\n`;

    if (detailed) {
      output += `-I- Running signal quality checks...\n\n`;
      output += `Cable Validation Report - ${node.hostname}\n`;
      output += `${"=".repeat(60)}\n\n`;

      node.hcas.forEach((hca, idx) => {
        output += `Port ${idx + 1}: ${hca.ports[0]?.guid || "unknown"}\n`;
        output += `  Cable Type: QSFP-DD AOC\n`;
        output += `  Cable Length: 5m\n`;
        output += `  Link State: ${hca.ports[0]?.state || "Active"}\n`;
        const portRate = hca.ports[0]?.rate || 400;
        output += `  Link Speed: ${portRate} Gb/s (${getIBStandardName(portRate)})\n`;

        // Add signal quality metrics
        const rxPower = -2.5 + Math.random() * 0.5; // -2.5 to -2.0 dBm
        const txPower = -1.8 + Math.random() * 0.3; // -1.8 to -1.5 dBm
        const ber = Math.random() * 1e-12; // Bit Error Rate
        const snr = 25 + Math.random() * 5; // Signal-to-Noise Ratio 25-30 dB

        output += `\n  Signal Quality Metrics:\n`;
        output += `    RX Power: ${rxPower.toFixed(2)} dBm (Normal: -3.0 to -1.5)\n`;
        output += `    TX Power: ${txPower.toFixed(2)} dBm (Normal: -2.0 to -1.0)\n`;
        output += `    Bit Error Rate: ${ber.toExponential(2)} (Threshold: < 1e-9)\n`;
        output += `    SNR: ${snr.toFixed(1)} dB (Normal: > 20 dB)\n`;
        output += `    Eye Opening: 95% (Normal: > 80%)\n`;
        output += `    Status: ${rxPower > -3 && ber < 1e-9 && snr > 20 ? "✓ PASS" : "✗ FAIL"}\n`;
        output += `\n`;
      });
    }

    output += `-I- Fabric health check completed\n`;
    output += `-I- No errors found\n`;
    output += `-I- See report in /tmp/ibdiagnet2\n`;

    return this.createSuccess(output);
  }

  /**
   * ibnetdiscover - Discover InfiniBand fabric topology
   */
  executeIbnetdiscover(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ibnetdiscover") ||
        this.createSuccess(`Usage: ibnetdiscover [options]
Options:
  -l, --list           list of connected endpoints
  -g, --grouping       group by switch
  -s, --switch <lid>   show only switch with specified lid
  -H, --Hca_list       list of HCAs only
  -S, --Switch_list    list of switches only
  -p, --ports          show port connections
  -R, --GNDN           show all nodes (including those with no desc)
  -o, --output <file>  output to file
  -V, --version        show version
  -h, --help           show this help`)
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("ibnetdiscover 5.9-0");
    }

    const nodes = this.resolveAllNodes(context);

    const hcaOnly = this.hasAnyFlag(parsed, ["H", "Hca_list"]);
    const switchOnly = this.hasAnyFlag(parsed, ["S", "Switch_list"]);
    const showPorts = this.hasAnyFlag(parsed, ["p", "ports"]);

    // Derive switch model from cluster's actual HCA port rate
    const portRate = nodes[0]?.hcas?.[0]?.ports?.[0]?.rate || 400;
    const switchModel =
      portRate >= 800
        ? "QM9790"
        : portRate >= 400
          ? "QM9700"
          : portRate >= 200
            ? "QM8790"
            : "QM8700";

    let output = `#\n`;
    output += `# Topology file: generated by ibnetdiscover\n`;
    output += `#\n`;
    output += `# Topology discovery for fabric (DGX Cluster)\n`;
    output += `#\n\n`;

    // Generate switch entries (rail-optimized spine/leaf architecture)
    if (!hcaOnly) {
      const numSpineSwitches = 4;
      const numLeafSwitches = nodes[0]?.hcas?.length || 8;

      output += `# Spine Switches\n`;
      for (let i = 0; i < numSpineSwitches; i++) {
        const switchGuid = `0x${(0x1000 + i).toString(16).padStart(16, "0")}`;
        output += `Switch\t64 "${switchGuid}"\t# "${switchModel}/Spine-${i}" enhanced port 0 lid ${10 + i}\n`;

        if (showPorts) {
          for (let j = 0; j < numLeafSwitches; j++) {
            const leafGuid = `0x${(0x2000 + j).toString(16).padStart(16, "0")}`;
            output += `[${j + 1}]\t"${leafGuid}"[${(i % 18) + 1}]\t\t# "${switchModel}/Rail-${j}" lid ${20 + j}\n`;
          }
        }
        output += "\n";
      }

      output += `# Leaf (Rail) Switches\n`;
      for (let i = 0; i < numLeafSwitches; i++) {
        const switchGuid = `0x${(0x2000 + i).toString(16).padStart(16, "0")}`;
        output += `Switch\t64 "${switchGuid}"\t# "${switchModel}/Rail-${i}" enhanced port 0 lid ${20 + i}\n`;

        if (showPorts) {
          for (let j = 0; j < numSpineSwitches; j++) {
            const spineGuid = `0x${(0x1000 + j).toString(16).padStart(16, "0")}`;
            output += `[${j + 1}]\t"${spineGuid}"[${i + 1}]\t\t# "${switchModel}/Spine-${j}" lid ${10 + j}\n`;
          }

          nodes.forEach((node, nodeIdx) => {
            const hca = node.hcas[i];
            if (hca) {
              output += `[${numSpineSwitches + nodeIdx + 1}]\t"${hca.ports[0]?.guid}"[1]\t\t# "${node.hostname}" HCA-${i}\n`;
            }
          });
        }
        output += "\n";
      }
    }

    // Generate HCA entries
    if (!switchOnly) {
      output += `# Channel Adapters (HCAs)\n`;
      nodes.forEach((node, nodeIdx) => {
        node.hcas.forEach((hca, hcaIdx) => {
          output += `Ca\t${hca.ports.length} "${hca.ports[0]?.guid}"\t# "${node.hostname}/${hca.caType}" Rail-${hcaIdx}\n`;

          if (showPorts) {
            hca.ports.forEach((port) => {
              const switchGuid = `0x${(0x2000 + hcaIdx).toString(16).padStart(16, "0")}`;
              output += `[${port.portNumber}](${hca.ports[0]?.guid})\t"${switchGuid}"[${nodeIdx + 5}]\t\t# lid ${port.lid} lmc 0 "${node.hostname}" ${port.state}\n`;
            });
          }
          output += "\n";
        });
      });
    }

    // Summary
    output += `#\n`;
    output += `# Summary:\n`;
    output += `#   ${nodes.reduce((sum, n) => sum + n.hcas.length, 0)} HCAs\n`;
    output += `#   ${4 + (nodes[0]?.hcas?.length || 8)} Switches (4 spine + ${nodes[0]?.hcas?.length || 8} rail)\n`;
    output += `#   ${nodes.reduce((sum, n) => sum + n.hcas.reduce((s, h) => s + h.ports.length, 0), 0)} Ports\n`;
    output += `#\n`;

    return this.createSuccess(output);
  }

  /**
   * ibdev2netdev - Show IB device to network interface mapping
   * Per spec Section 5.1: Network device mapping
   */
  executeIbdev2netdev(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ibdev2netdev") ||
        this.createSuccess(`Usage: ibdev2netdev [options]
Options:
  -v, --verbose        verbose output with PCI addresses
  -h, --help           show this help`)
      );
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError("No InfiniBand HCAs found");
    }

    const verbose = this.hasAnyFlag(parsed, ["v", "verbose"]);
    let output = "";

    node.hcas.forEach((hca, idx) => {
      hca.ports.forEach((port) => {
        const netdev = `ib${idx}`;
        const pciAddr = `0000:a${idx}:00.0`; // Simulated PCI address

        if (verbose) {
          // Per spec verbose format: mlx5_0 (0000:a3:00.0) port 1 ==> ib0 (Up)
          output += `${hca.caType} (${pciAddr}) port ${port.portNumber} ==> ${netdev} (${port.state === "Active" ? "Up" : "Down"})\n`;
        } else {
          // Standard format: mlx5_0 port 1 ==> ib0 (Up)
          output += `${hca.caType} port ${port.portNumber} ==> ${netdev} (${port.state === "Active" ? "Up" : "Down"})\n`;
        }
      });
    });

    return this.createSuccess(output);
  }
}
