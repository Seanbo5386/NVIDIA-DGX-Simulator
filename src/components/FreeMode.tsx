import { useEffect, useRef } from "react";
import { FaultInjection } from "./FaultInjection";
import { Terminal } from "./Terminal";
import { scenarioContextManager } from "@/store/scenarioContext";
import { RotateCcw, X, FlaskConical } from "lucide-react";

interface FreeModeProps {
  onClose: () => void;
}

const FREE_MODE_ID = "free-mode";

export function FreeMode({ onClose }: FreeModeProps) {
  const contextCreated = useRef(false);

  useEffect(() => {
    if (!contextCreated.current) {
      scenarioContextManager.clearAll();
      scenarioContextManager.createContext(FREE_MODE_ID);
      scenarioContextManager.setActiveContext(FREE_MODE_ID);
      contextCreated.current = true;
    }

    return () => {
      scenarioContextManager.deleteContext(FREE_MODE_ID);
      scenarioContextManager.setActiveContext(null);
      contextCreated.current = false;
    };
  }, []);

  const handleReset = () => {
    const context = scenarioContextManager.getContext(FREE_MODE_ID);
    if (context) {
      context.reset();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-black border-b border-teal-700">
        <div className="flex items-center gap-3">
          <FlaskConical className="w-5 h-5 text-teal-400" />
          <span className="text-lg font-bold text-teal-400">Free Mode</span>
          <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
            Sandbox
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors text-sm"
            title="Reset cluster to default state"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Cluster
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-900/50 hover:bg-red-800/50 text-red-300 transition-colors text-sm"
            title="Exit Free Mode"
          >
            <X className="w-4 h-4" />
            Exit
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Fault injection panel */}
        <div className="w-[400px] border-r border-gray-700 overflow-y-auto p-4 bg-gray-900">
          <FaultInjection />
        </div>

        {/* Terminal */}
        <div className="flex-1 overflow-hidden">
          <Terminal className="h-full" />
        </div>
      </div>
    </div>
  );
}
