import type { CommandResult, CommandContext, ParsedCommand, SimulatorMetadata } from '@/types/commands';
import { BaseSimulator } from './BaseSimulator';
import { useSimulationStore } from '@/store/simulationStore';

/**
 * BasicSystemSimulator
 * Handles basic Linux system utilities for cluster inspection
 *
 * Commands:
 * - lscpu: Display CPU architecture information
 * - free: Display memory usage information
 * - dmidecode: Display BIOS/hardware information
 * - dmesg: Display kernel ring buffer logs
 * - systemctl: Service management (status, start, stop, restart)
 */
export class BasicSystemSimulator extends BaseSimulator {
  getMetadata(): SimulatorMetadata {
    return {
      name: 'system-tools',
      version: '1.0.0',
      description: 'Basic Linux system utilities',
      commands: [
        {
          name: 'lscpu',
          description: 'Display CPU architecture information',
          usage: 'lscpu [OPTIONS]',
          examples: ['lscpu'],
        },
        {
          name: 'free',
          description: 'Display memory usage information',
          usage: 'free [OPTIONS]',
          examples: ['free', 'free -h'],
        },
        {
          name: 'dmidecode',
          description: 'Display BIOS/hardware information',
          usage: 'dmidecode -t <type>',
          examples: ['dmidecode -t bios', 'dmidecode -t memory', 'dmidecode -t processor'],
        },
        {
          name: 'dmesg',
          description: 'Display kernel ring buffer logs',
          usage: 'dmesg [OPTIONS]',
          examples: ['dmesg', 'dmesg | grep -i error', 'dmesg | grep -i warning'],
        },
        {
          name: 'systemctl',
          description: 'Service management',
          usage: 'systemctl [action] <service>',
          examples: ['systemctl status nvsm-core', 'systemctl start nvsm-core', 'systemctl restart nvsm-core'],
        },
        {
          name: 'hostnamectl',
          description: 'Query or change system hostname',
          usage: 'hostnamectl [status|set-hostname <name>]',
          examples: ['hostnamectl', 'hostnamectl status', 'hostnamectl set-hostname dgx-01'],
        },
        {
          name: 'timedatectl',
          description: 'Query or change system time settings',
          usage: 'timedatectl [status|set-timezone <tz>|set-ntp <bool>]',
          examples: ['timedatectl', 'timedatectl status', 'timedatectl set-timezone UTC'],
        },
      ],
    };
  }

  execute(parsed: ParsedCommand, context: CommandContext): CommandResult {
    // Handle --version flag (global)
    if (this.hasAnyFlag(parsed, ['version', 'v'])) {
      return this.handleVersion();
    }

    // Handle --help flag (only long form is global, -h may have command-specific meaning)
    // Commands like 'free' use -h for human-readable, so only intercept --help for those
    const hasHelpFlag = parsed.flags.has('help');
    const hasShortH = parsed.flags.has('h');

    // For lscpu, dmidecode, dmesg, systemctl: -h means help
    // For free: -h means human-readable
    if (hasHelpFlag) {
      return this.handleHelp();
    }

    // Route -h to help ONLY for commands where -h doesn't have another meaning
    if (hasShortH && parsed.baseCommand !== 'free') {
      return this.handleHelp();
    }

    // Route to appropriate handler
    switch (parsed.baseCommand) {
      case 'lscpu':
        return this.handleLscpu(parsed, context);
      case 'free':
        return this.handleFree(parsed, context);
      case 'dmidecode':
        return this.handleDmidecode(parsed, context);
      case 'dmesg':
        return this.handleDmesg(parsed, context);
      case 'systemctl':
        return this.handleSystemctl(parsed, context);
      case 'hostnamectl':
        return this.handleHostnamectl(parsed, context);
      case 'timedatectl':
        return this.handleTimedatectl(parsed, context);
      default:
        return this.createError(`Unknown system command: ${parsed.baseCommand}`);
    }
  }

