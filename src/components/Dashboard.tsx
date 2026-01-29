import React, { useEffect, useState } from 'react';
import { useSimulationStore } from '@/store/simulationStore';
import { Activity, HardDrive, Thermometer, Zap, AlertTriangle, CheckCircle, XCircle, TrendingUp, Network, Activity as ActivityIcon } from 'lucide-react';
import type { GPU, HealthStatus } from '@/types/hardware';
import { MetricsChart } from './MetricsChart';
import { TopologyGraph } from './TopologyGraph';
import { InfiniBandMap } from './InfiniBandMap';
import { MetricsHistory } from '@/utils/metricsHistory';
import { VisualContextPanel } from './VisualContextPanel';
import {
  getVisualizationContext,
  VisualizationContext,
} from '@/utils/scenarioVisualizationMap';

const HealthIndicator: React.FC<{ status: HealthStatus }> = ({ status }) => {
  const config = {
    OK: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/20' },
    Warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/20' },
    Critical: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/20' },
    Unknown: { icon: AlertTriangle, color: 'text-gray-500', bg: 'bg-gray-500/20' },
  };

  const { icon: Icon, color, bg } = config[status];

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${bg}`}>
      <Icon className={`w-4 h-4 ${color}`} />
      <span className={`text-sm font-medium ${color}`}>{status}</span>
    </div>
  );
};

const GPUCard: React.FC<{ gpu: GPU; nodeId: string }> = ({ gpu }) => {
  const tempColor = gpu.temperature > 80 ? 'text-red-500' : gpu.temperature > 70 ? 'text-yellow-500' : 'text-green-500';
  const memoryPercent = (gpu.memoryUsed / gpu.memoryTotal) * 100;

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-nvidia-green transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-nvidia-green">GPU {gpu.id}</h3>
          <p className="text-xs text-gray-400">{gpu.name}</p>
        </div>
        <HealthIndicator status={gpu.healthStatus} />
      </div>

      <div className="space-y-2">
        {/* Utilization */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="flex items-center gap-1 text-gray-400">
              <Activity className="w-3 h-3" />
              Utilization
            </span>
            <span className="text-nvidia-green font-medium">{Math.round(gpu.utilization)}%</span>
          </div>
          <div className="gpu-bar-container">
            <div
              className="gpu-bar"
              style={{ width: `${gpu.utilization}%` }}
            />
          </div>
        </div>

        {/* Memory */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="flex items-center gap-1 text-gray-400">
              <HardDrive className="w-3 h-3" />
              Memory
            </span>
            <span className="text-nvidia-green font-medium">
              {(gpu.memoryUsed / 1024).toFixed(1)} / {(gpu.memoryTotal / 1024).toFixed(1)} GB
            </span>
          </div>
          <div className="gpu-bar-container">
            <div
              className="gpu-bar bg-blue-500"
              style={{ width: `${memoryPercent}%` }}
            />
          </div>
        </div>

        {/* Temperature and Power */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-700">
          <div className="flex items-center gap-2">
            <Thermometer className={`w-4 h-4 ${tempColor}`} />
            <div>
              <div className="text-xs text-gray-400">Temp</div>
              <div className={`text-sm font-medium ${tempColor}`}>{Math.round(gpu.temperature)}°C</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            <div>
              <div className="text-xs text-gray-400">Power</div>
              <div className="text-sm font-medium text-yellow-500">
                {Math.round(gpu.powerDraw)}W / {gpu.powerLimit}W
              </div>
            </div>
          </div>
        </div>

        {/* MIG Status */}
        {gpu.migMode && (
          <div className="pt-2 border-t border-gray-700">
            <div className="text-xs text-nvidia-green">
              MIG Enabled: {gpu.migInstances.length} instance(s)
            </div>
          </div>
        )}

        {/* XID Errors */}
        {gpu.xidErrors.length > 0 && (
          <div className="pt-2 border-t border-red-900/50">
            <div className="text-xs text-red-500 font-medium">
              ⚠ {gpu.xidErrors.length} XID Error(s)
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const NodeSelector: React.FC = () => {
  const cluster = useSimulationStore(state => state.cluster);
  const selectedNode = useSimulationStore(state => state.selectedNode);
  const selectNode = useSimulationStore(state => state.selectNode);

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {cluster.nodes.map(node => (
        <button
          key={node.id}
          onClick={() => selectNode(node.id)}
          className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
            selectedNode === node.id
              ? 'bg-nvidia-green text-black'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          {node.id}
        </button>
      ))}
    </div>
  );
};

const ClusterHealthSummary: React.FC = () => {
  const cluster = useSimulationStore(state => state.cluster);

  const totalNodes = cluster.nodes.length;
  const totalGPUs = cluster.nodes.reduce((sum, node) => sum + node.gpus.length, 0);
  const healthyGPUs = cluster.nodes.reduce(
    (sum, node) => sum + node.gpus.filter(gpu => gpu.healthStatus === 'OK').length,
    0
  );
  const criticalGPUs = cluster.nodes.reduce(
    (sum, node) => sum + node.gpus.filter(gpu => gpu.healthStatus === 'Critical').length,
    0
  );

  const overallHealth: HealthStatus = criticalGPUs > 0 ? 'Critical' : healthyGPUs < totalGPUs ? 'Warning' : 'OK';

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-nvidia-green">Cluster Health</h2>
        <HealthIndicator status={overallHealth} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-nvidia-green">{totalNodes}/{totalNodes}</div>
          <div className="text-sm text-gray-400">Nodes Online</div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-nvidia-green">{healthyGPUs}/{totalGPUs}</div>
          <div className="text-sm text-gray-400">GPUs Healthy</div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-500">Active</div>
          <div className="text-sm text-gray-400">InfiniBand</div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-500">{cluster.bcmHA.state}</div>
          <div className="text-sm text-gray-400">BCM HA</div>
        </div>
      </div>

      {criticalGPUs > 0 && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="text-sm text-red-400 font-medium">
            ⚠ {criticalGPUs} GPU(s) in Critical state - check node details
          </div>
        </div>
      )}
    </div>
  );
};

type DashboardView = 'overview' | 'metrics' | 'topology' | 'network';

export const Dashboard: React.FC = () => {
  const cluster = useSimulationStore(state => state.cluster);
  const selectedNode = useSimulationStore(state => state.selectedNode);
  const isRunning = useSimulationStore(state => state.isRunning);
  const [activeView, setActiveView] = useState<DashboardView>('overview');
  const [selectedGPU, setSelectedGPU] = useState<string>('GPU0');
  const [activeScenario, setActiveScenario] = useState<VisualizationContext | null>(null);

  // Handler for launching a scenario from the context panel
  const handleLaunchScenario = (scenarioId: string) => {
    const context = getVisualizationContext(scenarioId);
    if (context) {
      setActiveScenario(context);
      // Switch to the appropriate view based on the scenario's primary view
      if (context.primaryView === 'topology' || context.primaryView === 'both') {
        setActiveView('topology');
      } else if (context.primaryView === 'network') {
        setActiveView('network');
      }
    }
  };

  const currentNode = cluster.nodes.find(n => n.id === selectedNode) || cluster.nodes[0];

  // Start automatic metrics collection only when simulation is running
  useEffect(() => {
    if (isRunning) {
      // Get node from store directly to avoid stale closure
      MetricsHistory.startCollection(() => {
        const state = useSimulationStore.getState();
        const nodeId = state.selectedNode;
        return state.cluster.nodes.find(n => n.id === nodeId) || state.cluster.nodes[0];
      }, 1000);
    } else {
      MetricsHistory.stopCollection();
    }

    return () => {
      MetricsHistory.stopCollection();
    };
  }, [isRunning]); // Only depend on isRunning, not currentNode

  if (!currentNode) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">No nodes available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ClusterHealthSummary />

      <div>
        <h3 className="text-lg font-semibold text-gray-200 mb-3">Node Selection</h3>
        <NodeSelector />
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        {[
          { id: 'overview', label: 'Overview', icon: ActivityIcon },
          { id: 'metrics', label: 'Historical Metrics', icon: TrendingUp },
          { id: 'topology', label: 'NVLink Topology', icon: Network },
          { id: 'network', label: 'InfiniBand Fabric', icon: Network },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveView(id as DashboardView)}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
              activeView === id
                ? 'border-nvidia-green text-nvidia-green'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeView === 'overview' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-200">
              {currentNode.id} - GPU Status
            </h3>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>System: {currentNode.systemType}</span>
              <span>Driver: {currentNode.nvidiaDriverVersion}</span>
              <span>CUDA: {currentNode.cudaVersion}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {currentNode.gpus.map(gpu => (
              <GPUCard key={gpu.id} gpu={gpu} nodeId={currentNode.id} />
            ))}
          </div>

          {/* Node Details */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mt-6">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Node Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Hostname</div>
                <div className="text-nvidia-green font-mono">{currentNode.hostname}</div>
              </div>
              <div>
                <div className="text-gray-400">CPU</div>
                <div className="text-gray-200">{currentNode.cpuModel.split(' ').slice(0, 4).join(' ')}</div>
              </div>
              <div>
                <div className="text-gray-400">RAM</div>
                <div className="text-gray-200">{currentNode.ramUsed} / {currentNode.ramTotal} GB</div>
              </div>
              <div>
                <div className="text-gray-400">Slurm State</div>
                <div className={`font-medium ${
                  currentNode.slurmState === 'idle' ? 'text-green-500' :
                  currentNode.slurmState === 'alloc' ? 'text-blue-500' :
                  currentNode.slurmState === 'drain' ? 'text-yellow-500' :
                  'text-red-500'
                }`}>
                  {currentNode.slurmState}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historical Metrics Tab */}
      {activeView === 'metrics' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm text-gray-400">Select GPU:</label>
            <select
              value={selectedGPU}
              onChange={(e) => setSelectedGPU(e.target.value)}
              className="bg-gray-700 text-gray-200 px-4 py-2 rounded-lg border border-gray-600"
            >
              {currentNode.gpus.map(gpu => (
                <option key={gpu.id} value={gpu.id}>
                  GPU {String(gpu.id).replace('GPU', '')} - {gpu.name}
                </option>
              ))}
            </select>
          </div>
          <MetricsChart nodeId={currentNode.id} gpuId={selectedGPU} />
        </div>
      )}

      {/* NVLink Topology Tab */}
      {activeView === 'topology' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <TopologyGraph node={currentNode} />
          </div>
          <div className="lg:col-span-1">
            <VisualContextPanel
              activeScenario={activeScenario}
              currentView="topology"
              onLaunchScenario={handleLaunchScenario}
            />
          </div>
        </div>
      )}

      {/* InfiniBand Fabric Tab */}
      {activeView === 'network' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <InfiniBandMap cluster={cluster} />
          </div>
          <div className="lg:col-span-1">
            <VisualContextPanel
              activeScenario={activeScenario}
              currentView="network"
              onLaunchScenario={handleLaunchScenario}
            />
          </div>
        </div>
      )}
    </div>
  );
};
