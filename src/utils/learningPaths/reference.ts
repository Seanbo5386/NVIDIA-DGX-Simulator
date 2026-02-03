/**
 * NCP-AII Exam Quick Reference Data
 *
 * Contains command references, XID error codes, specifications, and study priorities.
 */

// ============================================================================
// NCP-AII EXAM QUICK REFERENCE
// ============================================================================

/**
 * Key commands to memorize for the NCP-AII exam
 */
export const EXAM_COMMAND_REFERENCE = {
  // Domain 1: Platform Bring-Up (31%)
  platformBringUp: {
    systemInfo: [
      { cmd: 'dmidecode', desc: 'System/BIOS/hardware info' },
      { cmd: 'dmidecode -t bios', desc: 'BIOS version info' },
      { cmd: 'dmidecode -t system', desc: 'System serial/model' },
      { cmd: 'dmidecode -t memory', desc: 'Memory configuration' },
    ],
    bmc: [
      { cmd: 'ipmitool sensor', desc: 'Hardware sensor readings' },
      { cmd: 'ipmitool sel list', desc: 'System Event Log' },
      { cmd: 'ipmitool power status', desc: 'Power state' },
      { cmd: 'ipmitool mc info', desc: 'BMC information' },
    ],
    drivers: [
      { cmd: 'nvidia-smi', desc: 'GPU status overview' },
      { cmd: 'nvidia-smi -L', desc: 'List all GPUs' },
      { cmd: 'lsmod | grep nvidia', desc: 'Check loaded modules' },
      { cmd: 'modinfo nvidia', desc: 'Driver version details' },
    ],
    fabricManager: [
      { cmd: 'systemctl status nvidia-fabricmanager', desc: 'FM status' },
      { cmd: 'nv-fabricmanager --version', desc: 'FM version' },
    ],
  },

  // Domain 2: Accelerator Configuration (5%)
  acceleratorConfig: {
    topology: [
      { cmd: 'nvidia-smi topo -m', desc: 'GPU topology matrix' },
      { cmd: 'nvidia-smi nvlink -s', desc: 'NVLink status' },
      { cmd: 'nvidia-smi nvlink -e', desc: 'NVLink errors' },
    ],
    mig: [
      { cmd: 'nvidia-smi mig -lgip', desc: 'List MIG profiles' },
      { cmd: 'nvidia-smi mig -lgi', desc: 'List GPU instances' },
      { cmd: 'nvidia-smi mig -lci', desc: 'List compute instances' },
    ],
    config: [
      { cmd: 'nvidia-smi -pm 1', desc: 'Enable persistence' },
      { cmd: 'nvidia-smi --query-gpu=persistence_mode --format=csv', desc: 'Check persist mode' },
    ],
  },

  // Domain 3: Base Infrastructure (19%)
  baseInfra: {
    slurm: [
      { cmd: 'sinfo', desc: 'Cluster status' },
      { cmd: 'sinfo -N -l', desc: 'Detailed node list' },
      { cmd: 'squeue', desc: 'Job queue' },
      { cmd: 'scontrol show node', desc: 'Node details' },
      { cmd: 'scontrol show job', desc: 'Job details' },
      { cmd: 'sbatch', desc: 'Submit batch job' },
      { cmd: 'srun', desc: 'Interactive job' },
    ],
    containers: [
      { cmd: 'docker run --gpus all', desc: 'Run with GPU' },
      { cmd: 'enroot import', desc: 'Import container' },
      { cmd: 'srun --container-image=', desc: 'Slurm container job' },
    ],
    storage: [
      { cmd: 'df -h', desc: 'Disk usage' },
      { cmd: 'lsblk', desc: 'Block devices' },
      { cmd: 'lfs df -h', desc: 'Lustre space' },
      { cmd: 'lfs getstripe', desc: 'File striping' },
    ],
  },

  // Domain 4: Validation & Testing (33%)
  validation: {
    dcgm: [
      { cmd: 'dcgmi discovery -l', desc: 'List GPUs' },
      { cmd: 'dcgmi health -c', desc: 'Health check' },
      { cmd: 'dcgmi diag -r 1', desc: 'Quick diagnostics' },
      { cmd: 'dcgmi diag -r 3', desc: 'Extended diagnostics' },
      { cmd: 'dcgmi dmon', desc: 'GPU monitoring' },
      { cmd: 'dcgmi group -l', desc: 'List groups' },
    ],
    nccl: [
      { cmd: './all_reduce_perf -b 8 -e 256M -f 2 -g 8', desc: 'AllReduce test' },
      { cmd: './all_gather_perf', desc: 'AllGather test' },
    ],
    benchmarks: [
      { cmd: 'gpu-burn', desc: 'GPU stress test' },
      { cmd: 'nvidia-smi -d TEMPERATURE', desc: 'Thermal monitoring' },
    ],
  },

  // Domain 5: Troubleshooting (12%)
  troubleshooting: {
    xid: [
      { cmd: 'dmesg | grep -i xid', desc: 'Find XID errors' },
      { cmd: 'nvidia-smi -d ECC', desc: 'ECC error counts' },
      { cmd: 'nvidia-bug-report.sh', desc: 'Collect diagnostics' },
    ],
    thermal: [
      { cmd: 'nvidia-smi -d TEMPERATURE', desc: 'GPU temps' },
      { cmd: 'nvidia-smi --query-gpu=clocks_throttle_reasons.active --format=csv', desc: 'Throttle reasons' },
    ],
    infiniband: [
      { cmd: 'ibstat', desc: 'IB status' },
      { cmd: 'ibstatus', desc: 'Port status' },
      { cmd: 'ibnetdiscover', desc: 'Fabric topology' },
    ],
    logs: [
      { cmd: 'journalctl -b', desc: 'Boot logs' },
      { cmd: 'journalctl -u nvidia-fabricmanager', desc: 'FM logs' },
      { cmd: 'dmesg | grep -i mce', desc: 'MCE errors' },
    ],
  },
};

