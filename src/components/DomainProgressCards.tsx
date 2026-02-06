import React from "react";
import type { DomainId } from "@/types/scenarios";
import { useLearningProgressStore } from "@/store/learningProgressStore";
import { ProgressRing } from "./ProgressRing";

interface DomainProgressCardsProps {
  onStartScenario?: (scenarioId: string) => void;
}

// Domain configuration with scenarios
const DOMAIN_CONFIG: Array<{
  id: DomainId;
  title: string;
  color: string;
  borderColor: string;
  buttonColor: string;
  buttonHover: string;
  examWeight: number;
  scenarios: string[];
  totalScenarios: number;
  defaultScenario: string;
}> = [
  {
    id: "domain1",
    title: "Systems & Server Bring-Up",
    color: "bg-blue-600",
    borderColor: "hover:border-blue-500",
    buttonColor: "bg-blue-600",
    buttonHover: "hover:bg-blue-500",
    examWeight: 31,
    scenarios: [
      "DGX SuperPOD Deployment",
      "Firmware Upgrade Workflow",
      "Cable Validation",
      "Power and Cooling",
    ],
    totalScenarios: 4,
    defaultScenario: "domain1-server-post",
  },
  {
    id: "domain2",
    title: "Physical Layer Management",
    color: "bg-green-600",
    borderColor: "hover:border-green-500",
    buttonColor: "bg-green-600",
    buttonHover: "hover:bg-green-500",
    examWeight: 5,
    scenarios: [
      "BlueField DPU Configuration",
      "MIG Partitioning",
      "Advanced MIG Scenarios",
    ],
    totalScenarios: 3,
    defaultScenario: "domain2-mig-setup",
  },
  {
    id: "domain3",
    title: "Control Plane Installation",
    color: "bg-purple-600",
    borderColor: "hover:border-purple-500",
    buttonColor: "bg-purple-600",
    buttonHover: "hover:bg-purple-500",
    examWeight: 19,
    scenarios: [
      "BCM High Availability",
      "Slurm with GPU GRES",
      "Container Toolkit Setup",
    ],
    totalScenarios: 3,
    defaultScenario: "domain3-slurm-config",
  },
  {
    id: "domain4",
    title: "Cluster Test & Verification",
    color: "bg-orange-600",
    borderColor: "hover:border-orange-500",
    buttonColor: "bg-orange-600",
    buttonHover: "hover:bg-orange-500",
    examWeight: 33,
    scenarios: ["Single-Node Stress Test", "HPL Benchmark", "NCCL Tests"],
    totalScenarios: 3,
    defaultScenario: "domain4-dcgmi-diag",
  },
  {
    id: "domain5",
    title: "Troubleshooting & Optimization",
    color: "bg-red-600",
    borderColor: "hover:border-red-500",
    buttonColor: "bg-red-600",
    buttonHover: "hover:bg-red-500",
    examWeight: 12,
    scenarios: [
      "Low HPL Performance",
      "GPU Faults in NVSM",
      "InfiniBand Link Errors",
    ],
    totalScenarios: 3,
    defaultScenario: "domain5-xid-errors",
  },
];

export const DomainProgressCards: React.FC<DomainProgressCardsProps> = ({
  onStartScenario,
}) => {
  const { tierProgress } = useLearningProgressStore();

  // Calculate completion percentage for a domain
  const getDomainProgress = (
    domainId: DomainId,
  ): { completed: number; total: number; percentage: number } => {
    // In a real implementation, this would track actual scenario completion
    // For now, we'll use tier progress as a proxy
    const progress = tierProgress[domainId];
    if (!progress) {
      return { completed: 0, total: 9, percentage: 0 }; // 3 tiers * 3 scenarios each
    }
    const completed =
      progress.tier1Completed +
      progress.tier2Completed +
      progress.tier3Completed;
    const total = 9; // 3 scenarios per tier, 3 tiers
    return {
      completed,
      total,
      percentage: Math.round((completed / total) * 100),
    };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {DOMAIN_CONFIG.map((domain, index) => {
        const progress = getDomainProgress(domain.id);

        return (
          <div
            key={domain.id}
            className={`bg-gray-800 rounded-lg p-5 border border-gray-700 ${domain.borderColor} transition-colors`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded ${domain.color} flex items-center justify-center text-white font-bold text-sm`}
                >
                  {index + 1}
                </div>
                <div>
                  <h4 className="text-white font-semibold m-0">
                    {domain.title}
                  </h4>
                  <span className="text-xs text-gray-500">
                    {domain.examWeight}% of exam
                  </span>
                </div>
              </div>
              {/* Progress Ring */}
              <ProgressRing
                progress={progress.percentage}
                size="sm"
                showLabel={true}
              />
            </div>

            {/* Scenarios list */}
            <ul className="text-sm text-gray-400 space-y-1.5 mb-3">
              {domain.scenarios.map((scenario, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      i < progress.completed ? "bg-nvidia-green" : "bg-gray-600"
                    }`}
                  />
                  {scenario}
                </li>
              ))}
            </ul>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="h-1.5 bg-gray-700 rounded-sm overflow-hidden mb-1">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${progress.percentage}%`,
                    backgroundColor:
                      progress.percentage < 30
                        ? "#ef4444"
                        : progress.percentage < 70
                          ? "#eab308"
                          : "#76B900",
                  }}
                />
              </div>
              <span className="text-xs text-gray-500">
                {progress.completed}/{progress.total} scenarios completed
              </span>
            </div>

            <button
              onClick={() => onStartScenario?.(domain.defaultScenario)}
              className={`w-full py-2 ${domain.buttonColor} text-white rounded text-sm font-medium ${domain.buttonHover} transition-colors`}
            >
              {progress.completed > 0 ? "Continue Labs" : "Start Labs"}
            </button>
          </div>
        );
      })}

      {/* All Scenarios Card */}
      <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg p-5 border border-gray-600 hover:border-nvidia-green transition-colors">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded bg-nvidia-green flex items-center justify-center text-black font-bold text-sm">
            All
          </div>
          <div>
            <h4 className="text-white font-semibold m-0">
              Browse All Scenarios
            </h4>
            <span className="text-xs text-gray-400">Full scenario library</span>
          </div>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Access the complete scenario library with filtering and search
          capabilities.
        </p>
        <button
          onClick={() => onStartScenario?.("")}
          className="w-full py-2 bg-nvidia-green text-black rounded text-sm font-medium hover:bg-nvidia-darkgreen transition-colors"
        >
          View All Scenarios
        </button>
      </div>
    </div>
  );
};
