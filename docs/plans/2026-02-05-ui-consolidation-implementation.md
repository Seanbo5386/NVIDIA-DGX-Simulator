# UI Consolidation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the application from redundant multi-modal UI into a clean four-tab interface (Simulator, Labs & Scenarios, Reference, State Management) with ~16 narrative scenarios and task-centric documentation.

**Architecture:** Phased migration approach - build new components first, migrate all content, verify functionality, then remove old components. No data loss permitted.

**Tech Stack:** React 18, TypeScript, Zustand, TailwindCSS, Vitest

---

## Critical Preservation Checklist

Before ANY file deletion, verify these are preserved:

- [ ] 24 quiz questions from quizQuestions.json
- [ ] 6 command families from commandFamilies.json
- [ ] XID error database from Documentation.tsx
- [ ] Exam Guide content (5 domains, study tips, thresholds)
- [ ] All localStorage keys migrated
- [ ] Progress calculation algorithms
- [ ] Spaced repetition scheduling logic
- [ ] Export/import progress functionality

---

## Phase 1: Foundation (New Tab Structure)

### Task 1: Create Task-Centric Reference Data Structure

**Files:**

- Create: `src/data/taskCategories.json`
- Test: `src/data/__tests__/taskCategories.test.ts`

**Step 1: Write the test file**

```typescript
// src/data/__tests__/taskCategories.test.ts
import { describe, it, expect } from "vitest";
import taskCategoriesData from "../taskCategories.json";

interface TaskCategory {
  id: string;
  title: string;
  icon: string;
  decisionGuide: string;
  commands: CommandReference[];
}

interface CommandReference {
  name: string;
  summary: string;
  commonUsage: { command: string; description: string }[];
  options: { flag: string; description: string }[];
  related: string[];
}

const data = taskCategoriesData as { categories: TaskCategory[] };

describe("taskCategories.json", () => {
  it("should have categories array", () => {
    expect(data).toHaveProperty("categories");
    expect(Array.isArray(data.categories)).toBe(true);
  });

  it("should have 9 task categories", () => {
    expect(data.categories.length).toBe(9);
  });

  it("each category should have required properties", () => {
    data.categories.forEach((cat) => {
      expect(cat).toHaveProperty("id");
      expect(cat).toHaveProperty("title");
      expect(cat).toHaveProperty("icon");
      expect(cat).toHaveProperty("decisionGuide");
      expect(cat).toHaveProperty("commands");
      expect(Array.isArray(cat.commands)).toBe(true);
    });
  });

  it("each command should have required properties", () => {
    data.categories.forEach((cat) => {
      cat.commands.forEach((cmd) => {
        expect(cmd).toHaveProperty("name");
        expect(cmd).toHaveProperty("summary");
        expect(cmd).toHaveProperty("commonUsage");
        expect(cmd).toHaveProperty("options");
        expect(cmd).toHaveProperty("related");
      });
    });
  });

  it("should cover all major commands from commandFamilies", () => {
    const allCommands = data.categories.flatMap((c) =>
      c.commands.map((cmd) => cmd.name),
    );
    const expectedCommands = [
      "nvidia-smi",
      "dcgmi",
      "nvsm",
      "ibstat",
      "ibdiagnet",
      "ipmitool",
      "sinfo",
      "squeue",
      "docker",
      "enroot",
    ];
    expectedCommands.forEach((cmd) => {
      expect(allCommands).toContain(cmd);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/data/__tests__/taskCategories.test.ts`
Expected: FAIL - Cannot find module '../taskCategories.json'

**Step 3: Create the task categories data file**

