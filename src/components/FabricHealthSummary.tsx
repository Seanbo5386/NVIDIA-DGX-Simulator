/**
 * Fabric Health Summary Panel
 *
 * Displays overall InfiniBand fabric health metrics including
 * active/down links, error summaries, and health score.
 */

import React from 'react';
import { Activity, AlertTriangle, Link2, Server } from 'lucide-react';
import type { ClusterConfig } from '@/types/hardware';

interface FabricHealthSummaryProps {
  cluster: ClusterConfig;
}

interface FabricMetrics {
  totalPorts: number;
  activePorts: number;
  downPorts: number;
  degradedPorts: number; // Active but with errors
  totalHosts: number;
  connectedHosts: number;
  totalErrors: {
    symbolErrors: number;
    linkDowned: number;
    portRcvErrors: number;
    portXmitDiscards: number;
  };
  healthScore: number; // 0-100
}

const calculateFabricMetrics = (cluster: ClusterConfig): FabricMetrics => {
  let totalPorts = 0;
  let activePorts = 0;
  let downPorts = 0;
  let degradedPorts = 0;
  let connectedHosts = 0;
  const totalErrors = {
    symbolErrors: 0,
    linkDowned: 0,
    portRcvErrors: 0,
    portXmitDiscards: 0,
  };

  cluster.nodes.forEach(node => {
    let nodeHasActivePort = false;

    node.hcas.forEach(hca => {
      hca.ports.forEach(port => {
        totalPorts++;

        if (port.state === 'Active') {
          activePorts++;
          nodeHasActivePort = true;

          // Check for errors indicating degradation
          const hasErrors = port.errors.symbolErrors > 0 ||
                           port.errors.portRcvErrors > 0;
          if (hasErrors) degradedPorts++;
        } else {
          downPorts++;
        }

        // Accumulate errors
        totalErrors.symbolErrors += port.errors.symbolErrors;
        totalErrors.linkDowned += port.errors.linkDowned;
        totalErrors.portRcvErrors += port.errors.portRcvErrors;
        totalErrors.portXmitDiscards += port.errors.portXmitDiscards;
      });
    });

    if (nodeHasActivePort) connectedHosts++;
  });

  // Calculate health score (simple formula)
  const portHealth = totalPorts > 0 ? (activePorts / totalPorts) * 100 : 100;
  const errorPenalty = Math.min(degradedPorts * 5, 30); // Max 30% penalty
  const healthScore = Math.max(0, Math.round(portHealth - errorPenalty));

  return {
    totalPorts,
    activePorts,
    downPorts,
    degradedPorts,
    totalHosts: cluster.nodes.length,
    connectedHosts,
    totalErrors,
    healthScore,
  };
};

export const FabricHealthSummary: React.FC<FabricHealthSummaryProps> = ({ cluster }) => {
  const metrics = calculateFabricMetrics(cluster);

  const healthColor = metrics.healthScore >= 90 ? 'text-green-500' :
                      metrics.healthScore >= 70 ? 'text-yellow-500' :
                      'text-red-500';

  const healthBg = metrics.healthScore >= 90 ? 'bg-green-500' :
                   metrics.healthScore >= 70 ? 'bg-yellow-500' :
                   'bg-red-500';

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-nvidia-green" />
        <h3 className="text-sm font-semibold text-gray-200">Fabric Health Summary</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        {/* Health Score */}
        <div className="bg-gray-900 rounded p-3">
          <div className="text-xs text-gray-400 mb-1">Health Score</div>
          <div className="flex items-center gap-2">
            <div className={`text-2xl font-bold ${healthColor}`}>
              {metrics.healthScore}%
            </div>
            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${healthBg} transition-all`}
                style={{ width: `${metrics.healthScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Link Status */}
        <div className="bg-gray-900 rounded p-3">
          <div className="text-xs text-gray-400 mb-1">Links</div>
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-green-500" />
            <span className="text-green-500 font-medium">{metrics.activePorts}</span>
            <span className="text-gray-500">/</span>
            <span className="text-gray-400">{metrics.totalPorts}</span>
            {metrics.downPorts > 0 && (
              <span className="text-red-500 text-xs">({metrics.downPorts} down)</span>
            )}
          </div>
          {metrics.degradedPorts > 0 && (
            <div className="flex items-center gap-1 mt-1 text-yellow-500 text-xs">
              <AlertTriangle className="w-3 h-3" />
              {metrics.degradedPorts} degraded
            </div>
          )}
        </div>

        {/* Host Status */}
        <div className="bg-gray-900 rounded p-3">
          <div className="text-xs text-gray-400 mb-1">Hosts</div>
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-green-500" />
            <span className="text-green-500 font-medium">{metrics.connectedHosts}</span>
            <span className="text-gray-500">/</span>
            <span className="text-gray-400">{metrics.totalHosts}</span>
            <span className="text-gray-500 text-xs">connected</span>
          </div>
        </div>

        {/* Error Counts */}
        <div className="bg-gray-900 rounded p-3">
          <div className="text-xs text-gray-400 mb-1">Error Counters</div>
          <div className="grid grid-cols-2 gap-x-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Symbol:</span>
              <span className={metrics.totalErrors.symbolErrors > 0 ? 'text-yellow-500' : 'text-gray-400'}>
                {metrics.totalErrors.symbolErrors}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">RcvErr:</span>
              <span className={metrics.totalErrors.portRcvErrors > 0 ? 'text-yellow-500' : 'text-gray-400'}>
                {metrics.totalErrors.portRcvErrors}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">LnkDwn:</span>
              <span className={metrics.totalErrors.linkDowned > 0 ? 'text-red-500' : 'text-gray-400'}>
                {metrics.totalErrors.linkDowned}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Discard:</span>
              <span className={metrics.totalErrors.portXmitDiscards > 0 ? 'text-orange-500' : 'text-gray-400'}>
                {metrics.totalErrors.portXmitDiscards}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Topology Info */}
      <div className="mt-3 pt-2 border-t border-gray-700 text-xs text-gray-500">
        Topology: {cluster.fabricTopology} |
        Click nodes for detailed port information
      </div>
    </div>
  );
};