  /**
   * Handle lscpu command
   * Displays CPU architecture information
   */
  private handleLscpu(_parsed: ParsedCommand, _context: CommandContext): CommandResult {
    const output = `Architecture:        x86_64
CPU op-mode(s):      32-bit, 64-bit
Byte Order:          Little Endian
CPU(s):              128
On-line CPU(s) list: 0-127
Thread(s) per core:  2
Core(s) per socket:  32
Socket(s):           2
NUMA node(s):        2
Vendor ID:           AuthenticAMD
CPU family:          25
Model:               1
Model name:          AMD EPYC 7742 64-Core Processor
Stepping:            1
CPU MHz:             2245.781
CPU max MHz:         3400.0000
CPU min MHz:         1500.0000
BogoMIPS:            4491.56
Virtualization:      AMD-V
L1d cache:           32K
L1i cache:           32K
L2 cache:            512K
L3 cache:            16384K
NUMA node0 CPU(s):   0-31,64-95
NUMA node1 CPU(s):   32-63,96-127`;

    return this.createSuccess(output);
  }

  /**
   * Handle free command
   * Displays memory usage information
   * Supports -h flag for human-readable output
   */
  private handleFree(parsed: ParsedCommand, _context: CommandContext): CommandResult {
    const showHuman = this.hasAnyFlag(parsed, ['h', 'human']);

    let output: string;
    if (showHuman) {
      output = `              total        used        free      shared  buff/cache   available
Mem:           2.0T        128G        1.7T        4.0G        180G        1.8T
Swap:           32G          0B         32G`;
    } else {
      output = `              total        used        free      shared  buff/cache   available
Mem:      2147483648   134217728  1879048192     4194304   188743680  1946157056
Swap:       33554432           0    33554432`;
    }

    return this.createSuccess(output);
  }

  /**
   * Handle dmidecode command
   * Displays BIOS/hardware information
   * Supports -t flag for specific types: bios, memory, processor
   */
  private handleDmidecode(parsed: ParsedCommand, _context: CommandContext): CommandResult {
    const hasTypeFlag = this.hasAnyFlag(parsed, ['t']);
    const type = parsed.flags.get('t'); // Get the value of -t flag

    if (hasTypeFlag && type === 'bios') {
      const output = `# dmidecode 3.2
Getting SMBIOS data from sysfs.
SMBIOS 3.2.0 present.

Handle 0x0000, DMI type 0, 26 bytes
BIOS Information
        Vendor: American Megatrends Inc.
        Version: 1.2.3
        Release Date: 09/15/2023
        ROM Size: 32 MB
        Characteristics:
                PCI is supported
                BIOS is upgradeable
                BIOS shadowing is allowed
                UEFI is supported
        BIOS Revision: 5.17
        Firmware Revision: 3.2`;
      return this.createSuccess(output);
    }

    if (hasTypeFlag && (type === 'memory' || type === 'processor')) {
      const output = `# dmidecode 3.2
Getting SMBIOS data from sysfs.
SMBIOS 3.2.0 present.

Handle 0x003C, DMI type 17, 84 bytes
Memory Device
        Array Handle: 0x0039
        Total Width: 72 bits
        Data Width: 64 bits
        Size: 128 GB
        Form Factor: DIMM
        Locator: DIMM_A1
        Bank Locator: P0_Node0_Channel0_Dimm0
        Type: DDR4
        Speed: 3200 MT/s
        Manufacturer: Samsung
        Part Number: M393A16K40CB2-CVF`;
      return this.createSuccess(output);
    }

    return this.createError(`Usage: dmidecode -t <type>
Available types: bios, memory, processor`);
  }

