/**
 * Slurm Job Placement Visualizer
 *
 * Shows how Slurm jobs are allocated across cluster nodes and GPUs.
 * Provides visual understanding of GRES allocation and job scheduling.
 */

import React, { useState, useMemo } from 'react';
import type { DGXNode, GPU } from '@/types/hardware';
import { Server, Cpu, Play, Clock, AlertCircle, CheckCircle, Users } from 'lucide-react';

interface SlurmJobVisualizerProps {
  nodes: DGXNode[];
  className?: string;
}

interface SlurmJob {
  id: number;
  name: string;
  user: string;
  state: 'RUNNING' | 'PENDING' | 'COMPLETING' | 'SUSPENDED';
  nodeAllocations: {
    nodeId: string;
    gpuIds: number[];
  }[];
  priority: number;
  timeLimit: string;
  timeUsed: string;
  partition: string;
  color: string;
}

// Generate simulated Slurm jobs
const generateSlurmJobs = (nodes: DGXNode[]): SlurmJob[] => {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
  const jobs: SlurmJob[] = [];

  // Running jobs - distributed across nodes
  let jobId = 1001;
  let colorIndex = 0;

  // Job 1: Multi-node training job
  if (nodes.length >= 2) {
    jobs.push({
      id: jobId++,
      name: 'llama3_finetune',
      user: 'researcher1',
      state: 'RUNNING',
      nodeAllocations: [
        { nodeId: nodes[0].id, gpuIds: [0, 1, 2, 3] },
        { nodeId: nodes[1]?.id || nodes[0].id, gpuIds: [0, 1, 2, 3] },
      ],
      priority: 100,
      timeLimit: '24:00:00',
      timeUsed: '12:34:56',
      partition: 'gpu',
      color: colors[colorIndex++ % colors.length],
    });
  }

  // Job 2: Single node inference
  jobs.push({
    id: jobId++,
    name: 'inference_batch',
    user: 'mlops',
    state: 'RUNNING',
    nodeAllocations: [
      { nodeId: nodes[0].id, gpuIds: [4, 5] },
    ],
    priority: 80,
    timeLimit: '4:00:00',
    timeUsed: '1:23:45',
    partition: 'gpu',
    color: colors[colorIndex++ % colors.length],
  });

  // Job 3: Development job
  if (nodes.length >= 2) {
    jobs.push({
      id: jobId++,
      name: 'debug_session',
      user: 'dev_user',
      state: 'RUNNING',
      nodeAllocations: [
        { nodeId: nodes[1]?.id || nodes[0].id, gpuIds: [6, 7] },
      ],
      priority: 50,
      timeLimit: '8:00:00',
      timeUsed: '0:45:00',
      partition: 'interactive',
      color: colors[colorIndex++ % colors.length],
    });
  }

  // Pending jobs
  jobs.push({
    id: jobId++,
    name: 'large_scale_train',
    user: 'researcher2',
    state: 'PENDING',
    nodeAllocations: [],
    priority: 120,
    timeLimit: '48:00:00',
    timeUsed: '0:00:00',
    partition: 'gpu',
    color: colors[colorIndex++ % colors.length],
  });

  jobs.push({
    id: jobId++,
    name: 'benchmark_test',
    user: 'sysadmin',
    state: 'PENDING',
    nodeAllocations: [],
    priority: 90,
    timeLimit: '2:00:00',
    timeUsed: '0:00:00',
    partition: 'test',
    color: colors[colorIndex++ % colors.length],
  });

  return jobs;
};

