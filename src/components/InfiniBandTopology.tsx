/**
 * InfiniBand Fat-Tree Topology Visualization
 *
 * Shows the InfiniBand fabric topology connecting multiple DGX nodes
 * in a fat-tree architecture with spine and leaf switches.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { DGXNode, InfiniBandHCA } from '@/types/hardware';

interface InfiniBandTopologyProps {
  nodes: DGXNode[];
  selectedNodeId?: string;
  onNodeClick?: (nodeId: string) => void;
  onHCAClick?: (nodeId: string, hca: InfiniBandHCA) => void;
}

interface TopologyNode {
  id: string;
  type: 'spine' | 'leaf' | 'hca' | 'dgx';
  label: string;
  x: number;
  y: number;
  health: 'OK' | 'Warning' | 'Critical';
  data?: DGXNode | InfiniBandHCA;
}

interface TopologyLink {
  source: TopologyNode;
  target: TopologyNode;
  bandwidth: number; // Gb/s
  active: boolean;
}

export const InfiniBandTopology: React.FC<InfiniBandTopologyProps> = ({
  nodes,
  selectedNodeId,
  onNodeClick,
  onHCAClick,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<TopologyNode | null>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const width = 1000;
    const height = 700;
    const nodeCount = nodes.length;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    // Add gradients
    const defs = svg.append('defs');

    // Spine switch gradient (purple/blue)
    const spineGradient = defs.append('linearGradient')
      .attr('id', 'spine-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%');
    spineGradient.append('stop').attr('offset', '0%').attr('stop-color', '#7C3AED');
    spineGradient.append('stop').attr('offset', '100%').attr('stop-color', '#4C1D95');

    // Leaf switch gradient (blue)
    const leafGradient = defs.append('linearGradient')
      .attr('id', 'leaf-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%');
    leafGradient.append('stop').attr('offset', '0%').attr('stop-color', '#2563EB');
    leafGradient.append('stop').attr('offset', '100%').attr('stop-color', '#1E40AF');

    // Arrow marker for direction
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 5)
      .attr('refY', 0)
      .attr('markerWidth', 4)
      .attr('markerHeight', 4)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#6B7280');

    // Calculate number of spine and leaf switches based on node count
    const numSpine = Math.max(2, Math.ceil(nodeCount / 4));
    const numLeaf = Math.max(2, Math.ceil(nodeCount / 2));

    // Create spine switches (top tier)
    const spineNodes: TopologyNode[] = [];
    const spineSpacing = width / (numSpine + 1);
    for (let i = 0; i < numSpine; i++) {
      spineNodes.push({
        id: `spine-${i}`,
        type: 'spine',
        label: `Spine ${i}`,
        x: spineSpacing * (i + 1),
        y: 80,
        health: 'OK',
      });
    }

    // Create leaf switches (middle tier)
    const leafNodes: TopologyNode[] = [];
    const leafSpacing = width / (numLeaf + 1);
    for (let i = 0; i < numLeaf; i++) {
      leafNodes.push({
        id: `leaf-${i}`,
        type: 'leaf',
        label: `Leaf ${i}`,
        x: leafSpacing * (i + 1),
        y: 250,
        health: 'OK',
      });
    }

    // Create DGX nodes with their HCAs (bottom tier)
    const dgxNodes: TopologyNode[] = [];
    const hcaNodes: TopologyNode[] = [];
    const dgxSpacing = width / (nodeCount + 1);

    nodes.forEach((node, nodeIdx) => {
      const dgxX = dgxSpacing * (nodeIdx + 1);
      const dgxY = 550;

      dgxNodes.push({
        id: node.id,
        type: 'dgx',
        label: node.hostname,
        x: dgxX,
        y: dgxY,
        health: node.healthStatus === 'OK' ? 'OK' : node.healthStatus === 'Warning' ? 'Warning' : 'Critical',
        data: node,
      });

      // Create HCA nodes for this DGX
      node.hcas.forEach((hca, hcaIdx) => {
        const hcaOffset = (hcaIdx - (node.hcas.length - 1) / 2) * 40;
        hcaNodes.push({
          id: `${node.id}-hca-${hcaIdx}`,
          type: 'hca',
          label: `HCA ${hcaIdx}`,
          x: dgxX + hcaOffset,
          y: 420,
          health: hca.ports.every(p => p.state === 'Active') ? 'OK' :
                  hca.ports.some(p => p.state === 'Active') ? 'Warning' : 'Critical',
          data: hca,
        });
      });
    });

    // Create links
    const links: TopologyLink[] = [];

    // Spine to Leaf connections (full mesh)
    spineNodes.forEach((spine) => {
      leafNodes.forEach((leaf) => {
        links.push({
          source: spine,
          target: leaf,
          bandwidth: 400,
          active: true,
        });
      });
    });

    // Leaf to HCA connections
    hcaNodes.forEach((hca, idx) => {
      // Connect each HCA to 1-2 leaf switches
      const leafIdx = Math.floor(idx / 2) % leafNodes.length;
      links.push({
        source: leafNodes[leafIdx],
        target: hca,
        bandwidth: 400,
        active: hca.health === 'OK',
      });
      // Second uplink to adjacent leaf for redundancy
      if (leafNodes[leafIdx + 1] || leafNodes[0]) {
        links.push({
          source: leafNodes[(leafIdx + 1) % leafNodes.length],
          target: hca,
          bandwidth: 400,
          active: hca.health === 'OK',
        });
      }
    });

    // HCA to DGX connections
    dgxNodes.forEach((dgx) => {
      const dgxHCAs = hcaNodes.filter(h => h.id.startsWith(dgx.id));
      dgxHCAs.forEach((hca) => {
        links.push({
          source: hca,
          target: dgx,
          bandwidth: 400,
          active: true,
        });
      });
    });

    // Draw links
    const linkGroup = svg.append('g').attr('class', 'links');

    linkGroup
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('x1', (d) => d.source.x)
      .attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x)
      .attr('y2', (d) => d.target.y)
      .attr('stroke', (d) => d.active ? '#4ADE80' : '#EF4444')
      .attr('stroke-width', (d) => {
        // Thicker lines for spine-leaf, thinner for leaf-hca
        if (d.source.type === 'spine' || d.target.type === 'spine') return 3;
        return 2;
      })
      .attr('stroke-dasharray', (d) => d.active ? '0' : '4,4')
      .attr('opacity', 0.5);

    // Tier labels
    svg.append('text')
      .attr('x', 30)
      .attr('y', 80)
      .attr('fill', '#9CA3AF')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text('Spine Tier');

    svg.append('text')
      .attr('x', 30)
      .attr('y', 250)
      .attr('fill', '#9CA3AF')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text('Leaf Tier');

    svg.append('text')
      .attr('x', 30)
      .attr('y', 420)
      .attr('fill', '#9CA3AF')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text('HCAs');

    svg.append('text')
      .attr('x', 30)
      .attr('y', 550)
      .attr('fill', '#9CA3AF')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text('DGX Nodes');

    // Draw spine switches
    const spineGroup = svg.append('g').attr('class', 'spine-switches');

    const spines = spineGroup
      .selectAll('g')
      .data(spineNodes)
      .enter()
      .append('g')
      .attr('transform', (d) => `translate(${d.x}, ${d.y})`);

    spines
      .append('rect')
      .attr('x', -50)
      .attr('y', -25)
      .attr('width', 100)
      .attr('height', 50)
      .attr('rx', 8)
      .attr('fill', 'url(#spine-gradient)')
      .attr('stroke', '#7C3AED')
      .attr('stroke-width', 2);

    spines
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#fff')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text((d) => d.label);

    // Draw leaf switches
    const leafGroup = svg.append('g').attr('class', 'leaf-switches');

    const leaves = leafGroup
      .selectAll('g')
      .data(leafNodes)
      .enter()
      .append('g')
      .attr('transform', (d) => `translate(${d.x}, ${d.y})`);

    leaves
      .append('rect')
      .attr('x', -45)
      .attr('y', -22)
      .attr('width', 90)
      .attr('height', 44)
      .attr('rx', 6)
      .attr('fill', 'url(#leaf-gradient)')
      .attr('stroke', '#2563EB')
      .attr('stroke-width', 2);

    leaves
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#fff')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .text((d) => d.label);

    // Draw HCAs
    const hcaGroup = svg.append('g').attr('class', 'hcas');

    const hcas = hcaGroup
      .selectAll('g')
      .data(hcaNodes)
      .enter()
      .append('g')
      .attr('transform', (d) => `translate(${d.x}, ${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        const dgxId = d.id.split('-hca-')[0];
        if (onHCAClick && d.data) {
          onHCAClick(dgxId, d.data as InfiniBandHCA);
        }
      })
      .on('mouseover', function(_event, d) {
        setHoveredNode(d);
        d3.select(this).select('circle').attr('stroke-width', 3);
      })
      .on('mouseout', function() {
        setHoveredNode(null);
        d3.select(this).select('circle').attr('stroke-width', 2);
      });

    hcas
      .append('circle')
      .attr('r', 15)
      .attr('fill', (d) => d.health === 'OK' ? '#065F46' : d.health === 'Warning' ? '#92400E' : '#991B1B')
      .attr('stroke', (d) => d.health === 'OK' ? '#10B981' : d.health === 'Warning' ? '#F59E0B' : '#EF4444')
      .attr('stroke-width', 2);

    hcas
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#fff')
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .text((d) => d.label.replace('HCA ', ''));

    // Draw DGX nodes
    const dgxGroup = svg.append('g').attr('class', 'dgx-nodes');

    const dgxs = dgxGroup
      .selectAll('g')
      .data(dgxNodes)
      .enter()
      .append('g')
      .attr('transform', (d) => `translate(${d.x}, ${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        if (onNodeClick) {
          onNodeClick(d.id);
        }
      })
      .on('mouseover', function(_event, d) {
        setHoveredNode(d);
        d3.select(this).select('rect').attr('stroke-width', 4);
      })
      .on('mouseout', function() {
        setHoveredNode(null);
        d3.select(this).select('rect').attr('stroke-width', 2);
      });

    dgxs
      .append('rect')
      .attr('x', -55)
      .attr('y', -30)
      .attr('width', 110)
      .attr('height', 60)
      .attr('rx', 8)
      .attr('fill', (d) => d.id === selectedNodeId ? '#1E3A5F' : '#1F2937')
      .attr('stroke', (d) => {
        if (d.id === selectedNodeId) return '#00D4FF';
        if (d.health === 'Critical') return '#EF4444';
        if (d.health === 'Warning') return '#F59E0B';
        return '#76B900';
      })
      .attr('stroke-width', (d) => d.id === selectedNodeId ? 3 : 2);

    dgxs
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.3em')
      .attr('fill', '#fff')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .text((d) => d.label);

    dgxs
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.2em')
      .attr('fill', '#9CA3AF')
      .attr('font-size', '10px')
      .text((d) => {
        const dgxData = d.data as DGXNode;
        return `${dgxData.gpus.length} GPUs | ${dgxData.hcas.length} HCAs`;
      });

  }, [nodes, selectedNodeId, onNodeClick, onHCAClick]);

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-200">
          InfiniBand Fat-Tree Topology
        </h3>
        <div className="text-sm text-gray-400">
          {nodes.length} nodes | {nodes.reduce((sum, n) => sum + n.hcas.length, 0)} HCAs
        </div>
      </div>

      <svg ref={svgRef} className="w-full bg-gray-900 rounded-lg" />

      {/* Info panel for hovered node */}
      {hoveredNode && (
        <div className="mt-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">
            {hoveredNode.type === 'dgx' ? 'DGX Node' :
             hoveredNode.type === 'hca' ? 'HCA' : 'Switch'}: {hoveredNode.label}
          </h4>
          {hoveredNode.type === 'dgx' && hoveredNode.data && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-gray-400">System Type:</div>
              <div className="text-gray-300">{(hoveredNode.data as DGXNode).systemType}</div>
              <div className="text-gray-400">GPUs:</div>
              <div className="text-gray-300">{(hoveredNode.data as DGXNode).gpus.length}</div>
              <div className="text-gray-400">HCAs:</div>
              <div className="text-gray-300">{(hoveredNode.data as DGXNode).hcas.length}</div>
              <div className="text-gray-400">Slurm State:</div>
              <div className="text-gray-300">{(hoveredNode.data as DGXNode).slurmState}</div>
              <div className="text-gray-400">Health:</div>
              <div className={`font-semibold ${
                hoveredNode.health === 'OK' ? 'text-green-400' :
                hoveredNode.health === 'Warning' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {hoveredNode.health}
              </div>
            </div>
          )}
          {hoveredNode.type === 'hca' && hoveredNode.data && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-gray-400">Type:</div>
              <div className="text-gray-300">{(hoveredNode.data as InfiniBandHCA).caType}</div>
              <div className="text-gray-400">Firmware:</div>
              <div className="text-gray-300">{(hoveredNode.data as InfiniBandHCA).firmwareVersion}</div>
              <div className="text-gray-400">Ports:</div>
              <div className="text-gray-300">{(hoveredNode.data as InfiniBandHCA).ports.length}</div>
              <div className="text-gray-400">Port Status:</div>
              <div className="text-gray-300">
                {(hoveredNode.data as InfiniBandHCA).ports.map((p) =>
                  `P${p.portNumber}: ${p.state}`
                ).join(', ')}
              </div>
              <div className="text-gray-400">Rate:</div>
              <div className="text-gray-300">
                {(hoveredNode.data as InfiniBandHCA).ports[0]?.rate || 'N/A'} Gb/s
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-4 bg-gradient-to-r from-purple-600 to-purple-900 rounded" />
          <span className="text-gray-300">Spine Switch</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-4 bg-gradient-to-r from-blue-600 to-blue-900 rounded" />
          <span className="text-gray-300">Leaf Switch</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-800 border-2 border-green-500 rounded-full" />
          <span className="text-gray-300">HCA Active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-800 border-2 border-green-500 rounded" />
          <span className="text-gray-300">DGX Node</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-green-400" />
          <span className="text-gray-300">Active Link</span>
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Click on DGX nodes or HCAs for details. NDR (400Gb/s) connections shown.
      </p>
    </div>
  );
};

export default InfiniBandTopology;
