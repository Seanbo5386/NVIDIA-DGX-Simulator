/**
 * Domain 3: Base Infrastructure (19% of exam)
 */

import type { LearningPath } from '../types';

export const DOMAIN3_PATH: LearningPath = {
  id: 'path-domain3',
  domainId: 'domain3',
  title: 'Base Infrastructure',
  description: 'Master BCM, HA configurations, Slurm workload management, containers, and storage',
  examWeight: 19,
  skills: [
    'Slurm cluster management',
    'Container orchestration',
    'High availability concepts',
    'Storage configuration',
    'NGC containers',
    'Enroot/Pyxis integration'
  ],
  modules: [
    {
      id: 'mod-d3-slurm',
      title: 'Slurm Workload Manager',
      description: 'Managing HPC workloads with Slurm',
      icon: '📊',
      order: 1,
      lessons: [
        {
          id: 'lesson-d3-slurm-basics',
          title: 'Slurm Fundamentals',
          description: 'Learn the basics of Slurm job scheduling',
          objectives: [
            'Understand Slurm architecture',
            'Check cluster and node status',
            'Interpret node states'
          ],
          estimatedMinutes: 25,
          commands: ['sinfo', 'squeue', 'scontrol'],
          difficulty: 'beginner',
          steps: [
            {
              id: 'step-d3-1-intro',
              type: 'concept',
              title: 'Introduction to Slurm',
              content: `**Slurm** (Simple Linux Utility for Resource Management) is the workload manager used on DGX clusters. It handles:

- Job scheduling and queuing
- Resource allocation (GPUs, CPUs, memory)
- Node state management
- Job accounting

**Key Components:**
| Component | Description |
|-----------|-------------|
| slurmctld | Central controller daemon |
| slurmd | Node daemon (on each compute node) |
| slurmdbd | Database daemon for accounting |

**Key Concepts:**
- **Partition**: Group of nodes (like a queue)
- **Job**: User workload to be executed
- **Allocation**: Reserved resources for a job
- **GRES**: Generic Resources (used for GPUs)`,
              tips: [
                'Slurm is the standard for HPC and AI clusters',
                'GPU allocation uses GRES (Generic Resources)'
              ]
            },
            {
              id: 'step-d3-1-sinfo',
              type: 'command',
              title: 'Check Cluster Status',
              content: 'Use sinfo to see the status of all nodes in the cluster.',
              expectedCommand: 'sinfo',
              commandHint: 'Type: sinfo',
              successMessage: 'sinfo shows partitions, their state, and available nodes.',
              tips: [
                'States: idle (available), alloc (in use), down, drain',
                'The asterisk (*) marks the default partition'
              ]
            },
            {
              id: 'step-d3-1-sinfo-detail',
              type: 'command',
              title: 'Detailed Node Information',
              content: 'Use sinfo with format options for more details.',
              expectedCommand: 'sinfo -N -l',
              validationPattern: /sinfo\s+(-N|-l|--long|--Node)/,
              commandHint: 'Try: sinfo -N -l',
              successMessage: 'Shows each node individually with CPU, memory, and state.',
              tips: [
                '-N shows node-oriented output',
                '-l shows long (detailed) format'
              ]
            },
            {
              id: 'step-d3-1-squeue',
              type: 'command',
              title: 'View Job Queue',
              content: 'Check the current job queue with squeue.',
              expectedCommand: 'squeue',
              commandHint: 'Type: squeue',
              successMessage: 'squeue shows all pending and running jobs.',
              tips: [
                'ST column: R=Running, PD=Pending, CG=Completing',
                'Use -u $USER to see only your jobs'
              ]
            },
            {
              id: 'step-d3-1-node',
              type: 'command',
              title: 'Node Details',
              content: 'Get detailed information about a specific node.',
              expectedCommand: 'scontrol show node dgx-01',
              validationPattern: /scontrol\s+show\s+node\s+\w+/,
              commandHint: 'Try: scontrol show node dgx-01',
              successMessage: 'scontrol show node displays detailed node configuration.',
              tips: [
                'Shows CPU, memory, GRES (GPU) configuration',
                'State reasons explain why nodes are down/drain'
              ]
            },
            {
              id: 'step-d3-1-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of Slurm.',
              quizQuestion: 'What does a node state of "drain" indicate?',
              quizChoices: [
                'Node is available for jobs',
                'Node is running a job',
                'Node is marked unavailable by admin (existing jobs continue)',
                'Node has failed'
              ],
              quizCorrectIndex: 2,
              quizExplanation: 'A drained node is marked unavailable for new jobs by an administrator, but any running jobs are allowed to complete. This is different from "down" which means the node has failed.'
            }
          ]
        },
        {
          id: 'lesson-d3-slurm-jobs',
          title: 'Job Submission and Management',
          description: 'Submit, monitor, and manage Slurm jobs',
          objectives: [
            'Submit batch jobs with sbatch',
            'Request GPU resources',
            'Monitor and cancel jobs'
          ],
          estimatedMinutes: 25,
          commands: ['sbatch', 'srun', 'scancel', 'scontrol'],
          difficulty: 'intermediate',
          prerequisites: ['lesson-d3-slurm-basics'],
          steps: [
            {
              id: 'step-d3-2-intro',
              type: 'concept',
              title: 'Job Submission Concepts',
              content: `Slurm jobs are submitted using **sbatch** (batch) or **srun** (interactive).

**Common sbatch Options:**
| Option | Description |
|--------|-------------|
| -N, --nodes | Number of nodes |
| -n, --ntasks | Number of tasks |
| -c, --cpus-per-task | CPUs per task |
| --gres=gpu:N | Number of GPUs |
| -t, --time | Time limit (D-HH:MM:SS) |
| -p, --partition | Target partition |
| -o, --output | Output file path |
| -e, --error | Error file path |

**Example Job Script:**
\`\`\`bash
#!/bin/bash
#SBATCH --job-name=gpu-test
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=16
#SBATCH --gres=gpu:8
#SBATCH --time=01:00:00

nvidia-smi
python train.py
\`\`\``,
              tips: [
                'Always specify a time limit to improve scheduling',
                'GPU jobs typically need --gres=gpu:N'
              ]
            },
            {
              id: 'step-d3-2-submit',
              type: 'command',
              title: 'Submit a Job',
              content: 'Submit a simple GPU job using sbatch.',
              expectedCommand: 'sbatch --gres=gpu:1 --wrap="nvidia-smi"',
              validationPattern: /sbatch\s+.*--gres=gpu/,
              commandHint: 'Try: sbatch --gres=gpu:1 --wrap="nvidia-smi"',
              successMessage: 'Job submitted! Note the job ID for tracking.',
              tips: [
                '--wrap runs a single command without a script file',
                'Job output goes to slurm-JOBID.out by default'
              ]
            },
            {
              id: 'step-d3-2-show',
              type: 'command',
              title: 'View Job Details',
              content: 'Check detailed information about a submitted job.',
              expectedCommand: 'scontrol show job',
              validationPattern: /scontrol\s+show\s+job/,
              commandHint: 'Try: scontrol show job (or add job ID)',
              successMessage: 'Shows comprehensive job information including resources and state.',
              tips: [
                'JobState shows current status',
                'NumNodes, NumCPUs, NumTasks show allocation'
              ]
            },
            {
              id: 'step-d3-2-srun',
              type: 'command',
              title: 'Interactive Job',
              content: 'Use srun for interactive GPU access.',
              expectedCommand: 'srun --gres=gpu:1 --pty bash',
              validationPattern: /srun\s+.*--gres=gpu.*--pty/,
              commandHint: 'Try: srun --gres=gpu:1 --pty bash',
              successMessage: 'Starts an interactive shell with GPU access.',
              tips: [
                '--pty allocates a pseudo-terminal',
                'Exit the shell to release resources'
              ]
            },
            {
              id: 'step-d3-2-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of job submission.',
              quizQuestion: 'Which sbatch option requests GPU resources?',
              quizChoices: ['--gpu=N', '--gres=gpu:N', '--ngpus=N', '--cuda=N'],
              quizCorrectIndex: 1,
              quizExplanation: 'GPUs are requested using --gres=gpu:N (Generic RESource). The exact syntax depends on cluster configuration but this is the standard format.'
            }
          ]
        },
        {
          id: 'lesson-d3-slurm-advanced',
          title: 'Advanced Slurm Features',
          description: 'Master job arrays, dependencies, and resource management',
          objectives: [
            'Use job arrays for parallel tasks',
            'Set up job dependencies',
            'Understand resource limits'
          ],
          estimatedMinutes: 20,
          commands: ['sbatch', 'scontrol'],
          difficulty: 'advanced',
          prerequisites: ['lesson-d3-slurm-jobs'],
          steps: [
            {
              id: 'step-d3-3-arrays',
              type: 'concept',
              title: 'Job Arrays',
              content: `**Job Arrays** allow submitting many similar jobs with one command.

\`\`\`bash
#SBATCH --array=0-99        # 100 tasks (0-99)
#SBATCH --array=1,3,5,7     # Specific indices
#SBATCH --array=0-100:10    # Step by 10 (0,10,20...)
#SBATCH --array=0-100%10    # Max 10 running at once
\`\`\`

**Environment Variables:**
- \`SLURM_ARRAY_JOB_ID\`: Master job ID
- \`SLURM_ARRAY_TASK_ID\`: Individual task index
- \`SLURM_ARRAY_TASK_COUNT\`: Total number of tasks`,
              tips: [
                'Great for hyperparameter sweeps',
                'Use %N to limit concurrent tasks'
              ]
            },
            {
              id: 'step-d3-3-deps',
              type: 'concept',
              title: 'Job Dependencies',
              content: `**Dependencies** control job execution order.

\`\`\`bash
sbatch --dependency=afterok:12345 job.sh
\`\`\`

**Dependency Types:**
| Type | Description |
|------|-------------|
| after:jobid | Start after job begins |
| afterok:jobid | Start after job completes successfully |
| afternotok:jobid | Start if job fails |
| afterany:jobid | Start after job ends (any state) |
| singleton | One job of this name at a time |

Multiple dependencies: \`--dependency=afterok:123:456\``,
              tips: [
                'Useful for multi-stage pipelines',
                'Data preprocessing -> Training -> Evaluation'
              ]
            },
            {
              id: 'step-d3-3-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of advanced Slurm.',
              quizQuestion: 'Which dependency type waits for a job to complete successfully?',
              quizChoices: ['after', 'afterok', 'afterany', 'singleton'],
              quizCorrectIndex: 1,
              quizExplanation: 'afterok waits for the specified job to complete with exit code 0 (success). afterany runs regardless of success/failure, and after runs when the job starts.'
            }
          ]
        }
      ]
    },
    {
      id: 'mod-d3-containers',
      title: 'Container Management',
      description: 'Working with containers on DGX systems',
      icon: '📦',
      order: 2,
      prerequisites: ['mod-d3-slurm'],
      lessons: [
        {
          id: 'lesson-d3-ngc',
          title: 'NGC Containers',
          description: 'Using NVIDIA NGC container registry',
          objectives: [
            'Understand NGC container ecosystem',
            'Pull and run NGC containers',
            'Configure container runtime for GPUs'
          ],
          estimatedMinutes: 20,
          commands: ['docker', 'nvidia-smi'],
          difficulty: 'intermediate',
          steps: [
            {
              id: 'step-d3-4-intro',
              type: 'concept',
              title: 'NVIDIA NGC Overview',
              content: `**NGC (NVIDIA GPU Cloud)** is NVIDIA's hub for GPU-optimized software:

**Container Categories:**
- **Deep Learning**: PyTorch, TensorFlow, MXNet
- **HPC**: CUDA, OpenMPI, compilers
- **Data Science**: RAPIDS, Jupyter
- **Inference**: Triton, TensorRT

**Benefits of NGC Containers:**
- Pre-configured for optimal GPU performance
- Tested driver/CUDA combinations
- Regular security updates
- Consistent environments across systems

**Container Naming:**
\`nvcr.io/nvidia/pytorch:23.10-py3\`
- Registry: nvcr.io/nvidia
- Image: pytorch
- Tag: 23.10-py3 (year.month-python version)`,
              tips: [
                'Always use specific tags, not "latest"',
                'Check release notes for driver requirements'
              ]
            },
            {
              id: 'step-d3-4-run',
              type: 'command',
              title: 'Run NGC Container',
              content: 'Run a container with GPU access using nvidia-docker.',
              expectedCommand: 'docker run --gpus all nvidia/cuda:12.0-base nvidia-smi',
              validationPattern: /docker\s+run\s+--gpus/,
              commandHint: 'Try: docker run --gpus all nvidia/cuda:12.0-base nvidia-smi',
              successMessage: 'Container runs with GPU access and shows nvidia-smi output.',
              tips: [
                '--gpus all enables all GPUs in container',
                'Can specify --gpus "device=0,1" for specific GPUs'
              ]
            },
            {
              id: 'step-d3-4-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of NGC.',
              quizQuestion: 'What docker flag enables GPU access in containers?',
              quizChoices: ['--nvidia', '--gpu', '--gpus', '--cuda'],
              quizCorrectIndex: 2,
              quizExplanation: 'The --gpus flag enables GPU access. Use --gpus all for all GPUs or --gpus "device=0,1" for specific GPUs.'
            }
          ]
        },
        {
          id: 'lesson-d3-enroot',
          title: 'Enroot and Pyxis',
          description: 'HPC container runtime with Slurm integration',
          objectives: [
            'Understand Enroot advantages for HPC',
            'Use Pyxis for Slurm container jobs',
            'Configure container workloads'
          ],
          estimatedMinutes: 20,
          commands: ['enroot', 'srun'],
          difficulty: 'advanced',
          prerequisites: ['lesson-d3-ngc'],
          steps: [
            {
              id: 'step-d3-5-intro',
              type: 'concept',
              title: 'Enroot and Pyxis Overview',
              content: `**Enroot** is a lightweight container runtime designed for HPC:
- No daemon required (unlike Docker)
- Unprivileged operation
- Efficient image distribution
- Native GPU support

**Pyxis** is the Slurm plugin for Enroot:
- Seamless container integration with Slurm
- Automatic GPU/network setup
- Simple command-line interface

**Usage with Slurm:**
\`\`\`bash
srun --container-image=nvcr.io/nvidia/pytorch:23.10-py3 \\
     python train.py
\`\`\``,
              tips: [
                'Enroot is preferred over Docker for HPC workloads',
                'Pyxis handles container setup automatically'
              ]
            },
            {
              id: 'step-d3-5-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of Enroot.',
              quizQuestion: 'What is the main advantage of Enroot over Docker for HPC?',
              quizChoices: [
                'More GPU support',
                'Better graphics',
                'No daemon required, unprivileged operation',
                'Faster networking'
              ],
              quizCorrectIndex: 2,
              quizExplanation: 'Enroot operates without a daemon and can run unprivileged, making it more suitable for shared HPC environments where users don\'t have root access.'
            }
          ]
        }
      ]
    },
    {
      id: 'mod-d3-storage',
      title: 'Storage Configuration',
      description: 'Managing storage for AI/ML workloads on DGX',
      icon: '💾',
      order: 3,
      prerequisites: ['mod-d3-containers'],
      lessons: [
        {
          id: 'lesson-d3-storage-overview',
          title: 'DGX Storage Architecture',
          description: 'Understanding storage options and configuration for DGX systems',
          objectives: [
            'Understand local vs shared storage',
            'Know DGX internal storage layout',
            'Configure storage for AI workloads'
          ],
          estimatedMinutes: 25,
          commands: ['df', 'lsblk', 'mount'],
          difficulty: 'intermediate',
          steps: [
            {
              id: 'step-d3-6-intro',
              type: 'concept',
              title: 'DGX Storage Architecture',
              content: `**DGX A100 Internal Storage:**

| Component | Capacity | Purpose |
|-----------|----------|---------|
| OS NVMe | 2x 1.92TB | OS, /home |
| Data NVMe | Up to 8x 3.84TB | /raid, scratch |

**Storage Types for AI/ML:**

| Type | Use Case | Pros | Cons |
|------|----------|------|------|
| Local NVMe | Scratch, checkpoints | Fast, low latency | Not shared |
| NFS | Home dirs, shared data | Simple, shared | Slower |
| Lustre | Large datasets | Parallel I/O | Complex |
| GPFS | Enterprise workloads | Robust | Expensive |
| WekaFS | AI-optimized | Very fast | Newer |

**Best Practices:**
- Use local NVMe for job scratch space
- Mount shared storage for datasets
- Use parallel filesystem for large-scale training
- Monitor I/O to avoid bottlenecks`,
              tips: [
                'Local NVMe is much faster than networked storage',
                'Stage data to local scratch for best performance'
              ]
            },
            {
              id: 'step-d3-6-df',
              type: 'command',
              title: 'Check Disk Space',
              content: 'View available disk space on all mounted filesystems.',
              expectedCommand: 'df -h',
              validationPattern: /df\s+(-h|--human-readable)/,
              commandHint: 'Try: df -h',
              successMessage: 'Shows all mounted filesystems with their usage.',
              tips: [
                'Watch for nearly full filesystems',
                '/raid is typically the large local storage'
              ]
            },
            {
              id: 'step-d3-6-lsblk',
              type: 'command',
              title: 'List Block Devices',
              content: 'View all block storage devices and their partitions.',
              expectedCommand: 'lsblk',
              commandHint: 'Type: lsblk',
              successMessage: 'Shows NVMe drives and their partition layout.',
              tips: [
                'nvme0n1, nvme1n1 etc. are NVMe drives',
                'Look for RAID arrays (md devices)'
              ]
            },
            {
              id: 'step-d3-6-nvme-list',
              type: 'command',
              title: 'NVMe Drive Information',
              content: 'Get detailed information about NVMe drives.',
              expectedCommand: 'nvme list',
              validationPattern: /nvme\s+list/,
              commandHint: 'Try: nvme list',
              successMessage: 'Shows all NVMe drives with model and capacity.',
              tips: [
                'Check firmware version for drives',
                'Monitor SMART data for drive health'
              ]
            },
            {
              id: 'step-d3-6-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of DGX storage.',
              quizQuestion: 'What is the recommended storage type for job scratch space on DGX?',
              quizChoices: [
                'NFS',
                'Local NVMe',
                'iSCSI',
                'CIFS/SMB'
              ],
              quizCorrectIndex: 1,
              quizExplanation: 'Local NVMe storage provides the lowest latency and highest throughput for scratch data. It\'s ideal for temporary files, checkpoints, and staging data during training.'
            }
          ]
        },
        {
          id: 'lesson-d3-parallel-fs',
          title: 'Parallel Filesystems',
          description: 'Working with Lustre and GPFS for large-scale storage',
          objectives: [
            'Understand parallel filesystem concepts',
            'Check Lustre client status',
            'Optimize I/O for AI workloads'
          ],
          estimatedMinutes: 25,
          commands: ['lctl', 'lfs', 'mount'],
          difficulty: 'advanced',
          prerequisites: ['lesson-d3-storage-overview'],
          steps: [
            {
              id: 'step-d3-7-intro',
              type: 'concept',
              title: 'Parallel Filesystems for AI',
              content: `**Why Parallel Filesystems?**
- Aggregate bandwidth from multiple servers
- Handle millions of files
- Scale to petabytes
- Support concurrent access from many nodes

**Lustre Architecture:**
| Component | Role |
|-----------|------|
| MDS (Metadata Server) | File names, directories |
| OSS (Object Storage Server) | File data |
| MGS (Management Server) | Configuration |
| Client | Mounts filesystem |

**Lustre Striping:**
- Files split across multiple OSTs
- Increases read/write bandwidth
- Configurable per-file or per-directory

**Optimal Settings for AI:**
- Large stripe size (1-4 MB) for large files
- Multiple OSTs for large datasets
- Avoid many small files`,
              tips: [
                'Striping improves performance for large files',
                'Many small files are inefficient on parallel FS'
              ]
            },
            {
              id: 'step-d3-7-lfs-df',
              type: 'command',
              title: 'Check Lustre Space',
              content: 'View Lustre filesystem usage.',
              expectedCommand: 'lfs df -h',
              validationPattern: /lfs\s+df/,
              commandHint: 'Try: lfs df -h',
              successMessage: 'Shows space on each OST and MDT.',
              tips: [
                'Watch for full OSTs that block writes',
                'MDT space affects file creation'
              ]
            },
            {
              id: 'step-d3-7-lfs-stripe',
              type: 'command',
              title: 'Check File Striping',
              content: 'View the stripe configuration for a file or directory.',
              expectedCommand: 'lfs getstripe /path/to/file',
              validationPattern: /lfs\s+getstripe/,
              commandHint: 'Try: lfs getstripe /path/to/file',
              successMessage: 'Shows stripe count and size.',
              tips: [
                'More stripes = more parallel I/O',
                'Set striping before creating large files'
              ]
            },
            {
              id: 'step-d3-7-io-tips',
              type: 'concept',
              title: 'I/O Optimization Tips',
              content: `**Optimizing I/O for AI/ML:**

**Data Loading:**
- Use NVIDIA DALI for GPU-accelerated loading
- Enable multiple data loading workers
- Stage frequently-used data to local NVMe
- Use memory-mapped files when possible

**Checkpointing:**
- Write to local NVMe during training
- Background copy to shared storage
- Use torch.save with pickle protocol 4+
- Consider distributed checkpointing

**Dataset Organization:**
- Use large files (TFRecord, WebDataset)
- Avoid millions of small image files
- Pre-process data into efficient formats
- Consider caching preprocessed data

**Monitoring I/O:**
\`\`\`bash
iostat -x 5       # Disk I/O stats
iotop             # Per-process I/O
\`\`\``,
              tips: [
                'I/O is often the training bottleneck',
                'Profile with nsys to find I/O issues'
              ]
            },
            {
              id: 'step-d3-7-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of parallel filesystems.',
              quizQuestion: 'What does Lustre striping do?',
              quizChoices: [
                'Compresses data',
                'Encrypts data across servers',
                'Splits files across multiple storage servers for parallel I/O',
                'Duplicates data for redundancy'
              ],
              quizCorrectIndex: 2,
              quizExplanation: 'Lustre striping splits file data across multiple Object Storage Targets (OSTs), allowing parallel I/O operations that aggregate bandwidth from multiple servers.'
            }
          ]
        }
      ]
    }
  ],
  totalEstimatedMinutes: 160
};

/**
 * Domain 4: Validation & Testing (33% of exam)
 */
