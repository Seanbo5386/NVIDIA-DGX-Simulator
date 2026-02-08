// src/components/XidErrorReference.tsx
import { useState, useMemo } from "react";
import {
  Search,
  AlertTriangle,
  AlertCircle,
  Info,
  Cpu,
  Zap,
  HardDrive,
  Link,
  Thermometer,
  Settings,
  Code,
} from "lucide-react";
import {
  XID_ERRORS,
  type XIDSeverity,
  type XIDCategory,
} from "@/data/xidErrors";

// Map category to icons
const categoryIcons: Record<XIDCategory, React.ReactNode> = {
  Hardware: <Cpu className="w-4 h-4" />,
  Memory: <HardDrive className="w-4 h-4" />,
  NVLink: <Link className="w-4 h-4" />,
  Power: <Zap className="w-4 h-4" />,
  Driver: <Settings className="w-4 h-4" />,
  Application: <Code className="w-4 h-4" />,
  Thermal: <Thermometer className="w-4 h-4" />,
};

// Get severity badge styles
function getSeverityStyles(severity: XIDSeverity): string {
  switch (severity) {
    case "Critical":
      return "bg-red-900/50 text-red-400";
    case "Warning":
      return "bg-yellow-900/50 text-yellow-400";
    case "Informational":
      return "bg-blue-900/50 text-blue-400";
  }
}

export function XidErrorReference() {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"all" | XIDSeverity>(
    "all",
  );

  const filteredErrors = useMemo(() => {
    return XID_ERRORS.filter((error) => {
      const matchesSeverity =
        severityFilter === "all" || error.severity === severityFilter;
      const matchesSearch =
        searchQuery === "" ||
        error.code.toString().includes(searchQuery) ||
        error.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        error.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        error.cause.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSeverity && matchesSearch;
    });
  }, [searchQuery, severityFilter]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">XID Error Reference</h2>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search XID code or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-nvidia-green"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSeverityFilter("all")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              severityFilter === "all"
                ? "bg-nvidia-green text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSeverityFilter("Critical")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              severityFilter === "Critical"
                ? "bg-red-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            Critical
          </button>
          <button
            onClick={() => setSeverityFilter("Warning")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              severityFilter === "Warning"
                ? "bg-yellow-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            Warning
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="text-sm text-gray-400">
        Showing {filteredErrors.length} of {XID_ERRORS.length} XID errors
      </div>

      {/* Error List */}
      <div className="space-y-4">
        {filteredErrors.map((error) => (
          <div
            key={error.code}
            className="bg-gray-800 border border-gray-700 rounded-lg p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${getSeverityStyles(error.severity)}`}
                >
                  {error.severity === "Critical" ? (
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                  ) : error.severity === "Warning" ? (
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                  ) : (
                    <Info className="w-4 h-4 inline mr-1" />
                  )}
                  XID {error.code}
                </span>
                <span className="text-white font-semibold">{error.name}</span>
                <span className="text-gray-500 flex items-center gap-1">
                  {categoryIcons[error.category]}
                  {error.category}
                </span>
              </div>
              {error.examRelevance === "High" && (
                <span className="bg-nvidia-green/20 text-nvidia-green text-xs px-2 py-1 rounded">
                  Exam Relevant
                </span>
              )}
            </div>

            <p className="text-gray-300 mb-4">{error.cause}</p>

            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-400 mb-2">
                Recommended Actions:
              </h4>
              <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                {error.action.map((action, i) => (
                  <li key={i}>{action}</li>
                ))}
              </ul>
            </div>

            {error.relatedCommands && error.relatedCommands.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-2">
                  Related Commands:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {error.relatedCommands.map((cmd, i) => (
                    <code
                      key={i}
                      className="text-sm bg-gray-900 text-nvidia-green px-2 py-1 rounded"
                    >
                      {cmd}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
