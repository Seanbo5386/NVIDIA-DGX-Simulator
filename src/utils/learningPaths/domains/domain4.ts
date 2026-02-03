/**
 * Domain 4: Validation & Testing (33% of exam)
 */

import type { LearningPath } from '../types';

export const DOMAIN4_PATH: LearningPath = {
  id: 'path-domain4',
  domainId: 'domain4',
  title: 'Validation & Testing',
  description: 'Master NCCL testing, DCGMI diagnostics, health checks, and performance benchmarks',
  examWeight: 33,
  skills: [
    'NCCL performance testing',
    'DCGM diagnostics',
    'Health check procedures',
    'Performance benchmarking',
    'HPL/HPCG testing',
    'Memory bandwidth testing'
  ],
  modules: [
    {
      id: 'mod-d4-dcgm',
      title: 'DCGM Diagnostics',
      description: 'Using NVIDIA Data Center GPU Manager for diagnostics',
      icon: '🔍',
      order: 1,
      lessons: [
        {
          id: 'lesson-d4-dcgmi-basics',
          title: 'DCGMI Fundamentals',
          description: 'Learn DCGM for GPU health monitoring and diagnostics',
          objectives: [
            'Understand DCGM architecture',
            'Check GPU health status',
            'Run diagnostic tests'
          ],
          estimatedMinutes: 30,
          commands: ['dcgmi'],
          difficulty: 'intermediate',
          steps: [
            {
              id: 'step-d4-1-intro',
              type: 'concept',
              title: 'Introduction to DCGM',
              content: `**DCGM (Data Center GPU Manager)** is NVIDIA's tool for managing and monitoring GPUs at scale.

**Capabilities:**
- Health monitoring and diagnostics
- Configuration management
- Policy-based management
- Integration with cluster schedulers
- Telemetry and profiling

**Key Components:**
| Component | Description |
|-----------|-------------|
| nv-hostengine | Background daemon |
| dcgmi | Command-line interface |
| DCGM libraries | For programmatic access |

**DCGM vs nvidia-smi:**
- DCGM can detect memory health issues
- DCGM runs stress tests on GPUs
- DCGM monitors interconnects (NVLink, NVSwitch)
- DCGM integrates with monitoring systems`,
              tips: [
                'DCGM must be running (nv-hostengine)',
                'More thorough than nvidia-smi for health checks'
              ]
            },
            {
              id: 'step-d4-1-discovery',
              type: 'command',
              title: 'GPU Discovery',
              content: 'Discover all GPUs known to DCGM.',
              expectedCommand: 'dcgmi discovery -l',
              validationPattern: /dcgmi\s+discovery\s+(-l|--list)/,
              commandHint: 'Try: dcgmi discovery -l',
              successMessage: 'Shows all GPUs with their entity IDs and basic info.',
              tips: [
                'Entity IDs are used in other DCGM commands',
                'NvSwitches and NICs may also appear'
              ]
            },
            {
              id: 'step-d4-1-health',
              type: 'command',
              title: 'Check GPU Health',
              content: 'Run a quick health check on all GPUs.',
              expectedCommand: 'dcgmi health -c',
              validationPattern: /dcgmi\s+health\s+(-c|--check)/,
              commandHint: 'Try: dcgmi health -c',
              successMessage: 'Shows health status for memory, PCIe, NVLink, and more.',
              tips: [
                'Green = healthy, Yellow = warning, Red = failure',
                'Use -g for group-specific checks'
              ]
            },
            {
              id: 'step-d4-1-health-watch',
              type: 'command',
              title: 'Enable Health Watches',
              content: 'Set up continuous health monitoring.',
              expectedCommand: 'dcgmi health -s mpi',
              validationPattern: /dcgmi\s+health\s+(-s|--set)/,
              commandHint: 'Try: dcgmi health -s mpi (memory, pcie, inforom)',
              successMessage: 'Enables health watches for specified components.',
              tips: [
                'm = memory, p = PCIe, i = InfoROM',
                'Can combine: dcgmi health -s mpin'
              ]
            },
            {
              id: 'step-d4-1-diag',
              type: 'command',
              title: 'Run Diagnostics',
              content: 'Run the short diagnostic test suite.',
              expectedCommand: 'dcgmi diag -r 1',
              validationPattern: /dcgmi\s+diag\s+(-r|--run)\s+[123]/,
              commandHint: 'Try: dcgmi diag -r 1 (1=short, 2=medium, 3=long)',
              successMessage: 'Level 1 runs quick tests. Higher levels are more thorough.',
              tips: [
                'Level 1: Quick deployment check (~1 min)',
                'Level 2: Medium tests (~2 min)',
                'Level 3: Extended stress tests (~15+ min)'
              ]
            },
            {
              id: 'step-d4-1-diag-detail',
              type: 'concept',
              title: 'Diagnostic Levels',
              content: `**DCGM Diagnostic Levels:**

**Level 1 (Quick):**
- Software deployment check
- Basic GPU accessibility
- ~1 minute runtime

**Level 2 (Medium):**
- PCIe bandwidth test
- GPU memory bandwidth
- Basic compute test
- ~2 minutes runtime

**Level 3 (Extended):**
- Full memory stress test
- Extended compute stress
- NVLink bandwidth test
- Diagnostic stress test
- ~15+ minutes runtime

**When to Use Each:**
- Level 1: Quick sanity check, post-maintenance
- Level 2: Regular validation, pre-job checks
- Level 3: Initial deployment, RMA qualification`,
              tips: [
                'Level 3 should be run after hardware changes',
                'Include diag results in support tickets'
              ]
            },
            {
              id: 'step-d4-1-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of DCGM.',
              quizQuestion: 'What diagnostic level should you run for a thorough hardware validation after new deployment?',
              quizChoices: [
                'Level 1 (quick)',
                'Level 2 (medium)',
                'Level 3 (extended)',
                'Level 0 (basic)'
              ],
              quizCorrectIndex: 2,
              quizExplanation: 'Level 3 runs extended stress tests and is recommended for thorough hardware validation after deployment or maintenance. Level 2 is good for regular checks, and Level 1 is for quick deployment verification.'
            }
          ]
        },
        {
          id: 'lesson-d4-dcgm-groups',
          title: 'DCGM Groups and Policies',
          description: 'Organize GPUs and set monitoring policies',
          objectives: [
            'Create and manage GPU groups',
            'Set up health policies',
            'Configure alerts and actions'
          ],
          estimatedMinutes: 20,
          commands: ['dcgmi'],
          difficulty: 'advanced',
          prerequisites: ['lesson-d4-dcgmi-basics'],
          steps: [
            {
              id: 'step-d4-1b-groups',
              type: 'concept',
              title: 'GPU Groups',
              content: `**DCGM Groups** allow managing multiple GPUs as a unit.

**Use Cases:**
- Monitor all GPUs on a node
- Apply policies to specific GPU sets
- Run diagnostics on GPU subsets

**Default Groups:**
- Group 0: All GPUs in the system

**Creating Groups:**
\`\`\`bash
dcgmi group -c mygroup        # Create group
dcgmi group -a 0,1,2 mygroup  # Add GPUs 0,1,2
dcgmi group -l                # List groups
\`\`\``,
              tips: [
                'Groups persist across restarts',
                'Use groups for multi-node monitoring'
              ]
            },
            {
              id: 'step-d4-1b-list',
              type: 'command',
              title: 'List Groups',
              content: 'View all defined GPU groups.',
              expectedCommand: 'dcgmi group -l',
              validationPattern: /dcgmi\s+group\s+(-l|--list)/,
              commandHint: 'Try: dcgmi group -l',
              successMessage: 'Shows all groups and their GPU members.',
              tips: [
                'Group 0 is the default group with all GPUs',
                'Custom groups can be created for specific workloads'
              ]
            },
            {
              id: 'step-d4-1b-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of DCGM groups.',
              quizQuestion: 'What is Group 0 in DCGM?',
              quizChoices: [
                'An empty placeholder group',
                'The default group containing all GPUs',
                'A group for failed GPUs',
                'A group for MIG instances'
              ],
              quizCorrectIndex: 1,
              quizExplanation: 'Group 0 is the default group that automatically contains all GPUs in the system. Custom groups can be created for managing specific GPU subsets.'
            }
          ]
        }
      ]
    },
    {
      id: 'mod-d4-nccl',
      title: 'NCCL Testing',
      description: 'Validating multi-GPU communication with NCCL',
      icon: '🔄',
      order: 2,
      prerequisites: ['mod-d4-dcgm'],
      lessons: [
        {
          id: 'lesson-d4-nccl-tests',
          title: 'NCCL Performance Tests',
          description: 'Run NCCL tests to validate GPU communication',
          objectives: [
            'Understand NCCL collectives',
            'Run all_reduce benchmark',
            'Interpret performance results'
          ],
          estimatedMinutes: 30,
          commands: ['nccl-tests'],
          difficulty: 'advanced',
          steps: [
            {
              id: 'step-d4-2-intro',
              type: 'concept',
              title: 'NCCL Overview',
              content: `**NCCL (NVIDIA Collective Communications Library)** optimizes multi-GPU and multi-node communication.

**Supported Collectives:**
| Collective | Description |
|------------|-------------|
| AllReduce | Combine values from all, distribute result |
| AllGather | Gather data from all to all |
| Broadcast | Send from one to all |
| Reduce | Combine to one destination |
| ReduceScatter | Reduce and scatter results |
| AllToAll | Full exchange between all |

**NCCL Automatically Uses:**
- NVLink (within node, fastest)
- NVSwitch (within node, all-to-all)
- InfiniBand (between nodes)
- PCIe/Ethernet (fallback)

**nccl-tests** is the official benchmark suite for validating NCCL performance.`,
              tips: [
                'NCCL is critical for distributed training',
                'Poor NCCL performance usually indicates hardware/config issues'
              ]
            },
            {
              id: 'step-d4-2-allreduce',
              type: 'command',
              title: 'Run All-Reduce Test',
              content: 'Run the all_reduce benchmark across all local GPUs.',
              expectedCommand: './all_reduce_perf -b 8 -e 256M -f 2 -g 8',
              validationPattern: /all_reduce_perf|nccl.*all.?reduce/i,
              commandHint: 'Try: ./all_reduce_perf -b 8 -e 256M -f 2 -g 8',
              successMessage: 'This runs all_reduce with varying message sizes across 8 GPUs.',
              tips: [
                '-b: starting size, -e: ending size',
                '-f: factor to multiply size by, -g: number of GPUs'
              ]
            },
            {
              id: 'step-d4-2-interpret',
              type: 'concept',
              title: 'Interpreting NCCL Results',
              content: `**Key Metrics in NCCL Output:**

| Column | Description |
|--------|-------------|
| size | Message size in bytes |
| count | Number of elements |
| time | Operation time |
| algbw | Algorithm bandwidth |
| busbw | Bus bandwidth (actual) |

**Expected Bus Bandwidth on DGX A100:**
- 8 GPUs, large messages: ~225-240 GB/s
- Scales with NVSwitch connectivity

**Troubleshooting Low Performance:**
- Check NVLink status with nvidia-smi nvlink -s
- Verify Fabric Manager is running
- Check for NVLink errors
- Ensure proper NUMA affinity`,
              tips: [
                'Bus bandwidth should approach theoretical maximum',
                'Small messages have higher overhead, lower bandwidth is normal'
              ]
            },
            {
              id: 'step-d4-2-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of NCCL.',
              quizQuestion: 'What collective operation is most commonly used in distributed deep learning for gradient synchronization?',
              quizChoices: ['Broadcast', 'AllGather', 'AllReduce', 'ReduceScatter'],
              quizCorrectIndex: 2,
              quizExplanation: 'AllReduce is the most common operation in distributed training because it efficiently computes gradient averages across all GPUs. Each GPU contributes its gradients, and all GPUs receive the sum/average.'
            }
          ]
        }
      ]
    },
    {
      id: 'mod-d4-benchmarks',
      title: 'Performance Benchmarks',
      description: 'Running and interpreting system benchmarks',
      icon: '📈',
      order: 3,
      prerequisites: ['mod-d4-nccl'],
      lessons: [
        {
          id: 'lesson-d4-gpu-burn',
          title: 'GPU Stress Testing',
          description: 'Run stress tests to validate GPU stability',
          objectives: [
            'Understand stress testing purposes',
            'Run GPU burn tests',
            'Monitor for thermal and stability issues'
          ],
          estimatedMinutes: 20,
          commands: ['gpu-burn', 'nvidia-smi'],
          difficulty: 'intermediate',
          steps: [
            {
              id: 'step-d4-3-intro',
              type: 'concept',
              title: 'GPU Stress Testing',
              content: `**Why Stress Test GPUs?**
- Validate stability under load
- Detect thermal issues
- Find marginal hardware
- Burn-in new systems

**gpu-burn** is a popular stress testing tool that:
- Runs intensive matrix multiplications
- Tests both compute and memory
- Verifies results for correctness
- Runs for specified duration

**What to Monitor:**
- Temperature (should stabilize below throttle point)
- Power consumption (should reach TDP)
- Errors (any errors indicate problems)
- Clock speeds (should remain at boost levels)`,
              tips: [
                'Run for at least 10 minutes for meaningful results',
                'Monitor with nvidia-smi in another terminal'
              ]
            },
            {
              id: 'step-d4-3-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of stress testing.',
              quizQuestion: 'What is the primary purpose of running gpu-burn on a new DGX system?',
              quizChoices: [
                'To benchmark performance',
                'To validate stability and detect marginal hardware',
                'To measure power consumption',
                'To test networking'
              ],
              quizCorrectIndex: 1,
              quizExplanation: 'gpu-burn is used to stress test GPUs to validate stability and detect any marginal hardware that might fail under sustained load. It\'s commonly used for burn-in testing of new systems.'
            }
          ]
        },
        {
          id: 'lesson-d4-hpl',
          title: 'HPL Benchmarking',
          description: 'Run HPL benchmark for system validation',
          objectives: [
            'Understand HPL benchmark',
            'Interpret HPL results',
            'Compare to reference values'
          ],
          estimatedMinutes: 20,
          commands: ['hpl'],
          difficulty: 'advanced',
          prerequisites: ['lesson-d4-gpu-burn'],
          steps: [
            {
              id: 'step-d4-4-intro',
              type: 'concept',
              title: 'HPL Overview',
              content: `**HPL (High Performance Linpack)** is the benchmark used for the TOP500 supercomputer list.

**What HPL Measures:**
- Dense linear algebra performance
- Overall system compute capability
- Memory bandwidth utilization
- Multi-GPU scaling efficiency

**DGX A100 Reference Performance:**
- Single node (8 GPUs): ~10 PFLOPS (FP64)
- Achieving 85%+ efficiency is considered good

**Key Parameters:**
- N: Problem size (larger = more efficient but slower)
- NB: Block size (affects efficiency)
- P x Q: Process grid (should match GPU topology)

**Why It Matters:**
- Industry standard for validation
- Required for procurement acceptance
- Baseline for performance issues`,
              tips: [
                'HPL requires careful tuning for optimal results',
                'NGC provides optimized HPL containers'
              ]
            },
            {
              id: 'step-d4-4-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of HPL.',
              quizQuestion: 'What does HPL measure?',
              quizChoices: [
                'Network bandwidth',
                'Storage I/O performance',
                'Dense linear algebra (compute) performance',
                'Memory capacity'
              ],
              quizCorrectIndex: 2,
              quizExplanation: 'HPL (High Performance Linpack) measures dense linear algebra performance by solving a system of linear equations. It\'s the benchmark used for the TOP500 supercomputer list.'
            }
          ]
        },
        {
          id: 'lesson-d4-memory-bandwidth',
          title: 'Memory Bandwidth Testing',
          description: 'Measure and validate GPU memory bandwidth performance',
          objectives: [
            'Understand HBM2e memory specifications',
            'Run bandwidth benchmarks',
            'Identify memory performance issues'
          ],
          estimatedMinutes: 25,
          commands: ['bandwidthTest', 'nvidia-smi'],
          difficulty: 'advanced',
          prerequisites: ['lesson-d4-hpl'],
          steps: [
            {
              id: 'step-d4-5-intro',
              type: 'concept',
              title: 'GPU Memory Architecture',
              content: `**HBM2e Memory on A100:**

| Specification | A100 80GB |
|---------------|-----------|
| Memory Type | HBM2e |
| Capacity | 80 GB |
| Bus Width | 5120 bits |
| Bandwidth | 2039 GB/s (theoretical) |
| ECC | Yes (reduces usable ~6%) |

**Memory Bandwidth Components:**
- **Device-to-Device (D2D)**: GPU memory to GPU memory
- **Host-to-Device (H2D)**: System RAM to GPU
- **Device-to-Host (D2H)**: GPU to System RAM
- **Peer-to-Peer (P2P)**: GPU to GPU via NVLink/PCIe

**Why Bandwidth Matters:**
- AI/ML workloads are often memory-bound
- Low bandwidth indicates hardware issues
- ECC errors can reduce effective bandwidth`,
              tips: [
                'Actual bandwidth is typically 85-90% of theoretical',
                'ECC overhead reduces bandwidth by ~6%'
              ]
            },
            {
              id: 'step-d4-5-pcie',
              type: 'concept',
              title: 'PCIe Bandwidth',
              content: `**PCIe Bandwidth on DGX:**

| PCIe Gen | Bandwidth (x16) |
|----------|-----------------|
| Gen 3 | 16 GB/s |
| Gen 4 | 32 GB/s |
| Gen 5 | 64 GB/s |

**DGX A100 PCIe:**
- Uses PCIe Gen 4 for host connectivity
- 8 GPUs share system PCIe bandwidth
- NVLink preferred for GPU-to-GPU transfers

**When PCIe Matters:**
- Initial data loading from CPU
- Checkpoint writes to host storage
- CPU-GPU communication`,
              tips: [
                'NVLink is 12x faster than PCIe Gen 4',
                'Minimize PCIe transfers for best performance'
              ]
            },
            {
              id: 'step-d4-5-query-mem',
              type: 'command',
              title: 'Check Memory Info',
              content: 'Query memory specifications for all GPUs.',
              expectedCommand: 'nvidia-smi --query-gpu=memory.total,memory.free,memory.used --format=csv',
              validationPattern: /nvidia-smi.*memory\.(total|free|used)/,
              commandHint: 'Try: nvidia-smi --query-gpu=memory.total,memory.free,memory.used --format=csv',
              successMessage: 'Shows memory capacity and current usage for each GPU.',
              tips: [
                'A100-80GB shows ~80GB total',
                'Some memory is reserved for ECC and driver'
              ]
            },
            {
              id: 'step-d4-5-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of GPU memory.',
              quizQuestion: 'What is the theoretical memory bandwidth of an A100 80GB GPU?',
              quizChoices: [
                '900 GB/s',
                '1555 GB/s',
                '2039 GB/s',
                '3000 GB/s'
              ],
              quizCorrectIndex: 2,
              quizExplanation: 'The A100 80GB uses HBM2e memory with a theoretical bandwidth of 2039 GB/s (2 TB/s). Actual achieved bandwidth is typically 85-90% of theoretical.'
            }
          ]
        },
        {
          id: 'lesson-d4-hpcg',
          title: 'HPCG Benchmark',
          description: 'Run HPCG for realistic workload performance validation',
          objectives: [
            'Understand HPCG vs HPL differences',
            'Interpret HPCG results',
            'Compare to reference values'
          ],
          estimatedMinutes: 20,
          commands: ['hpcg'],
          difficulty: 'advanced',
          prerequisites: ['lesson-d4-memory-bandwidth'],
          steps: [
            {
              id: 'step-d4-6-intro',
              type: 'concept',
              title: 'HPCG Overview',
              content: `**HPCG (High Performance Conjugate Gradient)** is a complement to HPL that tests more realistic workload patterns.

**HPL vs HPCG:**
| Aspect | HPL | HPCG |
|--------|-----|------|
| Memory Pattern | Regular | Irregular |
| Data Reuse | High | Low |
| Bottleneck | Compute | Memory BW |
| Real-world | Less realistic | More realistic |

**Why HPCG Matters:**
- Better represents actual scientific workloads
- Stresses memory subsystem
- Shows impact of memory bandwidth limitations
- Part of TOP500 evaluation

**DGX A100 Reference:**
- Single node: ~40-50 TFLOPS (much lower than HPL)
- This is expected due to memory bandwidth limits`,
              tips: [
                'Low HPCG vs HPL ratio is normal',
                'HPCG is memory-bandwidth limited'
              ]
            },
            {
              id: 'step-d4-6-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of HPCG.',
              quizQuestion: 'Why is HPCG performance typically much lower than HPL?',
              quizChoices: [
                'HPCG uses less GPU cores',
                'HPCG is memory-bandwidth limited with irregular access patterns',
                'HPCG only uses one GPU',
                'HPCG disables tensor cores'
              ],
              quizCorrectIndex: 1,
              quizExplanation: 'HPCG has irregular memory access patterns and low data reuse, making it memory-bandwidth limited rather than compute-limited like HPL. This better reflects real scientific workloads.'
            }
          ]
        }
      ]
    }
  ],
  totalEstimatedMinutes: 185
};

/**
 * Domain 5: Troubleshooting (12% of exam)
 */
