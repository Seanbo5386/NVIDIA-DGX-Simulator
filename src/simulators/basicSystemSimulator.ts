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
   * Supports -t flag for specific types: system, bios, memory, processor, baseboard
   */
  private handleDmidecode(parsed: ParsedCommand, context: CommandContext): CommandResult {
    const hasTypeFlag = this.hasAnyFlag(parsed, ['t']);
    const type = parsed.flags.get('t') || parsed.positionalArgs[0]; // Get the value of -t flag or positional arg
    const hostname = context.currentNode || 'dgx-00';

    // No flag - show full system summary
    if (!hasTypeFlag && !type) {
      const output = `# dmidecode 3.2
Getting SMBIOS data from sysfs.
SMBIOS 3.2.0 present.

Handle 0x0001, DMI type 1, 27 bytes
System Information
        Manufacturer: NVIDIA
        Product Name: DGX A100
        Version: Not Specified
        Serial Number: DGXA100-${hostname.toUpperCase()}-SN001
        UUID: 12345678-1234-1234-1234-123456789abc
        Wake-up Type: Power Switch
        SKU Number: 920-23687-2512-000
        Family: DGX

Handle 0x0002, DMI type 2, 15 bytes
Base Board Information
        Manufacturer: NVIDIA
        Product Name: DGX A100 Baseboard
        Version: Rev 1.0
        Serial Number: DGXA100-BB-${hostname.toUpperCase()}-001`;
      return this.createSuccess(output);
    }

    if (type === 'system' || type === '1') {
      const output = `# dmidecode 3.2
Getting SMBIOS data from sysfs.
SMBIOS 3.2.0 present.

Handle 0x0001, DMI type 1, 27 bytes
System Information
        Manufacturer: NVIDIA
        Product Name: DGX A100
        Version: Not Specified
        Serial Number: DGXA100-${hostname.toUpperCase()}-SN001
        UUID: 12345678-1234-1234-1234-123456789abc
        Wake-up Type: Power Switch
        SKU Number: 920-23687-2512-000
        Family: DGX`;
      return this.createSuccess(output);
    }

    if (type === 'bios' || type === '0') {
      const output = `# dmidecode 3.2
Getting SMBIOS data from sysfs.
SMBIOS 3.2.0 present.

Handle 0x0000, DMI type 0, 26 bytes
BIOS Information
        Vendor: American Megatrends Inc.
        Version: 1.2.3
        Release Date: 09/15/2023
        Address: 0xF0000
        Runtime Size: 64 kB
        ROM Size: 32 MB
        Characteristics:
                PCI is supported
                BIOS is upgradeable
                BIOS shadowing is allowed
                Boot from CD is supported
                Selectable boot is supported
                BIOS ROM is socketed
                EDD is supported
                ACPI is supported
                USB legacy is supported
                UEFI is supported
        BIOS Revision: 5.17
        Firmware Revision: 3.2`;
      return this.createSuccess(output);
    }

    if (type === 'processor' || type === '4') {
      const output = `# dmidecode 3.2
Getting SMBIOS data from sysfs.
SMBIOS 3.2.0 present.

Handle 0x0040, DMI type 4, 48 bytes
Processor Information
        Socket Designation: CPU0
        Type: Central Processor
        Family: Zen
        Manufacturer: AMD
        ID: 10 0F 83 00 FF FB 8B 17
        Signature: Family 23, Model 49, Stepping 0
        Version: AMD EPYC 7742 64-Core Processor
        Voltage: 1.1 V
        External Clock: 100 MHz
        Max Speed: 3400 MHz
        Current Speed: 2250 MHz
        Status: Populated, Enabled
        Core Count: 64
        Core Enabled: 64
        Thread Count: 128
        Characteristics:
                64-bit capable
                Multi-Core
                Hardware Thread

Handle 0x0041, DMI type 4, 48 bytes
Processor Information
        Socket Designation: CPU1
        Type: Central Processor
        Family: Zen
        Manufacturer: AMD
        Version: AMD EPYC 7742 64-Core Processor
        Max Speed: 3400 MHz
        Current Speed: 2250 MHz
        Status: Populated, Enabled
        Core Count: 64
        Core Enabled: 64
        Thread Count: 128`;
      return this.createSuccess(output);
    }

    if (type === 'memory' || type === '17') {
      const output = `# dmidecode 3.2
Getting SMBIOS data from sysfs.
SMBIOS 3.2.0 present.

Handle 0x003C, DMI type 17, 84 bytes
Memory Device
        Array Handle: 0x0039
        Error Information Handle: Not Provided
        Total Width: 72 bits
        Data Width: 64 bits
        Size: 64 GB
        Form Factor: DIMM
        Set: None
        Locator: DIMM_A1
        Bank Locator: P0_Node0_Channel0_Dimm0
        Type: DDR4
        Type Detail: Synchronous Registered (Buffered)
        Speed: 3200 MT/s
        Manufacturer: Samsung
        Serial Number: 12345678
        Asset Tag: DIMM_A1_AssetTag
        Part Number: M393A8G40AB2-CWE
        Rank: 2
        Configured Memory Speed: 3200 MT/s

Handle 0x003D, DMI type 17, 84 bytes
Memory Device
        Array Handle: 0x0039
        Total Width: 72 bits
        Data Width: 64 bits
        Size: 64 GB
        Form Factor: DIMM
        Locator: DIMM_A2
        Bank Locator: P0_Node0_Channel0_Dimm1
        Type: DDR4
        Speed: 3200 MT/s
        Manufacturer: Samsung
        Part Number: M393A8G40AB2-CWE

[... 14 more DIMMs totaling 1024 GB ...]`;
      return this.createSuccess(output);
    }

    if (type === 'baseboard' || type === '2') {
      const output = `# dmidecode 3.2
Getting SMBIOS data from sysfs.
SMBIOS 3.2.0 present.

Handle 0x0002, DMI type 2, 15 bytes
Base Board Information
        Manufacturer: NVIDIA
        Product Name: DGX A100 Baseboard
        Version: Rev 1.0
        Serial Number: DGXA100-BB-${hostname.toUpperCase()}-001
        Asset Tag: Not Specified
        Features:
                Board is a hosting board
                Board is replaceable
        Location In Chassis: Not Specified
        Chassis Handle: 0x0003
        Type: Motherboard
        Contained Object Handles: 0`;
      return this.createSuccess(output);
    }

    if (type === 'chassis' || type === '3') {
      const output = `# dmidecode 3.2
Getting SMBIOS data from sysfs.
SMBIOS 3.2.0 present.

Handle 0x0003, DMI type 3, 22 bytes
Chassis Information
        Manufacturer: NVIDIA
        Type: Rack Mount Chassis
        Lock: Not Present
        Version: DGX A100
        Serial Number: DGXA100-CH-${hostname.toUpperCase()}-001
        Asset Tag: Not Specified
        Boot-up State: Safe
        Power Supply State: Safe
        Thermal State: Safe
        Security Status: None
        OEM Information: 0x00000000
        Height: 6 U
        Number Of Power Cords: 6`;
      return this.createSuccess(output);
    }

    return this.createError(`Usage: dmidecode [-t <type>]
Available types:
  0, bios         BIOS Information
  1, system       System Information
  2, baseboard    Base Board Information
  3, chassis      Chassis Information
  4, processor    Processor Information
  17, memory      Memory Device`);
  }

  /**
   * Handle dmesg command
   * Displays kernel ring buffer logs with XID error integration
   * Supports: -T (human-readable timestamps), piped grep for filtering
   *
   * Critical for NCP-AII exam - searching for XID errors in dmesg
   */
  private handleDmesg(parsed: ParsedCommand, context: CommandContext): CommandResult {
    // Use parsed.raw to get the full command line including any piped commands
    const rawCommand = parsed.raw;
    const humanTime = this.hasAnyFlag(parsed, ['T']);
    const grepError = rawCommand.includes('grep -i error');
    const grepWarning = rawCommand.includes('grep -i warning');
    const grepXid = rawCommand.includes('grep -i xid') || rawCommand.includes('grep -i nvrm');
    const grepFallen = rawCommand.includes('grep -i fallen') || rawCommand.includes('grep -i "fallen off"');
    const grepNvidia = rawCommand.includes('grep -i nvidia');

    // Check simulation store for any active XID errors (from fault injection)
    const state = useSimulationStore.getState();
    const xidMessages: string[] = [];

    // Only check current node's GPUs for XID errors
    const currentNodeId = context.currentNode || 'dgx-00';
    const currentNode = state.cluster.nodes.find(n => n.id === currentNodeId);

    // Generate timestamp formatter
    const formatTimestamp = (seconds: number): string => {
      if (humanTime) {
        const date = new Date();
        date.setSeconds(date.getSeconds() - (300 - seconds)); // Simulate recent timestamps
        return `[${date.toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })}]`;
      }
      return `[  ${seconds.toFixed(6)}]`;
    };

    if (currentNode) {
      currentNode.gpus.forEach(gpu => {
        if (gpu.xidErrors && gpu.xidErrors.length > 0) {
          gpu.xidErrors.forEach(error => {
            // Format as kernel-style XID error message
            const pciBase = 0x10 + gpu.id;
            const pciAddr = `0000:${pciBase.toString(16).padStart(2, '0')}:00.0`;
            const timestamp = 100 + gpu.id * 10 + Math.random() * 5;

            // Main XID error message
            xidMessages.push(
              `${formatTimestamp(timestamp)} NVRM: Xid (PCI:${pciAddr}): ${error.code}, ${error.description}`
            );

            // Add additional context for critical XID codes
            if (error.code === 79) {
              xidMessages.push(
                `${formatTimestamp(timestamp + 0.001)} NVRM: GPU at ${pciAddr} has fallen off the bus.`
              );
              xidMessages.push(
                `${formatTimestamp(timestamp + 0.002)} NVRM: GPU is lost. Power cycle or reboot required.`
              );
            } else if (error.code === 74) {
              xidMessages.push(
                `${formatTimestamp(timestamp + 0.001)} NVRM: NVLink: Link ${gpu.id % 6} has detected errors`
              );
            } else if (error.code === 48) {
              xidMessages.push(
                `${formatTimestamp(timestamp + 0.001)} NVRM: GPU ${gpu.id}: Uncorrectable ECC error detected in DRAM`
              );
            } else if (error.code === 63) {
              xidMessages.push(
                `${formatTimestamp(timestamp + 0.001)} NVRM: GPU ${gpu.id}: Row remapping failed - no spare rows available`
              );
            } else if (error.code === 43) {
              xidMessages.push(
                `${formatTimestamp(timestamp + 0.001)} NVRM: GPU ${gpu.id}: GPU stopped responding to commands`
              );
            }
          });
        }

        // Add thermal warnings to dmesg
        if (gpu.temperature > 83) {
          const timestamp = 200 + gpu.id * 5;
          xidMessages.push(
            `${formatTimestamp(timestamp)} NVRM: GPU at 0000:${(0x10 + gpu.id).toString(16).padStart(2, '0')}:00.0: GPU has reached thermal slowdown temperature (${gpu.temperature}C)`
          );
        }

        // Add ECC errors
        if (gpu.eccErrors && gpu.eccErrors.doubleBit > 0) {
          const timestamp = 150 + gpu.id * 5;
          xidMessages.push(
            `${formatTimestamp(timestamp)} NVRM: GPU ${gpu.id}: DBE (double-bit error) detected in GPU memory`
          );
        }
      });
    }

    let output: string;
    if (grepXid || grepNvidia) {
      // Return XID messages and NVIDIA-related messages when grepping
      if (xidMessages.length > 0) {
        output = xidMessages.join('\n');
      } else {
        // Show normal NVIDIA messages if no errors
        output = [
          `${formatTimestamp(2.456789)} nvidia: module verification: NVIDIA module signed with external signing key`,
          `${formatTimestamp(2.567890)} nvidia: loading out-of-tree module taints kernel`,
          `${formatTimestamp(2.678901)} nvidia-nvlink: Nvlink Core is being initialized`,
          `${formatTimestamp(2.789012)} NVRM: loading NVIDIA UNIX x86_64 Kernel Module  535.129.03  Thu Dec 7 19:01:02 UTC 2023`,
          `${formatTimestamp(3.012345)} nvidia-uvm: Loaded the UVM driver, major device number 235`,
        ].join('\n');
      }
    } else if (grepFallen) {
      // Specific grep for "fallen off the bus"
      const fallenMessages = xidMessages.filter(m => m.includes('fallen off'));
      output = fallenMessages.length > 0 ? fallenMessages.join('\n') : '';
    } else if (grepError) {
      // Include XID errors when grepping for errors
      const errorMessages = [
        `${formatTimestamp(0.234567)} ACPI Error: No handler for Region [SYSI] (ffff888123456789) [SystemMemory] (20200110/evregion-127)`,
        `${formatTimestamp(2.456789)} PCIe Bus Error: severity=Corrected, type=Physical Layer, id=00e8(Receiver ID)`
      ];

      // Add XID errors to error grep
      if (xidMessages.length > 0) {
        errorMessages.push(...xidMessages);
      }

      output = errorMessages.join('\n');
    } else if (grepWarning) {
      output = `${formatTimestamp(1.123456)} Warning: NMI watchdog not available
${formatTimestamp(3.789012)} ACPI Warning: SystemIO range conflicts with OpRegion (20200110/utaddress-204)`;
    } else {
      // Full dmesg output - include boot messages AND any XID errors
      const bootMessages = [
        `${formatTimestamp(0.000000)} Linux version 5.15.0-91-generic (buildd@lcy02-amd64-030) (gcc-11)`,
        `${formatTimestamp(0.000000)} Command line: BOOT_IMAGE=/boot/vmlinuz root=UUID=1234-5678`,
        `${formatTimestamp(0.000000)} KERNEL supported cpus:`,
        `${formatTimestamp(0.000001)}   Intel GenuineIntel`,
        `${formatTimestamp(0.000002)}   AMD AuthenticAMD`,
        `${formatTimestamp(0.234567)} ACPI: Interpreter enabled`,
        `${formatTimestamp(1.123456)} PCI: Using ACPI for IRQ routing`,
        `${formatTimestamp(1.234567)} pci 0000:10:00.0: [10de:20b2] type 00 class 0x030200`,
        `${formatTimestamp(1.345678)} pci 0000:11:00.0: [10de:20b2] type 00 class 0x030200`,
        `${formatTimestamp(1.456789)} pci 0000:12:00.0: [10de:20b2] type 00 class 0x030200`,
        `${formatTimestamp(1.567890)} pci 0000:13:00.0: [10de:20b2] type 00 class 0x030200`,
        `${formatTimestamp(1.678901)} pci 0000:14:00.0: [10de:20b2] type 00 class 0x030200`,
        `${formatTimestamp(1.789012)} pci 0000:15:00.0: [10de:20b2] type 00 class 0x030200`,
        `${formatTimestamp(1.890123)} pci 0000:16:00.0: [10de:20b2] type 00 class 0x030200`,
        `${formatTimestamp(1.901234)} pci 0000:17:00.0: [10de:20b2] type 00 class 0x030200`,
        `${formatTimestamp(2.456789)} NVRM: loading NVIDIA UNIX x86_64 Kernel Module  535.129.03`,
        `${formatTimestamp(2.567890)} nvidia-nvlink: Nvlink Core is being initialized`,
        `${formatTimestamp(3.789012)} nvidia-uvm: Loaded the UVM driver, major device number 235`,
        `${formatTimestamp(4.567890)} NVRM: GPU 0000:10:00.0: RmInitAdapter succeeded!`,
        `${formatTimestamp(4.678901)} NVRM: GPU 0000:11:00.0: RmInitAdapter succeeded!`,
        `${formatTimestamp(4.789012)} NVRM: GPU 0000:12:00.0: RmInitAdapter succeeded!`,
        `${formatTimestamp(4.890123)} NVRM: GPU 0000:13:00.0: RmInitAdapter succeeded!`,
        `${formatTimestamp(4.901234)} NVRM: GPU 0000:14:00.0: RmInitAdapter succeeded!`,
        `${formatTimestamp(5.012345)} NVRM: GPU 0000:15:00.0: RmInitAdapter succeeded!`,
        `${formatTimestamp(5.123456)} NVRM: GPU 0000:16:00.0: RmInitAdapter succeeded!`,
        `${formatTimestamp(5.234567)} NVRM: GPU 0000:17:00.0: RmInitAdapter succeeded!`,
        `${formatTimestamp(5.678901)} All 8 GPUs detected and initialized successfully`
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
  private handleTimedatectl(parsed: ParsedCommand, _context: CommandContext): CommandResult {
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