```json
// src/data/taskCategories.json
{
  "version": "1.0.0",
  "categories": [
    {
      "id": "check-gpu-health",
      "title": "Check GPU Health",
      "icon": "🖥️",
      "decisionGuide": "Quick snapshot → nvidia-smi | Overall health → nvsm show health | Deep diagnostics → dcgmi health",
      "commands": [
        {
          "name": "nvidia-smi",
          "summary": "Quick GPU status snapshot - memory, utilization, temperature",
          "commonUsage": [
            {
              "command": "nvidia-smi",
              "description": "Basic status of all GPUs"
            },
            {
              "command": "nvidia-smi -q -i 0",
              "description": "Detailed query for GPU 0"
            },
            {
              "command": "nvidia-smi --query-gpu=temperature.gpu,utilization.gpu --format=csv",
              "description": "Custom CSV output"
            }
          ],
          "options": [
            {
              "flag": "-i <id>",
              "description": "Target specific GPU by index"
            },
            { "flag": "-q", "description": "Detailed query mode" },
            { "flag": "-L", "description": "List all GPUs" },
            {
              "flag": "-d <type>",
              "description": "Display specific info (MEMORY, UTILIZATION, ECC, TEMPERATURE)"
            }
          ],
          "related": ["dcgmi discovery", "nvsm show gpu"]
        },
        {
          "name": "dcgmi",
          "summary": "NVIDIA Data Center GPU Manager - health monitoring and diagnostics",
          "commonUsage": [
            {
              "command": "dcgmi health --check",
              "description": "Quick health check"
            },
            {
              "command": "dcgmi diag --mode 1",
              "description": "Short diagnostic (1-2 min)"
            },
            {
              "command": "dcgmi diag --mode 3",
              "description": "Comprehensive diagnostic (10-15 min)"
            }
          ],
          "options": [
            {
              "flag": "--mode 1|2|3",
              "description": "Diagnostic depth (1=short, 2=medium, 3=long)"
            },
            { "flag": "-g <group>", "description": "Target GPU group" },
            { "flag": "-j", "description": "JSON output format" }
          ],
          "related": ["nvidia-smi -q", "nvsm show health"]
        },
        {
          "name": "nvsm",
          "summary": "NVIDIA System Management - hierarchical system health view",
          "commonUsage": [
            {
              "command": "nvsm show health",
              "description": "System health summary"
            },
            {
              "command": "nvsm show gpu",
              "description": "GPU inventory and status"
            },
            {
              "command": "nvsm show alerts",
              "description": "Active system alerts"
            }
          ],
          "options": [
            {
              "flag": "show <component>",
              "description": "Display component status (health, gpu, fabric, alerts)"
            },
            { "flag": "-v", "description": "Verbose output" }
          ],
          "related": ["nvidia-smi", "dcgmi health"]
        }
      ]
    },
    {
      "id": "diagnose-network",
      "title": "Diagnose Network Issues",
      "icon": "🔗",
      "decisionGuide": "Port status → ibstat | Error counters → perfquery | Fabric-wide → ibdiagnet",
      "commands": [
        {
          "name": "ibstat",
          "summary": "InfiniBand HCA port status and link information",
          "commonUsage": [
            { "command": "ibstat", "description": "All HCA ports status" },
            { "command": "ibstat mlx5_0", "description": "Specific HCA status" }
          ],
          "options": [
            { "flag": "-p", "description": "Show port GUIDs" },
            { "flag": "-s", "description": "Short output format" }
          ],
          "related": ["iblinkinfo", "perfquery"]
        },
        {
          "name": "ibdiagnet",
          "summary": "Comprehensive InfiniBand fabric diagnostics",
          "commonUsage": [
            {
              "command": "ibdiagnet",
              "description": "Full fabric diagnostic scan"
            },
            { "command": "ibdiagnet --ls", "description": "Link speed check" },
            {
              "command": "ibdiagnet -pc",
              "description": "Clear port counters after scan"
            }
          ],
          "options": [
            { "flag": "--ls", "description": "Check link speeds" },
            { "flag": "-pc", "description": "Clear port counters" },
            {
              "flag": "-o <dir>",
              "description": "Output directory for reports"
            }
          ],
          "related": ["ibstat", "iblinkinfo", "perfquery"]
        },
        {
          "name": "iblinkinfo",
          "summary": "InfiniBand fabric link topology and status",
          "commonUsage": [
            { "command": "iblinkinfo", "description": "All fabric links" },
            {
              "command": "iblinkinfo -l",
              "description": "Show LID information"
            }
          ],
          "options": [
            { "flag": "-l", "description": "Show LID details" },
            { "flag": "-R", "description": "Recalculate routing" }
          ],
          "related": ["ibstat", "ibdiagnet"]
        },
        {
          "name": "perfquery",
          "summary": "Query InfiniBand port performance counters",
          "commonUsage": [
            { "command": "perfquery", "description": "Local port counters" },
            { "command": "perfquery -x", "description": "Extended counters" }
          ],
          "options": [
            { "flag": "-x", "description": "Extended 64-bit counters" },
            { "flag": "-c", "description": "Clear counters after read" }
          ],
          "related": ["ibstat", "ibdiagnet"]
        }
      ]
    },
    {
      "id": "monitor-performance",
      "title": "Monitor Performance",
      "icon": "⚡",
      "decisionGuide": "Real-time stats → nvidia-smi dmon | Continuous monitoring → dcgmi dmon | Interactive → nvtop",
      "commands": [
        {
          "name": "nvidia-smi dmon",
          "summary": "Continuous GPU metrics monitoring",
          "commonUsage": [
            {
              "command": "nvidia-smi dmon",
              "description": "Default monitoring output"
            },
            {
              "command": "nvidia-smi dmon -s pucvmet",
              "description": "All metric categories"
            },
            {
              "command": "nvidia-smi dmon -d 5",
              "description": "5-second sample interval"
            }
          ],
          "options": [
            {
              "flag": "-s <metrics>",
              "description": "Metric categories (p=power, u=util, c=clock, v=ecc, m=mem, e=ecc, t=temp)"
            },
            { "flag": "-d <sec>", "description": "Sample interval in seconds" },
            { "flag": "-i <gpu>", "description": "Target specific GPU" }
          ],
          "related": ["dcgmi dmon", "nvtop"]
        },
        {
          "name": "nvtop",
          "summary": "Interactive GPU process monitor (like htop for GPUs)",
          "commonUsage": [
            { "command": "nvtop", "description": "Launch interactive monitor" }
          ],
          "options": [
            { "flag": "-d <sec>", "description": "Refresh delay" },
            {
              "flag": "-s <sort>",
              "description": "Sort order (memory, processor)"
            }
          ],
          "related": ["nvidia-smi dmon", "dcgmi dmon"]
        }
      ]
    },
    {
      "id": "troubleshoot-gpu",
      "title": "Troubleshoot GPU Problems",
      "icon": "🔧",
      "decisionGuide": "Run diagnostics → dcgmi diag | Collect logs → nvidia-bug-report | Stress test → gpu-burn",
      "commands": [
        {
          "name": "dcgmi diag",
          "summary": "GPU diagnostic tests at three levels",
          "commonUsage": [
            {
              "command": "dcgmi diag --mode 1",
              "description": "Quick validation (1-2 min)"
            },
            {
              "command": "dcgmi diag --mode 2",
              "description": "Standard diagnostics (5 min)"
            },
            {
              "command": "dcgmi diag --mode 3",
              "description": "Extended stress test (10-15 min)"
            }
          ],
          "options": [
            { "flag": "--mode 1|2|3", "description": "Test depth level" },
            { "flag": "-i <gpu>", "description": "Test specific GPU" },
            { "flag": "-r <test>", "description": "Run specific test" }
          ],
          "related": ["nvidia-smi -q", "nvidia-bug-report"]
        },
        {
          "name": "nvidia-bug-report",
          "summary": "Collect comprehensive system diagnostics for support",
          "commonUsage": [
            {
              "command": "nvidia-bug-report.sh",
              "description": "Generate full diagnostic bundle"
            }
          ],
          "options": [],
          "related": ["dcgmi diag", "dmesg"]
        },
        {
          "name": "gpu-burn",
          "summary": "GPU stress testing and burn-in validation",
          "commonUsage": [
            { "command": "gpu-burn 60", "description": "60-second burn test" },
            {
              "command": "gpu-burn -d 0 300",
              "description": "5-minute test on GPU 0"
            }
          ],
          "options": [
            { "flag": "-d <gpu>", "description": "Target specific GPU" },
            { "flag": "<seconds>", "description": "Test duration" }
          ],
          "related": ["dcgmi diag --mode 3"]
        }
      ]
    },
    {
      "id": "manage-cluster",
      "title": "Manage Cluster Jobs",
      "icon": "🖧",
      "decisionGuide": "View resources → sinfo | Check queue → squeue | Job control → scontrol | History → sacct",
      "commands": [
        {
          "name": "sinfo",
          "summary": "View Slurm cluster partition and node status",
          "commonUsage": [
            { "command": "sinfo", "description": "Partition overview" },
            { "command": "sinfo -N -l", "description": "Node-level details" },
            {
              "command": "sinfo --format=\"%P %a %D %t\"",
              "description": "Custom format"
            }
          ],
          "options": [
            { "flag": "-N", "description": "Node-centric view" },
            { "flag": "-l", "description": "Long/detailed format" },
            { "flag": "-p <partition>", "description": "Filter by partition" }
          ],
          "related": ["squeue", "scontrol"]
        },
        {
          "name": "squeue",
          "summary": "View job queue and running jobs",
          "commonUsage": [
            { "command": "squeue", "description": "All queued jobs" },
            { "command": "squeue -u $USER", "description": "Your jobs only" },
            {
              "command": "squeue -j <jobid>",
              "description": "Specific job details"
            }
          ],
          "options": [
            { "flag": "-u <user>", "description": "Filter by user" },
            { "flag": "-p <partition>", "description": "Filter by partition" },
            {
              "flag": "-t <state>",
              "description": "Filter by state (PENDING, RUNNING)"
            }
          ],
          "related": ["sinfo", "scontrol", "scancel"]
        },
        {
          "name": "scontrol",
          "summary": "Slurm administrative control commands",
          "commonUsage": [
            {
              "command": "scontrol show job <id>",
              "description": "Job details"
            },
            {
              "command": "scontrol show node <name>",
              "description": "Node details"
            },
            { "command": "scontrol hold <jobid>", "description": "Hold a job" }
          ],
          "options": [
            {
              "flag": "show job|node|partition",
              "description": "Display entity details"
            },
            {
              "flag": "hold|release <jobid>",
              "description": "Job state control"
            },
            { "flag": "update", "description": "Modify entity properties" }
          ],
          "related": ["sinfo", "squeue"]
        },
        {
          "name": "sacct",
          "summary": "View historical job accounting data",
          "commonUsage": [
            { "command": "sacct", "description": "Recent job history" },
            {
              "command": "sacct -j <jobid> --format=JobID,Elapsed,MaxRSS",
              "description": "Specific job metrics"
            }
          ],
          "options": [
            { "flag": "-j <jobid>", "description": "Specific job" },
            { "flag": "-S <date>", "description": "Start date filter" },
            {
              "flag": "--format=<fields>",
              "description": "Custom output fields"
            }
          ],
          "related": ["squeue", "scontrol"]
        }
      ]
    },
    {
      "id": "run-containers",
      "title": "Run Containers",
      "icon": "📦",
      "decisionGuide": "Development → docker | HPC workloads → enroot/pyxis | NGC images → ngc",
      "commands": [
        {
          "name": "docker",
          "summary": "Container runtime for development and testing",
          "commonUsage": [
            {
              "command": "docker run --gpus all nvidia/cuda:12.0-base nvidia-smi",
              "description": "Run with GPU access"
            },
            {
              "command": "docker ps",
              "description": "List running containers"
            },
            { "command": "docker images", "description": "List local images" }
          ],
          "options": [
            { "flag": "--gpus all", "description": "Enable GPU access" },
            { "flag": "-v <host>:<container>", "description": "Mount volume" },
            { "flag": "--rm", "description": "Remove container on exit" }
          ],
          "related": ["enroot", "pyxis"]
        },
        {
          "name": "enroot",
          "summary": "Unprivileged container runtime for HPC",
          "commonUsage": [
            {
              "command": "enroot import docker://nvcr.io#nvidia/pytorch:23.10-py3",
              "description": "Import NGC container"
            },
            {
              "command": "enroot create nvidia+pytorch+23.10-py3.sqsh",
              "description": "Create container"
            },
            {
              "command": "enroot start --rw pytorch",
              "description": "Start container"
            }
          ],
          "options": [
            { "flag": "import", "description": "Import from registry" },
            { "flag": "create", "description": "Create from squashfs" },
            { "flag": "start --rw", "description": "Start read-write" }
          ],
          "related": ["docker", "pyxis"]
        },
        {
          "name": "pyxis",
          "summary": "Slurm plugin for container execution",
          "commonUsage": [
            {
              "command": "srun --container-image=nvcr.io#nvidia/pytorch:23.10-py3 python train.py",
              "description": "Run in container via Slurm"
            }
          ],
          "options": [
            {
              "flag": "--container-image=<uri>",
              "description": "Container image to use"
            },
            {
              "flag": "--container-mounts=<mounts>",
              "description": "Volume mounts"
            }
          ],
          "related": ["enroot", "srun"]
        }
      ]
    },
    {
      "id": "check-hardware",
      "title": "Check Hardware Status",
      "icon": "🌡️",
      "decisionGuide": "BMC sensors → ipmitool sensor | System events → ipmitool sel | Hardware info → dmidecode",
      "commands": [
        {
          "name": "ipmitool",
          "summary": "BMC interface for out-of-band management",
          "commonUsage": [
            {
              "command": "ipmitool sensor list",
              "description": "All sensor readings"
            },
            {
              "command": "ipmitool sel list",
              "description": "System Event Log"
            },
            {
              "command": "ipmitool chassis status",
              "description": "Power/chassis state"
            },
            { "command": "ipmitool mc info", "description": "BMC information" }
          ],
          "options": [
            { "flag": "sensor list", "description": "Read all sensors" },
            { "flag": "sel list", "description": "Event log entries" },
            {
              "flag": "chassis power <cmd>",
              "description": "Power control (on/off/cycle)"
            },
            {
              "flag": "-H <host> -U <user> -P <pass>",
              "description": "Remote BMC access"
            }
          ],
          "related": ["sensors", "dmidecode"]
        },
        {
          "name": "sensors",
          "summary": "Linux hardware sensor readings",
          "commonUsage": [
            { "command": "sensors", "description": "All detected sensors" }
          ],
          "options": [
            { "flag": "-f", "description": "Fahrenheit output" },
            { "flag": "-u", "description": "Raw output" }
          ],
          "related": ["ipmitool sensor"]
        },
        {
          "name": "dmidecode",
          "summary": "DMI/SMBIOS hardware information",
          "commonUsage": [
            {
              "command": "dmidecode -t memory",
              "description": "Memory configuration"
            },
            {
              "command": "dmidecode -t processor",
              "description": "CPU information"
            },
            {
              "command": "dmidecode -t system",
              "description": "System information"
            }
          ],
          "options": [
            {
              "flag": "-t <type>",
              "description": "Filter by type (memory, processor, system)"
            },
            { "flag": "-s <keyword>", "description": "Single value lookup" }
          ],
          "related": ["ipmitool", "lspci"]
        }
      ]
    },
    {
      "id": "configure-mig",
      "title": "Configure MIG Partitions",
      "icon": "🔀",
      "decisionGuide": "Enable MIG → nvidia-smi -mig 1 | List profiles → nvidia-smi mig -lgip | Create instances → nvidia-smi mig -cgi",
      "commands": [
        {
          "name": "nvidia-smi mig",
          "summary": "Multi-Instance GPU configuration",
          "commonUsage": [
            {
              "command": "nvidia-smi -i 0 -mig 1",
              "description": "Enable MIG on GPU 0"
            },
            {
              "command": "nvidia-smi mig -lgip",
              "description": "List GPU instance profiles"
            },
            {
              "command": "nvidia-smi mig -i 0 -cgi 19,19,19 -C",
              "description": "Create 3x 3g.20gb instances"
            },
            {
              "command": "nvidia-smi mig -lgi",
              "description": "List created instances"
            }
          ],
          "options": [
            { "flag": "-mig 0|1", "description": "Disable/enable MIG mode" },
            { "flag": "-lgip", "description": "List GPU instance profiles" },
            {
              "flag": "-cgi <profiles>",
              "description": "Create GPU instances"
            },
            {
              "flag": "-C",
              "description": "Create compute instances automatically"
            },
            { "flag": "-dgi", "description": "Destroy GPU instances" }
          ],
          "related": ["dcgmi profile"]
        }
      ]
    },
    {
      "id": "understand-errors",
      "title": "Understand Errors",
      "icon": "⚠️",
      "decisionGuide": "XID decode → check error table | ECC status → nvidia-smi -q -d ECC | Event log → ipmitool sel",
      "commands": [
        {
          "name": "XID Error Reference",
          "summary": "NVIDIA GPU error codes and their meanings",
          "commonUsage": [
            {
              "command": "dmesg | grep -i nvrm",
              "description": "Find XID errors in kernel log"
            },
            {
              "command": "nvidia-smi -q -d ECC",
              "description": "ECC error counts"
            }
          ],
          "options": [],
          "related": ["nvidia-smi", "dcgmi health"]
        }
      ]
    }
  ]
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/data/__tests__/taskCategories.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/data/taskCategories.json src/data/__tests__/taskCategories.test.ts
git commit -m "feat: add task-centric reference data structure"
```

