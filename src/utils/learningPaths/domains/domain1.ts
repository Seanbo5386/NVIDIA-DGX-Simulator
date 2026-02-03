/**
 * Domain 1: Platform Bring-Up (31% of exam)
 * Comprehensive coverage of server POST, BIOS, BMC, drivers, firmware, and DGX system setup
 */

import type { LearningPath } from '../types';

export const DOMAIN1_PATH: LearningPath = {
  id: 'path-domain1',
  domainId: 'domain1',
  title: 'Platform Bring-Up Mastery',
  description: 'Master server POST, BIOS configuration, BMC management, drivers, and firmware for DGX systems',
  examWeight: 31,
  skills: [
    'Server POST troubleshooting',
    'BIOS/UEFI configuration',
    'BMC/IPMI management',
    'Driver installation and verification',
    'Firmware updates',
    'DGX OS deployment',
    'Network configuration',
    'Storage setup'
  ],
  modules: [
    // Module 1: BIOS & BMC Fundamentals
    {
      id: 'mod-d1-bios-bmc',
      title: 'BIOS & BMC Fundamentals',
      description: 'Understanding and configuring BIOS settings and BMC management',
      icon: '',
      order: 1,
      lessons: [
        {
          id: 'lesson-d1-dmidecode',
          title: 'System Information with dmidecode',
          description: 'Learn to extract hardware information using dmidecode',
          objectives: [
            'Understand DMI/SMBIOS tables',
            'Query specific hardware components',
            'Interpret BIOS and system information'
          ],
          estimatedMinutes: 15,
          commands: ['dmidecode'],
          difficulty: 'beginner',
          steps: [
            {
              id: 'step-d1-1-intro',
              type: 'concept',
              title: 'What is DMI/SMBIOS?',
              content: `**Desktop Management Interface (DMI)** and **System Management BIOS (SMBIOS)** are standards that define data structures in a system's BIOS. These structures contain information about the system's hardware components.

The \`dmidecode\` command reads this information and presents it in a human-readable format. On DGX systems, this is essential for:
- Verifying hardware configuration
- Checking BIOS version
- Identifying memory modules and their specifications
- Gathering serial numbers for support

**Common DMI Types:**
| Type | Description |
|------|-------------|
| 0 | BIOS Information |
| 1 | System Information |
| 2 | Baseboard (Motherboard) |
| 4 | Processor Information |
| 17 | Memory Device |
| 38 | IPMI Device |`,
              tips: [
                'dmidecode requires root privileges on most systems',
                'The simulator runs as root by default'
              ]
            },
            {
              id: 'step-d1-1-basic',
              type: 'command',
              title: 'View All System Information',
              content: 'Start by viewing the complete DMI table. This shows all hardware information available.',
              expectedCommand: 'dmidecode',
              commandHint: 'Simply type "dmidecode" without any arguments',
              successMessage: 'You can see the full DMI table including BIOS, system, and hardware information.',
              tips: [
                'The output is organized by DMI type numbers',
                'Look for "NVIDIA" in the manufacturer fields for DGX systems'
              ]
            },
            {
              id: 'step-d1-1-bios',
              type: 'command',
              title: 'Query BIOS Information',
              content: 'Use the `-t` flag to query specific DMI types. Type 0 contains BIOS information.',
              expectedCommand: 'dmidecode -t bios',
              validationPattern: /dmidecode\s+(-t\s+bios|-t\s+0|--type\s+bios|--type\s+0)/,
              commandHint: 'Try: dmidecode -t bios (or dmidecode -t 0)',
              successMessage: 'The BIOS section shows vendor, version, and release date.',
              tips: [
                'BIOS updates may be required for new GPU support',
                'Check BIOS version against NVIDIA release notes'
              ]
            },
            {
              id: 'step-d1-1-system',
              type: 'command',
              title: 'Query System Information',
              content: 'Type 1 contains system-level information including manufacturer, product name, and serial number.',
              expectedCommand: 'dmidecode -t system',
              validationPattern: /dmidecode\s+(-t\s+system|-t\s+1|--type\s+system|--type\s+1)/,
              commandHint: 'Try: dmidecode -t system',
              successMessage: 'System information shows the DGX model (A100, H100, etc.) and serial numbers.',
              tips: [
                'Serial number is needed for NVIDIA support cases',
                'Product Name identifies the exact DGX model'
              ]
            },
            {
              id: 'step-d1-1-memory',
              type: 'command',
              title: 'Check Memory Configuration',
              content: 'Memory information is in DMI type 17. This is crucial for verifying RAM configuration on DGX systems.',
              expectedCommand: 'dmidecode -t memory',
              validationPattern: /dmidecode\s+(-t\s+memory|-t\s+17|--type\s+memory|--type\s+17)/,
              commandHint: 'Try: dmidecode -t memory (or dmidecode -t 17)',
              successMessage: 'You can see each DIMM slot with its size, speed, and manufacturer.',
              tips: [
                'DGX A100 typically has 1TB or 2TB of system RAM',
                'Verify all DIMMs are recognized and running at rated speed'
              ]
            },
            {
              id: 'step-d1-1-processor',
              type: 'command',
              title: 'Check Processor Information',
              content: 'Type 4 shows CPU details including model, cores, and speed.',
              expectedCommand: 'dmidecode -t processor',
              validationPattern: /dmidecode\s+(-t\s+processor|-t\s+4)/,
              commandHint: 'Try: dmidecode -t processor',
              successMessage: 'Shows CPU model, core count, and current/max speed.',
              tips: [
                'DGX A100 uses dual AMD EPYC 7742 (128 cores total)',
                'DGX H100 uses dual Intel Xeon Platinum 8480C'
              ]
            },
            {
              id: 'step-d1-1-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of dmidecode.',
              quizQuestion: 'Which dmidecode type number contains BIOS information?',
              quizChoices: ['Type 0', 'Type 1', 'Type 2', 'Type 17'],
              quizCorrectIndex: 0,
              quizExplanation: 'Type 0 contains BIOS information. Type 1 is System, Type 2 is Baseboard, Type 17 is Memory Device.'
            }
          ]
        },
        {
          id: 'lesson-d1-ipmitool',
          title: 'BMC Management with ipmitool',
          description: 'Learn to manage the Baseboard Management Controller',
          objectives: [
            'Understand IPMI and BMC concepts',
            'Query sensor readings',
            'Manage system power state',
            'Access system event logs'
          ],
          estimatedMinutes: 25,
          commands: ['ipmitool'],
          difficulty: 'beginner',
          prerequisites: ['lesson-d1-dmidecode'],
          steps: [
            {
              id: 'step-d1-2-intro',
              type: 'concept',
              title: 'Understanding IPMI and BMC',
              content: `**IPMI (Intelligent Platform Management Interface)** is a standardized interface for hardware management. The **BMC (Baseboard Management Controller)** is a specialized processor that implements IPMI.

On DGX systems, the BMC provides:
- Out-of-band management (works even when OS is down)
- Hardware sensor monitoring (temperature, voltage, fan speeds)
- System event logging
- Remote power control
- Serial-over-LAN console access
- Virtual media mounting

The \`ipmitool\` command is the primary interface for interacting with the BMC.

**Key ipmitool subcommands:**
| Command | Description |
|---------|-------------|
| sensor | Read hardware sensors |
| sel | System Event Log |
| power | Power control |
| chassis | Chassis status |
| mc | Management Controller info |
| lan | Network configuration |`,
              tips: [
                'BMC has its own IP address for network management',
                'Default credentials should be changed for security'
              ]
            },
            {
              id: 'step-d1-2-sensors',
              type: 'command',
              title: 'Reading Sensor Data',
              content: 'Check all hardware sensors including temperatures, voltages, and fan speeds.',
              expectedCommand: 'ipmitool sensor',
              validationPattern: /ipmitool\s+sensor(\s+list)?$/,
              commandHint: 'Try: ipmitool sensor',
              successMessage: 'The sensor output shows readings, thresholds, and status for all monitored components.',
              tips: [
                'Pay attention to temperature sensors for GPU and CPU',
                'Fan speeds should increase under load'
              ]
            },
            {
              id: 'step-d1-2-sensor-specific',
              type: 'command',
              title: 'Read Specific Sensor',
              content: 'Read a specific sensor by name for targeted monitoring.',
              expectedCommand: 'ipmitool sensor get "CPU Temp"',
              validationPattern: /ipmitool\s+sensor\s+(get|reading)/,
              commandHint: 'Try: ipmitool sensor get "CPU Temp"',
              successMessage: 'Shows detailed information for a single sensor including all thresholds.',
              tips: [
                'Sensor names are case-sensitive',
                'Use quotes for names with spaces'
              ]
            },
            {
              id: 'step-d1-2-sel',
              type: 'command',
              title: 'System Event Log',
              content: 'The SEL (System Event Log) records hardware events. This is crucial for troubleshooting.',
              expectedCommand: 'ipmitool sel list',
              validationPattern: /ipmitool\s+sel\s+list/,
              commandHint: 'Try: ipmitool sel list',
              successMessage: 'The SEL shows timestamped hardware events. Look for errors or warnings.',
              tips: [
                'SEL entries persist across reboots',
                'Clear old entries with "ipmitool sel clear" after reviewing'
              ]
            },
            {
              id: 'step-d1-2-sel-info',
              type: 'command',
              title: 'SEL Information',
              content: 'Check SEL capacity and usage.',
              expectedCommand: 'ipmitool sel info',
              validationPattern: /ipmitool\s+sel\s+info/,
              commandHint: 'Try: ipmitool sel info',
              successMessage: 'Shows how many entries are in the SEL and total capacity.',
              tips: [
                'If SEL is nearly full, older events may be lost',
                'Regularly export and clear the SEL'
              ]
            },
            {
              id: 'step-d1-2-power',
              type: 'command',
              title: 'Check Power Status',
              content: 'Query the current power state of the system.',
              expectedCommand: 'ipmitool power status',
              validationPattern: /ipmitool\s+(power\s+status|chassis\s+power\s+status)/,
              commandHint: 'Try: ipmitool power status',
              successMessage: 'You can see whether the chassis power is on or off.',
              tips: [
                'Other power commands: on, off, cycle, reset',
                'Use with caution on production systems!'
              ]
            },
            {
              id: 'step-d1-2-chassis',
              type: 'command',
              title: 'Chassis Status',
              content: 'Get detailed chassis status including intrusion detection.',
              expectedCommand: 'ipmitool chassis status',
              validationPattern: /ipmitool\s+chassis\s+status/,
              commandHint: 'Try: ipmitool chassis status',
              successMessage: 'Shows power state, last restart cause, and chassis intrusion status.',
              tips: [
                'Check "Last Power Event" for unexpected restarts',
                'Chassis intrusion can indicate physical tampering'
              ]
            },
            {
              id: 'step-d1-2-mc',
              type: 'command',
              title: 'BMC Information',
              content: 'Get information about the BMC itself.',
              expectedCommand: 'ipmitool mc info',
              validationPattern: /ipmitool\s+mc\s+info/,
              commandHint: 'Try: ipmitool mc info',
              successMessage: 'Shows BMC firmware version and capabilities.',
              tips: [
                'BMC firmware should be updated along with BIOS',
                'Check NVIDIA release notes for compatible versions'
              ]
            },
            {
              id: 'step-d1-2-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of IPMI.',
              quizQuestion: 'What does BMC stand for?',
              quizChoices: [
                'Basic Management Console',
                'Baseboard Management Controller',
                'BIOS Management Center',
                'Base Module Controller'
              ],
              quizCorrectIndex: 1,
              quizExplanation: 'BMC stands for Baseboard Management Controller. It\'s a specialized microcontroller embedded on the motherboard for out-of-band management.'
            }
          ]
        }
      ]
    },
    // Module 2: Driver Management
    {
      id: 'mod-d1-drivers',
      title: 'Driver Management',
      description: 'Installing, verifying, and troubleshooting NVIDIA drivers',
      icon: '',
      order: 2,
      prerequisites: ['mod-d1-bios-bmc'],
      lessons: [
        {
          id: 'lesson-d1-nvidia-smi-basics',
          title: 'nvidia-smi Fundamentals',
          description: 'Master the essential nvidia-smi commands for driver verification',
          objectives: [
            'Check driver version and GPU detection',
            'Understand nvidia-smi output format',
            'Monitor GPU utilization and memory'
          ],
          estimatedMinutes: 25,
          commands: ['nvidia-smi'],
          difficulty: 'beginner',
          steps: [
            {
              id: 'step-d1-3-intro',
              type: 'concept',
              title: 'Introduction to nvidia-smi',
              content: `**nvidia-smi** (NVIDIA System Management Interface) is the most important tool for managing NVIDIA GPUs. It provides:

- Driver version information
- GPU identification and enumeration
- Real-time monitoring of GPU state
- Configuration and management capabilities

If nvidia-smi fails to run, it usually indicates driver issues. This is often the first command to run when troubleshooting GPU problems.

**Key Information Displayed:**
| Field | Description |
|-------|-------------|
| Driver Version | Installed driver version |
| CUDA Version | Maximum supported CUDA version |
| GPU Name | Model (e.g., A100-SXM4-80GB) |
| Persistence-M | Persistence mode state |
| Temp | Current GPU temperature |
| Pwr:Usage/Cap | Power usage and limit |
| Memory-Usage | VRAM usage |
| GPU-Util | Compute utilization percentage |`,
              tips: [
                'nvidia-smi is part of the NVIDIA driver package',
                'A working nvidia-smi confirms driver is loaded'
              ]
            },
            {
              id: 'step-d1-3-basic',
              type: 'command',
              title: 'Basic GPU Status',
              content: 'Run nvidia-smi without arguments to see the default status view.',
              expectedCommand: 'nvidia-smi',
              commandHint: 'Simply type: nvidia-smi',
              successMessage: 'The default view shows all GPUs with temperature, utilization, and memory usage.',
              tips: [
                'The top section shows driver and CUDA versions',
                'Each GPU has its own row in the table'
              ]
            },
            {
              id: 'step-d1-3-list',
              type: 'command',
              title: 'List All GPUs',
              content: 'Use the -L flag to get a simple list of all detected GPUs.',
              expectedCommand: 'nvidia-smi -L',
              validationPattern: /nvidia-smi\s+(-L|--list-gpus)/,
              commandHint: 'Try: nvidia-smi -L',
              successMessage: 'Each GPU is listed with its UUID and name. DGX A100 has 8 GPUs.',
              tips: [
                'GPU UUIDs are useful for uniquely identifying GPUs',
                'Missing GPUs here indicate detection problems'
              ]
            },
            {
              id: 'step-d1-3-query',
              type: 'command',
              title: 'Query Specific GPU Info',
              content: 'Use --query-gpu to get specific information in a parseable format.',
              expectedCommand: 'nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv',
              validationPattern: /nvidia-smi\s+--query-gpu=.*--format=csv/,
              commandHint: 'Try: nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv',
              successMessage: 'Query mode provides specific data fields in CSV format for scripting.',
              tips: [
                'Use --help-query-gpu to see all available fields',
                'This format is ideal for monitoring scripts'
              ]
            },
            {
              id: 'step-d1-3-loop',
              type: 'command',
              title: 'Continuous Monitoring',
              content: 'Use the -l flag to continuously monitor GPU status.',
              expectedCommand: 'nvidia-smi -l 1',
              validationPattern: /nvidia-smi\s+(-l|--loop)/,
              commandHint: 'Try: nvidia-smi -l 1 (refreshes every 1 second)',
              successMessage: 'The display updates automatically. Press Ctrl+C to exit.',
              tips: [
                'Useful for watching GPU behavior during workloads',
                'Add -f to log to a file'
              ]
            },
            {
              id: 'step-d1-3-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of nvidia-smi.',
              quizQuestion: 'If nvidia-smi fails to run, what is the most likely cause?',
              quizChoices: [
                'GPU hardware failure',
                'NVIDIA driver not installed or not loaded',
                'Insufficient permissions',
                'Network connectivity issues'
              ],
              quizCorrectIndex: 1,
              quizExplanation: 'nvidia-smi requires the NVIDIA kernel driver to be loaded. If it fails, check that the driver is installed and the nvidia kernel module is loaded (lsmod | grep nvidia).'
            }
          ]
        },
        {
          id: 'lesson-d1-nvidia-smi-advanced',
          title: 'Advanced nvidia-smi Usage',
          description: 'Master advanced nvidia-smi features for detailed GPU management',
          objectives: [
            'Use display flags for focused output',
            'Configure persistence mode',
            'Understand clock and power management'
          ],
          estimatedMinutes: 20,
          commands: ['nvidia-smi'],
          difficulty: 'intermediate',
          prerequisites: ['lesson-d1-nvidia-smi-basics'],
          steps: [
            {
              id: 'step-d1-3a-display',
              type: 'concept',
              title: 'Display Flags Overview',
              content: `nvidia-smi supports display flags (-d) to show specific categories of information:

| Flag | Description |
|------|-------------|
| MEMORY | Memory usage details |
| UTILIZATION | GPU and memory utilization |
| ECC | ECC error counts |
| TEMPERATURE | Thermal information |
| POWER | Power consumption |
| CLOCK | Clock frequencies |
| COMPUTE | Compute mode |
| PIDS | Running processes |
| PERFORMANCE | Performance state |
| ACCOUNTING | Process accounting |

Multiple flags can be combined: \`nvidia-smi -d MEMORY,UTILIZATION\``,
              tips: [
                'Display flags reduce output to relevant information',
                'Combine with -q for detailed query output'
              ]
            },
            {
              id: 'step-d1-3a-memory',
              type: 'command',
              title: 'Memory Information',
              content: 'View detailed memory usage information.',
              expectedCommand: 'nvidia-smi -d MEMORY',
              validationPattern: /nvidia-smi\s+(-d\s+MEMORY|--display=MEMORY)/i,
              commandHint: 'Try: nvidia-smi -d MEMORY',
              successMessage: 'Shows total, used, and free memory for each GPU.',
              tips: [
                'BAR1 memory is used for PCIe mapping',
                'FB (framebuffer) is the main GPU memory'
              ]
            },
            {
              id: 'step-d1-3a-ecc',
              type: 'command',
              title: 'ECC Error Information',
              content: 'Check ECC (Error Correcting Code) memory errors.',
              expectedCommand: 'nvidia-smi -d ECC',
              validationPattern: /nvidia-smi\s+(-d\s+ECC|--display=ECC)/i,
              commandHint: 'Try: nvidia-smi -d ECC',
              successMessage: 'Shows single-bit (corrected) and double-bit (uncorrected) errors.',
              tips: [
                'Volatile errors clear on reboot',
                'Aggregate errors are lifetime totals'
              ]
            },
            {
              id: 'step-d1-3a-persistence',
              type: 'concept',
              title: 'Persistence Mode',
              content: `**Persistence Mode** keeps the NVIDIA driver loaded even when no applications are using the GPU. Benefits:

- Faster application startup (no driver initialization)
- Consistent power management
- Required for many cluster environments

Without persistence mode:
- Driver unloads when last GPU application exits
- Next application has initialization delay
- GPU may reset to default clocks

Enable with: \`nvidia-smi -pm 1\` (requires root)`,
              tips: [
                'Always enable on production DGX systems',
                'Can also be enabled via nvidia-persistenced daemon'
              ]
            },
            {
              id: 'step-d1-3a-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of advanced nvidia-smi.',
              quizQuestion: 'What is the benefit of enabling persistence mode?',
              quizChoices: [
                'Increases GPU performance',
                'Reduces power consumption',
                'Keeps driver loaded for faster application startup',
                'Enables ECC memory'
              ],
              quizCorrectIndex: 2,
              quizExplanation: 'Persistence mode keeps the NVIDIA driver loaded even when no applications are using the GPU. This eliminates the initialization delay when starting new GPU applications.'
            }
          ]
        },
        {
          id: 'lesson-d1-kernel-modules',
          title: 'Kernel Module Management',
          description: 'Understanding and managing NVIDIA kernel modules',
          objectives: [
            'List loaded kernel modules',
            'Understand module dependencies',
            'Query module information'
          ],
          estimatedMinutes: 15,
          commands: ['lsmod', 'modinfo'],
          difficulty: 'intermediate',
          prerequisites: ['lesson-d1-nvidia-smi-basics'],
          steps: [
            {
              id: 'step-d1-4-intro',
              type: 'concept',
              title: 'Kernel Modules for NVIDIA GPUs',
              content: `Linux kernel modules are pieces of code that can be loaded into the kernel on demand. NVIDIA GPUs require several kernel modules:

| Module | Purpose |
|--------|---------|
| nvidia | Main GPU driver module |
| nvidia_modeset | Display mode setting |
| nvidia_uvm | Unified Virtual Memory (for CUDA) |
| nvidia_drm | Direct Rendering Manager integration |
| nvidia_peermem | GPU Direct RDMA support |

Understanding these modules helps diagnose driver issues and verify proper installation.`,
              tips: [
                'Modules are loaded automatically at boot',
                'Some modules have dependencies on others'
              ]
            },
            {
              id: 'step-d1-4-lsmod',
              type: 'command',
              title: 'List NVIDIA Modules',
              content: 'Use lsmod to see all loaded kernel modules. Filter for nvidia modules.',
              expectedCommand: 'lsmod | grep nvidia',
              validationPattern: /lsmod\s*\|\s*grep\s+nvidia/,
              commandHint: 'Try: lsmod | grep nvidia',
              successMessage: 'You can see all nvidia modules and their dependencies (Used by column).',
              tips: [
                'The "Used by" count shows how many things depend on this module',
                'A module with dependencies cannot be unloaded'
              ]
            },
            {
              id: 'step-d1-4-modinfo',
              type: 'command',
              title: 'Module Information',
              content: 'Get detailed information about a specific module using modinfo.',
              expectedCommand: 'modinfo nvidia',
              validationPattern: /modinfo\s+nvidia/,
              commandHint: 'Try: modinfo nvidia',
              successMessage: 'modinfo shows the module version, parameters, and file location.',
              tips: [
                'The version here should match nvidia-smi output',
                'srcversion helps identify exact build'
              ]
            },
            {
              id: 'step-d1-4-mlx',
              type: 'command',
              title: 'InfiniBand Modules',
              content: 'DGX systems use Mellanox InfiniBand NICs. Check those modules too.',
              expectedCommand: 'lsmod | grep mlx',
              validationPattern: /lsmod\s*\|\s*grep\s+mlx/,
              commandHint: 'Try: lsmod | grep mlx',
              successMessage: 'Shows mlx5_core and related InfiniBand driver modules.',
              tips: [
                'mlx5_core is the main Mellanox driver',
                'ib_core provides InfiniBand protocol support'
              ]
            },
            {
              id: 'step-d1-4-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of kernel modules.',
              quizQuestion: 'Which command shows information about a kernel module including its version?',
              quizChoices: ['lsmod', 'modinfo', 'modprobe', 'insmod'],
              quizCorrectIndex: 1,
              quizExplanation: 'modinfo displays detailed information about a kernel module. lsmod lists loaded modules, modprobe loads/unloads modules, and insmod is a lower-level insert tool.'
            }
          ]
        }
      ]
    },
    // Module 3: System Information
    {
      id: 'mod-d1-sysinfo',
      title: 'System Information & Monitoring',
      description: 'Understanding DGX system configuration and monitoring',
      icon: '',
      order: 3,
      prerequisites: ['mod-d1-drivers'],
      lessons: [
        {
          id: 'lesson-d1-linux-basics',
          title: 'Linux System Commands',
          description: 'Essential Linux commands for DGX administration',
          objectives: [
            'Check system resources',
            'Monitor processes',
            'Understand NUMA topology'
          ],
          estimatedMinutes: 20,
          commands: ['uname', 'uptime', 'top', 'numactl'],
          difficulty: 'beginner',
          steps: [
            {
              id: 'step-d1-5-uname',
              type: 'command',
              title: 'System Identification',
              content: 'Use uname to identify the system and kernel version.',
              expectedCommand: 'uname -a',
              validationPattern: /uname\s+-a/,
              commandHint: 'Try: uname -a',
              successMessage: 'Shows kernel version, hostname, and architecture.',
              tips: [
                'Kernel version affects driver compatibility',
                'DGX OS is based on Ubuntu'
              ]
            },
            {
              id: 'step-d1-5-uptime',
              type: 'command',
              title: 'System Uptime',
              content: 'Check how long the system has been running and load averages.',
              expectedCommand: 'uptime',
              commandHint: 'Type: uptime',
              successMessage: 'Shows uptime, users, and load averages.',
              tips: [
                'Load average shows 1, 5, and 15 minute averages',
                'On DGX A100 (128 cores), load of 128 means full CPU utilization'
              ]
            },
            {
              id: 'step-d1-5-top',
              type: 'command',
              title: 'Process Monitoring',
              content: 'Use top to monitor system processes and resource usage.',
              expectedCommand: 'top',
              commandHint: 'Type: top (press q to quit)',
              successMessage: 'Shows real-time process list sorted by resource usage.',
              tips: [
                'Press 1 to show per-CPU usage',
                'Press M to sort by memory'
              ]
            },
            {
              id: 'step-d1-5-numa',
              type: 'concept',
              title: 'NUMA Architecture',
              content: `**NUMA (Non-Uniform Memory Access)** is a memory architecture where memory access time depends on the memory location relative to a processor.

DGX systems have multiple NUMA nodes:
- Each CPU socket is a NUMA node
- GPUs are attached to specific NUMA nodes
- Optimal performance requires matching processes to their local NUMA node

**GPU-NUMA Affinity on DGX A100:**
- GPUs 0-3: NUMA node 0 (CPU 0)
- GPUs 4-7: NUMA node 1 (CPU 1)

Placing workloads on the correct NUMA node reduces memory latency.`,
              tips: [
                'Use numactl to control NUMA placement',
                'nvidia-smi topo shows GPU NUMA affinity'
              ]
            },
            {
              id: 'step-d1-5-numactl',
              type: 'command',
              title: 'NUMA Information',
              content: 'Use numactl to view NUMA topology.',
              expectedCommand: 'numactl --hardware',
              validationPattern: /numactl\s+(--hardware|-H)/,
              commandHint: 'Try: numactl --hardware',
              successMessage: 'Shows NUMA nodes, CPUs per node, and memory per node.',
              tips: [
                'DGX A100 has 2 NUMA nodes',
                'Each node has half the CPUs and memory'
              ]
            },
            {
              id: 'step-d1-5-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of NUMA.',
              quizQuestion: 'Why is NUMA awareness important on DGX systems?',
              quizChoices: [
                'It increases GPU memory',
                'It reduces memory access latency by keeping data local',
                'It enables more GPUs',
                'It improves network speed'
              ],
              quizCorrectIndex: 1,
              quizExplanation: 'NUMA awareness ensures that processes access memory from their local NUMA node, reducing latency. On DGX systems, this also means matching GPU workloads with the CPUs on the same NUMA node.'
            }
          ]
        },
        {
          id: 'lesson-d1-fabric-manager',
          title: 'NVIDIA Fabric Manager',
          description: 'Understanding NVSwitch and Fabric Manager for multi-GPU systems',
          objectives: [
            'Understand NVSwitch topology',
            'Check Fabric Manager status',
            'Troubleshoot fabric connectivity'
          ],
          estimatedMinutes: 15,
          commands: ['nv-fabricmanager', 'systemctl'],
          difficulty: 'intermediate',
          prerequisites: ['lesson-d1-linux-basics'],
          steps: [
            {
              id: 'step-d1-6-intro',
              type: 'concept',
              title: 'NVSwitch and Fabric Manager',
              content: `**NVSwitch** is NVIDIA's high-bandwidth switch chip that enables all-to-all GPU communication. DGX A100 has 6 NVSwitch chips.

**Fabric Manager** is a service that:
- Manages NVSwitch topology
- Configures GPU-to-GPU routing
- Monitors fabric health
- Required for multi-GPU operations

Without Fabric Manager running:
- Multi-GPU training will fail
- nvidia-smi may show topology issues
- NCCL operations will have errors`,
              tips: [
                'Fabric Manager must be running for full GPU connectivity',
                'Check with systemctl status nvidia-fabricmanager'
              ]
            },
            {
              id: 'step-d1-6-status',
              type: 'command',
              title: 'Check Fabric Manager Status',
              content: 'Verify that Fabric Manager service is running.',
              expectedCommand: 'systemctl status nvidia-fabricmanager',
              validationPattern: /systemctl\s+status\s+nvidia-fabricmanager/,
              commandHint: 'Try: systemctl status nvidia-fabricmanager',
              successMessage: 'Shows whether the service is active and recent log messages.',
              tips: [
                'Status should be "active (running)"',
                'Check logs for initialization errors'
              ]
            },
            {
              id: 'step-d1-6-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of Fabric Manager.',
              quizQuestion: 'What happens if Fabric Manager is not running on a DGX A100?',
              quizChoices: [
                'GPUs will run at reduced clock speed',
                'Only single-GPU operations will work correctly',
                'The system will not boot',
                'GPU temperatures will increase'
              ],
              quizCorrectIndex: 1,
              quizExplanation: 'Without Fabric Manager, the NVSwitch fabric is not properly configured, and multi-GPU operations will fail or have degraded performance. Single-GPU workloads will still work.'
            }
          ]
        }
      ]
    }
  ],
  totalEstimatedMinutes: 135
};