  /**
   * Handle dmesg command
   * Displays kernel ring buffer logs
   * Supports piped grep for filtering (simulated via cmdLine check)
   */
  private handleDmesg(parsed: ParsedCommand, context: CommandContext): CommandResult {
    // Use parsed.raw to get the full command line including any piped commands
    const rawCommand = parsed.raw;
    const grepError = rawCommand.includes('grep -i error');
    const grepWarning = rawCommand.includes('grep -i warning');
    const grepXid = rawCommand.includes('grep -i xid') || rawCommand.includes('grep -i nvrm');

    // Check simulation store for any active XID errors (from fault injection)
    const state = useSimulationStore.getState();
    const xidMessages: string[] = [];

    // Only check current node's GPUs for XID errors
    const currentNodeId = context.currentNode || 'dgx-00';
    const currentNode = state.cluster.nodes.find(n => n.id === currentNodeId);

    if (currentNode) {
      currentNode.gpus.forEach(gpu => {
        if (gpu.xidErrors && gpu.xidErrors.length > 0) {
          gpu.xidErrors.forEach(error => {
            // Format as kernel-style XID error message
            // PCI address is formatted based on GPU index (e.g., 12:00.0, 13:00.0)
            const pciBase = 0x10 + gpu.id;
            const pciAddr = `0000:${pciBase.toString(16).padStart(2, '0')}:00.0`;
            const timestamp = (100 + gpu.id * 10 + Math.random() * 5).toFixed(6);
            xidMessages.push(
              `[  ${timestamp}] NVRM: Xid (PCI:${pciAddr}): ${error.code}, ${error.description}`
            );
          });
        }
      });
    }

    let output: string;
    if (grepXid) {
      // Return only XID messages when grepping
      output = xidMessages.join('\n');
      if (!output) {
        output = ''; // No XID errors found
      }
    } else if (grepError) {
      // Include XID errors when grepping for errors
      const errorMessages = [
        `[    0.234567] ACPI Error: No handler for Region [SYSI] (ffff888123456789) [SystemMemory] (20200110/evregion-127)`,
        `[    2.456789] PCIe Bus Error: severity=Corrected, type=Physical Layer, id=00e8(Receiver ID)`
      ];

      // Add XID errors to error grep
      if (xidMessages.length > 0) {
        errorMessages.push(...xidMessages);
      }

      output = errorMessages.join('\n');
    } else if (grepWarning) {
      output = `[    1.123456] Warning: NMI watchdog not available
[    3.789012] ACPI Warning: SystemIO range conflicts with OpRegion (20200110/utaddress-204)`;
    } else {
      // Full dmesg output - include boot messages AND any XID errors
      const bootMessages = [
        `[    0.000000] Linux version 5.15.0-91-generic (buildd@lcy02-amd64-030)`,
        `[    0.000000] Command line: BOOT_IMAGE=/boot/vmlinuz root=UUID=1234-5678`,
        `[    0.000000] KERNEL supported cpus:`,
        `[    0.000000]   Intel GenuineIntel`,
        `[    0.000000]   AMD AuthenticAMD`,
        `[    0.234567] ACPI: Interpreter enabled`,
        `[    1.123456] PCI: Using ACPI for IRQ routing`,
        `[    2.456789] NVIDIA: module loaded successfully`,
        `[    3.789012] nvlink: initialized nvlink driver`,
        `[    4.567890] nvidia-uvm: Loaded successfully`,
        `[    5.678901] All GPUs detected and initialized successfully`
      ];

      // Add XID errors to the full dmesg output if they exist
      if (xidMessages.length > 0) {
        bootMessages.push(...xidMessages);
      }

      output = bootMessages.join('\n');
    }

    return this.createSuccess(output);
  }

