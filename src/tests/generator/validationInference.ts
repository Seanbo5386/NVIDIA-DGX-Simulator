/**
 * Validation Inference Engine
 *
 * Infers expected validation rules based on command type and cluster state.
 * Reduces manual validation specification by applying smart defaults.
 */

import type { Cluster } from '@/types/hardware';

export interface FaultConfig {
  nodeId?: string;
  gpuId?: number;
  type: string;
  parameters?: Record<string, unknown>;
}

export interface InferredValidation {
  exitCode: number;
  outputContains: string[];
  outputNotContains: string[];
  fieldChecks: Record<string, string>;  // e.g., { "temperature": ">= 85" }
  stateChecks: Record<string, string>;  // e.g., { "gpu.0.health": "Warning" }
}

export interface ValidationOverride {
  exitCode?: number;
  outputContains?: string[];
  outputNotContains?: string[];
  fieldChecks?: Record<string, string>;
  stateChecks?: Record<string, string>;
}

export interface CommandPattern {
  pattern: RegExp;
  inferValidation: (
    command: string,
    matches: RegExpMatchArray,
    clusterState: Cluster,
    injectedFaults: FaultConfig[]
  ) => InferredValidation;
}

// nvidia-smi command patterns
export const nvidiaSmiPatterns: CommandPattern[] = [
  // nvidia-smi (basic - list all GPUs)
  {
    pattern: /^nvidia-smi$/,
    inferValidation: (_cmd, _matches, cluster, faults) => {
      const node = cluster.nodes[0];
      const fatalXidGpus = faults.filter(f => f.type === 'xid-error' && f.parameters?.xid === 79);
      const visibleGpus = node.gpus.length - fatalXidGpus.length;

      return {
        exitCode: 0,
        outputContains: visibleGpus > 0 ? ['GPU', 'Driver Version', 'CUDA Version'] : [],
        outputNotContains: [],
        fieldChecks: {},
        stateChecks: {}
      };
    }
  },

  // nvidia-smi -L (list GPUs)
  {
    pattern: /^nvidia-smi\s+-L$/,
    inferValidation: (_cmd, _matches, cluster, _faults) => {
      const node = cluster.nodes[0];
      return {
        exitCode: 0,
        outputContains: node.gpus.map((_, i) => `GPU ${i}:`),
        outputNotContains: [],
        fieldChecks: {},
        stateChecks: {}
      };
    }
  },

  // nvidia-smi -i N (specific GPU)
  {
    pattern: /^nvidia-smi\s+-i\s+(\d+)$/,
    inferValidation: (_cmd, matches, cluster, faults) => {
      const gpuIndex = parseInt(matches[1]);
      const node = cluster.nodes[0];
      const maxGpu = node.gpus.length - 1;

      if (gpuIndex > maxGpu) {
        return {
          exitCode: 1,
          outputContains: ['Unable to query GPU', 'not found'],
          outputNotContains: [],
          fieldChecks: {},
          stateChecks: {}
        };
      }

      const gpuFault = faults.find(f => f.gpuId === gpuIndex && f.type === 'xid-error' && f.parameters?.xid === 79);
      if (gpuFault) {
        return {
          exitCode: 1,
          outputContains: ['not accessible', 'XID 79'],
          outputNotContains: [],
          fieldChecks: {},
          stateChecks: {}
        };
      }

      return {
        exitCode: 0,
        outputContains: [`GPU ${gpuIndex}`],
        outputNotContains: [],
        fieldChecks: {},
        stateChecks: {}
      };
    }
  },

  // nvidia-smi -q (query all)
  {
    pattern: /^nvidia-smi\s+-q/,
    inferValidation: (_cmd, _matches, _cluster, _faults) => {
      return {
        exitCode: 0,
        outputContains: ['GPU', 'Product Name', 'Driver Version'],
        outputNotContains: [],
        fieldChecks: {},
        stateChecks: {}
      };
    }
  },

  // nvidia-smi --query-gpu with temperature
  {
    pattern: /nvidia-smi\s+--query-gpu=.*temperature/,
    inferValidation: (_cmd, _matches, _cluster, faults) => {
      const thermalFault = faults.find(f => f.type === 'thermal');

      return {
        exitCode: 0,
        outputContains: [],
        outputNotContains: [],
        fieldChecks: thermalFault ? { 'temperature': `>= ${thermalFault.parameters?.temperature || 85}` } : {},
        stateChecks: {}
      };
    }
  },

  // nvidia-smi --gpu-reset
  {
    pattern: /nvidia-smi\s+--gpu-reset\s+-i\s+(\d+)/,
    inferValidation: (_cmd, matches, _cluster, faults) => {
      const gpuIndex = parseInt(matches[1]);
      const fatalXid = faults.find(f => f.gpuId === gpuIndex && f.type === 'xid-error' && f.parameters?.xid === 79);

      if (fatalXid) {
        return {
          exitCode: 1,
          outputContains: ['Unable to reset', 'fallen off the bus'],
          outputNotContains: ['Successfully reset'],
          fieldChecks: {},
          stateChecks: { [`gpu.${gpuIndex}.xidErrors.length`]: '> 0' }
        };
      }

      return {
        exitCode: 0,
        outputContains: ['reset successfully'],
        outputNotContains: [],
        fieldChecks: {},
        stateChecks: { [`gpu.${gpuIndex}.xidErrors.length`]: '== 0' }
      };
    }
  },

  // nvidia-smi nvlink (NVLink status)
  {
    pattern: /nvidia-smi\s+nvlink/,
    inferValidation: (_cmd, _matches, _cluster, _faults) => {
      return {
        exitCode: 0,
        outputContains: ['Link'],
        outputNotContains: [],
        fieldChecks: {},
        stateChecks: {}
      };
    }
  }
];

