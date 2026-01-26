import type { CommandResult, CommandContext } from '@/types/commands';
import type { ParsedCommand } from '@/utils/commandParser';
import { BaseSimulator, type SimulatorMetadata } from '@/simulators/BaseSimulator';
import { useSimulationStore } from '@/store/simulationStore';

/**
 * NVIDIA Fabric Manager Simulator
 *
 * Simulates nv-fabricmanager CLI for managing NVSwitch fabric topology.
 * Used for DGX systems with NVSwitch interconnects.
 */
export class FabricManagerSimulator extends BaseSimulator {
  constructor() {
    super();
  }

  getMetadata(): SimulatorMetadata {
    return {
      name: 'nv-fabricmanager',
      version: '535.104.05',
      description: 'NVIDIA Fabric Manager CLI',
      commands: [
        'nv-fabricmanager',
      ],
    };
  }

  execute(parsed: ParsedCommand, context: CommandContext): CommandResult {
    // Main command handler
    if (this.hasAnyFlag(parsed, ['help', 'h'])) {
      return this.showHelp();
    }

    if (this.hasAnyFlag(parsed, ['version', 'v'])) {
      return this.showVersion();
    }

    const subcommand = parsed.args[0];

    switch (subcommand) {
      case 'status':
        return this.executeStatus(parsed, context);
      case 'query':
        return this.executeQuery(parsed, context);
      case 'start':
        return this.executeStart(parsed, context);
      case 'stop':
        return this.executeStop(parsed, context);
      case 'restart':
        return this.executeRestart(parsed, context);
      case 'config':
        return this.executeConfig(parsed, context);
      case 'diag':
        return this.executeDiag(parsed, context);
      case 'topo':
        return this.executeTopo(parsed, context);
      default:
        if (parsed.args.length === 0) {
          return this.showHelp();
        }
        return this.createError(`Unknown subcommand: ${subcommand}\nRun 'nv-fabricmanager --help' for usage.`);
    }
  }

  private showHelp(): CommandResult {
    let output = `NVIDIA Fabric Manager CLI\n\n`;
    output += `Usage: nv-fabricmanager [options] <command> [args]\n\n`;
    output += `Options:\n`;
    output += `  -h, --help           Show this help message\n`;
    output += `  -v, --version        Show version information\n\n`;
    output += `Commands:\n`;
    output += `  status               Show fabric manager status\n`;
    output += `  query [type]         Query fabric information\n`;
    output += `    nvswitch            NVSwitch status\n`;
    output += `    topology            Fabric topology\n`;
    output += `    nvlink              NVLink status\n`;
    output += `  start                Start fabric manager service\n`;
    output += `  stop                 Stop fabric manager service\n`;
    output += `  restart              Restart fabric manager service\n`;
    output += `  config               Show/modify configuration\n`;
    output += `  diag                 Run fabric diagnostics\n`;
    output += `  topo                 Display topology map\n\n`;
    output += `Examples:\n`;
    output += `  nv-fabricmanager status\n`;
    output += `  nv-fabricmanager query nvswitch\n`;
    output += `  nv-fabricmanager diag\n`;
    return this.createSuccess(output);
  }

  private showVersion(): CommandResult {
    return this.createSuccess(`nv-fabricmanager version 535.104.05\nCUDA Version: 12.2\nDriver Version: 535.104.05\n`);
  }

  private getNode(context: CommandContext) {
    const state = useSimulationStore.getState();
    return state.cluster.nodes.find(n => n.id === context.currentNode);
  }