/**
 * XID error quick reference for exam
 */
export const XID_REFERENCE = [
  { xid: 13, desc: 'Graphics Engine Exception', category: 'SW/Driver', action: 'Check application code' },
  { xid: 31, desc: 'GPU memory page fault', category: 'SW', action: 'Application memory issue' },
  { xid: 32, desc: 'Invalid/corrupted push buffer', category: 'SW/Driver', action: 'Driver issue' },
  { xid: 43, desc: 'GPU stopped processing', category: 'Critical', action: 'GPU hang, may need reset' },
  { xid: 45, desc: 'Preemptive cleanup', category: 'Transient', action: 'Usually recoverable' },
  { xid: 48, desc: 'Double Bit ECC Error', category: 'Hardware', action: 'Memory failure, RMA' },
  { xid: 63, desc: 'ECC page retirement', category: 'Hardware', action: 'Monitor for pattern' },
  { xid: 64, desc: 'ECC page retirement (DBE)', category: 'Hardware', action: 'Memory issue' },
  { xid: 74, desc: 'NVLink error', category: 'NVLink', action: 'Check cables/NVSwitch' },
  { xid: 79, desc: 'GPU fallen off bus', category: 'Critical', action: 'Reboot required' },
  { xid: 94, desc: 'NVSwitch NVLink error', category: 'NVLink', action: 'Check Fabric Manager' },
  { xid: 95, desc: 'NVSwitch NVLink error', category: 'NVLink', action: 'Check Fabric Manager' },
  { xid: 119, desc: 'GSP error', category: 'GSP', action: 'Firmware issue' },
  { xid: 120, desc: 'GSP error', category: 'GSP', action: 'Firmware issue' },
];

/**
 * DGX A100 specifications for exam
 */
export const DGX_A100_SPECS = {
  gpus: {
    count: 8,
    model: 'A100-SXM4-80GB',
    memoryPerGPU: '80 GB HBM2e',
    totalGPUMemory: '640 GB',
    peakFP64: '19.5 TFLOPS per GPU',
    peakFP16: '312 TFLOPS per GPU (with TF32)',
    tensorCores: 432,
  },
  nvlink: {
    version: 'NVLink 3.0',
    linksPerGPU: 12,
    bandwidthPerLink: '50 GB/s bidirectional',
    totalBandwidthPerGPU: '600 GB/s',
    nvSwitchCount: 6,
  },
  cpus: {
    model: 'AMD EPYC 7742',
    count: 2,
    coresTotal: 128,
    threadsTotal: 256,
  },
  memory: {
    systemRAM: '1 TB or 2 TB',
    type: 'DDR4-3200',
  },
  networking: {
    infiniband: '8x HDR (200 Gb/s each)',
    ethernet: '2x 100 GbE',
  },
  storage: {
    osNVMe: '2x 1.92 TB',
    dataNVMe: 'Up to 8x 3.84 TB',
  },
  power: {
    maxSystem: '6.5 kW',
    gpuTDP: '400W per GPU',
  },
  thermals: {
    normalRange: '40-75C',
    throttleStart: '83C',
    shutdown: '90C+',
  },
};

/**
 * Get study tips based on domain weight
 */
export function getStudyPriorities(): Array<{
  domain: string;
  weight: number;
  priority: 'High' | 'Medium' | 'Low';
  focusAreas: string[];
}> {
  return [
    {
      domain: 'Domain 4: Validation & Testing',
      weight: 33,
      priority: 'High',
      focusAreas: [
        'DCGM commands and diagnostic levels',
        'NCCL testing and interpretation',
        'Health monitoring procedures',
        'Performance benchmarking',
      ],
    },
    {
      domain: 'Domain 1: Platform Bring-Up',
      weight: 31,
      priority: 'High',
      focusAreas: [
        'dmidecode and system information',
        'IPMI/BMC management',
        'Driver verification',
        'Fabric Manager status',
      ],
    },
    {
      domain: 'Domain 3: Base Infrastructure',
      weight: 19,
      priority: 'Medium',
      focusAreas: [
        'Slurm job submission and management',
        'Container runtimes (NGC, Enroot)',
        'Storage configuration',
        'GRES for GPU allocation',
      ],
    },
    {
      domain: 'Domain 5: Troubleshooting',
      weight: 12,
      priority: 'Medium',
      focusAreas: [
        'XID error interpretation',
        'Thermal management',
        'NVLink diagnostics',
        'Log analysis techniques',
      ],
    },
    {
      domain: 'Domain 2: Accelerator Configuration',
      weight: 5,
      priority: 'Low',
      focusAreas: [
        'MIG configuration basics',
        'NVLink topology',
        'Persistence mode',
        'Power management',
      ],
    },
  ];
}