// dcgmi command patterns
export const dcgmiPatterns: CommandPattern[] = [
  // dcgmi (help/usage)
  {
    pattern: /^dcgmi$/,
    inferValidation: () => {
      return {
        exitCode: 0,
        outputContains: ['usage', 'DCGM'],
        outputNotContains: [],
        fieldChecks: {},
        stateChecks: {}
      };
    }
  },

  // dcgmi discovery -l
  {
    pattern: /^dcgmi\s+discovery\s+-l/,
    inferValidation: (_cmd, _matches, cluster, _faults) => {
      const node = cluster.nodes[0];
      return {
        exitCode: 0,
        outputContains: ['GPU ID', `${node.gpus.length}`],
        outputNotContains: [],
        fieldChecks: {},
        stateChecks: {}
      };
    }
  },

  // dcgmi health -c
  {
    pattern: /^dcgmi\s+health\s+-c/,
    inferValidation: (_cmd, _matches, _cluster, faults) => {
      const hasUnhealthyGpu = faults.some(f =>
        f.type === 'xid-error' || f.type === 'thermal' || f.type === 'ecc-error'
      );

      return {
        exitCode: 0,
        outputContains: hasUnhealthyGpu ? ['Warning', 'Unhealthy'] : ['Healthy'],
        outputNotContains: [],
        fieldChecks: {},
        stateChecks: {}
      };
    }
  },

  // dcgmi diag -r N
  {
    pattern: /^dcgmi\s+diag\s+-r\s+(\d+)/,
    inferValidation: (_cmd, matches, _cluster, faults) => {
      const level = parseInt(matches[1]);
      const hasFailingGpu = faults.some(f =>
        f.type === 'xid-error' || f.type === 'ecc-error'
      );

      if (level < 1 || level > 4) {
        return {
          exitCode: 1,
          outputContains: ['Invalid', 'level'],
          outputNotContains: [],
          fieldChecks: {},
          stateChecks: {}
        };
      }

      return {
        exitCode: hasFailingGpu ? 1 : 0,
        outputContains: hasFailingGpu ? ['FAIL'] : ['PASS'],
        outputNotContains: [],
        fieldChecks: {},
        stateChecks: {}
      };
    }
  },

  // dcgmi policy --set
  {
    pattern: /^dcgmi\s+policy\s+--set/,
    inferValidation: () => {
      return {
        exitCode: 0,
        outputContains: ['Policy'],
        outputNotContains: [],
        fieldChecks: {},
        stateChecks: {}
      };
    }
  },

  // dcgmi group
  {
    pattern: /^dcgmi\s+group/,
    inferValidation: () => {
      return {
        exitCode: 0,
        outputContains: ['Group'],
        outputNotContains: [],
        fieldChecks: {},
        stateChecks: {}
      };
    }
  }
];