---

### Task 2: Create Reference Tab Component

**Files:**

- Create: `src/components/ReferenceTab.tsx`
- Create: `src/components/__tests__/ReferenceTab.test.tsx`

**Step 1: Write the test file**

```typescript
// src/components/__tests__/ReferenceTab.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReferenceTab } from "../ReferenceTab";

describe("ReferenceTab", () => {
  it("renders the main heading", () => {
    render(<ReferenceTab />);
    expect(screen.getByText("Reference")).toBeInTheDocument();
  });

  it("renders the search input", () => {
    render(<ReferenceTab />);
    expect(screen.getByPlaceholderText(/search commands/i)).toBeInTheDocument();
  });

  it("renders all 9 task categories", () => {
    render(<ReferenceTab />);
    expect(screen.getByText("Check GPU Health")).toBeInTheDocument();
    expect(screen.getByText("Diagnose Network Issues")).toBeInTheDocument();
    expect(screen.getByText("Monitor Performance")).toBeInTheDocument();
    expect(screen.getByText("Troubleshoot GPU Problems")).toBeInTheDocument();
    expect(screen.getByText("Manage Cluster Jobs")).toBeInTheDocument();
    expect(screen.getByText("Run Containers")).toBeInTheDocument();
    expect(screen.getByText("Check Hardware Status")).toBeInTheDocument();
    expect(screen.getByText("Configure MIG Partitions")).toBeInTheDocument();
    expect(screen.getByText("Understand Errors")).toBeInTheDocument();
  });

  it("shows category detail view when category clicked", () => {
    render(<ReferenceTab />);
    fireEvent.click(screen.getByText("Check GPU Health"));
    expect(screen.getByText(/Reference › Check GPU Health/)).toBeInTheDocument();
    expect(screen.getByText(/When to use these tools/i)).toBeInTheDocument();
  });

  it("shows breadcrumb navigation in detail view", () => {
    render(<ReferenceTab />);
    fireEvent.click(screen.getByText("Check GPU Health"));
    expect(screen.getByText("Reference")).toBeInTheDocument();
    expect(screen.getByText("Check GPU Health")).toBeInTheDocument();
  });

  it("returns to main view when breadcrumb clicked", () => {
    render(<ReferenceTab />);
    fireEvent.click(screen.getByText("Check GPU Health"));
    // Find the breadcrumb "Reference" link and click it
    const breadcrumbs = screen.getAllByText("Reference");
    fireEvent.click(breadcrumbs[0]);
    expect(screen.getByText("What do you want to do?")).toBeInTheDocument();
  });

  it("expands command details when clicked", () => {
    render(<ReferenceTab />);
    fireEvent.click(screen.getByText("Check GPU Health"));
    fireEvent.click(screen.getByText("nvidia-smi"));
    expect(screen.getByText("COMMON USAGE")).toBeInTheDocument();
    expect(screen.getByText("KEY OPTIONS")).toBeInTheDocument();
  });

  it("filters categories based on search", () => {
    render(<ReferenceTab />);
    const searchInput = screen.getByPlaceholderText(/search commands/i);
    fireEvent.change(searchInput, { target: { value: "nvidia-smi" } });
    expect(screen.getByText("Check GPU Health")).toBeInTheDocument();
    expect(screen.queryByText("Manage Cluster Jobs")).not.toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/__tests__/ReferenceTab.test.tsx`