export const SlurmJobVisualizer: React.FC<SlurmJobVisualizerProps> = ({
  nodes,
  className = '',
}) => {
  const [selectedJob, setSelectedJob] = useState<SlurmJob | null>(null);
  const [showPending, setShowPending] = useState(true);

  const jobs = useMemo(() => generateSlurmJobs(nodes), [nodes]);

  const runningJobs = jobs.filter(j => j.state === 'RUNNING');
  const pendingJobs = jobs.filter(j => j.state === 'PENDING');

  // Get job for a specific GPU
  const getJobForGPU = (nodeId: string, gpuId: number): SlurmJob | undefined => {
    return runningJobs.find(job =>
      job.nodeAllocations.some(
        alloc => alloc.nodeId === nodeId && alloc.gpuIds.includes(gpuId)
      )
    );
  };

  // Calculate node utilization
  const getNodeUtilization = (node: DGXNode) => {
    let allocatedGPUs = 0;
    runningJobs.forEach(job => {
      job.nodeAllocations.forEach(alloc => {
        if (alloc.nodeId === node.id) {
          allocatedGPUs += alloc.gpuIds.length;
        }
      });
    });
    return {
      allocated: allocatedGPUs,
      total: node.gpus.length,
      percentage: (allocatedGPUs / node.gpus.length) * 100,
    };
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'RUNNING':
        return <Play className="w-4 h-4 text-green-400" />;
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'COMPLETING':
        return <CheckCircle className="w-4 h-4 text-blue-400" />;
      case 'SUSPENDED':
        return <AlertCircle className="w-4 h-4 text-orange-400" />;
      default:
        return null;
    }
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-nvidia-green" />
          <h3 className="text-lg font-semibold text-gray-200">
            Slurm Job Placement
          </h3>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-green-400" />
            <span className="text-gray-300">{runningJobs.length} Running</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-gray-300">{pendingJobs.length} Pending</span>
          </div>
        </div>
      </div>

      {/* Cluster Node Grid */}
      <div className="space-y-4 mb-4">
        {nodes.map((node) => {
          const utilization = getNodeUtilization(node);

          return (
            <div key={node.id} className="bg-gray-900 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-200">{node.hostname}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    node.slurmState === 'allocated' ? 'bg-green-900 text-green-200' :
                    node.slurmState === 'mixed' ? 'bg-yellow-900 text-yellow-200' :
                    node.slurmState === 'idle' ? 'bg-gray-700 text-gray-300' :
                    'bg-red-900 text-red-200'
                  }`}>
                    {node.slurmState}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {utilization.allocated}/{utilization.total} GPUs allocated
                </span>
              </div>

              {/* GPU Grid */}
              <div className="grid grid-cols-8 gap-2">
                {node.gpus.map((gpu) => {
                  const job = getJobForGPU(node.id, gpu.id);
                  const isSelected = selectedJob && job?.id === selectedJob.id;

                  return (
                    <div
                      key={gpu.id}
                      onClick={() => job && setSelectedJob(job)}
                      className={`relative p-2 rounded-lg cursor-pointer transition-all ${
                        job ? 'hover:ring-2 hover:ring-white' : ''
                      } ${isSelected ? 'ring-2 ring-white' : ''}`}
                      style={{
                        backgroundColor: job ? job.color : '#374151',
                        opacity: job ? 1 : 0.5,
                      }}
                    >
                      <div className="flex flex-col items-center">
                        <Cpu className="w-4 h-4 text-white mb-1" />
                        <span className="text-xs font-medium text-white">GPU {gpu.id}</span>
                        {job && (
                          <span className="text-xs text-white/80 truncate w-full text-center mt-0.5">
                            {job.name.slice(0, 8)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Utilization Bar */}
              <div className="mt-2">
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-nvidia-green transition-all"
                    style={{ width: `${utilization.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Job Queue */}
      <div className="grid grid-cols-2 gap-4">
        {/* Running Jobs */}
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
            <Play className="w-4 h-4 text-green-400" />
            Running Jobs
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {runningJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`p-2 rounded-lg cursor-pointer transition-colors ${
                  selectedJob?.id === job.id ? 'bg-gray-600' : 'bg-gray-900 hover:bg-gray-700'
                }`}
                style={{ borderLeft: `4px solid ${job.color}` }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-200">{job.name}</span>
                  <span className="text-xs text-gray-400">#{job.id}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                  <Users className="w-3 h-3" />
                  <span>{job.user}</span>
                  <span>|</span>
                  <span>{job.nodeAllocations.reduce((sum, a) => sum + a.gpuIds.length, 0)} GPUs</span>
                  <span>|</span>
                  <span>{job.timeUsed}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Jobs */}
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            Pending Queue
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {pendingJobs.map((job) => (
              <div
                key={job.id}
                className="p-2 bg-gray-900 rounded-lg"
                style={{ borderLeft: `4px solid ${job.color}` }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-200">{job.name}</span>
                  <span className="text-xs text-gray-400">#{job.id}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                  <Users className="w-3 h-3" />
                  <span>{job.user}</span>
                  <span>|</span>
                  <span>Priority: {job.priority}</span>
                  <span>|</span>
                  <span>{job.partition}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Job Details */}
      {selectedJob && (
        <div className="mt-4 p-3 bg-gray-900 rounded-lg border-l-4" style={{ borderColor: selectedJob.color }}>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Job Details</h4>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-gray-500">Job ID:</span>
              <span className="text-gray-300 ml-2">#{selectedJob.id}</span>
            </div>
            <div>
              <span className="text-gray-500">Name:</span>
              <span className="text-gray-300 ml-2">{selectedJob.name}</span>
            </div>
            <div>
              <span className="text-gray-500">User:</span>
              <span className="text-gray-300 ml-2">{selectedJob.user}</span>
            </div>
            <div>
              <span className="text-gray-500">State:</span>
              <span className="text-gray-300 ml-2 flex items-center gap-1">
                {getStateIcon(selectedJob.state)}
                {selectedJob.state}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Partition:</span>
              <span className="text-gray-300 ml-2">{selectedJob.partition}</span>
            </div>
            <div>
              <span className="text-gray-500">Priority:</span>
              <span className="text-gray-300 ml-2">{selectedJob.priority}</span>
            </div>
            <div>
              <span className="text-gray-500">Time Limit:</span>
              <span className="text-gray-300 ml-2">{selectedJob.timeLimit}</span>
            </div>
            <div>
              <span className="text-gray-500">Time Used:</span>
              <span className="text-gray-300 ml-2">{selectedJob.timeUsed}</span>
            </div>
            <div>
              <span className="text-gray-500">GPUs:</span>
              <span className="text-gray-300 ml-2">
                {selectedJob.nodeAllocations.reduce((sum, a) => sum + a.gpuIds.length, 0)}
              </span>
            </div>
          </div>

          {/* Node Allocations */}
          {selectedJob.nodeAllocations.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <span className="text-xs text-gray-500">Allocated Resources:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {selectedJob.nodeAllocations.map((alloc, idx) => (
                  <span key={idx} className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300">
                    {alloc.nodeId}: GPU[{alloc.gpuIds.join(', ')}]
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Slurm Commands */}
      <div className="mt-4 p-3 bg-gray-900 rounded-lg font-mono text-xs">
        <div className="text-gray-500"># View job allocation:</div>
        <div className="text-cyan-400">$ squeue -o "%i %j %u %t %P %D %C %b"</div>
        <div className="text-gray-500 mt-2"># Show GRES usage:</div>
        <div className="text-cyan-400">$ scontrol show node | grep -A5 "Gres"</div>
      </div>
    </div>
  );
};

export default SlurmJobVisualizer;
