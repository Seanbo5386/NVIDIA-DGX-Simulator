import type { CommandResult, CommandContext } from '@/types/commands';
import type { ParsedCommand } from '@/utils/commandParser';
import { BaseSimulator, type SimulatorMetadata } from '@/simulators/BaseSimulator';
import { useSimulationStore } from '@/store/simulationStore';

/**
 * InfiniBand Simulator
 * 
 * Handles multiple InfiniBand diagnostic commands: ibstat, ibportstate, ibporterrors, 
 * iblinkinfo, perfquery, ibdiagnet
 */
export class InfiniBandSimulator extends BaseSimulator {
  constructor() {
    super();
  }

  getMetadata(): SimulatorMetadata {
    return {
      name: 'infiniband-tools',
      version: '5.9-0',
      description: 'InfiniBand Diagnostic Tools',
      commands: [],
    };
  }

  execute(_parsed: ParsedCommand, _context: CommandContext): CommandResult {
    return this.createError('Use specific InfiniBand commands: ibstat, ibportstate, ibporterrors, iblinkinfo, perfquery, ibdiagnet');
  }

  private getNode(context: CommandContext) {
    const state = useSimulationStore.getState();
    return state.cluster.nodes.find(n => n.id === context.currentNode);
  }

  /**
   * ibstat - Display HCA status
   */
  executeIbstat(parsed: ParsedCommand, context: CommandContext): CommandResult {
    if (this.hasAnyFlag(parsed, ['help', 'h'])) {
      let output = `Usage: ibstat [options] [<ca_name>] [portnum]\n`;
      output += `Options:\n`;
      output += `  -d, --debug          increase debug level\n`;
      output += `  -l, --list_of_cas    list all CA names\n`;
      output += `  -s, --short          short output\n`;
      output += `  -p, --port_list      show port list\n`;
      output += `  -V, --version        show version\n`;
      output += `  -h, --help           show this help\n`;
      return this.createSuccess(output);
    }

    if (this.hasAnyFlag(parsed, ['version', 'V'])) {
      return this.createSuccess('ibstat 5.9-0');
    }

    const node = this.getNode(context);
    if (!node) {
      return this.createError('Error: Unable to determine current node');
    }

    if (node.hcas.length === 0) {
      return this.createError('No InfiniBand HCAs found');
    }

    let output = '';
    node.hcas.forEach((hca, idx) => {
      if (idx > 0) output += '\n';
      output += `CA '${hca.caType}'\n`;
      output += `\tCA type: MT4123\n`;
      output += `\tNumber of ports: ${hca.ports.length}\n`;
      output += `\tFirmware version: ${hca.firmwareVersion}\n`;
      output += `\tHardware version: 0\n`;
      output += `\tNode GUID: 0x${hca.ports[0]?.guid}\n`;
      output += `\tSystem image GUID: 0x${hca.ports[0]?.guid}\n`;

      hca.ports.forEach(port => {
        output += `\tPort ${port.portNumber}:\n`;
        output += `\t\tState: ${port.state}\n`;
        output += `\t\tPhysical state: ${port.physicalState}\n`;
        output += `\t\tRate: ${port.rate}\n`;
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
  executeIbportstate(parsed: ParsedCommand, context: CommandContext): CommandResult {
    if (this.hasAnyFlag(parsed, ['help', 'h'])) {
      let output = `Usage: ibportstate [options] <lid|guid> <portnum>\n`;
      output += `Options:\n`;
      output += `  -d, --debug          increase debug level\n`;
      output += `  -V, --version        show version\n`;
      output += `  -h, --help           show this help\n`;
      return this.createSuccess(output);
    }

    if (this.hasAnyFlag(parsed, ['version', 'V'])) {
      return this.createSuccess('ibportstate 5.9-0');
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError('Error: No HCA found');
    }

    const port = node.hcas[0].ports[0];
    const output = `Port ${port.portNumber} State: ${port.state}\n` +
      `Physical Port State: ${port.physicalState}\n`;

    return this.createSuccess(output);
  }

  /**
   * ibporterrors - Show port error counters
   */
  executeIbporterrors(parsed: ParsedCommand, context: CommandContext): CommandResult {
    if (this.hasAnyFlag(parsed, ['help', 'h'])) {
      let output = `Usage: ibporterrors [options]\n`;
      output += `Options:\n`;
      output += `  -C, --Ca <ca>        CA name\n`;
      output += `  -P, --Port <port>    port number\n`;
      output += `  -c, --clear          clear errors after read\n`;
      output += `  -V, --version        show version\n`;
      output += `  -h, --help           show this help\n`;
      return this.createSuccess(output);
    }

    if (this.hasAnyFlag(parsed, ['version', 'V'])) {
      return this.createSuccess('ibporterrors 5.9-0');
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError('Error: No HCA found');
    }

    let output = 'Errors for:\n';
    node.hcas.forEach((hca) => {
      hca.ports.forEach(port => {
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
  executeIblinkinfo(parsed: ParsedCommand, context: CommandContext): CommandResult {
    if (this.hasAnyFlag(parsed, ['help', 'h'])) {
      let output = `Usage: iblinkinfo [options]\n`;
      output += `Options:\n`;
      output += `  -v, --verbose        verbose output\n`;
      output += `  -l, --line           line format\n`;
      output += `  -R, --GNDN           include switches with no link down\n`;
      output += `  -V, --version        show version\n`;
      output += `  -h, --help           show this help\n`;
      return this.createSuccess(output);
    }

    if (this.hasAnyFlag(parsed, ['version', 'V'])) {
      return this.createSuccess('iblinkinfo 5.9-0');
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError('Error: No HCA found');
    }

    const verbose = this.hasAnyFlag(parsed, ['v', 'verbose']);

    let output = `InfiniBand Link Information:\n\n`;

    node.hcas.forEach((hca) => {
      hca.ports.forEach(port => {
        output += `CA: ${hca.caType}\n`;
        output += `      ${port.guid}\n`;
        output += `         port ${port.portNumber} lid ${port.lid} lmc 0 ${port.state} ${port.rate}Gb (${port.linkLayer})\n`;

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
  executePerfquery(parsed: ParsedCommand, context: CommandContext): CommandResult {
    if (this.hasAnyFlag(parsed, ['help', 'h'])) {
      let output = `Usage: perfquery [options] [<lid|guid> [[port(s)] [reset_mask]]]\n`;
      output += `Options:\n`;
      output += `  -x, --extended       extended counters\n`;
      output += `  -X, --xmtsl          transmit data\n`;
      output += `  -r, --reset          reset after read\n`;
      output += `  -V, --version        show version\n`;
      output += `  -h, --help           show this help\n`;
      return this.createSuccess(output);
    }

    if (this.hasAnyFlag(parsed, ['version', 'V'])) {
      return this.createSuccess('perfquery 5.9-0');
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError('Error: No HCA found');
    }

    const port = node.hcas[0].ports[0];

    const output = `# Port counters: Lid ${port.lid} port ${port.portNumber}\n` +
      `PortSelect:......................${port.portNumber}\n` +
      `PortXmitData:....................${Math.floor(Math.random() * 1000000000)}\n` +
      `PortRcvData:.....................${Math.floor(Math.random() * 1000000000)}\n` +
      `PortXmitPkts:....................${Math.floor(Math.random() * 10000000)}\n` +
      `PortRcvPkts:.....................${Math.floor(Math.random() * 10000000)}\n` +
      `PortUnicastXmitPkts:.............${Math.floor(Math.random() * 10000000)}\n` +
      `PortUnicastRcvPkts:..............${Math.floor(Math.random() * 10000000)}\n` +
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
   * ibdiagnet - Full fabric diagnostic
   */
  executeIbdiagnet(parsed: ParsedCommand, context: CommandContext): CommandResult {
    if (this.hasAnyFlag(parsed, ['help', 'h'])) {
      let output = `Usage: ibdiagnet [options]\n`;
      output += `Options:\n`;
      output += `  -o, --output <dir>   output directory\n`;
      output += `  -t, --topo <file>    topology file\n`;
      output += `  -p, --port <num>     port number\n`;
      output += `  --skip <checks>      skip specific checks\n`;
      output += `  -V, --version        show version\n`;
      output += `  -h, --help           show this help\n`;
      return this.createSuccess(output);
    }

    if (this.hasAnyFlag(parsed, ['version', 'V'])) {
      return this.createSuccess('ibdiagnet 2.9.0');
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError('Error: No HCA found');
    }

    const output = `\n-I- Using port 1 as the local port\n` +
      `-I- Discovering ... \n` +
      `-I- Discovering done\n` +
      `-I- # of nodes: ${node.hcas.length}\n` +
      `-I- # of links: ${node.hcas.length}\n` +
      `-I- # of CAs: ${node.hcas.length}\n` +
      `-I- # of switches: 0\n` +
      `-I- Checking fabric health...\n` +
      `-I- Fabric health check completed\n` +
      `-I- No errors found\n` +
      `-I- See report in /tmp/ibdiagnet2\n`;

    return this.createSuccess(output);
  }

  /**
   * ibnetdiscover - Discover InfiniBand fabric topology
   */
  executeIbnetdiscover(parsed: ParsedCommand, _context: CommandContext): CommandResult {
    if (this.hasAnyFlag(parsed, ['help', 'h'])) {
      let output = `Usage: ibnetdiscover [options]\n`;
      output += `Options:\n`;
      output += `  -l, --list           list of connected endpoints\n`;
      output += `  -g, --grouping       group by switch\n`;
      output += `  -s, --switch <lid>   show only switch with specified lid\n`;
      output += `  -H, --Hca_list       list of HCAs only\n`;
      output += `  -S, --Switch_list    list of switches only\n`;
      output += `  -p, --ports          show port connections\n`;
      output += `  -R, --GNDN           show all nodes (including those with no desc)\n`;
      output += `  -o, --output <file>  output to file\n`;
      output += `  -V, --version        show version\n`;
      output += `  -h, --help           show this help\n`;
      return this.createSuccess(output);
    }

    if (this.hasAnyFlag(parsed, ['version', 'V'])) {
      return this.createSuccess('ibnetdiscover 5.9-0');
    }

    const state = useSimulationStore.getState();
    const nodes = state.cluster.nodes;

    const hcaOnly = this.hasAnyFlag(parsed, ['H', 'Hca_list']);
    const switchOnly = this.hasAnyFlag(parsed, ['S', 'Switch_list']);
    const showPorts = this.hasAnyFlag(parsed, ['p', 'ports']);

    let output = `#\n`;
    output += `# Topology file: generated by ibnetdiscover\n`;
    output += `#\n`;
    output += `# Topology discovery for fabric (DGX Cluster)\n`;
    output += `#\n\n`;

    // Generate switch entries (simulated spine/leaf architecture)
    if (!hcaOnly) {
      const numSpineSwitches = 2;
      const numLeafSwitches = Math.ceil(nodes.length / 4);

      output += `# Spine Switches\n`;
      for (let i = 0; i < numSpineSwitches; i++) {
        const switchGuid = `0x${(0x1000 + i).toString(16).padStart(16, '0')}`;
        output += `Switch\t36 "${switchGuid}"\t# "MQM8700/Spine-${i}" enhanced port 0 lid ${10 + i}\n`;

        if (showPorts) {
          for (let j = 0; j < numLeafSwitches; j++) {
            const leafGuid = `0x${(0x2000 + j).toString(16).padStart(16, '0')}`;
            output += `[${j + 1}]\t"${leafGuid}"[${(i % 18) + 1}]\t\t# "MQM8700/Leaf-${j}" lid ${20 + j}\n`;
          }
        }
        output += '\n';
      }

      output += `# Leaf Switches\n`;
      for (let i = 0; i < numLeafSwitches; i++) {
        const switchGuid = `0x${(0x2000 + i).toString(16).padStart(16, '0')}`;
        output += `Switch\t36 "${switchGuid}"\t# "MQM8700/Leaf-${i}" enhanced port 0 lid ${20 + i}\n`;

        if (showPorts) {
          // Connect to spine switches
          for (let j = 0; j < numSpineSwitches; j++) {
            const spineGuid = `0x${(0x1000 + j).toString(16).padStart(16, '0')}`;
            output += `[${j + 1}]\t"${spineGuid}"[${i + 1}]\t\t# "MQM8700/Spine-${j}" lid ${10 + j}\n`;
          }

          // Connect to HCAs on nodes assigned to this leaf
          const nodesOnLeaf = nodes.slice(i * 4, (i + 1) * 4);
          nodesOnLeaf.forEach((node, nodeIdx) => {
            node.hcas.forEach((hca, hcaIdx) => {
              output += `[${numSpineSwitches + nodeIdx * 8 + hcaIdx + 1}]\t"${hca.ports[0]?.guid}"[1]\t\t# "${node.hostname}" HCA-${hcaIdx}\n`;
            });
          });
        }
        output += '\n';
      }
    }

    // Generate HCA entries
    if (!switchOnly) {
      output += `# Channel Adapters (HCAs)\n`;
      nodes.forEach((node, nodeIdx) => {
        node.hcas.forEach((hca, hcaIdx) => {
          output += `Ca\t${hca.ports.length} "${hca.ports[0]?.guid}"\t# "${node.hostname}/${hca.caType}"\n`;

          if (showPorts) {
            hca.ports.forEach(port => {
              const leafIdx = Math.floor(nodeIdx / 4);
              const switchGuid = `0x${(0x2000 + leafIdx).toString(16).padStart(16, '0')}`;
              const switchPort = (nodeIdx % 4) * 8 + hcaIdx + 1;
              output += `[${port.portNumber}](${hca.ports[0]?.guid})\t"${switchGuid}"[${switchPort}]\t\t# lid ${port.lid} lmc 0 "${node.hostname}" ${port.state}\n`;
            });
          }
          output += '\n';
        });
      });
    }

    // Summary
    output += `#\n`;
    output += `# Summary:\n`;
    output += `#   ${nodes.reduce((sum, n) => sum + n.hcas.length, 0)} HCAs\n`;
    output += `#   ${Math.ceil(nodes.length / 4) + 2} Switches\n`;
    output += `#   ${nodes.reduce((sum, n) => sum + n.hcas.reduce((s, h) => s + h.ports.length, 0), 0)} Ports\n`;
    output += `#\n`;

    return this.createSuccess(output);
  }

  /**
   * ibdev2netdev - Show IB device to network interface mapping
   * Per spec Section 5.1: Network device mapping
   */
  executeIbdev2netdev(parsed: ParsedCommand, context: CommandContext): CommandResult {
    if (this.hasAnyFlag(parsed, ['help', 'h'])) {
      let output = `Usage: ibdev2netdev [options]\n`;
      output += `Options:\n`;
      output += `  -v, --verbose        verbose output with PCI addresses\n`;
      output += `  -h, --help           show this help\n`;
      return this.createSuccess(output);
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError('No InfiniBand HCAs found');
    }

    const verbose = this.hasAnyFlag(parsed, ['v', 'verbose']);
    let output = '';

    node.hcas.forEach((hca, idx) => {
      hca.ports.forEach(port => {
        const netdev = `ib${idx}`;
        const pciAddr = `0000:a${idx}:00.0`;  // Simulated PCI address

        if (verbose) {
          // Per spec verbose format: mlx5_0 (0000:a3:00.0) port 1 ==> ib0 (Up)
          output += `${hca.caType} (${pciAddr}) port ${port.portNumber} ==> ${netdev} (${port.state === 'Active' ? 'Up' : 'Down'})\n`;
        } else {
          // Standard format: mlx5_0 port 1 ==> ib0 (Up)
          output += `${hca.caType} port ${port.portNumber} ==> ${netdev} (${port.state === 'Active' ? 'Up' : 'Down'})\n`;
        }
      });
    });

    return this.createSuccess(output);
  }
}
