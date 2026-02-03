/**
 * Domain 5: Troubleshooting (12% of exam)
 */

import type { LearningPath } from '../types';

export const DOMAIN5_PATH: LearningPath = {
  id: 'path-domain5',
  domainId: 'domain5',
  title: 'Troubleshooting Mastery',
  description: 'Diagnose and resolve XID errors, thermal issues, NVLink failures, and performance problems',
  examWeight: 12,
  skills: [
    'XID error interpretation',
    'Thermal troubleshooting',
    'NVLink diagnostics',
    'Performance analysis',
    'Log analysis',
    'InfiniBand troubleshooting'
  ],
  modules: [
    {
      id: 'mod-d5-xid',
      title: 'XID Errors',
      description: 'Understanding and resolving NVIDIA XID errors',
      icon: '⚠️',
      order: 1,
      lessons: [
        {
          id: 'lesson-d5-xid-basics',
          title: 'XID Error Fundamentals',
          description: 'Learn to interpret and respond to XID errors',
          objectives: [
            'Understand XID error categories',
            'Find XID errors in system logs',
            'Determine severity and response'
          ],
          estimatedMinutes: 35,
          commands: ['dmesg', 'nvidia-smi'],
          difficulty: 'advanced',
          steps: [
            {
              id: 'step-d5-1-intro',
              type: 'concept',
              title: 'What are XID Errors?',
              content: `**XID errors** are NVIDIA GPU error codes logged by the driver when GPU problems occur.

**Where to Find XID Errors:**
- System logs: dmesg, /var/log/messages, journalctl
- nvidia-smi output (during active errors)

**Common XID Categories:**

| XID | Description | Severity |
|-----|-------------|----------|
| 13 | Graphics Engine Exception | SW/Driver |
| 31 | GPU memory page fault | SW/Application |
| 32 | Invalid/corrupted push buffer | SW/Driver |
| 43 | GPU stopped processing | Critical |
| 45 | Preemptive cleanup | Transient |
| 48 | Double Bit ECC Error | Hardware |
| 63 | ECC page retirement | Hardware |
| 64 | ECC page retirement (DBE) | Hardware |
| 74 | NVLink error | NVLink |
| 79 | GPU fallen off bus | Critical |
| 94/95 | NVSwitch NVLink errors | NVLink |
| 119/120 | GSP errors | GSP firmware |`,
              tips: [
                'Document XID codes for NVIDIA support',
                'Check if errors are recurring or one-time'
              ]
            },
            {
              id: 'step-d5-1-dmesg',
              type: 'command',
              title: 'Check System Logs',
              content: 'Search system logs for NVIDIA XID errors.',
              expectedCommand: 'dmesg | grep -i "xid"',
              validationPattern: /dmesg.*grep.*(xid|nvidia)/i,
              commandHint: 'Try: dmesg | grep -i "xid"',
              successMessage: 'Look for lines containing "Xid" followed by a number.',
              tips: [
                'XID errors include timestamp and GPU ID',
                'Multiple XIDs may indicate cascading failures'
              ]
            },
            {
              id: 'step-d5-1-pending',
              type: 'command',
              title: 'Check for Pending Errors',
              content: 'Use nvidia-smi to check for active/pending GPU errors.',
              expectedCommand: 'nvidia-smi -d ECC',
              validationPattern: /nvidia-smi.*(-d\s+ECC|--display.*ECC)/i,
              commandHint: 'Try: nvidia-smi -d ECC',
              successMessage: 'Shows ECC error counts - volatile (since boot) and aggregate (lifetime).',
              tips: [
                'High ECC error counts may indicate failing memory',
                'Some ECC errors are normal and auto-corrected'
              ]
            },
            {
              id: 'step-d5-1-common',
              type: 'concept',
              title: 'Common XID Scenarios',
              content: `**XID 79 - GPU Fallen Off Bus:**
- GPU no longer responds on PCIe
- Requires reset or reboot
- If recurring, likely hardware failure

**XID 48/63/64 - ECC Errors:**
- Memory errors detected
- Single-bit errors are corrected (warnings)
- Double-bit errors are uncorrectable (critical)
- Page retirement may occur automatically

**XID 74/94/95 - NVLink Errors:**
- Communication issues between GPUs
- Check Fabric Manager status
- May indicate cable or NVSwitch issues

**Troubleshooting Steps:**
1. Note the exact XID code and timestamp
2. Check which GPU(s) affected
3. Review recent workload changes
4. Check temperatures and power
5. Run DCGM diagnostics
6. Collect logs for support if recurring`,
              tips: [
                'Always document errors before clearing/rebooting',
                'Use nvidia-bug-report.sh for support cases'
              ]
            },
            {
              id: 'step-d5-1-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of XID errors.',
              quizQuestion: 'Which XID error typically indicates a fallen-off-the-bus GPU requiring reset?',
              quizChoices: ['XID 13', 'XID 31', 'XID 79', 'XID 94'],
              quizCorrectIndex: 2,
              quizExplanation: 'XID 79 (GPU has fallen off the bus) indicates the GPU is no longer responding on PCIe. This requires at minimum a GPU reset, often a reboot, and may indicate hardware failure if recurring.'
            }
          ]
        },
        {
          id: 'lesson-d5-thermal',
          title: 'Thermal Troubleshooting',
          description: 'Diagnose and resolve GPU thermal issues',
          objectives: [
            'Monitor GPU temperatures',
            'Understand throttling behavior',
            'Identify cooling issues'
          ],
          estimatedMinutes: 25,
          commands: ['nvidia-smi', 'ipmitool'],
          difficulty: 'intermediate',
          prerequisites: ['lesson-d5-xid-basics'],
          steps: [
            {
              id: 'step-d5-2-intro',
              type: 'concept',
              title: 'GPU Thermal Management',
              content: `GPUs have thermal limits to prevent damage. On A100:

**Temperature Thresholds:**
| Range | Status |
|-------|--------|
| 40-75°C | Normal operation |
| 75-83°C | Warm warning |
| 83°C+ | Throttling begins |
| 90°C+ | Critical (shutdown risk) |

**Throttling Types:**
- **Power Throttling**: Reduces power limit
- **Thermal Throttling**: Reduces clock speeds
- **Hardware Slowdown**: Emergency protection

**DGX Cooling:**
- DGX A100/H100 use liquid cooling
- Coolant temperature affects GPU temps
- Ambient temperature should be controlled

**Common Causes of Overheating:**
- Blocked airflow/coolant flow
- Failed cooling components
- Excessive ambient temperature
- Thermal paste degradation`,
              tips: [
                'Sustained high temps shorten GPU lifespan',
                'Check ambient temps and airflow'
              ]
            },
            {
              id: 'step-d5-2-temp',
              type: 'command',
              title: 'Monitor Temperatures',
              content: 'Check current GPU temperatures and throttle status.',
              expectedCommand: 'nvidia-smi -d TEMPERATURE',
              validationPattern: /nvidia-smi.*(-d\s+TEMPERATURE|--display=TEMPERATURE)/i,
              commandHint: 'Try: nvidia-smi -d TEMPERATURE',
              successMessage: 'Shows current, slowdown, and shutdown temperature thresholds.',
              tips: [
                'GPU Temp vs Memory Temp may differ',
                'Slowdown threshold triggers throttling'
              ]
            },
            {
              id: 'step-d5-2-throttle',
              type: 'command',
              title: 'Check Throttle Reasons',
              content: 'Query current throttle reasons for each GPU.',
              expectedCommand: 'nvidia-smi --query-gpu=clocks_throttle_reasons.active --format=csv',
              validationPattern: /nvidia-smi.*clocks_throttle_reasons/,
              commandHint: 'Try: nvidia-smi --query-gpu=clocks_throttle_reasons.active --format=csv',
              successMessage: 'Shows what (if anything) is causing clock throttling.',
              tips: [
                'Empty means no throttling',
                'Multiple reasons can be active simultaneously'
              ]
            },
            {
              id: 'step-d5-2-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of thermal management.',
              quizQuestion: 'At what temperature does an A100 typically begin thermal throttling?',
              quizChoices: ['65°C', '75°C', '83°C', '90°C'],
              quizCorrectIndex: 2,
              quizExplanation: '83°C is the typical thermal slowdown threshold for A100 GPUs. Above this, the GPU reduces clock speeds to prevent overheating. 90°C+ risks emergency shutdown.'
            }
          ]
        },
        {
          id: 'lesson-d5-nvlink-debug',
          title: 'NVLink Troubleshooting',
          description: 'Diagnose and resolve NVLink connectivity issues',
          objectives: [
            'Check NVLink status and errors',
            'Identify failing links',
            'Understand error counters'
          ],
          estimatedMinutes: 25,
          commands: ['nvidia-smi nvlink', 'dcgmi'],
          difficulty: 'advanced',
          prerequisites: ['lesson-d5-thermal'],
          steps: [
            {
              id: 'step-d5-3-intro',
              type: 'concept',
              title: 'NVLink Troubleshooting Overview',
              content: `**NVLink Issues Can Cause:**
- Multi-GPU workload failures
- Degraded NCCL performance
- XID 74, 94, 95 errors
- Training job failures

**What to Check:**
1. Link status (active/inactive)
2. Error counters
3. Fabric Manager status
4. NVSwitch health

**Common Problems:**
- Inactive links (hardware failure)
- CRC errors (cable issues)
- Recovery errors (intermittent issues)
- Fabric Manager not running`,
              tips: [
                'NVLink issues often manifest as NCCL errors',
                'Check Fabric Manager first for multi-GPU issues'
              ]
            },
            {
              id: 'step-d5-3-status',
              type: 'command',
              title: 'Check NVLink Status',
              content: 'View status of all NVLink connections.',
              expectedCommand: 'nvidia-smi nvlink -s',
              validationPattern: /nvidia-smi\s+nvlink\s+(-s|--status)/,
              commandHint: 'Try: nvidia-smi nvlink -s',
              successMessage: 'Shows link status for each GPU. All should be active.',
              tips: [
                'Inactive links indicate hardware problems',
                'Check error counters for active but problematic links'
              ]
            },
            {
              id: 'step-d5-3-errors',
              type: 'command',
              title: 'Check NVLink Errors',
              content: 'View error counters for NVLink connections.',
              expectedCommand: 'nvidia-smi nvlink -e',
              validationPattern: /nvidia-smi\s+nvlink\s+(-e|--error)/,
              commandHint: 'Try: nvidia-smi nvlink -e',
              successMessage: 'Shows error counts. Non-zero values indicate issues.',
              tips: [
                'CRC errors may indicate cable problems',
                'Recovery errors indicate intermittent issues'
              ]
            },
            {
              id: 'step-d5-3-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of NVLink troubleshooting.',
              quizQuestion: 'What XID error codes are associated with NVLink problems?',
              quizChoices: [
                'XID 13, 31, 32',
                'XID 48, 63, 64',
                'XID 74, 94, 95',
                'XID 79, 119, 120'
              ],
              quizCorrectIndex: 2,
              quizExplanation: 'XID 74, 94, and 95 are NVLink-related errors. XID 74 is a general NVLink error, while XID 94 and 95 are specifically NVSwitch-related NVLink errors.'
            }
          ]
        }
      ]
    },
    {
      id: 'mod-d5-performance',
      title: 'Performance Troubleshooting',
      description: 'Diagnosing and resolving performance issues',
      icon: '📉',
      order: 2,
      prerequisites: ['mod-d5-xid'],
      lessons: [
        {
          id: 'lesson-d5-perf-analysis',
          title: 'Performance Analysis',
          description: 'Identify and diagnose GPU performance issues',
          objectives: [
            'Identify performance bottlenecks',
            'Check utilization metrics',
            'Understand common causes'
          ],
          estimatedMinutes: 25,
          commands: ['nvidia-smi', 'dcgmi'],
          difficulty: 'intermediate',
          steps: [
            {
              id: 'step-d5-4-intro',
              type: 'concept',
              title: 'Performance Analysis Overview',
              content: `**Common Performance Issues:**

| Symptom | Possible Causes |
|---------|-----------------|
| Low GPU utilization | CPU bottleneck, data loading |
| Low memory bandwidth | Memory-bound code, ECC overhead |
| Throttled clocks | Thermal, power limits |
| Poor multi-GPU scaling | NVLink issues, NCCL config |
| High latency | PCIe bottleneck, driver issues |

**Key Metrics to Monitor:**
- GPU Utilization (SM activity)
- Memory Utilization
- Memory Bandwidth
- PCIe Throughput
- NVLink Throughput
- Clock Frequencies
- Power Consumption

**Tools for Analysis:**
- nvidia-smi (basic monitoring)
- dcgmi dmon (detailed metrics)
- Nsight Systems (profiling)
- NCCL debug logging`,
              tips: [
                'Low GPU utilization is often a CPU/data bottleneck',
                'Check both SM and memory utilization'
              ]
            },
            {
              id: 'step-d5-4-dmon',
              type: 'command',
              title: 'DCGM Monitoring',
              content: 'Use DCGM for detailed GPU monitoring.',
              expectedCommand: 'dcgmi dmon -e 100,101,140,150,155',
              validationPattern: /dcgmi\s+dmon/,
              commandHint: 'Try: dcgmi dmon -e 100,101,140,150,155',
              successMessage: 'Shows GPU utilization, memory utilization, and power.',
              tips: [
                'Field IDs: 100=GPU util, 101=mem util',
                '140=power, 150=SM clock, 155=mem clock'
              ]
            },
            {
              id: 'step-d5-4-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of performance analysis.',
              quizQuestion: 'If GPU utilization is low but the job is slow, what is the most likely cause?',
              quizChoices: [
                'GPU overheating',
                'ECC errors',
                'CPU or data loading bottleneck',
                'NVLink failure'
              ],
              quizCorrectIndex: 2,
              quizExplanation: 'Low GPU utilization with slow performance typically indicates the GPU is waiting for data. This is usually caused by CPU processing bottleneck, slow storage I/O, or inefficient data loading in the application.'
            }
          ]
        },
        {
          id: 'lesson-d5-infiniband',
          title: 'InfiniBand Troubleshooting',
          description: 'Diagnose InfiniBand networking issues on DGX',
          objectives: [
            'Check IB link status',
            'Identify port errors',
            'Verify connectivity'
          ],
          estimatedMinutes: 20,
          commands: ['ibstat', 'ibstatus', 'ibnetdiscover'],
          difficulty: 'advanced',
          prerequisites: ['lesson-d5-perf-analysis'],
          steps: [
            {
              id: 'step-d5-5-intro',
              type: 'concept',
              title: 'InfiniBand on DGX',
              content: `**DGX InfiniBand Configuration:**
- DGX A100: 8x HDR (200 Gb/s) ports
- DGX H100: 8x NDR (400 Gb/s) ports

**Common IB Issues:**
- Link down (cable, port failure)
- Link errors (signal quality)
- Subnet manager issues
- RDMA failures

**Key Commands:**
| Command | Purpose |
|---------|---------|
| ibstat | Show HCA status |
| ibstatus | Port status summary |
| ibnetdiscover | Discover fabric topology |
| perfquery | Performance counters |
| ibdiagnet | Full diagnostics |`,
              tips: [
                'Each GPU has an associated IB port',
                'Check both link state and physical state'
              ]
            },
            {
              id: 'step-d5-5-ibstat',
              type: 'command',
              title: 'Check IB Status',
              content: 'View InfiniBand HCA status.',
              expectedCommand: 'ibstat',
              commandHint: 'Type: ibstat',
              successMessage: 'Shows all IB ports with their state and link speed.',
              tips: [
                'State should be "Active"',
                'Physical state should be "LinkUp"'
              ]
            },
            {
              id: 'step-d5-5-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of InfiniBand.',
              quizQuestion: 'What is the per-port bandwidth of HDR InfiniBand on DGX A100?',
              quizChoices: ['100 Gb/s', '200 Gb/s', '400 Gb/s', '800 Gb/s'],
              quizCorrectIndex: 1,
              quizExplanation: 'DGX A100 uses HDR (High Data Rate) InfiniBand with 200 Gb/s per port. DGX H100 upgrades to NDR (Next Data Rate) at 400 Gb/s per port.'
            }
          ]
        },
        {
          id: 'lesson-d5-log-analysis',
          title: 'Advanced Log Analysis',
          description: 'Master techniques for analyzing system and GPU logs',
          objectives: [
            'Navigate Linux log files',
            'Use journalctl effectively',
            'Collect NVIDIA bug reports',
            'Analyze MCE and hardware logs'
          ],
          estimatedMinutes: 30,
          commands: ['journalctl', 'dmesg', 'nvidia-bug-report.sh'],
          difficulty: 'advanced',
          prerequisites: ['lesson-d5-infiniband'],
          steps: [
            {
              id: 'step-d5-6-intro',
              type: 'concept',
              title: 'DGX Log Locations',
              content: `**Key Log Files on DGX:**

| Location | Contents |
|----------|----------|
| /var/log/syslog | General system messages |
| /var/log/messages | System-wide messages |
| /var/log/kern.log | Kernel messages |
| /var/log/dmesg | Boot-time kernel ring buffer |
| journalctl | Systemd journal (primary) |

**NVIDIA-Specific Logs:**
| Source | How to Access |
|--------|---------------|
| GPU driver messages | dmesg | grep -i nvidia |
| XID errors | dmesg | grep -i xid |
| Fabric Manager | journalctl -u nvidia-fabricmanager |
| DCGM | journalctl -u nvidia-dcgm |

**Log Priority Levels:**
| Level | Meaning |
|-------|---------|
| emerg | System is unusable |
| alert | Action must be taken immediately |
| crit | Critical conditions |
| err | Error conditions |
| warning | Warning conditions |
| notice | Normal but significant |
| info | Informational |
| debug | Debug-level messages |`,
              tips: [
                'Use journalctl -p err for errors only',
                'Add -f flag for real-time following'
              ]
            },
            {
              id: 'step-d5-6-journal-boot',
              type: 'command',
              title: 'View Boot Logs',
              content: 'Check messages from the current boot for initialization issues.',
              expectedCommand: 'journalctl -b',
              validationPattern: /journalctl\s+(-b|--boot)/,
              commandHint: 'Try: journalctl -b',
              successMessage: 'Shows all log messages from the current boot.',
              tips: [
                'Use -b -1 for previous boot',
                'Helpful for tracking down boot failures'
              ]
            },
            {
              id: 'step-d5-6-journal-unit',
              type: 'command',
              title: 'View Service Logs',
              content: 'Check logs for a specific systemd service.',
              expectedCommand: 'journalctl -u nvidia-fabricmanager',
              validationPattern: /journalctl\s+(-u|--unit)/,
              commandHint: 'Try: journalctl -u nvidia-fabricmanager',
              successMessage: 'Shows logs for the Fabric Manager service.',
              tips: [
                'Useful for debugging service startup issues',
                'Add --since "1 hour ago" to filter by time'
              ]
            },
            {
              id: 'step-d5-6-nvidia-bug',
              type: 'concept',
              title: 'NVIDIA Bug Report',
              content: `**nvidia-bug-report.sh** collects comprehensive diagnostic information:

**What It Collects:**
- nvidia-smi output
- Driver version and module info
- Kernel logs related to NVIDIA
- System configuration
- GPU state and health
- NVLink status and errors

**Usage:**
\`\`\`bash
sudo nvidia-bug-report.sh
\`\`\`

**Output:**
- Creates nvidia-bug-report.log.gz
- Contains all diagnostic data
- Required for NVIDIA support cases

**When to Run:**
- Before and after reproducing issues
- After hardware failures
- For support ticket submission`,
              tips: [
                'Run immediately after an issue occurs',
                'Include both pre-issue and post-issue reports'
              ]
            },
            {
              id: 'step-d5-6-mce',
              type: 'concept',
              title: 'MCE (Machine Check Exception) Logs',
              content: `**MCE** reports hardware errors detected by the CPU:

**Common MCE Sources:**
- CPU cache errors
- Memory ECC failures
- PCIe bus errors
- Thermal events

**Checking MCE:**
\`\`\`bash
# Check for MCE messages
dmesg | grep -i mce

# View MCE log
mcelog --client
\`\`\`

**MCE Severity:**
| Type | Meaning |
|------|---------|
| Corrected | Hardware corrected, logged for tracking |
| Uncorrected | Data corruption possible |
| Fatal | System halt/panic |

**Action on MCE:**
1. Document the full MCE message
2. Check for patterns (same core/DIMM)
3. Run hardware diagnostics
4. Consider preventive replacement`,
              tips: [
                'Frequent corrected errors may predict failure',
                'Same core/bank repeatedly indicates failing component'
              ]
            },
            {
              id: 'step-d5-6-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of log analysis.',
              quizQuestion: 'What tool should you use to collect diagnostic information for NVIDIA support?',
              quizChoices: [
                'nvidia-smi --debug',
                'dmesg --nvidia',
                'nvidia-bug-report.sh',
                'journalctl --nvidia'
              ],
              quizCorrectIndex: 2,
              quizExplanation: 'nvidia-bug-report.sh is the official NVIDIA diagnostic collection script. It gathers all relevant logs, configuration, and state information needed for support cases.'
            }
          ]
        },
        {
          id: 'lesson-d5-recovery',
          title: 'GPU Recovery Procedures',
          description: 'Learn to recover from GPU failures and errors',
          objectives: [
            'Reset GPUs without rebooting',
            'Clear persistent errors',
            'Recover from fallen-off-bus conditions'
          ],
          estimatedMinutes: 25,
          commands: ['nvidia-smi', 'systemctl'],
          difficulty: 'advanced',
          prerequisites: ['lesson-d5-log-analysis'],
          steps: [
            {
              id: 'step-d5-7-intro',
              type: 'concept',
              title: 'GPU Recovery Overview',
              content: `**When GPU Recovery is Needed:**
- XID errors indicating GPU hang
- GPU fallen off the bus (XID 79)
- Persistent ECC errors
- Training job failures

**Recovery Methods (least to most disruptive):**

1. **Application-level reset**: Kill the process using the GPU
2. **GPU reset**: nvidia-smi -r (if supported)
3. **Driver reload**: Unload and reload nvidia modules
4. **System reboot**: Full restart

**Important Considerations:**
- Always collect logs before recovery
- Some errors require full reboot
- Hardware failures need RMA, not just reset
- Check for patterns before recovery`,
              tips: [
                'Document errors before attempting recovery',
                'Some GPUs don\'t support runtime reset'
              ]
            },
            {
              id: 'step-d5-7-check-processes',
              type: 'command',
              title: 'Check GPU Processes',
              content: 'Before reset, check what processes are using GPUs.',
              expectedCommand: 'nvidia-smi pmon -c 1',
              validationPattern: /nvidia-smi\s+pmon/,
              commandHint: 'Try: nvidia-smi pmon -c 1',
              successMessage: 'Shows processes running on each GPU.',
              tips: [
                'Processes must be terminated before GPU reset',
                'Use lsof or fuser to find all GPU file handles'
              ]
            },
            {
              id: 'step-d5-7-drain-slurm',
              type: 'concept',
              title: 'Graceful Node Drain',
              content: `**Before GPU Recovery on Slurm Nodes:**

1. **Drain the node** (prevent new jobs):
\`\`\`bash
scontrol update nodename=dgx-01 state=drain reason="GPU recovery"
\`\`\`

2. **Wait for running jobs** to complete (or cancel them):
\`\`\`bash
squeue -w dgx-01
scancel <jobid>  # if needed
\`\`\`

3. **Perform recovery**

4. **Return node to service**:
\`\`\`bash
scontrol update nodename=dgx-01 state=resume
\`\`\`

**Best Practices:**
- Always drain before maintenance
- Communicate with users if canceling jobs
- Run diagnostics before resuming`,
              tips: [
                'Draining allows jobs to finish gracefully',
                'Use scontrol show node to verify state'
              ]
            },
            {
              id: 'step-d5-7-driver-reload',
              type: 'concept',
              title: 'Driver Reload Procedure',
              content: `**Full Driver Reload (when GPU reset isn't enough):**

**Steps:**
\`\`\`bash
# 1. Stop services using NVIDIA
sudo systemctl stop nvidia-fabricmanager
sudo systemctl stop nvidia-dcgm

# 2. Kill remaining GPU processes
sudo fuser -k /dev/nvidia*

# 3. Unload modules (in order)
sudo rmmod nvidia_uvm
sudo rmmod nvidia_drm
sudo rmmod nvidia_modeset
sudo rmmod nvidia

# 4. Reload modules
sudo modprobe nvidia
sudo modprobe nvidia_uvm

# 5. Restart services
sudo systemctl start nvidia-fabricmanager
sudo systemctl start nvidia-dcgm

# 6. Verify
nvidia-smi
\`\`\`

**Note:** This is disruptive! Prefer reboot if driver won't unload.`,
              tips: [
                'Modules may refuse to unload if in use',
                'Persistence daemon prevents module unload'
              ]
            },
            {
              id: 'step-d5-7-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of GPU recovery.',
              quizQuestion: 'What should you do FIRST when a GPU shows XID 79 (fallen off bus)?',
              quizChoices: [
                'Immediately reboot the system',
                'Collect nvidia-bug-report.sh and document the error',
                'Replace the GPU',
                'Clear the error with nvidia-smi'
              ],
              quizCorrectIndex: 1,
              quizExplanation: 'Before any recovery action, you should collect diagnostic information using nvidia-bug-report.sh. This preserves the error state for analysis and support. Then document timestamps and circumstances before attempting recovery.'
            }
          ]
        }
      ]
    }
  ],
  totalEstimatedMinutes: 205
};