  /**
   * Handle systemctl command
   * Service management: status, start, stop, restart
   * Special handling for nvsm-core service per spec Section 2.1
   */
  private handleSystemctl(parsed: ParsedCommand, _context: CommandContext): CommandResult {
    const action = parsed.subcommands[0];
    const service = parsed.subcommands[1];

    if (action === 'status') {
      if (!service) {
        return this.createError('Usage: systemctl status <service>');
      }

      if (service.startsWith('nvsm')) {
        // Per spec Golden Output Reference for nvsm-core service
        const uptime = `${Math.floor(Math.random() * 12)}h ${Math.floor(Math.random() * 60)}min`;
        const pid = Math.floor(1000 + Math.random() * 5000);
        const output = `● ${service}.service - NVSM Core Service
   Loaded: loaded (/usr/lib/systemd/system/${service}.service; enabled; vendor preset: enabled)
   Active: active (running) since ${new Date().toUTCString()}; ${uptime} ago
 Main PID: ${pid} (nvsm-core)
    Tasks: 18 (limit: 4915)
   CGroup: /system.slice/${service}.service
           └─${pid} /usr/bin/nvsm-core`;
        return this.createSuccess(output);
      }

      // Generic service status
      const output = `● ${service}.service - ${service}
   Loaded: loaded (/usr/lib/systemd/system/${service}.service; enabled)
   Active: active (running)`;
      return this.createSuccess(output);
    }

    if (action === 'start' || action === 'stop' || action === 'restart') {
      if (!service) {
        return this.createError(`Usage: systemctl ${action} <service>`);
      }
      // Silent success for start/stop/restart
      return this.createSuccess('');
    }

    return this.createError('Usage: systemctl [status|start|stop|restart] <service>');
  }

  /**
   * Handle hostnamectl command
   * Query or change system hostname
   */
  private handleHostnamectl(parsed: ParsedCommand, context: CommandContext): CommandResult {
    const action = parsed.subcommands[0] || 'status';
    const hostname = context.currentNode || 'dgx-00';

    if (action === 'status' || action === undefined) {
      const output = `   Static hostname: ${hostname}
         Icon name: computer-server
           Chassis: server
        Machine ID: 1234567890abcdef1234567890abcdef
           Boot ID: abcdef1234567890abcdef1234567890
  Operating System: Ubuntu 22.04.3 LTS
            Kernel: Linux 5.15.0-91-generic
      Architecture: x86-64
   Hardware Vendor: NVIDIA
    Hardware Model: DGX A100
  Firmware Version: 1.2.3`;
      return this.createSuccess(output);
    }

    if (action === 'set-hostname') {
      const newHostname = parsed.subcommands[1] || parsed.positionalArgs[0];
      if (!newHostname) {
        return this.createError('hostnamectl: missing hostname argument');
      }
      return this.createSuccess(''); // Silent success
    }

    return this.createError('Usage: hostnamectl [status|set-hostname <name>]');
  }

  /**
   * Handle timedatectl command
   * Query or change system time settings
   */
  private handleTimedatectl(parsed: ParsedCommand, context: CommandContext): CommandResult {
    const action = parsed.subcommands[0] || 'status';
    const now = new Date();

    if (action === 'status' || action === undefined) {
      const output = `               Local time: ${now.toLocaleString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} UTC
           Universal time: ${now.toUTCString()}
                 RTC time: ${now.toUTCString()}
                Time zone: UTC (UTC, +0000)
System clock synchronized: yes
              NTP service: active
          RTC in local TZ: no`;
      return this.createSuccess(output);
    }

    if (action === 'set-timezone') {
      const tz = parsed.subcommands[1] || parsed.positionalArgs[0];
      if (!tz) {
        return this.createError('timedatectl: missing timezone argument');
      }
      return this.createSuccess(''); // Silent success
    }

    if (action === 'set-ntp') {
      const enabled = parsed.subcommands[1] || parsed.positionalArgs[0];
      if (!enabled) {
        return this.createError('timedatectl: missing boolean argument');
      }
      return this.createSuccess(''); // Silent success
    }

    if (action === 'list-timezones') {
      const output = `Africa/Abidjan
Africa/Cairo
America/Chicago
America/Los_Angeles
America/New_York
Asia/Shanghai
Asia/Tokyo
Europe/London
Europe/Paris
Pacific/Auckland
UTC`;
      return this.createSuccess(output);
    }

    return this.createError('Usage: timedatectl [status|set-timezone <tz>|set-ntp <bool>|list-timezones]');
  }
}
