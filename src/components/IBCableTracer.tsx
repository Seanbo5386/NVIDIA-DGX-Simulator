/**
 * InfiniBand Cable Tracing Tool
 *
 * Interactive tool for tracing and visualizing InfiniBand cable paths
 * between nodes in a cluster. Helps diagnose connectivity issues and
 * understand fabric topology.
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { DGXNode } from '@/types/hardware';
import { Cable, Search, AlertTriangle, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

interface IBCableTracerProps {
  nodes: DGXNode[];
  className?: string;
}

interface CableInfo {
  id: string;
  sourceNode: string;
  sourceHCA: string;
  sourcePort: number;
  destNode: string;
  destHCA: string;
  destPort: number;
  cableType: 'copper' | 'optical' | 'aoc';
  length: number;
  status: 'active' | 'degraded' | 'down';
  speed: number;
  errorCount: number;
}

interface TraceResult {
  path: CableInfo[];
  totalLength: number;
  hopCount: number;
  bottleneck: number;
  issues: string[];
}

// Generate simulated cable data
const generateCables = (nodes: DGXNode[]): CableInfo[] => {
  const cables: CableInfo[] = [];
  let cableId = 0;

  // Create inter-node connections
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      // Each node pair has multiple cable connections (for redundancy)
      const numConnections = Math.min(2, Math.min(nodes[i].hcas.length, nodes[j].hcas.length));

      for (let c = 0; c < numConnections; c++) {
        const isOptical = Math.random() > 0.3;
        const hasIssue = Math.random() > 0.85;

        cables.push({
          id: `cable-${cableId++}`,
          sourceNode: nodes[i].id,
          sourceHCA: nodes[i].hcas[c]?.caType || `mlx5_${c}`,
          sourcePort: 1,
          destNode: nodes[j].id,
          destHCA: nodes[j].hcas[c]?.caType || `mlx5_${c}`,
          destPort: 1,
          cableType: isOptical ? 'optical' : 'copper',
          length: isOptical ? Math.floor(Math.random() * 50) + 10 : Math.floor(Math.random() * 5) + 1,
          status: hasIssue ? (Math.random() > 0.5 ? 'degraded' : 'down') : 'active',
          speed: 400,
          errorCount: hasIssue ? Math.floor(Math.random() * 100) + 1 : 0,
        });
      }
    }
  }

  return cables;
};

export const IBCableTracer: React.FC<IBCableTracerProps> = ({
  nodes,
  className = '',
}) => {
  const cables = useMemo(() => generateCables(nodes), [nodes]);

  const [sourceNode, setSourceNode] = useState<string>('');
  const [destNode, setDestNode] = useState<string>('');
  const [traceResult, setTraceResult] = useState<TraceResult | null>(null);
  const [selectedCable, setSelectedCable] = useState<CableInfo | null>(null);
  const [filter, setFilter] = useState<'all' | 'issues'>('all');

  // Find path between two nodes
  const tracePath = useCallback(() => {
    if (!sourceNode || !destNode || sourceNode === destNode) {
      setTraceResult(null);
      return;
    }

    // Find direct cables between nodes
    const directCables = cables.filter(
      c => (c.sourceNode === sourceNode && c.destNode === destNode) ||
           (c.sourceNode === destNode && c.destNode === sourceNode)
    );

    if (directCables.length > 0) {
      const issues: string[] = [];
      directCables.forEach(cable => {
        if (cable.status === 'down') {
          issues.push(`Cable ${cable.id} is DOWN`);
        } else if (cable.status === 'degraded') {
          issues.push(`Cable ${cable.id} is degraded with ${cable.errorCount} errors`);
        }
      });

      setTraceResult({
        path: directCables,
        totalLength: directCables.reduce((sum, c) => sum + c.length, 0),
        hopCount: 1,
        bottleneck: Math.min(...directCables.map(c => c.speed)),
        issues,
      });
    } else {
      // No direct connection - would need multi-hop (simplified)
      setTraceResult({
        path: [],
        totalLength: 0,
        hopCount: 0,
        bottleneck: 0,
        issues: ['No direct connection found between these nodes'],
      });
    }
  }, [sourceNode, destNode, cables]);

  // Get cables with issues
  const cablesWithIssues = useMemo(() =>
    cables.filter(c => c.status !== 'active'),
    [cables]
  );

  // Get filtered cables
  const filteredCables = filter === 'issues' ? cablesWithIssues : cables;

  // Get status icon
  const getStatusIcon = (status: CableInfo['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'down':
        return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  // Get cable type icon/color
  const getCableTypeStyle = (type: CableInfo['cableType']) => {
    switch (type) {
      case 'optical':
        return { color: '#3B82F6', label: 'Optical' };
      case 'copper':
        return { color: '#F59E0B', label: 'Copper' };
      case 'aoc':
        return { color: '#10B981', label: 'AOC' };
    }
  };

  // Stats
  const stats = useMemo(() => ({
    total: cables.length,
    active: cables.filter(c => c.status === 'active').length,
    degraded: cables.filter(c => c.status === 'degraded').length,
    down: cables.filter(c => c.status === 'down').length,
    totalErrors: cables.reduce((sum, c) => sum + c.errorCount, 0),
  }), [cables]);

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cable className="w-5 h-5 text-nvidia-green" />
          <h3 className="text-lg font-semibold text-gray-200">
            InfiniBand Cable Tracer
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-sm rounded-lg ${
              filter === 'all' ? 'bg-nvidia-green text-black' : 'bg-gray-700 text-gray-300'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilter('issues')}
            className={`px-3 py-1 text-sm rounded-lg ${
              filter === 'issues' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            Issues ({stats.degraded + stats.down})
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-5 gap-4 mb-4 p-3 bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-200">{stats.total}</div>
          <div className="text-xs text-gray-500">Total Cables</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-green-400">{stats.active}</div>
          <div className="text-xs text-gray-500">Active</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-yellow-400">{stats.degraded}</div>
          <div className="text-xs text-gray-500">Degraded</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-red-400">{stats.down}</div>
          <div className="text-xs text-gray-500">Down</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-200">{stats.totalErrors}</div>
          <div className="text-xs text-gray-500">Total Errors</div>
        </div>
      </div>

      {/* Path Tracer */}
      <div className="mb-4 p-3 bg-gray-900 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Trace Path</h4>
        <div className="flex items-center gap-3">
          <select
            value={sourceNode}
            onChange={(e) => setSourceNode(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 text-sm"
          >
            <option value="">Select source node...</option>
            {nodes.map(n => (
              <option key={n.id} value={n.id}>{n.hostname}</option>
            ))}
          </select>

          <ArrowRight className="w-5 h-5 text-gray-500" />

          <select
            value={destNode}
            onChange={(e) => setDestNode(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 text-sm"
          >
            <option value="">Select destination node...</option>
            {nodes.map(n => (
              <option key={n.id} value={n.id}>{n.hostname}</option>
            ))}
          </select>

          <button
            onClick={tracePath}
            disabled={!sourceNode || !destNode}
            className="flex items-center gap-2 px-4 py-2 bg-nvidia-green text-black rounded-lg hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            <Search className="w-4 h-4" />
            Trace
          </button>
        </div>

        {/* Trace Result */}
        {traceResult && (
          <div className="mt-4 p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-sm font-semibold text-gray-300">Trace Results</h5>
              {traceResult.issues.length === 0 ? (
                <span className="flex items-center gap-1 text-green-400 text-xs">
                  <CheckCircle className="w-4 h-4" />
                  All paths healthy
                </span>
              ) : (
                <span className="flex items-center gap-1 text-yellow-400 text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  {traceResult.issues.length} issue(s)
                </span>
              )}
            </div>

            {traceResult.path.length > 0 ? (
              <>
                <div className="grid grid-cols-4 gap-4 text-xs mb-3">
                  <div>
                    <span className="text-gray-500">Paths:</span>
                    <span className="text-gray-300 ml-2">{traceResult.path.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Hop Count:</span>
                    <span className="text-gray-300 ml-2">{traceResult.hopCount}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Bottleneck:</span>
                    <span className="text-gray-300 ml-2">{traceResult.bottleneck}Gb/s</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Length:</span>
                    <span className="text-gray-300 ml-2">{traceResult.totalLength}m</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {traceResult.path.map((cable) => (
                    <div
                      key={cable.id}
                      className={`flex items-center gap-3 p-2 rounded-lg ${
                        cable.status === 'active' ? 'bg-gray-700' :
                        cable.status === 'degraded' ? 'bg-yellow-900/30' :
                        'bg-red-900/30'
                      }`}
                    >
                      {getStatusIcon(cable.status)}
                      <div className="flex-1 text-xs">
                        <span className="text-gray-300">{cable.sourceNode}:{cable.sourceHCA}</span>
                        <span className="text-gray-500 mx-2">→</span>
                        <span className="text-gray-300">{cable.destNode}:{cable.destHCA}</span>
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ backgroundColor: getCableTypeStyle(cable.cableType).color + '40', color: getCableTypeStyle(cable.cableType).color }}
                      >
                        {getCableTypeStyle(cable.cableType).label}
                      </span>
                      <span className="text-xs text-gray-400">{cable.length}m</span>
                      <span className="text-xs text-gray-400">{cable.speed}Gb/s</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-gray-400 text-sm">
                {traceResult.issues[0]}
              </div>
            )}

            {traceResult.issues.length > 0 && traceResult.path.length > 0 && (
              <div className="mt-3 p-2 bg-yellow-900/30 rounded-lg">
                <div className="text-xs text-yellow-400 font-medium mb-1">Issues Detected:</div>
                <ul className="text-xs text-yellow-200 space-y-1">
                  {traceResult.issues.map((issue, idx) => (
                    <li key={idx}>• {issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cable List */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Cable Inventory</h4>
        <div className="max-h-64 overflow-y-auto space-y-2">
          {filteredCables.map((cable) => (
            <div
              key={cable.id}
              onClick={() => setSelectedCable(cable)}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                selectedCable?.id === cable.id ? 'bg-gray-600' : 'bg-gray-900 hover:bg-gray-700'
              } ${
                cable.status === 'degraded' ? 'border-l-4 border-yellow-500' :
                cable.status === 'down' ? 'border-l-4 border-red-500' :
                'border-l-4 border-green-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(cable.status)}
                  <div>
                    <div className="text-sm text-gray-200">
                      {cable.sourceNode} <ArrowRight className="w-3 h-3 inline mx-1" /> {cable.destNode}
                    </div>
                    <div className="text-xs text-gray-500">
                      {cable.sourceHCA}:{cable.sourcePort} → {cable.destHCA}:{cable.destPort}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ backgroundColor: getCableTypeStyle(cable.cableType).color + '40', color: getCableTypeStyle(cable.cableType).color }}
                  >
                    {getCableTypeStyle(cable.cableType).label}
                  </span>
                  <span className="text-xs text-gray-400">{cable.length}m</span>
                  <span className="text-xs text-gray-400">{cable.speed}Gb/s</span>
                  {cable.errorCount > 0 && (
                    <span className="text-xs text-red-400">{cable.errorCount} errors</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredCables.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              {filter === 'issues' ? 'No cable issues detected' : 'No cables found'}
            </div>
          )}
        </div>
      </div>

      {/* Selected Cable Details */}
      {selectedCable && (
        <div className="mt-4 p-3 bg-gray-900 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-300">Cable Details</h4>
            <button
              onClick={() => setSelectedCable(null)}
              className="text-gray-500 hover:text-gray-300 text-xs"
            >
              ×
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-gray-500">Cable ID:</span>
              <span className="text-gray-300 ml-2">{selectedCable.id}</span>
            </div>
            <div>
              <span className="text-gray-500">Type:</span>
              <span className="text-gray-300 ml-2">{getCableTypeStyle(selectedCable.cableType).label}</span>
            </div>
            <div>
              <span className="text-gray-500">Status:</span>
              <span className={`ml-2 ${
                selectedCable.status === 'active' ? 'text-green-400' :
                selectedCable.status === 'degraded' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {selectedCable.status.toUpperCase()}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Source:</span>
              <span className="text-gray-300 ml-2">{selectedCable.sourceNode}:{selectedCable.sourceHCA}:{selectedCable.sourcePort}</span>
            </div>
            <div>
              <span className="text-gray-500">Destination:</span>
              <span className="text-gray-300 ml-2">{selectedCable.destNode}:{selectedCable.destHCA}:{selectedCable.destPort}</span>
            </div>
            <div>
              <span className="text-gray-500">Length:</span>
              <span className="text-gray-300 ml-2">{selectedCable.length}m</span>
            </div>
            <div>
              <span className="text-gray-500">Speed:</span>
              <span className="text-gray-300 ml-2">{selectedCable.speed}Gb/s</span>
            </div>
            <div>
              <span className="text-gray-500">Error Count:</span>
              <span className={`ml-2 ${selectedCable.errorCount > 0 ? 'text-red-400' : 'text-gray-300'}`}>
                {selectedCable.errorCount}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Commands Reference */}
      <div className="mt-4 p-3 bg-gray-900 rounded-lg font-mono text-xs">
        <div className="text-gray-500"># Trace cable path:</div>
        <div className="text-cyan-400">$ iblinkinfo | grep -E "{sourceNode || 'node1'}.*{destNode || 'node2'}"</div>
        <div className="text-gray-500 mt-2"># Check cable health:</div>
        <div className="text-cyan-400">$ mlxcables</div>
        <div className="text-gray-500 mt-2"># View port errors:</div>
        <div className="text-cyan-400">$ ibporterrors</div>
      </div>
    </div>
  );
};

export default IBCableTracer;
