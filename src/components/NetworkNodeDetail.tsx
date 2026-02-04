/**
 * Network Node Detail Panel
 *
 * Displays detailed information about a selected network node (GPU, switch, or host).
 * Used in TopologyGraph and InfiniBandMap for click-to-inspect functionality.
 */

import React from "react";
import {
  X,
  Thermometer,
  Activity,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Cpu,
} from "lucide-react";
import type {
  GPU,
  InfiniBandHCA,
  HealthStatus,
  NVLinkConnection,
} from "@/types/hardware";

export type NetworkNodeType =
  | { type: "gpu"; data: GPU }
  | {
      type: "nvswitch";
      data: {
        id: number;
        connectedGPUs: number[];
        status: "active" | "Warning" | "down";
        throughput: number;
        temperature: number;
      };
    }
  | {
      type: "switch";
      data: {
        id: string;
        switchType: "spine" | "leaf";
        status: "active" | "down";
        portCount: number;
        activePortCount: number;
        bandwidth: string;
        connectedNodes: string[];
        throughput: number; // GB/s
        temperature: number; // Celsius
        model: string;
        firmwareVersion: string;
      };
    }
  | {
      type: "host";
      data: {
        id: string;
        hostname: string;
        hcas: InfiniBandHCA[];
        gpuCount: number;
      };
    };

interface NetworkNodeDetailProps {
  node: NetworkNodeType;
  onClose: () => void;
}

const HealthBadge: React.FC<{ status: HealthStatus | "active" | "down" }> = ({
  status,
}) => {
  const config: Record<
    string,
    { icon: typeof CheckCircle; color: string; bg: string; label: string }
  > = {
    OK: {
      icon: CheckCircle,
      color: "text-green-500",
      bg: "bg-green-500/20",
      label: "Healthy",
    },
    active: {
      icon: CheckCircle,
      color: "text-green-500",
      bg: "bg-green-500/20",
      label: "Active",
    },
    Warning: {
      icon: AlertTriangle,
      color: "text-yellow-500",
      bg: "bg-yellow-500/20",
      label: "Warning",
    },
    Critical: {
      icon: XCircle,
      color: "text-red-500",
      bg: "bg-red-500/20",
      label: "Critical",
    },
    down: {
      icon: XCircle,
      color: "text-red-500",
      bg: "bg-red-500/20",
      label: "Down",
    },
    Unknown: {
      icon: AlertTriangle,
      color: "text-gray-500",
      bg: "bg-gray-500/20",
      label: "Unknown",
    },
  };

  const { icon: Icon, color, bg, label } = config[status] || config.Unknown;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${bg} ${color}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
};

