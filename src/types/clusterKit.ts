export interface ClusterKitCheckResult {
  checkName: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: Record<string, any>;
}

export interface ClusterKitAssessment {
  nodeId: string;
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'failed';
  checks: {
    gpu: ClusterKitCheckResult[];
    network: ClusterKitCheckResult[];
    storage: ClusterKitCheckResult[];
    firmware: ClusterKitCheckResult[];
    drivers: ClusterKitCheckResult[];
  };
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}
