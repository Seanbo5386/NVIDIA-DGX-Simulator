/**
 * Scenario-to-Visualization Mapping
 *
 * Maps lab scenarios to visualization contexts, defining which view to show
 * and which elements to highlight for each scenario.
 */

export type VisualizationView = 'topology' | 'network' | 'both';

export interface VisualizationContext {
  scenarioId: string;
  primaryView: VisualizationView;
  title: string;
  description: string;
  domain: 'domain1' | 'domain2' | 'domain3' | 'domain4' | 'domain5';

  // Optional highlight specifications
  highlightedGpus?: number[];         // GPU indices to highlight
  highlightedLinks?: string[];        // NVLink IDs to highlight (e.g., "0-1")
  highlightedNodes?: string[];        // Host/switch IDs to highlight
  highlightedSwitches?: string[];     // Spine/leaf switch IDs

  // Focus area description
  focusArea?: string;
}

/**
 * Mapping of scenario IDs to their visualization contexts.
 * Covers scenarios across all 5 domains.
 */
export const SCENARIO_VIZ_MAP: Record<string, VisualizationContext> = {
  // Domain 1: Platform Bring-Up
  'bios-bmc-basics': {
    scenarioId: 'bios-bmc-basics',
    primaryView: 'topology',
    title: 'BIOS & BMC Fundamentals',
    description: 'System initialization and BMC management',
    domain: 'domain1',
    focusArea: 'System management interface',
  },
  'driver-installation': {
    scenarioId: 'driver-installation',
    primaryView: 'topology',
    title: 'Driver Installation',
    description: 'NVIDIA driver and CUDA installation',
    domain: 'domain1',
    highlightedGpus: [0, 1, 2, 3, 4, 5, 6, 7],
    focusArea: 'All GPUs - driver initialization',
  },
  'firmware-updates': {
    scenarioId: 'firmware-updates',
    primaryView: 'both',
    title: 'Firmware Updates',
    description: 'GPU and HCA firmware management',
    domain: 'domain1',
    focusArea: 'System firmware components',
  },

  // Domain 2: Accelerator Configuration
  'mig-configuration': {
    scenarioId: 'mig-configuration',
    primaryView: 'topology',
    title: 'MIG Configuration',
    description: 'Multi-Instance GPU partitioning',
    domain: 'domain2',
    highlightedGpus: [0, 1],
    focusArea: 'GPU partitioning for MIG',
  },
  'nvlink-topology': {
    scenarioId: 'nvlink-topology',
    primaryView: 'topology',
    title: 'NVLink Topology',
    description: 'High-speed GPU interconnect configuration',
    domain: 'domain2',
    highlightedLinks: ['0-1', '1-2', '2-3', '4-5', '5-6', '6-7', '1-5', '2-6'],
    focusArea: 'NVLink mesh connectivity',
  },
  'bluefield-dpu': {
    scenarioId: 'bluefield-dpu',
    primaryView: 'network',
    title: 'BlueField DPU Configuration',
    description: 'Data Processing Unit setup',
    domain: 'domain2',
    focusArea: 'DPU network offload',
  },

  // Domain 3: Base Infrastructure
  'slurm-cluster-setup': {
    scenarioId: 'slurm-cluster-setup',
    primaryView: 'network',
    title: 'Slurm Cluster Setup',
    description: 'Job scheduler configuration',
    domain: 'domain3',
    highlightedNodes: ['dgx-01', 'dgx-02', 'dgx-03', 'dgx-04'],
    focusArea: 'Cluster node connectivity',
  },
  'container-runtime': {
    scenarioId: 'container-runtime',
    primaryView: 'topology',
    title: 'Container Runtime',
    description: 'GPU container configuration',
    domain: 'domain3',
    highlightedGpus: [0, 1, 2, 3],
    focusArea: 'GPU container allocation',
  },
  'bcm-ha-setup': {
    scenarioId: 'bcm-ha-setup',
    primaryView: 'network',
    title: 'BCM HA Configuration',
    description: 'Base Command Manager high availability',
    domain: 'domain3',
    focusArea: 'Management plane redundancy',
  },

  // Domain 4: Validation & Testing
  'nccl-testing': {
    scenarioId: 'nccl-testing',
    primaryView: 'topology',
    title: 'NCCL Testing',
    description: 'Collective communication validation',
    domain: 'domain4',
    highlightedGpus: [0, 1, 2, 3, 4, 5, 6, 7],
    highlightedLinks: ['0-1', '1-2', '2-3', '4-5', '5-6', '6-7'],
    focusArea: 'All-reduce communication paths',
  },
  'dcgmi-diagnostics': {
    scenarioId: 'dcgmi-diagnostics',
    primaryView: 'topology',
    title: 'DCGM Diagnostics',
    description: 'GPU health and diagnostics',
    domain: 'domain4',
    highlightedGpus: [0, 1, 2, 3, 4, 5, 6, 7],
    focusArea: 'GPU health monitoring',
  },
  'infiniband-stress-test': {
    scenarioId: 'infiniband-stress-test',
    primaryView: 'network',
    title: 'InfiniBand Stress Test',
    description: 'Fabric bandwidth validation',
    domain: 'domain4',
    highlightedSwitches: ['spine-0', 'spine-1', 'leaf-0', 'leaf-1', 'leaf-2', 'leaf-3'],
    focusArea: 'Fabric stress testing',
  },
  'cluster-health': {
    scenarioId: 'cluster-health',
    primaryView: 'both',
    title: 'Cluster Health Check',
    description: 'Full cluster validation',
    domain: 'domain4',
    highlightedGpus: [0, 1, 2, 3, 4, 5, 6, 7],
    highlightedNodes: ['dgx-01', 'dgx-02', 'dgx-03', 'dgx-04'],
    focusArea: 'Complete cluster health',
  },
  'gpu-bandwidth-validation': {
    scenarioId: 'gpu-bandwidth-validation',
    primaryView: 'topology',
    title: 'GPU Bandwidth Validation',
    description: 'Memory and NVLink bandwidth testing',
    domain: 'domain4',
    highlightedLinks: ['0-1', '2-3', '4-5', '6-7'],
    focusArea: 'Bandwidth measurement paths',
  },
  'hpl-benchmark-workflow': {
    scenarioId: 'hpl-benchmark-workflow',
    primaryView: 'both',
    title: 'HPL Benchmark',
    description: 'High Performance Linpack testing',
    domain: 'domain4',
    highlightedGpus: [0, 1, 2, 3, 4, 5, 6, 7],
    focusArea: 'Compute-intensive workload',
  },
  'ai-training-validation': {
    scenarioId: 'ai-training-validation',
    primaryView: 'both',
    title: 'AI Training Validation',
    description: 'Deep learning training verification',
    domain: 'domain4',
    highlightedGpus: [0, 1, 2, 3, 4, 5, 6, 7],
    focusArea: 'Training workload distribution',
  },
  'nccl-bandwidth-tuning': {
    scenarioId: 'nccl-bandwidth-tuning',
    primaryView: 'topology',
    title: 'NCCL Bandwidth Tuning',
    description: 'Optimize collective communication',
    domain: 'domain4',
    highlightedLinks: ['0-1', '1-2', '2-3', '0-4', '4-5', '5-6', '6-7'],
    focusArea: 'Communication optimization',
  },
  'ecc-error-investigation': {
    scenarioId: 'ecc-error-investigation',
    primaryView: 'topology',
    title: 'ECC Error Investigation',
    description: 'Memory error analysis',
    domain: 'domain4',
    highlightedGpus: [0],
    focusArea: 'Memory subsystem',
  },
  'gpu-reset-recovery': {
    scenarioId: 'gpu-reset-recovery',
    primaryView: 'topology',
    title: 'GPU Reset Recovery',
    description: 'GPU fault recovery procedures',
    domain: 'domain4',
    highlightedGpus: [0],
    focusArea: 'Single GPU recovery',
  },

  // Domain 5: Troubleshooting
  'xid-error-diagnosis': {
    scenarioId: 'xid-error-diagnosis',
    primaryView: 'topology',
    title: 'XID Error Diagnosis',
    description: 'GPU error code investigation',
    domain: 'domain5',
    highlightedGpus: [0, 1],
    focusArea: 'Error source identification',
  },
  'thermal-throttling': {
    scenarioId: 'thermal-throttling',
    primaryView: 'topology',
    title: 'Thermal Throttling',
    description: 'Temperature-related performance issues',
    domain: 'domain5',
    highlightedGpus: [3, 4],
    focusArea: 'Thermal hotspots',
  },
  'nvlink-failure': {
    scenarioId: 'nvlink-failure',
    primaryView: 'topology',
    title: 'NVLink Failure',
    description: 'Interconnect failure troubleshooting',
    domain: 'domain5',
    highlightedLinks: ['2-3'],
    highlightedGpus: [2, 3],
    focusArea: 'Failed NVLink connection',
  },
  'fabric-degradation': {
    scenarioId: 'fabric-degradation',
    primaryView: 'network',
    title: 'Fabric Degradation',
    description: 'InfiniBand performance issues',
    domain: 'domain5',
    highlightedSwitches: ['leaf-1'],
    focusArea: 'Degraded switch',
  },
  'performance-regression': {
    scenarioId: 'performance-regression',
    primaryView: 'both',
    title: 'Performance Regression',
    description: 'Identifying performance bottlenecks',
    domain: 'domain5',
    highlightedGpus: [0, 1, 2, 3, 4, 5, 6, 7],
    focusArea: 'Performance analysis',
  },
};