const NVLinkTable: React.FC<{ links: NVLinkConnection[] }> = ({ links }) => (
  <div className="mt-4">
    <h4 className="text-sm font-semibold text-gray-300 mb-2">
      NVLink Connections
    </h4>
    <table className="w-full text-xs">
      <thead>
        <tr className="text-gray-400 border-b border-gray-700">
          <th className="py-1 text-left">Link</th>
          <th className="py-1 text-left">Status</th>
          <th className="py-1 text-right">Speed</th>
          <th className="py-1 text-right">TX Err</th>
          <th className="py-1 text-right">RX Err</th>
          <th className="py-1 text-right">Replay</th>
        </tr>
      </thead>
      <tbody>
        {links.map((link) => (
          <tr key={link.linkId} className="border-b border-gray-800">
            <td className="py-1">Link {link.linkId}</td>
            <td className="py-1">
              <span
                className={
                  link.status === "Active" ? "text-green-500" : "text-red-500"
                }
              >
                {link.status}
              </span>
            </td>
            <td className="py-1 text-right">{link.speed} GB/s</td>
            <td
              className={`py-1 text-right ${link.txErrors > 0 ? "text-red-500" : ""}`}
            >
              {link.txErrors}
            </td>
            <td
              className={`py-1 text-right ${link.rxErrors > 0 ? "text-red-500" : ""}`}
            >
              {link.rxErrors}
            </td>
            <td
              className={`py-1 text-right ${link.replayErrors > 0 ? "text-red-500" : ""}`}
            >
              {link.replayErrors}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const NetworkNodeDetail: React.FC<NetworkNodeDetailProps> = ({
  node,
  onClose,
}) => {
  return (
    <div className="absolute right-4 top-4 w-80 bg-gray-900 border-2 border-nvidia-green/50 rounded-lg shadow-2xl z-50">
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800/50">
        <h3 className="text-sm font-semibold text-nvidia-green">
          {node.type === "gpu" && `GPU ${node.data.id}`}
          {node.type === "nvswitch" && `NVSwitch ${node.data.id}`}
          {node.type === "switch" &&
            `${node.data.switchType === "spine" ? "Spine" : "Leaf"} Switch`}
          {node.type === "host" && node.data.hostname}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3">
        {node.type === "gpu" && (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-xs">{node.data.name}</span>
              <HealthBadge status={node.data.healthStatus} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-orange-500" />
                <div>
                  <div className="text-gray-400">Temperature</div>
                  <div className="text-white font-medium">
                    {node.data.temperature}°C
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="text-gray-400">Utilization</div>
                  <div className="text-white font-medium">
                    {Math.round(node.data.utilization)}%
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <HardDrive className="w-4 h-4 text-purple-500" />
                <div>
                  <div className="text-gray-400">Memory</div>
                  <div className="text-white font-medium">
                    {(node.data.memoryUsed / 1024).toFixed(1)} /{" "}
                    {(node.data.memoryTotal / 1024).toFixed(1)} GB
                  </div>
                </div>
              </div>
            </div>

            <NVLinkTable links={node.data.nvlinks} />
          </>
        )}

        {node.type === "switch" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-xs">
                {node.data.switchType === "spine"
                  ? "Core Backbone Switch"
                  : "Aggregation Switch"}
              </span>
              <HealthBadge status={node.data.status} />
            </div>

            {/* Switch Model Info */}
            <div className="bg-gray-800 rounded p-2 text-xs">
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">Model:</span>
                <span className="text-gray-300">{node.data.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Firmware:</span>
                <span className="text-gray-300 font-mono">
                  {node.data.firmwareVersion}
                </span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-orange-500" />
                <div>
                  <div className="text-gray-400">Temperature</div>
                  <div className="text-white font-medium">
                    {node.data.temperature}°C
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <div>
                  <div className="text-gray-400">Throughput</div>
                  <div className="text-white font-medium">
                    {node.data.throughput} GB/s
                  </div>
                </div>
              </div>
            </div>

            {/* Port Status */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-gray-400">Port Status</span>
                <span className="text-gray-300">
                  <span className="text-green-500">
                    {node.data.activePortCount}
                  </span>
                  <span className="text-gray-500">
                    {" "}
                    / {node.data.portCount} active
                  </span>
                </span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{
                    width: `${(node.data.activePortCount / node.data.portCount) * 100}%`,
                  }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {node.data.bandwidth} per port
              </div>
            </div>

            {/* Connected Nodes */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="text-xs text-gray-400 mb-2">
                Connected{" "}
                {node.data.switchType === "spine" ? "Leaf Switches" : "Nodes"}
              </div>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {node.data.connectedNodes.map((nodeId) => (
                  <span
                    key={nodeId}
                    className="px-2 py-1 bg-gray-800 rounded text-xs text-nvidia-green"
                  >
                    {nodeId}
                  </span>
                ))}
              </div>
            </div>

            {/* Role Description */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="flex items-center gap-2 text-xs">
                <Cpu className="w-4 h-4 text-indigo-500" />
                <div>
                  <div className="text-gray-400">Role</div>
                  <div className="text-white font-medium">
                    {node.data.switchType === "spine"
                      ? "Non-blocking fabric backbone"
                      : "Host aggregation layer"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {node.type === "nvswitch" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-xs">
                NVSwitch Fabric Component
              </span>
              <HealthBadge status={node.data.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-orange-500" />
                <div>
                  <div className="text-gray-400">Temperature</div>
                  <div className="text-white font-medium">
                    {node.data.temperature}°C
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <div>
                  <div className="text-gray-400">Throughput</div>
                  <div className="text-white font-medium">
                    {node.data.throughput} GB/s
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="text-xs text-gray-400 mb-2">Connected GPUs</div>
              <div className="flex flex-wrap gap-1">
                {node.data.connectedGPUs.map((gpuId) => (
                  <span
                    key={gpuId}
                    className="px-2 py-1 bg-gray-800 rounded text-xs text-nvidia-green"
                  >
                    GPU {gpuId}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="flex items-center gap-2 text-xs">
                <Cpu className="w-4 h-4 text-indigo-500" />
                <div>
                  <div className="text-gray-400">Switch Role</div>
                  <div className="text-white font-medium">
                    High-speed GPU interconnect
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {node.type === "host" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-xs">
                Node ID: {node.data.id}
              </span>
              <HealthBadge
                status={
                  node.data.hcas.some((h) =>
                    h.ports.some((p) => p.state === "Active"),
                  )
                    ? "active"
                    : "down"
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-800 rounded p-2">
                <div className="text-gray-400">GPUs</div>
                <div className="text-white font-medium">
                  {node.data.gpuCount}
                </div>
              </div>
              <div className="bg-gray-800 rounded p-2">
                <div className="text-gray-400">HCAs</div>
                <div className="text-white font-medium">
                  {node.data.hcas.length}
                </div>
              </div>
            </div>

            {/* HCA Details */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="text-xs text-gray-400 mb-2">InfiniBand HCAs</div>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {node.data.hcas.map((hca, hcaIdx) => (
                  <div key={hcaIdx} className="bg-gray-800 rounded p-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-nvidia-green text-xs font-medium">
                        HCA {hcaIdx}: {hca.caType}
                      </span>
                      <span className="text-gray-500 text-xs">
                        FW: {hca.firmwareVersion}
                      </span>
                    </div>

                    {hca.ports.map((port) => {
                      const hasErrors =
                        port.errors.symbolErrors > 0 ||
                        port.errors.portRcvErrors > 0 ||
                        port.errors.linkDowned > 0;
                      const portColor =
                        port.state !== "Active"
                          ? "text-red-500"
                          : hasErrors
                            ? "text-yellow-500"
                            : "text-green-500";

                      return (
                        <div
                          key={port.portNumber}
                          className="mt-2 pt-2 border-t border-gray-700"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-gray-300 text-xs">
                              Port {port.portNumber}
                            </span>
                            <span className={`text-xs ${portColor}`}>
                              {port.state} @ {port.rate} Gb/s
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1 mt-1 text-xs">
                            <div className="text-gray-500">
                              LID:{" "}
                              <span className="text-gray-300">{port.lid}</span>
                            </div>
                            <div className="text-gray-500">
                              GUID:{" "}
                              <span className="text-gray-300 font-mono text-xs">
                                {port.guid.slice(0, 10)}...
                              </span>
                            </div>
                          </div>

                          {/* Error Counters */}
                          <div className="grid grid-cols-4 gap-1 mt-2 text-xs">
                            <div
                              className={
                                port.errors.symbolErrors > 0
                                  ? "text-yellow-500"
                                  : "text-gray-500"
                              }
                            >
                              Sym: {port.errors.symbolErrors}
                            </div>
                            <div
                              className={
                                port.errors.linkDowned > 0
                                  ? "text-red-500"
                                  : "text-gray-500"
                              }
                            >
                              Dwn: {port.errors.linkDowned}
                            </div>
                            <div
                              className={
                                port.errors.portRcvErrors > 0
                                  ? "text-yellow-500"
                                  : "text-gray-500"
                              }
                            >
                              Rcv: {port.errors.portRcvErrors}
                            </div>
                            <div
                              className={
                                port.errors.portXmitDiscards > 0
                                  ? "text-orange-500"
                                  : "text-gray-500"
                              }
                            >
                              Dsc: {port.errors.portXmitDiscards}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Command Hints */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="text-xs text-gray-400 mb-1">
                Diagnostic Commands
              </div>
              <div className="flex flex-wrap gap-1">
                <code className="px-1.5 py-0.5 bg-gray-900 rounded text-xs text-nvidia-green">
                  ibstat
                </code>
                <code className="px-1.5 py-0.5 bg-gray-900 rounded text-xs text-nvidia-green">
                  perfquery
                </code>
                <code className="px-1.5 py-0.5 bg-gray-900 rounded text-xs text-nvidia-green">
                  ibdiagnet
                </code>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