Expected: FAIL - Cannot find module '../ReferenceTab'

**Step 3: Create the ReferenceTab component**

```typescript
// src/components/ReferenceTab.tsx
import { useState, useMemo } from "react";
import { Search, ChevronRight, ChevronDown } from "lucide-react";
import taskCategoriesData from "../data/taskCategories.json";

interface CommandReference {
  name: string;
  summary: string;
  commonUsage: { command: string; description: string }[];
  options: { flag: string; description: string }[];
  related: string[];
}

interface TaskCategory {
  id: string;
  title: string;
  icon: string;
  decisionGuide: string;
  commands: CommandReference[];
}

const categories = taskCategoriesData.categories as TaskCategory[];

export function ReferenceTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | null>(null);
  const [expandedCommands, setExpandedCommands] = useState<Set<string>>(new Set());

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase();
    return categories.filter(
      (cat) =>
        cat.title.toLowerCase().includes(query) ||
        cat.commands.some(
          (cmd) =>
            cmd.name.toLowerCase().includes(query) ||
            cmd.summary.toLowerCase().includes(query)
        )
    );
  }, [searchQuery]);

  const toggleCommand = (cmdName: string) => {
    setExpandedCommands((prev) => {
      const next = new Set(prev);
      if (next.has(cmdName)) {
        next.delete(cmdName);
      } else {
        next.add(cmdName);
      }
      return next;
    });
  };

  const handleCategoryClick = (category: TaskCategory) => {
    setSelectedCategory(category);
    setExpandedCommands(new Set([category.commands[0]?.name]));
  };

  const handleBackToMain = () => {
    setSelectedCategory(null);
    setExpandedCommands(new Set());
  };

  // Category detail view
  if (selectedCategory) {
    return (
      <div className="h-full overflow-auto p-6 bg-gray-900">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <button
            onClick={handleBackToMain}
            className="hover:text-white transition-colors"
          >
            Reference
          </button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-white">{selectedCategory.title}</span>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search commands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-nvidia-green"
          />
        </div>

        {/* Decision Guide */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">When to use these tools:</h3>
          <p className="text-gray-300 font-mono text-sm">{selectedCategory.decisionGuide}</p>
        </div>

        {/* Commands */}
        <div className="space-y-3">
          {selectedCategory.commands.map((cmd) => {
            const isExpanded = expandedCommands.has(cmd.name);
            return (
              <div key={cmd.name} className="bg-gray-800 border border-gray-700 rounded-lg">
                <button
                  onClick={() => toggleCommand(cmd.name)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-nvidia-green" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="font-mono text-nvidia-green font-semibold">{cmd.name}</span>
                  </div>
                  <span className="text-gray-400 text-sm">{cmd.summary}</span>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-700">
                    {/* Common Usage */}
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        COMMON USAGE
                      </h4>
                      <div className="space-y-2">
                        {cmd.commonUsage.map((usage, i) => (
                          <div key={i} className="flex gap-4">
                            <code className="text-nvidia-green bg-gray-900 px-2 py-1 rounded text-sm whitespace-nowrap">
                              {usage.command}
                            </code>
                            <span className="text-gray-400 text-sm">{usage.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Options */}
                    {cmd.options.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          KEY OPTIONS
                        </h4>
                        <div className="space-y-1">
                          {cmd.options.map((opt, i) => (
                            <div key={i} className="flex gap-4">
                              <code className="text-yellow-400 font-mono text-sm w-32 shrink-0">
                                {opt.flag}
                              </code>
                              <span className="text-gray-400 text-sm">{opt.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Related */}
                    {cmd.related.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          RELATED
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {cmd.related.map((rel, i) => (
                            <span
                              key={i}
                              className="text-sm bg-gray-700 px-2 py-1 rounded text-gray-300"
                            >
                              {rel}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Main category grid view
  return (
    <div className="h-full overflow-auto p-6 bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Reference</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search commands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-nvidia-green w-64"
          />
        </div>
      </div>

      {/* Subtitle */}
      <p className="text-gray-400 mb-6">What do you want to do?</p>

      {/* Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryClick(category)}
            className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-left hover:border-nvidia-green transition-colors group"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{category.icon}</span>
              <h3 className="text-lg font-semibold text-white group-hover:text-nvidia-green transition-colors">
                {category.title}
              </h3>
            </div>
            <div className="text-sm text-gray-400">
              {category.commands.map((cmd) => cmd.name).join(", ")}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/__tests__/ReferenceTab.test.tsx`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/components/ReferenceTab.tsx src/components/__tests__/ReferenceTab.test.tsx
git commit -m "feat: add ReferenceTab component with task-centric navigation"
```

---

### Task 3: Create XID Error Reference Component

**Files:**

- Create: `src/components/XidErrorReference.tsx`
- Create: `src/components/__tests__/XidErrorReference.test.tsx`
- Preserve content from: `src/components/Documentation.tsx` (XID Reference tab)

**Step 1: Write the test file**

```typescript
// src/components/__tests__/XidErrorReference.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { XidErrorReference } from "../XidErrorReference";