/**
 * Get visualization context for a scenario.
 */
export function getVisualizationContext(scenarioId: string): VisualizationContext | null {
  return SCENARIO_VIZ_MAP[scenarioId] || null;
}

/**
 * Get all scenarios that use a specific view.
 */
export function getRelatedScenarios(view: VisualizationView): VisualizationContext[] {
  return Object.values(SCENARIO_VIZ_MAP).filter(
    (ctx) => ctx.primaryView === view || ctx.primaryView === 'both'
  );
}

/**
 * Get scenarios by domain.
 */
export function getScenariosByDomain(
  domain: 'domain1' | 'domain2' | 'domain3' | 'domain4' | 'domain5'
): VisualizationContext[] {
  return Object.values(SCENARIO_VIZ_MAP).filter((ctx) => ctx.domain === domain);
}

/**
 * Check if a scenario highlights specific GPUs.
 */
export function scenarioHighlightsGpu(scenarioId: string, gpuId: number): boolean {
  const ctx = getVisualizationContext(scenarioId);
  return ctx?.highlightedGpus?.includes(gpuId) ?? false;
}

/**
 * Check if a scenario highlights a specific NVLink.
 */
export function scenarioHighlightsLink(scenarioId: string, linkId: string): boolean {
  const ctx = getVisualizationContext(scenarioId);
  return ctx?.highlightedLinks?.includes(linkId) ?? false;
}
