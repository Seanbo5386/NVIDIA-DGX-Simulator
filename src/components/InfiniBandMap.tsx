/**
 * InfiniBand Fabric Map Component
 *
 * Visualizes InfiniBand fat-tree topology using D3.js.
 * Shows switches (leaf/spine) and HCAs with link health.
 * Includes live data flow animations when simulation is running.
 */

import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import type { ClusterConfig } from '@/types/hardware';
import { Network } from 'lucide-react';
import { useNetworkAnimation, AnimationLink } from '@/hooks/useNetworkAnimation';
import { useSimulationStore } from '@/store/simulationStore';

interface InfiniBandMapProps {
  cluster: ClusterConfig;
}

interface FabricNode {
  id: string;
  type: 'host' | 'leaf' | 'spine';
  label: string;
  status: 'active' | 'down' | 'degraded';
  x: number;
  y: number;
}

interface FabricLink {
  source: FabricNode;
  target: FabricNode;
  status: 'active' | 'down';
  speed: string;
}

export const InfiniBandMap: React.FC<InfiniBandMapProps> = ({ cluster }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const particleGroupRef = useRef<SVGGElement | null>(null);
  const isRunning = useSimulationStore((state) => state.isRunning);

  // Calculate animation links from fabric topology
  const animationLinks: AnimationLink[] = useMemo(() => {
    const links: AnimationLink[] = [];
    const width = 1000;

    // Spine positions
    const spineCount = 2;
    const spineNodes = Array.from({ length: spineCount }, (_, i) => ({
      id: `spine-${i}`,
      x: (width / (spineCount + 1)) * (i + 1),
      y: 80,
    }));

    // Leaf positions
    const leafCount = Math.min(cluster.nodes.length, 4);
    const leafNodes = Array.from({ length: leafCount }, (_, i) => ({
      id: `leaf-${i}`,
      x: (width / (leafCount + 1)) * (i + 1),
      y: 250,
    }));

    // Host positions
    const nodeSpacing = width / (cluster.nodes.length + 1);
    const hostNodes = cluster.nodes.map((node, idx) => ({
      id: node.id,
      x: nodeSpacing * (idx + 1),
      y: 450,
      active: node.hcas.some((hca) => hca.ports.some((p) => p.state === 'Active')),
      utilization: node.gpus.reduce((sum, g) => sum + g.utilization, 0) / node.gpus.length,
    }));

    // Spine to Leaf links
    spineNodes.forEach((spine) => {
      leafNodes.forEach((leaf) => {
        links.push({
          id: `${spine.id}-${leaf.id}`,
          sourceX: spine.x,
          sourceY: spine.y,
          targetX: leaf.x,
          targetY: leaf.y,
          active: true,
          utilization: 30 + Math.random() * 40, // Simulated backbone traffic
          bidirectional: true,
        });
      });
    });

    // Leaf to Host links
    hostNodes.forEach((host, idx) => {
      const leafIdx = Math.floor(idx / Math.ceil(hostNodes.length / leafNodes.length));
      const leaf = leafNodes[Math.min(leafIdx, leafNodes.length - 1)];
      if (leaf) {
        links.push({
          id: `${leaf.id}-${host.id}`,
          sourceX: leaf.x,
          sourceY: leaf.y,
          targetX: host.x,
          targetY: host.y,
          active: host.active,
          utilization: host.active ? host.utilization : 0,
          bidirectional: true,
        });
      }
    });

    return links;
  }, [cluster]);

  const { particles } = useNetworkAnimation({
    enabled: isRunning,
    links: animationLinks,
  });

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 1000;
    const height = 600;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    // Create fabric topology
    const nodes: FabricNode[] = [];
    const links: FabricLink[] = [];

    // Spine switches (top tier)
    const spineCount = 2;
    for (let i = 0; i < spineCount; i++) {
      nodes.push({
        id: `spine-${i}`,
        type: 'spine',
        label: `Spine Switch ${i + 1}`,
        status: 'active',
        x: (width / (spineCount + 1)) * (i + 1),
        y: 80,
      });
    }

    // Leaf switches (middle tier)
    const leafCount = Math.min(cluster.nodes.length, 4);
    for (let i = 0; i < leafCount; i++) {
      nodes.push({
        id: `leaf-${i}`,
        type: 'leaf',
        label: `Leaf Switch ${i + 1}`,
        status: 'active',
        x: (width / (leafCount + 1)) * (i + 1),
        y: 250,
      });
    }

    // Host nodes (bottom tier)
    const nodeSpacing = width / (cluster.nodes.length + 1);
    cluster.nodes.forEach((node, idx) => {
      // Check if any InfiniBand port is active
      const hasActiveIB = node.hcas.some(hca =>
        hca.ports.some(port => port.state === 'Active')
      );
      nodes.push({
        id: node.id,
        type: 'host',
        label: node.id,
        status: hasActiveIB ? 'active' : 'down',
        x: nodeSpacing * (idx + 1),
        y: 450,
      });
    });

    // Create links: Spine to Leaf (full mesh)
    const spineNodes = nodes.filter((n) => n.type === 'spine');
    const leafNodes = nodes.filter((n) => n.type === 'leaf');
    const hostNodes = nodes.filter((n) => n.type === 'host');

    spineNodes.forEach((spine) => {
      leafNodes.forEach((leaf) => {
        links.push({
          source: spine,
          target: leaf,
          status: 'active',
          speed: 'HDR 200 Gb/s',
        });
      });
    });

    // Create links: Leaf to Hosts
    hostNodes.forEach((host, idx) => {
      const leafIdx = Math.floor(idx / Math.ceil(hostNodes.length / leafNodes.length));
      const leaf = leafNodes[Math.min(leafIdx, leafNodes.length - 1)];
      if (leaf) {
        links.push({
          source: leaf,
          target: host,
          status: host.status === 'active' ? 'active' : 'down',
          speed: 'HDR 200 Gb/s',
        });
      }
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
      .attr('stroke', (d) => (d.status === 'active' ? '#10B981' : '#EF4444'))
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', (d) => (d.status === 'active' ? '0' : '5,5'))
      .attr('opacity', 0.5)
      .append('title')
      .text((d) => `${d.source.label} → ${d.target.label}\nStatus: ${d.status}\nSpeed: ${d.speed}`);

    // Draw nodes
    const nodeGroup = svg.append('g').attr('class', 'nodes');

    const nodeGroups = nodeGroup
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('transform', (d) => `translate(${d.x}, ${d.y})`)
      .style('cursor', 'pointer');

    // Node shapes (different for each type)
    nodeGroups.each(function (d) {
      const group = d3.select(this);

      if (d.type === 'spine') {
        // Rectangle for spine switches
        group
          .append('rect')
          .attr('x', -50)
          .attr('y', -25)
          .attr('width', 100)
          .attr('height', 50)
          .attr('fill', d.status === 'active' ? '#3B82F6' : '#EF4444')
          .attr('stroke', '#1F2937')
          .attr('stroke-width', 2)
          .attr('rx', 5);
      } else if (d.type === 'leaf') {
        // Hexagon for leaf switches
        const points = [];
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const x = 30 * Math.cos(angle);
          const y = 30 * Math.sin(angle);
          points.push(`${x},${y}`);
        }
        group
          .append('polygon')
          .attr('points', points.join(' '))
          .attr('fill', d.status === 'active' ? '#8B5CF6' : '#EF4444')
          .attr('stroke', '#1F2937')
          .attr('stroke-width', 2);
      } else {
        // Circle for hosts
        group
          .append('circle')
          .attr('r', 25)
          .attr('fill', d.status === 'active' ? '#10B981' : '#EF4444')
          .attr('stroke', '#1F2937')
          .attr('stroke-width', 2);
      }

      // Label
      group
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.3em')
        .attr('fill', '#fff')
        .attr('font-size', d.type === 'host' ? '10px' : '12px')
        .attr('font-weight', 'bold')
        .text(
          d.type === 'host'
            ? d.label.replace('dgx-', '')
            : d.type === 'spine'
            ? 'S' + d.id.split('-')[1]
            : 'L' + d.id.split('-')[1]
        );
    });

    // Add tooltips
    nodeGroups.append('title').text((d) => `${d.label}\nType: ${d.type}\nStatus: ${d.status}`);

    // Add hover effects
    nodeGroups
      .on('mouseover', function () {
        d3.select(this).select('rect,circle,polygon').attr('opacity', 1);
      })
      .on('mouseout', function () {
        d3.select(this).select('rect,circle,polygon').attr('opacity', 0.9);
      });

    // Add tier labels
    svg
      .append('text')
      .attr('x', 10)
      .attr('y', 80)
      .attr('fill', '#9CA3AF')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .text('Spine Tier');

    svg
      .append('text')
      .attr('x', 10)
      .attr('y', 250)
      .attr('fill', '#9CA3AF')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .text('Leaf Tier');

    svg
      .append('text')
      .attr('x', 10)
      .attr('y', 450)
      .attr('fill', '#9CA3AF')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .text('Host Tier');

    // Add particle container group for animations
    particleGroupRef.current = svg.append('g').attr('class', 'particles').node();
  }, [cluster]);

  // Particle animation render effect
  useEffect(() => {
    if (!particleGroupRef.current) return;

    const group = d3.select(particleGroupRef.current);

    // Data join for particles
    const particleSelection = group
      .selectAll<SVGCircleElement, (typeof particles)[0]>('circle')
      .data(particles, (d) => d.id);

    // Enter new particles
    particleSelection
      .enter()
      .append('circle')
      .attr('r', (d) => d.size || 4)
      .attr('fill', (d) => d.color)
      .attr('opacity', 0.8)
      .merge(particleSelection)
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y);

    // Remove old particles
    particleSelection.exit().remove();
  }, [particles]);

  const totalLinks = cluster.nodes.length;
  const activeLinks = cluster.nodes.filter((n) =>
    n.hcas.some(hca => hca.ports.some(port => port.state === 'Active'))
  ).length;

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-nvidia-green" />
          <h3 className="text-lg font-semibold text-gray-200">InfiniBand Fabric Topology</h3>
        </div>
        <div className="text-sm text-gray-400">
          Active Links: {activeLinks}/{totalLinks}
        </div>
      </div>

      <svg ref={svgRef} className="w-full bg-gray-900 rounded-lg" />

      {/* Animation status indicator */}
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
        <div
          className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}
        />
        {isRunning ? 'Live data flow' : 'Paused'}
        {isRunning && <span>({particles.length} active flows)</span>}
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded" />
          <span className="text-gray-300">Spine Switch</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-500" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
          <span className="text-gray-300">Leaf Switch</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full" />
          <span className="text-gray-300">Active Host</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-green-500" />
          <span className="text-gray-300">Active Link</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-red-500" style={{ borderTop: '2px dashed' }} />
          <span className="text-gray-300">Down Link</span>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-400">
        <p>• Fat-tree topology: 2 spine switches, {Math.min(cluster.nodes.length, 4)} leaf switches</p>
        <p>• Full mesh between spine and leaf tiers for maximum bandwidth</p>
        <p>• Each host connected to nearest leaf switch via HDR 200 Gb/s links</p>
      </div>
    </div>
  );
};