describe("XidErrorReference", () => {
  it("renders the component heading", () => {
    render(<XidErrorReference />);
    expect(screen.getByText("XID Error Reference")).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(<XidErrorReference />);
    expect(screen.getByPlaceholderText(/search xid/i)).toBeInTheDocument();
  });

  it("renders severity filter buttons", () => {
    render(<XidErrorReference />);
    expect(screen.getByRole("button", { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /critical/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /warning/i })).toBeInTheDocument();
  });

  it("displays XID error entries", () => {
    render(<XidErrorReference />);
    expect(screen.getByText(/XID 13/)).toBeInTheDocument();
    expect(screen.getByText(/XID 48/)).toBeInTheDocument();
    expect(screen.getByText(/XID 79/)).toBeInTheDocument();
  });

  it("filters by severity when button clicked", () => {
    render(<XidErrorReference />);
    fireEvent.click(screen.getByRole("button", { name: /critical/i }));
    expect(screen.getByText(/XID 48/)).toBeInTheDocument(); // Critical
    expect(screen.getByText(/XID 79/)).toBeInTheDocument(); // Critical
  });

  it("filters by search query", () => {
    render(<XidErrorReference />);
    const searchInput = screen.getByPlaceholderText(/search xid/i);
    fireEvent.change(searchInput, { target: { value: "ECC" } });
    expect(screen.getByText(/XID 48/)).toBeInTheDocument();
    expect(screen.getByText(/XID 63/)).toBeInTheDocument();
  });

  it("shows exam relevance tag on relevant errors", () => {
    render(<XidErrorReference />);
    expect(screen.getAllByText(/exam relevant/i).length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/__tests__/XidErrorReference.test.tsx`
Expected: FAIL - Cannot find module '../XidErrorReference'

**Step 3: Create the XidErrorReference component**

First, extract XID data from Documentation.tsx (preserve this content):

```typescript
// src/components/XidErrorReference.tsx
import { useState, useMemo } from "react";
import { Search, AlertTriangle, AlertCircle, Info, Cpu, Thermometer, Zap, HardDrive } from "lucide-react";

interface XidError {
  code: number;
  name: string;
  severity: "Critical" | "Warning";
  category: "GPU" | "Memory" | "NVLink" | "Power" | "Driver";
  rootCause: string;
  actions: string[];
  relatedCommands: string[];
  examRelevant: boolean;
}

// Extracted from Documentation.tsx - XID error database
const xidErrors: XidError[] = [
  {
    code: 13,
    name: "Graphics Engine Exception",
    severity: "Warning",
    category: "GPU",
    rootCause: "Application crash or GPU hang during graphics/compute operations",
    actions: [
      "Check application logs for errors",
      "Verify driver compatibility",
      "Run dcgmi diag to test GPU health",
      "If persistent, may indicate hardware issue"
    ],
    relatedCommands: ["nvidia-smi -q", "dcgmi diag --mode 2", "dmesg | grep -i nvrm"],
    examRelevant: true
  },
  {
    code: 31,
    name: "GPU Memory Page Fault",
    severity: "Warning",
    category: "Memory",
    rootCause: "Invalid memory access by application - often a programming bug",
    actions: [
      "Review application for memory access issues",
      "Check CUDA memory allocation patterns",
      "Verify sufficient GPU memory available",
      "Test with cuda-memcheck"
    ],
    relatedCommands: ["nvidia-smi -q -d MEMORY", "cuda-memcheck"],
    examRelevant: true
  },
  {
    code: 43,
    name: "GPU Stopped Processing",
    severity: "Critical",
    category: "GPU",
    rootCause: "GPU is no longer responding to commands",
    actions: [
      "Reset GPU with nvidia-smi -r",
      "Check power and thermal state",
      "Review recent workload changes",
      "May require system reboot if reset fails"
    ],
    relatedCommands: ["nvidia-smi -r", "nvidia-smi -q -d POWER,TEMPERATURE"],
    examRelevant: true
  },
  {
    code: 48,
    name: "Double-Bit ECC Error",
    severity: "Critical",
    category: "Memory",
    rootCause: "Uncorrectable memory error - data corruption has occurred",
    actions: [
      "Check nvidia-smi for retired pages count",
      "Run dcgmi diag --mode 3 for comprehensive memory test",
      "If persistent, GPU replacement recommended",
      "Document error frequency for RMA"
    ],
    relatedCommands: ["nvidia-smi -q -d ECC", "dcgmi diag --mode 3"],
    examRelevant: true
  },
  {
    code: 63,
    name: "ECC Page Retirement",
    severity: "Warning",
    category: "Memory",
    rootCause: "Memory page retired due to ECC errors - preventive action",
    actions: [
      "Monitor retired page count over time",
      "If approaching 64 retired pages, plan GPU replacement",
      "Check nvidia-smi -q -d ECC for details",
      "Normal wear indicator in long-running systems"
    ],
    relatedCommands: ["nvidia-smi -q -d ECC", "nvidia-smi -q -d RETIRED_PAGES"],
    examRelevant: true
  },
  {
    code: 79,
    name: "GPU Fallen Off Bus",
    severity: "Critical",
    category: "Power",
    rootCause: "GPU lost PCIe connection - hardware failure or power issue",
    actions: [
      "Check PCIe slot seating and power cables",
      "Verify PSU capacity and 12V rail stability",
      "Inspect for physical damage",
      "Test in different PCIe slot if possible",
      "Likely requires GPU replacement"
    ],
    relatedCommands: ["lspci | grep -i nvidia", "dmesg | grep -i pci", "ipmitool sel list"],
    examRelevant: true
  },
  {
    code: 119,
    name: "GSP Error",
    severity: "Critical",
    category: "Driver",
    rootCause: "GPU System Processor firmware/driver communication failure",
    actions: [
      "Check driver/firmware version compatibility",
      "Update to latest driver and firmware",
      "Review NVIDIA release notes for known issues",
      "May indicate need for RMA if persists after update"
    ],
    relatedCommands: ["nvidia-smi -q -d FIRMWARE", "nvidia-smi -q | grep Driver"],
    examRelevant: true
  },
  {
    code: 45,
    name: "Preemptive Channel Removal",
    severity: "Warning",
    category: "GPU",
    rootCause: "GPU channel terminated to prevent system hang",
    actions: [
      "Review application for long-running kernels",
      "Check TDR (Timeout Detection Recovery) settings",
      "May indicate inefficient compute workload"
    ],
    relatedCommands: ["nvidia-smi -q", "dcgmi health --check"],
    examRelevant: false
  },
  {
    code: 64,
    name: "Fallen Off Bus (Secondary)",
    severity: "Critical",
    category: "Power",
    rootCause: "Secondary GPU communication failure",
    actions: [
      "Check NVLink/NVSwitch connectivity",
      "Verify multi-GPU topology",
      "Inspect baseboard connections"
    ],
    relatedCommands: ["nvidia-smi topo -m", "nvidia-smi nvlink --status"],
    examRelevant: true
  },
  {
    code: 74,
    name: "NVLink Error",
    severity: "Critical",
    category: "NVLink",
    rootCause: "NVLink communication failure between GPUs",
    actions: [
      "Check nvidia-smi nvlink --status for error counts",
      "Verify NVSwitch health if applicable",
      "May indicate failing NVLink bridge",
      "Run dcgmi diag to test NVLink paths"
    ],
    relatedCommands: ["nvidia-smi nvlink --status", "nvidia-smi topo -m", "dcgmi diag --mode 2"],
    examRelevant: true
  }
];

const categoryIcons: Record<string, React.ReactNode> = {
  GPU: <Cpu className="w-4 h-4" />,
  Memory: <HardDrive className="w-4 h-4" />,
  NVLink: <Zap className="w-4 h-4" />,
  Power: <AlertTriangle className="w-4 h-4" />,
  Driver: <Info className="w-4 h-4" />,
};

export function XidErrorReference() {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"all" | "Critical" | "Warning">("all");

  const filteredErrors = useMemo(() => {
    return xidErrors.filter((error) => {
      const matchesSeverity = severityFilter === "all" || error.severity === severityFilter;
      const matchesSearch =
        searchQuery === "" ||
        error.code.toString().includes(searchQuery) ||
        error.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        error.rootCause.toLowerCase().includes(searchQuery.toLowerCase());
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
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    error.severity === "Critical"
                      ? "bg-red-900/50 text-red-400"
                      : "bg-yellow-900/50 text-yellow-400"
                  }`}
                >
                  {error.severity === "Critical" ? (
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                  )}
                  XID {error.code}
                </span>
                <span className="text-white font-semibold">{error.name}</span>
                <span className="text-gray-500 flex items-center gap-1">
                  {categoryIcons[error.category]}
                  {error.category}
                </span>
              </div>
              {error.examRelevant && (
                <span className="bg-nvidia-green/20 text-nvidia-green text-xs px-2 py-1 rounded">
                  Exam Relevant
                </span>
              )}
            </div>

            <p className="text-gray-300 mb-4">{error.rootCause}</p>

            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-400 mb-2">Recommended Actions:</h4>
              <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                {error.actions.map((action, i) => (
                  <li key={i}>{action}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-2">Related Commands:</h4>
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
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/__tests__/XidErrorReference.test.tsx`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/components/XidErrorReference.tsx src/components/__tests__/XidErrorReference.test.tsx
git commit -m "feat: add XidErrorReference component (extracted from Documentation)"
```

---

### Task 4: Integrate XID Reference into Reference Tab

**Files:**

- Modify: `src/components/ReferenceTab.tsx`
- Modify: `src/components/__tests__/ReferenceTab.test.tsx`

**Step 1: Update test to verify XID integration**

Add this test to ReferenceTab.test.tsx:

```typescript
it("shows XID Error Reference when 'Understand Errors' category is clicked", () => {
  render(<ReferenceTab />);
  fireEvent.click(screen.getByText("Understand Errors"));
  expect(screen.getByText("XID Error Reference")).toBeInTheDocument();
  expect(screen.getByText(/XID 48/)).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/__tests__/ReferenceTab.test.tsx`
Expected: FAIL - XID Error Reference not rendered

**Step 3: Update ReferenceTab to include XidErrorReference**

Add import and conditional rendering:

```typescript
// At top of ReferenceTab.tsx
import { XidErrorReference } from "./XidErrorReference";

// In the category detail view, add special case for understand-errors:
if (selectedCategory.id === "understand-errors") {
  return (
    <div className="h-full overflow-auto p-6 bg-gray-900">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <button
          onClick={handleBackToMain}
          className="hover:text-white transition-colors"
        >
          Reference
        </button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-white">{selectedCategory.title}</span>
      </div>
      <XidErrorReference />
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/__tests__/ReferenceTab.test.tsx`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/components/ReferenceTab.tsx src/components/__tests__/ReferenceTab.test.tsx
git commit -m "feat: integrate XidErrorReference into Reference tab"
```

---

### Task 5: Update App.tsx Tab Structure

**Files:**

- Modify: `src/App.tsx`
- Create: `src/components/StateManagementTab.tsx`

**Step 1: Create StateManagementTab component**

Extract StateManagementPanel wrapper:

```typescript
// src/components/StateManagementTab.tsx
import { StateManagementPanel } from "./StateManagementPanel";

export function StateManagementTab() {
  return (
    <div className="h-full overflow-auto p-6 bg-gray-900">
      <h1 className="text-2xl font-bold text-white mb-6">State Management</h1>
      <p className="text-gray-400 mb-6">
        Save and restore cluster configurations, export progress, and manage simulation state.
      </p>
      <StateManagementPanel />
    </div>
  );
}
```

**Step 2: Update App.tsx navigation**

Replace the three-tab system (Simulator, Labs & Scenarios, Documentation) with four tabs:

```typescript
// Update tab definitions in App.tsx
const tabs = [
  { id: "simulator", label: "Simulator", icon: Monitor },
  { id: "labs", label: "Labs & Scenarios", icon: FlaskConical },
  { id: "reference", label: "Reference", icon: BookOpen },
  { id: "state", label: "State Management", icon: Database },
];
```

**Step 3: Update tab content rendering**

Replace Documentation component with ReferenceTab and StateManagementTab:

```typescript
{activeTab === "reference" && <ReferenceTab />}
{activeTab === "state" && <StateManagementTab />}
```

**Step 4: Run build to verify no errors**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/App.tsx src/components/StateManagementTab.tsx
git commit -m "feat: update App.tsx to four-tab structure (Simulator, Labs, Reference, State)"
```

---

## Phase 2: Labs & Scenarios Rebuild

### Task 6: Create Narrative Scenario Data Structure

**Files:**

- Create: `src/data/narrativeScenarios.json`
- Create: `src/data/__tests__/narrativeScenarios.test.ts`

**Step 1: Write the test file**

```typescript
// src/data/__tests__/narrativeScenarios.test.ts
import { describe, it, expect } from "vitest";
import scenariosData from "../narrativeScenarios.json";

interface NarrativeScenario {
  id: string;
  domain: 1 | 2 | 3 | 4 | 5;
  title: string;
  narrative: {
    hook: string;
    setting: string;
    resolution: string;
  };
  commandFamilies: string[];
  estimatedMinutes: number;
  steps: NarrativeStep[];
}

interface NarrativeStep {
  id: string;
  situation: string;
  task: string;
  hints: string[];
  validation: {
    type: string;
    command?: string;
    pattern?: string;
  };
  quiz?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

const scenarios = scenariosData.scenarios as NarrativeScenario[];

describe("narrativeScenarios.json", () => {
  it("should have scenarios array", () => {
    expect(scenariosData).toHaveProperty("scenarios");
    expect(Array.isArray(scenarios)).toBe(true);
  });

  it("should have 16 narrative scenarios", () => {
    expect(scenarios.length).toBe(16);
  });

  it("should cover all 5 domains", () => {
    const domains = new Set(scenarios.map((s) => s.domain));
    expect(domains.size).toBe(5);
    [1, 2, 3, 4, 5].forEach((d) =>
      expect(domains.has(d as 1 | 2 | 3 | 4 | 5)).toBe(true),
    );
  });

  it("each scenario should have required narrative fields", () => {
    scenarios.forEach((s) => {
      expect(s).toHaveProperty("id");
      expect(s).toHaveProperty("domain");
      expect(s).toHaveProperty("title");
      expect(s).toHaveProperty("narrative");
      expect(s.narrative).toHaveProperty("hook");
      expect(s.narrative).toHaveProperty("setting");
      expect(s.narrative).toHaveProperty("resolution");
      expect(s).toHaveProperty("commandFamilies");
      expect(s.commandFamilies.length).toBeGreaterThanOrEqual(3);
      expect(s).toHaveProperty("estimatedMinutes");
      expect(s.estimatedMinutes).toBeGreaterThanOrEqual(15);
      expect(s).toHaveProperty("steps");
      expect(s.steps.length).toBeGreaterThanOrEqual(8);
    });
  });

  it("each step should have required fields", () => {
    scenarios.forEach((s) => {
      s.steps.forEach((step) => {
        expect(step).toHaveProperty("id");
        expect(step).toHaveProperty("situation");
        expect(step).toHaveProperty("task");
        expect(step).toHaveProperty("hints");
        expect(step).toHaveProperty("validation");
      });
    });
  });

  it("scenarios should have 2-3 integrated quizzes each", () => {
    scenarios.forEach((s) => {
      const quizCount = s.steps.filter((step) => step.quiz).length;
      expect(quizCount).toBeGreaterThanOrEqual(2);
      expect(quizCount).toBeLessThanOrEqual(4);
    });
  });
});
```

**Step 2: Create initial narrative scenarios data**

Create `src/data/narrativeScenarios.json` with 16 comprehensive scenarios. This is a large file - I'll create one complete example scenario and the structure for the rest.

```json
{
  "version": "1.0.0",
  "scenarios": [
    {
      "id": "domain4-silent-cluster",
      "domain": 4,
      "title": "The Silent Cluster",
      "narrative": {
        "hook": "Production cluster showing intermittent NCCL timeouts. Users report training jobs hanging without errors for 5-10 minutes before failing.",
        "setting": "You're the on-call engineer for a 32-node DGX A100 cluster running multi-node training workloads. The issue started appearing yesterday after a routine maintenance window.",
        "resolution": "Identify the root cause as ECC errors on GPU 3 of node dgx-04 causing NVLink degradation, and isolate the affected node for hardware service."
      },
      "commandFamilies": [
        "gpu-monitoring",
        "infiniband-tools",
        "cluster-tools",
        "diagnostics"
      ],
      "estimatedMinutes": 25,
      "steps": [
        {
          "id": "step-1",
          "situation": "You receive a ticket: 'NCCL all-reduce hanging on multi-node jobs'. The user mentions it started yesterday and happens intermittently.",
          "task": "First, check which nodes are currently running jobs and their status using Slurm commands.",
          "hints": [
            "Use squeue to see running jobs",
            "Check sinfo for node states"
          ],
          "validation": {
            "type": "command",
            "command": "squeue",
            "pattern": "RUNNING|PENDING"
          }
        },
        {
          "id": "step-2",
          "situation": "You see there are 4 multi-node jobs running across various nodes. The user's job is using nodes dgx-01 through dgx-08.",
          "task": "Check the overall GPU health across the cluster to identify any obvious issues.",
          "hints": [
            "nvidia-smi can show GPU status",
            "Look for ERR! or N/A in the output"
          ],
          "validation": {
            "type": "command",
            "command": "nvidia-smi",
            "pattern": "GPU|Memory"
          },
          "quiz": {
            "question": "When investigating intermittent cluster issues, why start with nvidia-smi before deeper diagnostics?",
            "options": [
              "It's faster and shows obvious problems like ERR!, thermal throttling, or high memory usage",
              "It's the only tool that works across all nodes",
              "DCGM requires special permissions",
              "nvidia-smi is more accurate than DCGM"
            ],
            "correctIndex": 0,
            "explanation": "nvidia-smi is quick and highlights obvious issues. If everything looks normal, you move to deeper diagnostics."
          }
        },
        {
          "id": "step-3",
          "situation": "nvidia-smi output looks normal on most nodes, but you notice dgx-04 shows slightly elevated temperatures on GPU 3. No ERR! visible.",
          "task": "Run DCGM health check on dgx-04 to get a deeper look at GPU health.",
          "hints": [
            "dcgmi health --check shows health status",
            "Focus on the node showing elevated temperatures"
          ],
          "validation": {
            "type": "command",
            "command": "dcgmi health",
            "pattern": "Health|Warning|Error"
          }
        },
        {
          "id": "step-4",
          "situation": "DCGM health check reports 'Warning' on GPU 3 with ECC errors detected. The other GPUs show healthy status.",
          "task": "Check detailed ECC error information for GPU 3 on dgx-04.",
          "hints": [
            "nvidia-smi -q -d ECC shows error counts",
            "Use -i flag to target specific GPU"
          ],
          "validation": {
            "type": "command",
            "command": "nvidia-smi.*ECC",
            "pattern": "Volatile|Aggregate|Single|Double"
          },
          "quiz": {
            "question": "What's the difference between volatile and aggregate ECC error counts?",
            "options": [
              "Volatile clears on reboot, aggregate persists - use aggregate to track long-term health",
              "Volatile is more severe than aggregate",
              "They measure different types of memory",
              "Aggregate only counts uncorrectable errors"
            ],
            "correctIndex": 0,
            "explanation": "Volatile ECC counts reset on reboot. Aggregate counts persist and show lifetime error accumulation - critical for tracking GPU health trends."
          }
        },
        {
          "id": "step-5",
          "situation": "ECC data shows 47 correctable errors and 2 uncorrectable errors on GPU 3. The aggregate count is high, suggesting ongoing memory issues.",
          "task": "NCCL hangs suggest communication issues. Check NVLink status between GPUs on dgx-04.",
          "hints": [
            "nvidia-smi nvlink shows link status and errors",
            "Look for replay errors or CRC errors"
          ],
          "validation": {
            "type": "command",
            "command": "nvidia-smi nvlink",
            "pattern": "Link|Replay|Error"
          }
        },
        {
          "id": "step-6",
          "situation": "NVLink status shows high replay error counts on links connected to GPU 3. The ECC errors are causing NVLink retransmissions.",
          "task": "This explains the NCCL timeouts - bad GPU affecting NVLink mesh. Check InfiniBand connectivity to rule out fabric issues.",
          "hints": [
            "ibstat shows port status",
            "perfquery shows error counters"
          ],
          "validation": {
            "type": "command",
            "command": "ibstat",
            "pattern": "State|Active|Rate"
          }
        },
        {
          "id": "step-7",
          "situation": "InfiniBand looks healthy - ports are Active at full speed with minimal errors. The issue is isolated to the GPU/NVLink.",
          "task": "Run a quick DCGM diagnostic to confirm GPU 3 hardware issue.",
          "hints": [
            "dcgmi diag --mode 1 is quick",
            "Target specific GPU with -i flag"
          ],
          "validation": {
            "type": "command",
            "command": "dcgmi diag",
            "pattern": "Pass|Fail|Warning"
          },
          "quiz": {
            "question": "You're deciding between dcgmi diag mode 1, 2, and 3. Given you've already identified the likely problem, which is most appropriate?",
            "options": [
              "Mode 1 - quick confirmation is enough since you've identified the issue",
              "Mode 3 - always run comprehensive tests",
              "Mode 2 - it's the default",
              "None - nvidia-smi already confirmed the issue"
            ],
            "correctIndex": 0,
            "explanation": "Mode 1 is ~1-2 minutes and sufficient for confirmation. Mode 3 takes 10-15 minutes and is for thorough burn-in testing, not quick triage."
          }
        },
        {
          "id": "step-8",
          "situation": "DCGM diagnostic confirms GPU 3 memory subsystem failure. You now have enough evidence to take action.",
          "task": "Drain the node from Slurm to prevent new jobs from being scheduled to dgx-04.",
          "hints": [
            "scontrol update can change node state",
            "Set state to DRAIN with a reason"
          ],
          "validation": {
            "type": "command",
            "command": "scontrol.*drain",
            "pattern": "drain|update"
          }
        },
        {
          "id": "step-9",
          "situation": "Node is draining. Existing jobs will complete but no new jobs will start on dgx-04.",
          "task": "Document your findings for the hardware team. Check the system event log for any related hardware events.",
          "hints": [
            "ipmitool sel list shows system events",
            "Look for GPU or PCIe related events"
          ],
          "validation": {
            "type": "command",
            "command": "ipmitool sel",
            "pattern": "Event|Log"
          }
        },
        {
          "id": "step-10",
          "situation": "SEL shows PCIe correctable errors logged around the same time the ECC errors started. Good correlation for the RMA report.",
          "task": "Final step: verify the node is properly drained and document the resolution.",
          "hints": [
            "sinfo -N shows node states",
            "The node should show drain state"
          ],
          "validation": {
            "type": "command",
            "command": "sinfo",
            "pattern": "drain|DRAIN"
          }
        }
      ]
    }
  ]
}
```

**Note:** The full file will contain 16 scenarios following this pattern. Each domain should have:

- Domain 1 (Systems & Bring-Up): 3-4 scenarios
- Domain 2 (Physical Layer): 2-3 scenarios
- Domain 3 (Control Plane): 3-4 scenarios
- Domain 4 (Cluster Test): 4-5 scenarios
- Domain 5 (Troubleshooting): 3-4 scenarios

**Step 3: Run test (will fail until all 16 scenarios created)**

Run: `npm run test:run -- src/data/__tests__/narrativeScenarios.test.ts`

**Step 4: Commit initial structure**

```bash
git add src/data/narrativeScenarios.json src/data/__tests__/narrativeScenarios.test.ts
git commit -m "feat: add narrative scenario data structure with first scenario"
```

---

### Task 7: Create Domain Navigation Component

**Files:**

- Create: `src/components/DomainNavigation.tsx`
- Create: `src/components/__tests__/DomainNavigation.test.tsx`

This component renders the domain cards on the main Labs & Scenarios view.

**Step 1: Write the test file**

```typescript
// src/components/__tests__/DomainNavigation.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DomainNavigation } from "../DomainNavigation";

const mockOnDomainSelect = vi.fn();
const mockOnFinalAssessment = vi.fn();

describe("DomainNavigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all 5 domain cards", () => {
    render(
      <DomainNavigation
        onDomainSelect={mockOnDomainSelect}
        onFinalAssessment={mockOnFinalAssessment}
      />
    );
    expect(screen.getByText(/Domain 1/)).toBeInTheDocument();
    expect(screen.getByText(/Domain 2/)).toBeInTheDocument();
    expect(screen.getByText(/Domain 3/)).toBeInTheDocument();
    expect(screen.getByText(/Domain 4/)).toBeInTheDocument();
    expect(screen.getByText(/Domain 5/)).toBeInTheDocument();
  });

  it("renders Final Assessment card", () => {
    render(
      <DomainNavigation
        onDomainSelect={mockOnDomainSelect}
        onFinalAssessment={mockOnFinalAssessment}
      />
    );
    expect(screen.getByText("Final Assessment")).toBeInTheDocument();
  });

  it("calls onDomainSelect when domain card clicked", () => {
    render(
      <DomainNavigation
        onDomainSelect={mockOnDomainSelect}
        onFinalAssessment={mockOnFinalAssessment}
      />
    );
    fireEvent.click(screen.getByText(/Domain 4/));
    expect(mockOnDomainSelect).toHaveBeenCalledWith(4);
  });

  it("calls onFinalAssessment when Start Exam clicked", () => {
    render(
      <DomainNavigation
        onDomainSelect={mockOnDomainSelect}
        onFinalAssessment={mockOnFinalAssessment}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /start exam/i }));
    expect(mockOnFinalAssessment).toHaveBeenCalled();
  });

  it("shows progress on each domain card", () => {
    render(
      <DomainNavigation
        onDomainSelect={mockOnDomainSelect}
        onFinalAssessment={mockOnFinalAssessment}
        progress={{ 1: { completed: 2, total: 4 }, 4: { completed: 1, total: 5 } }}
      />
    );
    expect(screen.getByText("2/4")).toBeInTheDocument();
    expect(screen.getByText("1/5")).toBeInTheDocument();
  });

  it("shows overall progress summary", () => {
    render(
      <DomainNavigation
        onDomainSelect={mockOnDomainSelect}
        onFinalAssessment={mockOnFinalAssessment}
        progress={{ 1: { completed: 2, total: 4 } }}
      />
    );
    expect(screen.getByText(/Overall Progress/)).toBeInTheDocument();
  });

  it("shows recommended scenario", () => {
    render(
      <DomainNavigation
        onDomainSelect={mockOnDomainSelect}
        onFinalAssessment={mockOnFinalAssessment}
        recommendedScenario={{ id: "test", title: "Test Scenario", domain: 4 }}
      />
    );
    expect(screen.getByText(/Recommended/)).toBeInTheDocument();
    expect(screen.getByText("Test Scenario")).toBeInTheDocument();
  });
});
```

**Step 2-5:** Implement component, run tests, commit.

---

## Phase 3: Content Migration (Tasks 8-12)

These tasks involve:

- **Task 8:** Migrate exam guide content from Documentation.tsx to Reference tab
- **Task 9:** Migrate remaining XID errors to XidErrorReference
- **Task 10:** Create all 16 narrative scenarios (content writing)
- **Task 11:** Migrate quiz questions into narrative scenario steps
- **Task 12:** Migrate progress tracking localStorage keys

---

## Phase 4: Polish & Cleanup (Tasks 13-16)

### Task 13: Apply UI Consistency Standards

**Files:**

- Modify: All component files to use standardized card pattern
- Create: `src/styles/card.ts` (shared card class constants)

### Task 14: Remove Old Components (CAREFUL)

**Pre-deletion checklist for each file:**

```
Before deleting src/components/LearningPaths.tsx:
□ All progress tracking migrated to new components
□ All localStorage keys preserved
□ Tutorial step rendering logic extracted
□ Command validation system preserved
□ Tests updated/removed

Before deleting src/components/CommandFamilyCards.tsx:
□ All content in taskCategories.json
□ Quiz functionality moved to scenario flow
□ Progress rings replaced with simpler indicators

Before deleting src/components/WhichToolQuiz.tsx:
□ All 24 questions migrated to narrative scenarios
□ Quiz display logic extracted to shared component
□ Score recording preserved

Before deleting src/components/SpacedReviewDrill.tsx:
□ "Recommended" scenario logic implemented
□ Review scheduling algorithm preserved in utils
□ No popup interruptions needed

Before deleting src/components/StudyDashboard.tsx:
□ Progress summary shown on domain navigation
□ Export/import preserved in State Management
□ Domain trends visible inline

Before deleting src/components/Documentation.tsx:
□ All XID data in XidErrorReference
□ All command data in taskCategories.json
□ Exam guide content migrated to Reference
□ Architecture content migrated or linked
□ State tab functional standalone
```

**Files:**

- Delete: `src/components/LearningPaths.tsx` (after verification)
- Delete: `src/components/CommandFamilyCards.tsx` (after verification)
- Delete: `src/components/WhichToolQuiz.tsx` (after verification)
- Delete: `src/components/SpacedReviewDrill.tsx` (after verification)
- Delete: `src/components/StudyDashboard.tsx` (after verification)
- Delete: `src/components/ExplanationGate.tsx` (after verification)
- Delete: `src/components/ProgressRing.tsx` (after verification)
- Modify: `src/components/Documentation.tsx` → Keep only as redirect or remove

### Task 15: Update Tests

**Files:**

- Remove: Tests for deleted components
- Update: Integration tests for new flow
- Add: E2E tests for new navigation

### Task 16: Final Verification

**Checklist:**

- [ ] All 4 tabs render correctly
- [ ] All 16 scenarios playable
- [ ] Reference tab search works
- [ ] XID lookup works
- [ ] State Management functional
- [ ] `explain` command still works in terminal
- [ ] Progress persists across sessions
- [ ] Export/import works
- [ ] No console errors
- [ ] All tests pass
- [ ] Build succeeds

---

## Execution Notes

**Estimated effort:** 4-6 focused sessions

**Risk mitigation:**

- Always verify content migration before deletion
- Keep old components until new ones verified
- Commit frequently with descriptive messages
- Run tests after each task

**Data preservation priority:**

1. Quiz questions (24)
2. XID error database
3. Exam guide content
4. Command reference data
5. Progress/localStorage
6. Scenario content
