/**
 * Drag-and-Drop Cluster Builder
 *
 * Interactive visual tool for building and configuring DGX cluster topologies.
 * Allows users to drag nodes, connect them via InfiniBand, and configure settings.
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import type { DGXNode } from '@/types/hardware';
import { Server, Plus, Trash2, Link, Save, RotateCcw, Move, Cpu, Network } from 'lucide-react';

interface ClusterBuilderProps {
  initialNodes?: DGXNode[];
  onSave?: (config: ClusterConfig) => void;
  className?: string;
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
}

interface Connection {
  id: string;
  from: string;
  to: string;
  type: 'infiniband' | 'ethernet';
  bandwidth: number;
}

interface ClusterConfig {
  nodes: NodeTemplate[];
  connections: Connection[];
  layout: NodePosition[];
}

interface NodeTemplate {
  id: string;
  type: 'DGX-A100' | 'DGX-H100' | 'DGX-B200';
  hostname: string;
  gpuCount: number;
  hcaCount: number;
}

const NODE_TEMPLATES: { type: NodeTemplate['type']; label: string; gpuCount: number; hcaCount: number; color: string }[] = [
  { type: 'DGX-A100', label: 'DGX A100', gpuCount: 8, hcaCount: 8, color: '#76B900' },
  { type: 'DGX-H100', label: 'DGX H100', gpuCount: 8, hcaCount: 8, color: '#0066CC' },
  { type: 'DGX-B200', label: 'DGX B200', gpuCount: 8, hcaCount: 8, color: '#9333EA' },
];

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const NODE_WIDTH = 140;
const NODE_HEIGHT = 80;

export const ClusterBuilder: React.FC<ClusterBuilderProps> = ({
  initialNodes = [],
  onSave,
  className = '',
}) => {
  const [nodes, setNodes] = useState<NodeTemplate[]>(() =>
    initialNodes.map((n) => ({
      id: n.id,
      type: (n.systemType as NodeTemplate['type']) || 'DGX-A100',
      hostname: n.hostname,
      gpuCount: n.gpus.length,
      hcaCount: n.hcas.length,
    }))
  );

  const [positions, setPositions] = useState<NodePosition[]>(() =>
    initialNodes.map((n, i) => ({
      id: n.id,
      x: 100 + (i % 4) * 180,
      y: 100 + Math.floor(i / 4) * 120,
    }))
  );

  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);

  // Add a new node
  const addNode = useCallback((type: NodeTemplate['type']) => {
    const nodeId = `dgx-${String(nodes.length).padStart(2, '0')}`;
    const newNode: NodeTemplate = {
      id: nodeId,
      type,
      hostname: `${nodeId}.local`,
      gpuCount: 8,
      hcaCount: 8,
    };

    // Find an empty spot
    const existingPositions = new Set(positions.map(p => `${p.x},${p.y}`));
    let x = 100, y = 100;
    while (existingPositions.has(`${x},${y}`)) {
      x += 180;
      if (x > CANVAS_WIDTH - NODE_WIDTH) {
        x = 100;
        y += 120;
      }
    }

    setNodes([...nodes, newNode]);
    setPositions([...positions, { id: nodeId, x, y }]);
  }, [nodes, positions]);

  // Remove a node
  const removeNode = useCallback((nodeId: string) => {
    setNodes(nodes.filter(n => n.id !== nodeId));
    setPositions(positions.filter(p => p.id !== nodeId));
    setConnections(connections.filter(c => c.from !== nodeId && c.to !== nodeId));
    if (selectedNode === nodeId) setSelectedNode(null);
  }, [nodes, positions, connections, selectedNode]);

  // Start connecting nodes
  const startConnection = useCallback((nodeId: string) => {
    if (connectingFrom === null) {
      setConnectingFrom(nodeId);
    } else if (connectingFrom !== nodeId) {
      // Create connection
      const connectionId = `conn-${connections.length}`;
      const existingConn = connections.find(
        c => (c.from === connectingFrom && c.to === nodeId) ||
             (c.from === nodeId && c.to === connectingFrom)
      );

      if (!existingConn) {
        setConnections([...connections, {
          id: connectionId,
          from: connectingFrom,
          to: nodeId,
          type: 'infiniband',
          bandwidth: 400,
        }]);
      }
      setConnectingFrom(null);
    } else {
      setConnectingFrom(null);
    }
  }, [connectingFrom, connections]);

  // Remove a connection
  const removeConnection = useCallback((connId: string) => {
    setConnections(connections.filter(c => c.id !== connId));
  }, [connections]);

  // Handle mouse down for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return; // Only left click

    const pos = positions.find(p => p.id === nodeId);
    if (!pos) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDraggedNode(nodeId);
    setDragOffset({
      x: e.clientX - rect.left - pos.x,
      y: e.clientY - rect.top - pos.y,
    });

    e.preventDefault();
  }, [positions]);

  // Handle mouse move for dragging
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggedNode) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const newX = Math.max(0, Math.min(CANVAS_WIDTH - NODE_WIDTH, e.clientX - rect.left - dragOffset.x));
    const newY = Math.max(0, Math.min(CANVAS_HEIGHT - NODE_HEIGHT, e.clientY - rect.top - dragOffset.y));

    setPositions(positions.map(p =>
      p.id === draggedNode ? { ...p, x: newX, y: newY } : p
    ));
  }, [draggedNode, dragOffset, positions]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setDraggedNode(null);
  }, []);

  // Get node position by ID
  const getNodePos = (nodeId: string) => positions.find(p => p.id === nodeId);

  // Save configuration
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave({
        nodes,
        connections,
        layout: positions,
      });
    }
  }, [nodes, connections, positions, onSave]);

  // Reset to initial state
  const handleReset = useCallback(() => {
    setNodes(initialNodes.map((n) => ({
      id: n.id,
      type: (n.systemType as NodeTemplate['type']) || 'DGX-A100',
      hostname: n.hostname,
      gpuCount: n.gpus.length,
      hcaCount: n.hcas.length,
    })));
    setPositions(initialNodes.map((n, i) => ({
      id: n.id,
      x: 100 + (i % 4) * 180,
      y: 100 + Math.floor(i / 4) * 120,
    })));
    setConnections([]);
    setSelectedNode(null);
    setConnectingFrom(null);
  }, [initialNodes]);

  // Calculate cluster stats
  const stats = useMemo(() => ({
    totalNodes: nodes.length,
    totalGPUs: nodes.reduce((sum, n) => sum + n.gpuCount, 0),
    totalHCAs: nodes.reduce((sum, n) => sum + n.hcaCount, 0),
    totalConnections: connections.length,
    aggregateBandwidth: connections.reduce((sum, c) => sum + c.bandwidth, 0),
  }), [nodes, connections]);

  const selectedNodeData = nodes.find(n => n.id === selectedNode);

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-nvidia-green" />
          <h3 className="text-lg font-semibold text-gray-200">
            Cluster Builder
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          {onSave && (
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-3 py-1.5 bg-nvidia-green text-black rounded-lg hover:bg-green-500 text-sm font-medium"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          )}
        </div>
      </div>

      {/* Node Palette */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Add Nodes</h4>
        <div className="flex gap-2">
          {NODE_TEMPLATES.map((template) => (
            <button
              key={template.type}
              onClick={() => addNode(template.type)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              style={{ borderLeft: `4px solid ${template.color}` }}
            >
              <Plus className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-200">{template.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative bg-gray-900 rounded-lg border border-gray-700 overflow-hidden"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#374151" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {connections.map((conn) => {
            const fromPos = getNodePos(conn.from);
            const toPos = getNodePos(conn.to);
            if (!fromPos || !toPos) return null;

            const x1 = fromPos.x + NODE_WIDTH / 2;
            const y1 = fromPos.y + NODE_HEIGHT / 2;
            const x2 = toPos.x + NODE_WIDTH / 2;
            const y2 = toPos.y + NODE_HEIGHT / 2;

            return (
              <g key={conn.id}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={conn.type === 'infiniband' ? '#3B82F6' : '#6B7280'}
                  strokeWidth="3"
                  strokeDasharray={conn.type === 'ethernet' ? '5,5' : 'none'}
                />
                <circle
                  cx={(x1 + x2) / 2}
                  cy={(y1 + y2) / 2}
                  r="12"
                  fill="#1F2937"
                  stroke={conn.type === 'infiniband' ? '#3B82F6' : '#6B7280'}
                  strokeWidth="2"
                  className="cursor-pointer"
                  style={{ pointerEvents: 'all' }}
                  onClick={() => removeConnection(conn.id)}
                />
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 + 4}
                  textAnchor="middle"
                  className="text-xs fill-gray-300 pointer-events-none"
                >
                  {conn.bandwidth}G
                </text>
              </g>
            );
          })}

          {/* Connection in progress */}
          {connectingFrom && (
            <line
              x1={(getNodePos(connectingFrom)?.x || 0) + NODE_WIDTH / 2}
              y1={(getNodePos(connectingFrom)?.y || 0) + NODE_HEIGHT / 2}
              x2={(getNodePos(connectingFrom)?.x || 0) + NODE_WIDTH / 2}
              y2={(getNodePos(connectingFrom)?.y || 0) + NODE_HEIGHT / 2}
              stroke="#76B900"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          )}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => {
          const pos = getNodePos(node.id);
          if (!pos) return null;

          const template = NODE_TEMPLATES.find(t => t.type === node.type);
          const isSelected = selectedNode === node.id;
          const isConnecting = connectingFrom === node.id;

          return (
            <div
              key={node.id}
              className={`absolute rounded-lg p-2 cursor-move transition-shadow ${
                isSelected ? 'ring-2 ring-nvidia-green' : ''
              } ${isConnecting ? 'ring-2 ring-yellow-400' : ''}`}
              style={{
                left: pos.x,
                top: pos.y,
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
                backgroundColor: '#1F2937',
                borderLeft: `4px solid ${template?.color || '#76B900'}`,
              }}
              onMouseDown={(e) => handleMouseDown(e, node.id)}
              onClick={() => setSelectedNode(node.id)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <Server className="w-3 h-3 text-gray-400" />
                  <span className="text-xs font-medium text-gray-200 truncate" style={{ maxWidth: '80px' }}>
                    {node.hostname.split('.')[0]}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNode(node.id);
                  }}
                  className="p-0.5 text-gray-500 hover:text-red-400 rounded"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="text-xs text-gray-400">{node.type}</div>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Cpu className="w-3 h-3" />
                  <span>{node.gpuCount} GPUs</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startConnection(node.id);
                  }}
                  className={`p-1 rounded ${
                    isConnecting ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-blue-400'
                  }`}
                  title="Connect to another node"
                >
                  <Link className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Server className="w-12 h-12 mx-auto mb-2 text-gray-600" />
              <p className="text-gray-400">Click "Add Nodes" above to build your cluster</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="mt-4 grid grid-cols-5 gap-4 p-3 bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-200">{stats.totalNodes}</div>
          <div className="text-xs text-gray-500">Nodes</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-200">{stats.totalGPUs}</div>
          <div className="text-xs text-gray-500">GPUs</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-200">{stats.totalHCAs}</div>
          <div className="text-xs text-gray-500">HCAs</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-200">{stats.totalConnections}</div>
          <div className="text-xs text-gray-500">Connections</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-200">{stats.aggregateBandwidth}Gb/s</div>
          <div className="text-xs text-gray-500">Aggregate BW</div>
        </div>
      </div>

      {/* Selected Node Details */}
      {selectedNodeData && (
        <div className="mt-4 p-3 bg-gray-900 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-300">Node Details</h4>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-500 hover:text-gray-300"
            >
              <span className="text-xs">×</span>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-gray-500">ID:</span>
              <span className="text-gray-300 ml-2">{selectedNodeData.id}</span>
            </div>
            <div>
              <span className="text-gray-500">Type:</span>
              <span className="text-gray-300 ml-2">{selectedNodeData.type}</span>
            </div>
            <div>
              <span className="text-gray-500">Hostname:</span>
              <span className="text-gray-300 ml-2">{selectedNodeData.hostname}</span>
            </div>
            <div>
              <span className="text-gray-500">GPUs:</span>
              <span className="text-gray-300 ml-2">{selectedNodeData.gpuCount}</span>
            </div>
            <div>
              <span className="text-gray-500">HCAs:</span>
              <span className="text-gray-300 ml-2">{selectedNodeData.hcaCount}</span>
            </div>
            <div>
              <span className="text-gray-500">Connections:</span>
              <span className="text-gray-300 ml-2">
                {connections.filter(c => c.from === selectedNodeData.id || c.to === selectedNodeData.id).length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 p-3 bg-gray-900 rounded-lg text-xs text-gray-400">
        <div className="font-semibold text-gray-300 mb-1">Instructions:</div>
        <ul className="space-y-1 list-disc list-inside">
          <li><Move className="w-3 h-3 inline" /> Drag nodes to reposition them</li>
          <li><Link className="w-3 h-3 inline" /> Click the link icon on two nodes to connect them</li>
          <li>Click the connection label to remove it</li>
          <li>Click a node to see its details</li>
        </ul>
      </div>
    </div>
  );
};

export default ClusterBuilder;