  private executeStatus(parsed: ParsedCommand, context: CommandContext): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError('Error: Unable to determine current node');
    }

    const gpuCount = node.gpus.length;
    const nvswitchCount = gpuCount >= 8 ? 6 : (gpuCount >= 4 ? 2 : 0);
    const healthyNvlinks = node.gpus.reduce((sum, g) => sum + g.nvlinks.filter(l => l.state === 'active').length, 0);
    const totalNvlinks = node.gpus.reduce((sum, g) => sum + g.nvlinks.length, 0);

    let output = `\x1b[1mNVIDIA Fabric Manager Status\x1b[0m\n`;
    output += `${'─'.repeat(50)}\n\n`;

    output += `\x1b[1mService Status:\x1b[0m\n`;
    output += `  Fabric Manager:       \x1b[32mRunning\x1b[0m\n`;
    output += `  PID:                  ${12345 + Math.floor(Math.random() * 1000)}\n`;
    output += `  Uptime:               ${Math.floor(Math.random() * 30)}d ${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m\n`;
    output += `  Config File:          /etc/nvidia-fabricmanager/fabricmanager.cfg\n\n`;

    output += `\x1b[1mFabric Topology:\x1b[0m\n`;
    output += `  System Type:          ${node.systemType}\n`;
    output += `  GPUs:                 ${gpuCount}\n`;
    output += `  NVSwitches:           ${nvswitchCount}\n`;
    output += `  NVLinks Total:        ${totalNvlinks}\n`;
    output += `  NVLinks Active:       ${healthyNvlinks}\n`;
    output += `  Topology:             ${gpuCount === 8 ? 'Fully Connected (NVSwitch)' : 'Direct NVLink'}\n\n`;

    output += `\x1b[1mHealth Status:\x1b[0m\n`;
    const allHealthy = healthyNvlinks === totalNvlinks && node.gpus.every(g => g.healthStatus === 'OK');
    output += `  Overall:              ${allHealthy ? '\x1b[32mHealthy\x1b[0m' : '\x1b[33mDegraded\x1b[0m'}\n`;
    output += `  Last Health Check:    ${new Date().toISOString()}\n`;
    output += `  Errors Detected:      ${allHealthy ? '0' : Math.floor(Math.random() * 5) + 1}\n`;

    return this.createSuccess(output);
  }

  private executeQuery(parsed: ParsedCommand, context: CommandContext): CommandResult {
    const queryType = parsed.args[1];

    switch (queryType) {
      case 'nvswitch':
        return this.queryNvswitch(context);
      case 'topology':
        return this.queryTopology(context);
      case 'nvlink':
        return this.queryNvlink(context);
      default:
        let output = `Query types:\n`;
        output += `  nvswitch   - Query NVSwitch status\n`;
        output += `  topology   - Query fabric topology\n`;
        output += `  nvlink     - Query NVLink status\n\n`;
        output += `Usage: nv-fabricmanager query <type>\n`;
        return this.createSuccess(output);
    }
  }

  private queryNvswitch(context: CommandContext): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError('Error: Unable to determine current node');
    }

    const nvswitchCount = node.gpus.length >= 8 ? 6 : (node.gpus.length >= 4 ? 2 : 0);

    let output = `\x1b[1mNVSwitch Status\x1b[0m\n`;
    output += `${'─'.repeat(60)}\n\n`;

    if (nvswitchCount === 0) {
      output += `No NVSwitches detected in this system configuration.\n`;
      return this.createSuccess(output);
    }

    output += `NVSwitch  | UUID                                  | State  | Temp | Power\n`;
    output += `${'─'.repeat(60)}\n`;

    for (let i = 0; i < nvswitchCount; i++) {
      const uuid = `NVSwitch-${i}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
      const temp = 45 + Math.floor(Math.random() * 15);
      const power = 30 + Math.floor(Math.random() * 20);
      output += `   ${i}      | ${uuid.padEnd(37)} | Active | ${temp}C  | ${power}W\n`;
    }

    output += `\n`;
    output += `Total NVSwitches: ${nvswitchCount}\n`;
    output += `All NVSwitches operational.\n`;

    return this.createSuccess(output);
  }

  private queryTopology(context: CommandContext): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError('Error: Unable to determine current node');
    }

    let output = `\x1b[1mFabric Topology\x1b[0m\n`;
    output += `${'─'.repeat(50)}\n\n`;

    output += `System: ${node.systemType}\n`;
    output += `Hostname: ${node.hostname}\n\n`;

    // GPU topology
    output += `GPU Topology:\n`;
    node.gpus.forEach(gpu => {
      const nvlinkCount = gpu.nvlinks.length;
      const activeNvlinks = gpu.nvlinks.filter(l => l.state === 'active').length;
      output += `  GPU ${gpu.id}: ${gpu.type} - ${activeNvlinks}/${nvlinkCount} NVLinks active\n`;
    });

    output += `\n`;

    // NVSwitch connectivity
    const nvswitchCount = node.gpus.length >= 8 ? 6 : 0;
    if (nvswitchCount > 0) {
      output += `NVSwitch Connectivity:\n`;
      for (let sw = 0; sw < nvswitchCount; sw++) {
        const connectedGpus = node.gpus.map((_, idx) => idx).filter(_ => Math.random() > 0.2);
        output += `  NVSwitch ${sw}: Connected to GPUs [${connectedGpus.join(', ')}]\n`;
      }
    }

    return this.createSuccess(output);
  }

  private queryNvlink(context: CommandContext): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError('Error: Unable to determine current node');
    }

    let output = `\x1b[1mNVLink Status\x1b[0m\n`;
    output += `${'─'.repeat(70)}\n\n`;

    output += `GPU | Link | State   | Speed     | Remote GPU | Bandwidth\n`;
    output += `${'─'.repeat(70)}\n`;

    node.gpus.forEach(gpu => {
      gpu.nvlinks.forEach((link, linkIdx) => {
        const state = link.state === 'active' ? '\x1b[32mActive\x1b[0m ' : '\x1b[31mInactive\x1b[0m';
        const speed = 'NVLink4';
        const bandwidth = link.state === 'active' ? `${link.bandwidth}GB/s` : 'N/A';
        const remoteGpu = link.remoteGpuId ?? 'NVSwitch';
        output += `  ${gpu.id} |   ${linkIdx}  | ${state} | ${speed.padEnd(9)} | ${String(remoteGpu).padEnd(10)} | ${bandwidth}\n`;
      });
    });

    const totalLinks = node.gpus.reduce((sum, g) => sum + g.nvlinks.length, 0);
    const activeLinks = node.gpus.reduce((sum, g) => sum + g.nvlinks.filter(l => l.state === 'active').length, 0);
    output += `\n`;
    output += `Total NVLinks: ${totalLinks}\n`;
    output += `Active NVLinks: ${activeLinks}\n`;
    output += `Inactive NVLinks: ${totalLinks - activeLinks}\n`;

    return this.createSuccess(output);
  }

  private executeStart(parsed: ParsedCommand, context: CommandContext): CommandResult {
    return this.createSuccess(`Starting NVIDIA Fabric Manager...\n` +
      `Initializing NVSwitch fabric...\n` +
      `Discovering GPUs...\n` +
      `Configuring NVLink topology...\n` +
      `\x1b[32mNVIDIA Fabric Manager started successfully.\x1b[0m\n`);
  }

  private executeStop(parsed: ParsedCommand, context: CommandContext): CommandResult {
    return this.createSuccess(`Stopping NVIDIA Fabric Manager...\n` +
      `Shutting down NVLink connections...\n` +
      `\x1b[33mNVIDIA Fabric Manager stopped.\x1b[0m\n`);
  }

  private executeRestart(parsed: ParsedCommand, context: CommandContext): CommandResult {
    return this.createSuccess(`Restarting NVIDIA Fabric Manager...\n` +
      `Stopping service...\n` +
      `Waiting for cleanup...\n` +
      `Starting service...\n` +
      `Initializing NVSwitch fabric...\n` +
      `\x1b[32mNVIDIA Fabric Manager restarted successfully.\x1b[0m\n`);
  }

  private executeConfig(parsed: ParsedCommand, context: CommandContext): CommandResult {
    const configOption = parsed.args[1];

    if (configOption === 'show' || !configOption) {
      let output = `\x1b[1mFabric Manager Configuration\x1b[0m\n`;
      output += `${'─'.repeat(50)}\n\n`;
      output += `Configuration file: /etc/nvidia-fabricmanager/fabricmanager.cfg\n\n`;
      output += `[General]\n`;
      output += `  LOG_LEVEL=4\n`;
      output += `  LOG_FILE=/var/log/nvidia-fabricmanager.log\n`;
      output += `  DAEMONIZE=1\n\n`;
      output += `[Fabric]\n`;
      output += `  FM_STAY_RESIDENT=1\n`;
      output += `  FM_NSEC_POLL_INTERVAL=100000000\n`;
      output += `  FABRIC_MODE=FULL_SPEED\n`;
      output += `  FM_CMD_BIND_INTERFACE=127.0.0.1\n`;
      output += `  FM_CMD_PORT_NUMBER=16001\n\n`;
      output += `[NVSwitch]\n`;
      output += `  NVSWITCH_BLACKLIST_MODE=0\n`;
      output += `  NVSWITCH_ERR_THRESHOLD=16\n`;
      output += `  ACCESS_LINK_TIMEOUT_MS=5000\n\n`;
      output += `[Health]\n`;
      output += `  HEALTH_CHECK_ENABLED=1\n`;
      output += `  HEALTH_CHECK_INTERVAL_SEC=60\n`;
      return this.createSuccess(output);
    }

    return this.createError(`Unknown config option: ${configOption}\nUse 'nv-fabricmanager config show' to display configuration.`);
  }

  private executeDiag(parsed: ParsedCommand, context: CommandContext): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError('Error: Unable to determine current node');
    }

    let output = `\x1b[1mNVIDIA Fabric Manager Diagnostics\x1b[0m\n`;
    output += `${'─'.repeat(60)}\n\n`;

    output += `Running fabric diagnostics...\n\n`;

    // Check fabric manager service
    output += `\x1b[1m[1/5] Checking Fabric Manager Service\x1b[0m\n`;
    output += `  Service Status: \x1b[32mRunning\x1b[0m\n`;
    output += `  Configuration: \x1b[32mValid\x1b[0m\n\n`;

    // Check NVSwitch
    output += `\x1b[1m[2/5] Checking NVSwitch Devices\x1b[0m\n`;
    const nvswitchCount = node.gpus.length >= 8 ? 6 : 0;
    if (nvswitchCount > 0) {
      output += `  Detected: ${nvswitchCount} NVSwitches\n`;
      output += `  Status: \x1b[32mAll Operational\x1b[0m\n\n`;
    } else {
      output += `  No NVSwitch devices detected\n\n`;
    }

    // Check NVLink
    output += `\x1b[1m[3/5] Checking NVLink Connections\x1b[0m\n`;
    const totalLinks = node.gpus.reduce((sum, g) => sum + g.nvlinks.length, 0);
    const activeLinks = node.gpus.reduce((sum, g) => sum + g.nvlinks.filter(l => l.state === 'active').length, 0);
    output += `  Total Links: ${totalLinks}\n`;
    output += `  Active Links: ${activeLinks}\n`;
    output += `  Status: ${activeLinks === totalLinks ? '\x1b[32mAll Links Active\x1b[0m' : '\x1b[33mSome Links Inactive\x1b[0m'}\n\n`;

    // Check bandwidth
    output += `\x1b[1m[4/5] Testing NVLink Bandwidth\x1b[0m\n`;
    output += `  Aggregate Bandwidth: ${activeLinks * 50}GB/s\n`;
    output += `  Per-Link Bandwidth: ~50GB/s\n`;
    output += `  Status: \x1b[32mWithin Expected Range\x1b[0m\n\n`;

    // Check errors
    output += `\x1b[1m[5/5] Checking Error Logs\x1b[0m\n`;
    const errorCount = node.gpus.reduce((sum, g) => sum + g.xidErrors.length, 0);
    output += `  Recent Errors: ${errorCount}\n`;
    output += `  Status: ${errorCount === 0 ? '\x1b[32mNo Errors\x1b[0m' : '\x1b[33mErrors Detected\x1b[0m'}\n\n`;

    // Summary
    output += `${'─'.repeat(60)}\n`;
    const allPassed = activeLinks === totalLinks && errorCount === 0;
    output += `\x1b[1mDiagnostic Summary:\x1b[0m ${allPassed ? '\x1b[32mPASSED\x1b[0m' : '\x1b[33mWARNINGS\x1b[0m'}\n`;
    output += `Completed at: ${new Date().toISOString()}\n`;

    return this.createSuccess(output);
  }

  private executeTopo(parsed: ParsedCommand, context: CommandContext): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError('Error: Unable to determine current node');
    }

    const gpuCount = node.gpus.length;
    const nvswitchCount = gpuCount >= 8 ? 6 : 0;

    let output = `\x1b[1mNVSwitch Fabric Topology Map\x1b[0m\n`;
    output += `${'─'.repeat(60)}\n\n`;

    if (nvswitchCount === 0) {
      output += `  No NVSwitch fabric detected.\n`;
      output += `  System uses direct GPU-to-GPU NVLink connections.\n`;
      return this.createSuccess(output);
    }

    // ASCII topology diagram
    output += `  ┌─────────────────────────────────────────────────────┐\n`;
    output += `  │                  NVSwitch Fabric                    │\n`;
    output += `  ├─────────────────────────────────────────────────────┤\n`;
    output += `  │                                                     │\n`;

    // NVSwitches row
    output += `  │  `;
    for (let i = 0; i < nvswitchCount; i++) {
      output += `[SW${i}] `;
    }
    output += `           │\n`;

    output += `  │    │     │     │     │     │     │                  │\n`;
    output += `  │    └─────┴─────┴─────┴─────┴─────┘                  │\n`;
    output += `  │              │ NVLink │                             │\n`;
    output += `  │    ┌─────────┴────────┴─────────┐                  │\n`;
    output += `  │    │                            │                  │\n`;

    // GPUs row
    output += `  │  `;
    for (let i = 0; i < Math.min(gpuCount, 8); i++) {
      output += `[G${i}] `;
    }
    output += `     │\n`;

    output += `  │                                                     │\n`;
    output += `  └─────────────────────────────────────────────────────┘\n\n`;

    output += `  Legend:\n`;
    output += `    [SW#] = NVSwitch #\n`;
    output += `    [G#]  = GPU #\n\n`;

    output += `  Connectivity:\n`;
    output += `    - Each GPU connected to all ${nvswitchCount} NVSwitches\n`;
    output += `    - Full mesh GPU-to-GPU via NVSwitch\n`;
    output += `    - Aggregate bandwidth: ${nvswitchCount * 50 * gpuCount}GB/s\n`;

    return this.createSuccess(output);
  }
}
