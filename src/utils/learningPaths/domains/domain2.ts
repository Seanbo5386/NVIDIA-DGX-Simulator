/**
 * Domain 2: Accelerator Configuration (5% of exam)
 */

import type { LearningPath } from '../types';

export const DOMAIN2_PATH: LearningPath = {
  id: 'path-domain2',
  domainId: 'domain2',
  title: 'Accelerator Configuration',
  description: 'Configure BlueField DPUs, MIG partitions, NVLink, and GPU topology',
  examWeight: 5,
  skills: [
    'MIG configuration',
    'NVLink topology understanding',
    'GPU affinity and NUMA',
    'BlueField DPU basics',
    'Persistence mode management',
    'Compute mode settings'
  ],
  modules: [
    {
      id: 'mod-d2-topology',
      title: 'GPU Topology & NVLink',
      description: 'Understanding GPU interconnects and topology',
      icon: '',
      order: 1,
      lessons: [
        {
          id: 'lesson-d2-topo',
          title: 'GPU Topology Analysis',
          description: 'Learn to analyze GPU topology and NVLink connections',
          objectives: [
            'Understand NVLink interconnects',
            'Read topology matrices',
            'Identify optimal GPU pairs for workloads'
          ],
          estimatedMinutes: 25,
          commands: ['nvidia-smi topo', 'nvidia-smi nvlink'],
          difficulty: 'intermediate',
          steps: [
            {
              id: 'step-d2-1-intro',
              type: 'concept',
              title: 'NVLink and GPU Topology',
              content: `**NVLink** is NVIDIA's high-speed interconnect that provides direct GPU-to-GPU communication.

**DGX A100 Specifications:**
- 8 A100 GPUs per system
- 12 NVLink connections per GPU
- 600 GB/s total bandwidth per GPU
- 6 NVSwitch chips for all-to-all connectivity

**Connection Types in Topology Matrix:**
| Symbol | Meaning |
|--------|---------|
| X | Self (same GPU) |
| NV# | # NVLink connections |
| SYS | Through CPU/PCIe |
| PHB | Through PCIe Host Bridge |
| NODE | Same NUMA node |

Understanding topology helps optimize multi-GPU workloads by placing communicating processes on well-connected GPUs.`,
              tips: [
                'NVLink is much faster than PCIe for GPU-to-GPU transfers',
                'DGX uses NVSwitch for full bisection bandwidth'
              ]
            },
            {
              id: 'step-d2-1-topo',
              type: 'command',
              title: 'View Topology Matrix',
              content: 'Display the GPU topology matrix showing interconnect types between all GPUs.',
              expectedCommand: 'nvidia-smi topo -m',
              validationPattern: /nvidia-smi\s+topo\s+(-m|--matrix)/,
              commandHint: 'Try: nvidia-smi topo -m',
              successMessage: 'The matrix shows connection types: NV# for NVLink, SYS for system/PCIe.',
              tips: [
                'NV12 means 12 NVLink connections (best)',
                'SYS means going through system (slower)'
              ]
            },
            {
              id: 'step-d2-1-nvlink-status',
              type: 'command',
              title: 'NVLink Status',
              content: 'Check the status of all NVLink connections.',
              expectedCommand: 'nvidia-smi nvlink -s',
              validationPattern: /nvidia-smi\s+nvlink\s+(-s|--status)/,
              commandHint: 'Try: nvidia-smi nvlink -s',
              successMessage: 'This shows NVLink status per GPU. All links should be active.',
              tips: [
                'Inactive links may indicate hardware issues',
                'Check for NVLink errors in error counters'
              ]
            },
            {
              id: 'step-d2-1-nvlink-errors',
              type: 'command',
              title: 'NVLink Error Counters',
              content: 'Check for NVLink errors across all GPUs.',
              expectedCommand: 'nvidia-smi nvlink -e',
              validationPattern: /nvidia-smi\s+nvlink\s+(-e|--error)/,
              commandHint: 'Try: nvidia-smi nvlink -e',
              successMessage: 'Shows error counts for each NVLink connection.',
              tips: [
                'Non-zero errors may indicate cable or hardware issues',
                'CRC errors can occur with damaged cables'
              ]
            },
            {
              id: 'step-d2-1-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of GPU topology.',
              quizQuestion: 'What does NV12 mean in the nvidia-smi topology matrix?',
              quizChoices: [
                'NVIDIA driver version 12',
                '12 NVLink connections between GPUs',
                'GPU ID 12',
                '12 GB/s bandwidth'
              ],
              quizCorrectIndex: 1,
              quizExplanation: 'NV12 indicates 12 NVLink connections between the two GPUs, providing maximum bandwidth. Each NVLink provides 50 GB/s bidirectional on A100.'
            }
          ]
        },
        {
          id: 'lesson-d2-mig',
          title: 'Multi-Instance GPU (MIG)',
          description: 'Configure and manage MIG partitions on A100 GPUs',
          objectives: [
            'Understand MIG concepts',
            'Enable and disable MIG mode',
            'Create and manage MIG instances',
            'Monitor MIG utilization'
          ],
          estimatedMinutes: 30,
          commands: ['nvidia-smi mig'],
          difficulty: 'advanced',
          prerequisites: ['lesson-d2-topo'],
          steps: [
            {
              id: 'step-d2-2-intro',
              type: 'concept',
              title: 'Multi-Instance GPU Overview',
              content: `**MIG (Multi-Instance GPU)** allows partitioning an A100 GPU into up to 7 isolated instances. Each instance has:

- Dedicated compute resources (Streaming Multiprocessors)
- Isolated memory bandwidth and capacity
- Separate error isolation
- Independent scheduling

**MIG Profiles on A100-80GB:**
| Profile | Memory | SMs | Instances |
|---------|--------|-----|-----------|
| 7g.80gb | 80 GB | 98 | 1 |
| 4g.40gb | 40 GB | 56 | 2 |
| 3g.40gb | 40 GB | 42 | 2 |
| 2g.20gb | 20 GB | 28 | 3 |
| 1g.10gb | 10 GB | 14 | 7 |

**Key Concepts:**
- **GPU Instance (GI)**: Hardware partition with memory and compute
- **Compute Instance (CI)**: Compute-only partition within a GI
- **MIG Device**: Combination of GI + CI visible to applications`,
              tips: [
                'MIG requires A100 or newer GPUs',
                'Enabling MIG requires GPU reset (no running processes)'
              ]
            },
            {
              id: 'step-d2-2-status',
              type: 'command',
              title: 'Check MIG Mode Status',
              content: 'First, check if MIG mode is enabled on your GPUs.',
              expectedCommand: 'nvidia-smi -i 0 --query-gpu=mig.mode.current --format=csv',
              validationPattern: /nvidia-smi.*mig\.mode/,
              commandHint: 'Try: nvidia-smi -i 0 --query-gpu=mig.mode.current --format=csv',
              successMessage: 'Shows whether MIG mode is Enabled or Disabled for GPU 0.',
              tips: [
                'MIG mode change requires reboot or driver reload',
                'All GPUs can have different MIG states'
              ]
            },
            {
              id: 'step-d2-2-profiles',
              type: 'command',
              title: 'List MIG Profiles',
              content: 'View available MIG profiles for partitioning the GPU.',
              expectedCommand: 'nvidia-smi mig -lgip',
              validationPattern: /nvidia-smi\s+mig\s+(-lgip|--list-gpu-instance-profiles)/,
              commandHint: 'Try: nvidia-smi mig -lgip',
              successMessage: 'Shows available GPU Instance profiles with their memory and SM counts.',
              tips: [
                '7g.80gb (or 7g.40gb) gives full GPU resources',
                '1g.10gb (or 1g.5gb) gives 1/7 of the GPU'
              ]
            },
            {
              id: 'step-d2-2-list-gi',
              type: 'command',
              title: 'List GPU Instances',
              content: 'View currently created GPU Instances.',
              expectedCommand: 'nvidia-smi mig -lgi',
              validationPattern: /nvidia-smi\s+mig\s+(-lgi|--list-gpu-instances)/,
              commandHint: 'Try: nvidia-smi mig -lgi',
              successMessage: 'Shows all GPU Instances across all MIG-enabled GPUs.',
              tips: [
                'Each GI has an ID used for further operations',
                'GI must exist before creating CI'
              ]
            },
            {
              id: 'step-d2-2-list-ci',
              type: 'command',
              title: 'List Compute Instances',
              content: 'View Compute Instances within GPU Instances.',
              expectedCommand: 'nvidia-smi mig -lci',
              validationPattern: /nvidia-smi\s+mig\s+(-lci|--list-compute-instances)/,
              commandHint: 'Try: nvidia-smi mig -lci',
              successMessage: 'Shows all Compute Instances and their parent GPU Instances.',
              tips: [
                'CI inherits compute resources from parent GI',
                'A GI can have multiple CIs for finer granularity'
              ]
            },
            {
              id: 'step-d2-2-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of MIG.',
              quizQuestion: 'What is the maximum number of MIG instances on a single A100 GPU?',
              quizChoices: ['3', '5', '7', '8'],
              quizCorrectIndex: 2,
              quizExplanation: 'An A100 can be partitioned into up to 7 MIG instances using the 1g.10gb (or 1g.5gb) profile. Larger profiles result in fewer instances.'
            }
          ]
        }
      ]
    },
    {
      id: 'mod-d2-gpu-config',
      title: 'GPU Configuration',
      description: 'Configuring GPU modes and settings',
      icon: '',
      order: 2,
      prerequisites: ['mod-d2-topology'],
      lessons: [
        {
          id: 'lesson-d2-persistence',
          title: 'Persistence Mode & Settings',
          description: 'Configure persistence mode and other GPU settings',
          objectives: [
            'Enable and manage persistence mode',
            'Understand compute modes',
            'Configure power limits'
          ],
          estimatedMinutes: 15,
          commands: ['nvidia-smi'],
          difficulty: 'intermediate',
          steps: [
            {
              id: 'step-d2-3-persist-intro',
              type: 'concept',
              title: 'GPU Configuration Options',
              content: `**Key GPU Configuration Settings:**

**Persistence Mode:**
- Keeps driver loaded between GPU applications
- Reduces startup latency
- Essential for production environments

**Compute Mode:**
| Mode | Description |
|------|-------------|
| Default | Multiple contexts allowed |
| Exclusive Process | One process per GPU |
| Prohibited | No CUDA allowed |

**Power Management:**
- Power limit can be adjusted within supported range
- Lower limits reduce heat but may reduce performance
- Useful for thermal-constrained environments`,
              tips: [
                'Changes require root privileges',
                'Some settings reset on reboot'
              ]
            },
            {
              id: 'step-d2-3-persist-check',
              type: 'command',
              title: 'Check Persistence Mode',
              content: 'Query current persistence mode setting.',
              expectedCommand: 'nvidia-smi --query-gpu=persistence_mode --format=csv',
              validationPattern: /nvidia-smi.*persistence_mode/,
              commandHint: 'Try: nvidia-smi --query-gpu=persistence_mode --format=csv',
              successMessage: 'Shows persistence mode status for each GPU.',
              tips: [
                'Should be "Enabled" for production use',
                'Can also check in main nvidia-smi output'
              ]
            },
            {
              id: 'step-d2-3-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of GPU configuration.',
              quizQuestion: 'What compute mode should be used to ensure only one process can use a GPU at a time?',
              quizChoices: ['Default', 'Exclusive Process', 'Prohibited', 'Shared'],
              quizCorrectIndex: 1,
              quizExplanation: 'Exclusive Process mode ensures that only one CUDA context (process) can use the GPU at a time. This is useful for preventing resource contention.'
            }
          ]
        },
        {
          id: 'lesson-d2-power-management',
          title: 'GPU Power Management',
          description: 'Configure and monitor GPU power settings',
          objectives: [
            'Monitor power consumption',
            'Set power limits',
            'Understand power throttling'
          ],
          estimatedMinutes: 20,
          commands: ['nvidia-smi'],
          difficulty: 'intermediate',
          prerequisites: ['lesson-d2-persistence'],
          steps: [
            {
              id: 'step-d2-4-intro',
              type: 'concept',
              title: 'GPU Power Concepts',
              content: `**A100 Power Specifications:**

| Variant | TDP | Power Range |
|---------|-----|-------------|
| A100 PCIe | 250W | 100-250W |
| A100 SXM4 | 400W | 100-400W |
| H100 SXM5 | 700W | 100-700W |

**Power States (P-states):**
| State | Description |
|-------|-------------|
| P0 | Maximum performance |
| P8 | Basic 3D (not for A100) |
| P12 | Idle, low power |

**Why Adjust Power?**
- Reduce thermals in constrained environments
- Balance power budget across cluster
- Reduce noise in air-cooled systems
- Emergency thermal management`,
              tips: [
                'Lower power = lower thermals but less performance',
                'Changes require root privileges'
              ]
            },
            {
              id: 'step-d2-4-power-query',
              type: 'command',
              title: 'Check Power Usage',
              content: 'Query current power consumption and limits.',
              expectedCommand: 'nvidia-smi --query-gpu=power.draw,power.limit,power.max_limit --format=csv',
              validationPattern: /nvidia-smi.*power\.(draw|limit)/,
              commandHint: 'Try: nvidia-smi --query-gpu=power.draw,power.limit,power.max_limit --format=csv',
              successMessage: 'Shows current draw, current limit, and max allowed limit.',
              tips: [
                'power.draw is real-time consumption',
                'power.max_limit is the hardware maximum'
              ]
            },
            {
              id: 'step-d2-4-power-states',
              type: 'concept',
              title: 'Performance vs Power Tradeoffs',
              content: `**Performance Impact of Power Limits:**

| Power Limit % | Typical Perf Impact |
|---------------|---------------------|
| 100% | Baseline (max) |
| 90% | ~2-5% slower |
| 80% | ~5-10% slower |
| 70% | ~10-15% slower |
| 60% | ~15-25% slower |

**Power Efficiency Curve:**
- GPUs are most efficient at ~80% power
- Last 20% power gives diminishing returns
- Consider 350W vs 400W on A100 SXM4

**Use Cases for Power Limits:**
- Thermal constraints: Reduce to prevent throttling
- Power budget: Cluster-wide power management
- Noise: Lower power = lower fan speeds
- Efficiency: Save power with minimal perf loss`,
              tips: [
                '80% power often gives 95% performance',
                'Power efficiency varies by workload'
              ]
            },
            {
              id: 'step-d2-4-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of power management.',
              quizQuestion: 'What is the TDP (Thermal Design Power) of an A100 SXM4 GPU?',
              quizChoices: ['250W', '350W', '400W', '500W'],
              quizCorrectIndex: 2,
              quizExplanation: 'The A100 SXM4 has a TDP of 400W, while the PCIe variant has 250W TDP. The higher power allows for higher sustained clocks and better cooling with the SXM4 form factor.'
            }
          ]
        }
      ]
    },
    {
      id: 'mod-d2-bluefield',
      title: 'BlueField DPU',
      description: 'Understanding BlueField Data Processing Units',
      icon: '',
      order: 3,
      prerequisites: ['mod-d2-gpu-config'],
      lessons: [
        {
          id: 'lesson-d2-dpu-basics',
          title: 'BlueField DPU Overview',
          description: 'Introduction to BlueField Data Processing Units',
          objectives: [
            'Understand DPU architecture',
            'Know DPU modes of operation',
            'Check DPU status'
          ],
          estimatedMinutes: 20,
          commands: ['mst', 'flint'],
          difficulty: 'advanced',
          steps: [
            {
              id: 'step-d2-5-intro',
              type: 'concept',
              title: 'What is a DPU?',
              content: `**BlueField DPU (Data Processing Unit)** is a SmartNIC with:
- ARM CPU cores (embedded Linux)
- ConnectX network adapter
- Hardware accelerators

**DPU Capabilities:**
| Feature | Description |
|---------|-------------|
| Networking | 100-400 Gb/s Ethernet/InfiniBand |
| Security | Encryption, firewall |
| Storage | NVMe-oF, virtio-blk |
| Virtualization | SR-IOV, OVS offload |

**DGX Integration:**
- DGX A100: ConnectX-6 (not DPU)
- DGX H100: BlueField-3 DPU
- Offloads network/storage from host CPU

**DPU Operating Modes:**
| Mode | Description |
|------|-------------|
| Embedded | DPU controls NIC, host is endpoint |
| Separated | Host controls NIC, DPU is separate |
| Privileged | Full access to both |`,
              tips: [
                'DPU offloads infrastructure work from host',
                'Required for NVIDIA Magnum IO'
              ]
            },
            {
              id: 'step-d2-5-mst',
              type: 'command',
              title: 'Check MST Devices',
              content: 'List Mellanox/NVIDIA devices with MST (Mellanox Software Tools).',
              expectedCommand: 'mst status',
              validationPattern: /mst\s+status/,
              commandHint: 'Try: mst status',
              successMessage: 'Shows all Mellanox devices including ConnectX and BlueField.',
              tips: [
                'MST must be started: mst start',
                'Shows /dev/mst/mtXXXX device paths'
              ]
            },
            {
              id: 'step-d2-5-flint',
              type: 'command',
              title: 'Check Firmware Version',
              content: 'Query firmware version on a Mellanox device.',
              expectedCommand: 'flint -d /dev/mst/mt4125_pciconf0 query',
              validationPattern: /flint\s+(-d|--device).*query/,
              commandHint: 'Try: flint -d /dev/mst/mt4125_pciconf0 query',
              successMessage: 'Shows firmware version, PSID, and device info.',
              tips: [
                'Keep firmware up to date',
                'PSID identifies the exact card variant'
              ]
            },
            {
              id: 'step-d2-5-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of DPU.',
              quizQuestion: 'What does DPU stand for in NVIDIA BlueField context?',
              quizChoices: [
                'Display Processing Unit',
                'Data Processing Unit',
                'Deep Processing Unit',
                'Distributed Processing Unit'
              ],
              quizCorrectIndex: 1,
              quizExplanation: 'DPU stands for Data Processing Unit. BlueField DPUs combine ARM CPUs, ConnectX networking, and hardware accelerators to offload infrastructure tasks from the host.'
            }
          ]
        }
      ]
    }
  ],
  totalEstimatedMinutes: 110
};