// Slurm command patterns
export const slurmPatterns: CommandPattern[] = [
  // sinfo
  {
    pattern: /^sinfo/,
    inferValidation: () => {
      return {
        exitCode: 0,
        outputContains: ['PARTITION', 'NODES', 'STATE'],
        outputNotContains: [],
        fieldChecks: {},
        stateChecks: {}
      };
    }
  },

  // squeue
  {
    pattern: /^squeue/,
    inferValidation: () => {
      return {
        exitCode: 0,
        outputContains: ['JOBID'],
        outputNotContains: [],
        fieldChecks: {},
        stateChecks: {}
      };
    }
  },

  // scontrol show node
  {
    pattern: /^scontrol\s+show\s+node/,
    inferValidation: () => {
      return {
        exitCode: 0,
        outputContains: ['NodeName', 'State'],
        outputNotContains: [],
        fieldChecks: {},
        stateChecks: {}
      };
    }
  }
];

// InfiniBand command patterns
export const infinibandPatterns: CommandPattern[] = [
  // ibstat
  {
    pattern: /^ibstat/,
    inferValidation: () => {
      return {
        exitCode: 0,
        outputContains: ['CA', 'Port'],
        outputNotContains: [],
        fieldChecks: {},
        stateChecks: {}
      };
    }
  },

  // ibstatus
  {
    pattern: /^ibstatus/,
    inferValidation: () => {
      return {
        exitCode: 0,
        outputContains: ['Infiniband'],
        outputNotContains: [],
        fieldChecks: {},
        stateChecks: {}
      };
    }
  },

  // iblinkinfo
  {
    pattern: /^iblinkinfo/,
    inferValidation: () => {
      return {
        exitCode: 0,
        outputContains: ['Switch', 'Link'],
        outputNotContains: [],
        fieldChecks: {},
        stateChecks: {}
      };
    }
  }
];

// All patterns combined
const allPatterns = [
  ...nvidiaSmiPatterns,
  ...dcgmiPatterns,
  ...slurmPatterns,
  ...infinibandPatterns
];

/**
 * Infer validation rules for a command based on command type and cluster state
 */
export function inferValidation(
  command: string,
  clusterState: Cluster,
  injectedFaults: FaultConfig[]
): InferredValidation {
  // Try to match command against patterns
  for (const { pattern, inferValidation: infer } of allPatterns) {
    const matches = command.match(pattern);
    if (matches) {
      return infer(command, matches, clusterState, injectedFaults);
    }
  }

  // Default: assume success with generic output
  return {
    exitCode: 0,
    outputContains: [],
    outputNotContains: [],
    fieldChecks: {},
    stateChecks: {}
  };
}

/**
 * Merge inferred validation with explicit overrides
 */
export function mergeWithOverride(
  inferred: InferredValidation,
  override?: ValidationOverride | null
): InferredValidation {
  if (!override) return inferred;

  return {
    exitCode: override.exitCode ?? inferred.exitCode,
    outputContains: override.outputContains ?? inferred.outputContains,
    outputNotContains: override.outputNotContains ?? inferred.outputNotContains,
    fieldChecks: { ...inferred.fieldChecks, ...override.fieldChecks },
    stateChecks: { ...inferred.stateChecks, ...override.stateChecks }
  };
}

/**
 * Validate a field check expression against a value
 */
export function evaluateFieldCheck(value: number | string, expression: string): boolean {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  // Parse expressions like ">= 85", "== 0", "> 0", etc.
  const match = expression.match(/^(>=|<=|>|<|==|!=)\s*(.+)$/);
  if (!match) return false;

  const [, operator, targetStr] = match;
  const target = parseFloat(targetStr);

  switch (operator) {
    case '>=': return numValue >= target;
    case '<=': return numValue <= target;
    case '>': return numValue > target;
    case '<': return numValue < target;
    case '==': return numValue === target;
    case '!=': return numValue !== target;
    default: return false;
  }
}
