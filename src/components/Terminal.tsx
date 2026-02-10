import React, { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import "xterm/css/xterm.css";
import type { CommandContext } from "@/types/commands";
import { NvidiaSmiSimulator } from "@/simulators/nvidiaSmiSimulator";
import { DcgmiSimulator } from "@/simulators/dcgmiSimulator";
import { IpmitoolSimulator } from "@/simulators/ipmitoolSimulator";
import { InfiniBandSimulator } from "@/simulators/infinibandSimulator";
import { NvsmSimulator } from "@/simulators/nvsmSimulator";
import { MellanoxSimulator } from "@/simulators/mellanoxSimulator";
import { SlurmSimulator } from "@/simulators/slurmSimulator";
import { ContainerSimulator } from "@/simulators/containerSimulator";
import { BcmSimulator } from "@/simulators/bcmSimulator";
import { CmshSimulator } from "@/simulators/cmshSimulator";
import { BasicSystemSimulator } from "@/simulators/basicSystemSimulator";
import { PciToolsSimulator } from "@/simulators/pciToolsSimulator";
import { BenchmarkSimulator } from "@/simulators/benchmarkSimulator";
import { StorageSimulator } from "@/simulators/storageSimulator";
import { NvlinkAuditSimulator } from "@/simulators/nvlinkAuditSimulator";
import { FabricManagerSimulator } from "@/simulators/fabricManagerSimulator";
import { NvidiaBugReportSimulator } from "@/simulators/nvidiaBugReportSimulator";
import { ClusterKitSimulator } from "@/simulators/clusterKitSimulator";
import { NeMoSimulator } from "@/simulators/nemoSimulator";
import { useSimulationStore } from "@/store/simulationStore";
import { scenarioContextManager } from "@/store/scenarioContext";
import { ScenarioValidator } from "@/utils/scenarioValidator";
import { parse as parseCommand } from "@/utils/commandParser";
import { commandTracker } from "@/utils/commandValidator";
import { CommandRouter } from "@/cli/commandRouter";
import {
  handleInteractiveShellInput,
  shouldEnterInteractiveMode,
  type ShellState,
} from "@/utils/interactiveShellHandler";
import { TERMINAL_OPTIONS, WELCOME_MESSAGE } from "@/constants/terminalConfig";
import { handleKeyboardInput } from "@/utils/terminalKeyboardHandler";
import { useLabFeedback } from "@/hooks/useLabFeedback";
import { HintManager } from "@/utils/hintManager";
import { getDidYouMeanMessage } from "@/utils/commandSuggestions";
import { applyPipeFilters, hasPipes } from "@/utils/pipeHandler";

// Helper function to format practice exercises
function formatPracticeExercises(
  exercises: Array<{
    id: string;
    prompt: string;
    expectedCommand: string;
    hints: string[];
    difficulty: string;
    category: string;
    relatedCommand: string;
  }>,
): string {
  if (exercises.length === 0) {
    return "No exercises available.";
  }

  let output =
    "\x1b[1;36m═══════════════════════════════════════════════════════════════\x1b[0m\n";
  output += "\x1b[1;33m                    COMMAND PRACTICE EXERCISES\x1b[0m\n";
  output +=
    "\x1b[1;36m═══════════════════════════════════════════════════════════════\x1b[0m\n\n";

  exercises.forEach((exercise, index) => {
    const difficultyColor =
      exercise.difficulty === "beginner"
        ? "32"
        : exercise.difficulty === "intermediate"
          ? "33"
          : "31";

    output += `\x1b[1;37m[Exercise ${index + 1}]\x1b[0m \x1b[${difficultyColor}m(${exercise.difficulty})\x1b[0m\n`;
    output += `\x1b[1;34mCategory:\x1b[0m ${exercise.category}\n`;
    output += `\x1b[1;34mRelated Command:\x1b[0m ${exercise.relatedCommand}\n\n`;
    output += `\x1b[1;37mTask:\x1b[0m ${exercise.prompt}\n\n`;
    output += `\x1b[1;33mHints:\x1b[0m\n`;
    exercise.hints.forEach((hint, i) => {
      output += `  ${i + 1}. ${hint}\n`;
    });
    output += `\n\x1b[2mExpected: ${exercise.expectedCommand}\x1b[0m\n`;
    output +=
      "\n\x1b[1;36m───────────────────────────────────────────────────────────────\x1b[0m\n\n";
  });

  output +=
    "\x1b[2mUsage: practice [random|beginner|intermediate|advanced|category <cat>|<command>]\x1b[0m\n";

  return output;
}

interface TerminalProps {
  className?: string;
}

export const Terminal: React.FC<TerminalProps> = ({ className = "" }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const [, setCurrentCommand] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const commandHistoryRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const [isTerminalReady, setIsTerminalReady] = useState(false);
  const [shellState, setShellState] = useState<ShellState>({
    mode: "bash",
    prompt: "",
  });
  const selectedNode = useSimulationStore((state) => state.selectedNode);
  const cluster = useSimulationStore((state) => state.cluster);
  const initialNode = selectedNode || cluster.nodes[0]?.id || "dgx-00";
  const [connectedNode, setConnectedNode] = useState<string>(initialNode);
  const commandRouterRef = useRef<CommandRouter | null>(null);

  // Ref to store executeCommand for external calls (e.g., auto-SSH on node selection)
  const executeCommandRef = useRef<((cmd: string) => Promise<void>) | null>(
    null,
  );

  // Command simulators
  const nvidiaSmiSimulator = useRef(new NvidiaSmiSimulator());
  const dcgmiSimulator = useRef(new DcgmiSimulator());
  const ipmitoolSimulator = useRef(new IpmitoolSimulator());
  const infinibandSimulator = useRef(new InfiniBandSimulator());
  const nvsmSimulator = useRef(new NvsmSimulator());
  const mellanoxSimulator = useRef(new MellanoxSimulator());
  const slurmSimulator = useRef(new SlurmSimulator());
  const containerSimulator = useRef(new ContainerSimulator());
  const bcmSimulator = useRef(new BcmSimulator());
  const cmshSimulator = useRef(new CmshSimulator());
  const basicSystemSimulator = useRef(new BasicSystemSimulator());
  const pciToolsSimulator = useRef(new PciToolsSimulator());
  const benchmarkSimulator = useRef(new BenchmarkSimulator());
  const storageSimulator = useRef(new StorageSimulator());
  const nvlinkAuditSimulator = useRef(new NvlinkAuditSimulator());
  const fabricManagerSimulator = useRef(new FabricManagerSimulator());
  const nvidiaBugReportSimulator = useRef(new NvidiaBugReportSimulator());
  const clusterKitSimulator = useRef(new ClusterKitSimulator());
  const nemoSimulator = useRef(new NeMoSimulator());

  const currentContext = useRef<CommandContext>({
    currentNode: selectedNode || cluster.nodes[0]?.id || "dgx-00",
    currentPath: "/root",
    environment: {
      PATH: "/usr/local/cuda/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
      HOME: "/root",
      USER: "root",
    },
    history: [],
  });

  // Auto-SSH when node selection changes from Dashboard
  useEffect(() => {
    // Only auto-SSH if:
    // 1. Terminal is ready with all refs available
    // 2. Selected node is different from currently connected node
    // 3. We're not in an interactive shell mode
    // Note: We check selectedNode !== connectedNode to allow first click to work
    // (previousNodeRef check removed - it was preventing first click from working)
    if (
      selectedNode &&
      isTerminalReady &&
      xtermRef.current &&
      executeCommandRef.current &&
      selectedNode !== connectedNode &&
      shellState.mode === "bash"
    ) {
      const term = xtermRef.current;
      const sshCommand = `ssh ${selectedNode}`;

      // Display the SSH command being typed
      term.write(sshCommand);
      term.write("\r\n");

      // Execute the SSH command - this will update connectedNode via setConnectedNode
      executeCommandRef.current(sshCommand);
    }
  }, [selectedNode, isTerminalReady, shellState.mode, connectedNode]);

  // Manage scenario context when scenario changes
  useEffect(() => {
    const store = useSimulationStore.getState();
    if (store.activeScenario) {
      // Create or get scenario context
      const context = scenarioContextManager.getOrCreateContext(
        store.activeScenario.id,
        cluster,
      );
      scenarioContextManager.setActiveContext(store.activeScenario.id);

      // Add to command context
      currentContext.current.scenarioContext = context;
      currentContext.current.cluster = context.getCluster();

      console.log(
        `Terminal: Using scenario context for ${store.activeScenario.id}`,
      );
    } else {
      // Clear scenario context when no active scenario
      scenarioContextManager.setActiveContext(null);
      currentContext.current.scenarioContext = undefined;
      currentContext.current.cluster = cluster;

      console.log("Terminal: Cleared scenario context");
    }
  }, [cluster]);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm(TERMINAL_OPTIONS);

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(terminalRef.current);

    // Safe fit function that checks container dimensions first
    const safeFit = () => {
      if (terminalRef.current) {
        const { clientWidth, clientHeight } = terminalRef.current;
        // Only fit if container has valid dimensions
        if (clientWidth > 0 && clientHeight > 0) {
          try {
            fitAddon.fit();
          } catch (e) {
            // Ignore fit errors during layout transitions
          }
        }
      }
    };

    // Fit terminal to container size (delayed to allow layout to settle)
    requestAnimationFrame(safeFit);

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      safeFit();
    });
    resizeObserver.observe(terminalRef.current);

    xtermRef.current = term;
    setIsTerminalReady(true);

    // Display welcome message
    term.write(WELCOME_MESSAGE);

    const prompt = () => {
      if (shellState.mode === "nvsm") {
        // Use NVSM's current prompt
        term.write(`\x1b[36m${shellState.prompt || "nvsm> "}\x1b[0m`);
      } else if (shellState.mode === "cmsh") {
        term.write(
          `\x1b[36m${shellState.prompt || "[root@dgx-headnode]% "}\x1b[0m`,
        );
      } else {
        // Normal bash prompt
        const node = currentContext.current.currentNode;
        term.write(`\x1b[1;32mroot@${node}\x1b[0m:\x1b[1;34m~\x1b[0m# `);
      }
    };

    prompt();

    // Helper function to render progress bar
    const renderProgressBar = (progress: number): string => {
      const width = 40;
      const filled = Math.round((progress / 100) * width);
      const empty = width - filled;
      const bar = "█".repeat(filled) + "░".repeat(empty);
      return `\x1b[36mProgress: [${bar}] ${progress}%\x1b[0m`;
    };

    const commandRouter = new CommandRouter();
    commandRouterRef.current = commandRouter;

    const handleHistoryChange = (index: number) => {
      setHistoryIndex(index);
      historyIndexRef.current = index;
    };

    const appendCommandToHistory = (cmdLine: string) => {
      setCommandHistory((prev) => {
        const nextHistory = [...prev, cmdLine];
        commandHistoryRef.current = nextHistory;
        return nextHistory;
      });

      handleHistoryChange(-1);
    };

    commandRouter.register("help", async (cmdLine) => {
      const args = cmdLine.trim().split(/\s+/).slice(1);
      try {
        const {
          getCommandDefinitionRegistry,
          formatCommandHelp,
          formatCommandList,
        } = await import("@/cli");
        const registry = await getCommandDefinitionRegistry();

        if (args.length > 0) {
          const commandName = args[0];
          const def = registry.getDefinition(commandName);
          if (def) {
            return { output: formatCommandHelp(def), exitCode: 0 };
          }

          return {
            output: `\x1b[33mNo help available for '\x1b[36m${commandName}\x1b[33m'.\x1b[0m\n\nType \x1b[36mhelp\x1b[0m to see all available commands.`,
            exitCode: 1,
          };
        }

        return { output: formatCommandList(registry.getAllDefinitions()), exitCode: 0 };
      } catch (error) {
        return {
          output: `Error loading command information: ${error instanceof Error ? error.message : "Unknown error"}`,
          exitCode: 1,
        };
      }
    });

    commandRouter.register("explain", async (cmdLine) => {
      const args = cmdLine.trim().split(/\s+/).slice(1);
      if (args.length === 0) {
        return {
          output:
            "\x1b[33mUsage:\x1b[0m explain <command>\n\nGet detailed information about a specific command.\n\n\x1b[1mExamples:\x1b[0m\n  \x1b[36mexplain nvidia-smi\x1b[0m\n  \x1b[36mexplain dcgmi\x1b[0m\n  \x1b[36mexplain ipmitool\x1b[0m",
          exitCode: 1,
        };
      }

      const commandName = args[0];
      try {
        const { getCommandDefinitionRegistry, formatCommandHelp } =
          await import("@/cli");
        const registry = await getCommandDefinitionRegistry();
        const def = registry.getDefinition(commandName);

        if (def) {
          return { output: formatCommandHelp(def), exitCode: 0 };
        }

        let output = `\x1b[33mNo information available for '\x1b[36m${commandName}\x1b[33m'.\x1b[0m`;
        const suggestion = getDidYouMeanMessage(commandName);
        if (suggestion) {
          output += "\n\n" + suggestion;
        }
        return { output, exitCode: 1 };
      } catch (error) {
        return {
          output: `Error loading command information: ${error instanceof Error ? error.message : "Unknown error"}`,
          exitCode: 1,
        };
      }
    });

    commandRouter.register("explain-json", async (cmdLine) => {
      const args = cmdLine.trim().split(/\s+/).slice(1);
      if (args.length === 0) {
        return {
          output:
            "Usage: explain-json <command>\n\nProvides detailed command information from JSON definitions.\nIncludes usage patterns, exit codes, error resolutions, and state interactions.\n\nExample: explain-json nvidia-smi",
          exitCode: 1,
        };
      }

      const commandName = args[0];
      try {
        const { getCommandDefinitionRegistry, generateExplainOutput } =
          await import("@/cli");
        const registry = await getCommandDefinitionRegistry();
        const output = await generateExplainOutput(commandName, registry, {
          includeErrors: true,
          includeExamples: true,
          includePermissions: true,
        });
        return { output, exitCode: 0 };
      } catch (error) {
        return {
          output: `Error loading command information: ${error instanceof Error ? error.message : "Unknown error"}`,
          exitCode: 1,
        };
      }
    });

    commandRouter.register("practice", async (cmdLine) => {
      const args = cmdLine.trim().split(/\s+/).slice(1);

      try {
        const { getCommandDefinitionRegistry, CommandExerciseGenerator } =
          await import("@/cli");
        const registry = await getCommandDefinitionRegistry();
        const generator = new CommandExerciseGenerator(registry);

        const subcommand = args[0];

        if (!subcommand || subcommand === "random") {
          const exercises = generator.getRandomExercises(3);
          return { output: formatPracticeExercises(exercises), exitCode: 0 };
        }

        if (
          subcommand === "beginner" ||
          subcommand === "intermediate" ||
          subcommand === "advanced"
        ) {
          const exercises = generator.generateByDifficulty(subcommand, 3);
          return { output: formatPracticeExercises(exercises), exitCode: 0 };
        }

        if (subcommand === "category") {
          const category = args[1];
          if (!category) {
            return {
              output:
                "Usage: practice category <category>\n\nAvailable categories: gpu_management, diagnostics, cluster_management, networking, containers, storage",
              exitCode: 1,
            };
          }
          const exercises = generator.generateForCategory(category, 3);
          return { output: formatPracticeExercises(exercises), exitCode: 0 };
        }

        const exercises = generator.generateForCommand(subcommand);
        if (exercises.length === 0) {
          return {
            output:
              "No exercises found for command: " +
              subcommand +
              "\n\nTry: practice random, practice beginner, or practice category gpu_management",
            exitCode: 1,
          };
        }
        return {
          output: formatPracticeExercises(exercises.slice(0, 3)),
          exitCode: 0,
        };
      } catch (error) {
        return {
          output: `Error generating exercises: ${error instanceof Error ? error.message : "Unknown error"}`,
          exitCode: 1,
        };
      }
    });

    commandRouter.register("clear", async () => {
      term.clear();
      return { output: "", exitCode: 0 };
    });

    commandRouter.register("ssh", async (cmdLine) => {
      const args = cmdLine.trim().split(/\s+/).slice(1);
      const store = useSimulationStore.getState();
      const { cluster: currentCluster } = store;
      if (args.length === 0) {
        return {
          output:
            "\x1b[33mUsage: ssh <hostname>\x1b[0m\n\nAvailable nodes:\n" +
            currentCluster.nodes
              .map((node) => `  \x1b[36m${node.id}\x1b[0m - ${node.systemType}`)
              .join("\n"),
          exitCode: 1,
        };
      }

      const targetNode = args[0];
      const nodeExists = currentCluster.nodes.some(
        (node) => node.id === targetNode,
      );

      if (!nodeExists) {
        return {
          output: `\x1b[31mssh: Could not resolve hostname ${targetNode}: Name or service not known\x1b[0m`,
          exitCode: 1,
        };
      }

      if (targetNode === currentContext.current.currentNode) {
        return {
          output: `\x1b[33mAlready connected to ${targetNode}\x1b[0m`,
          exitCode: 0,
        };
      }

      const oldNode = currentContext.current.currentNode;
      currentContext.current.currentNode = targetNode;
      setConnectedNode(targetNode);
      useSimulationStore.getState().selectNode(targetNode);

      const targetIndex =
        currentCluster.nodes.findIndex((node) => node.id === targetNode) + 1;
      return {
        output:
          `\x1b[32mConnecting to ${targetNode}...\x1b[0m\n` +
          `\x1b[90mThe authenticity of host '${targetNode} (10.0.0.${targetIndex})' was established.\x1b[0m\n` +
          `\x1b[32mConnection established.\x1b[0m\n` +
          `\x1b[90mLast login: ${new Date().toLocaleString()} from ${oldNode}\x1b[0m`,
        exitCode: 0,
      };
    });

    commandRouter.register("hint", async () => {
      const store = useSimulationStore.getState();
      const { activeScenario, scenarioProgress, revealHint } = store;

      if (!activeScenario) {
        return {
          output:
            "\x1b[33mNo active lab scenario. Hints are only available during lab exercises.\x1b[0m\n\nStart a lab from the sidebar to access hints.",
          exitCode: 1,
        };
      }

      const progress = scenarioProgress[activeScenario.id];
      if (!progress) {
        return {
          output: "\x1b[31mError: Could not load scenario progress.\x1b[0m",
          exitCode: 1,
        };
      }

      const currentStep = activeScenario.steps[progress.currentStepIndex];
      const stepProgress = progress.steps[progress.currentStepIndex];

      if (!currentStep || !stepProgress) {
        return {
          output: "\x1b[31mError: Could not determine current step.\x1b[0m",
          exitCode: 1,
        };
      }

      const hintEvaluation = HintManager.getAvailableHints(
        currentStep,
        stepProgress,
      );

      if (hintEvaluation.nextHint) {
        const hint = hintEvaluation.nextHint;
        revealHint(activeScenario.id, currentStep.id, hint.id);
        const formattedHint = HintManager.formatHint(
          hint,
          hintEvaluation.revealedCount + 1,
          hintEvaluation.totalCount,
        );

        return { output: formattedHint, exitCode: 0 };
      }

      return {
        output: HintManager.getNoHintMessage(hintEvaluation),
        exitCode: 0,
      };
    });

    commandRouter.register("nvidia-smi", (cmdLine, context) => {
      const parsed = parseCommand(cmdLine);
      return nvidiaSmiSimulator.current.execute(parsed, context);
    });

    commandRouter.register("dcgmi", (cmdLine, context) => {
      const parsed = parseCommand(cmdLine);
      return dcgmiSimulator.current.execute(parsed, context);
    });

    commandRouter.register("nvsm", (cmdLine, context) => {
      const parsed = parseCommand(cmdLine);
      const result = nvsmSimulator.current.execute(parsed, context);
      if (shouldEnterInteractiveMode(result, parsed.subcommands.length === 0)) {
        setShellState({ mode: "nvsm", prompt: result.prompt || "" });
      }
      return result;
    });

    commandRouter.register("ipmitool", (cmdLine, context) => {
      const parsed = parseCommand(cmdLine);
      return ipmitoolSimulator.current.execute(parsed, context);
    });

    commandRouter.registerMany(
      [
        "ibstat",
        "ibportstate",
        "ibporterrors",
        "iblinkinfo",
        "perfquery",
        "ibdiagnet",
        "ibdev2netdev",
        "ibnetdiscover",
      ],
      (cmdLine, context) => {
        const parsed = parseCommand(cmdLine);
        switch (parsed.command) {
          case "ibstat":
            return infinibandSimulator.current.executeIbstat(parsed, context);
          case "ibportstate":
            return infinibandSimulator.current.executeIbportstate(
              parsed,
              context,
            );
          case "ibporterrors":
            return infinibandSimulator.current.executeIbporterrors(
              parsed,
              context,
            );
          case "iblinkinfo":
            return infinibandSimulator.current.executeIblinkinfo(
              parsed,
              context,
            );
          case "perfquery":
            return infinibandSimulator.current.executePerfquery(
              parsed,
              context,
            );
          case "ibdiagnet":
            return infinibandSimulator.current.executeIbdiagnet(parsed, context);
          case "ibdev2netdev":
            return infinibandSimulator.current.executeIbdev2netdev(
              parsed,
              context,
            );
          case "ibnetdiscover":
            return infinibandSimulator.current.executeIbnetdiscover(
              parsed,
              context,
            );
          default:
            return { output: `\x1b[31mInternal router error: command '${parsed.command}' not implemented.\x1b[0m`, exitCode: 1 };
        }
      },
    );

    commandRouter.registerMany(
      ["sinfo", "squeue", "scontrol", "sbatch", "srun", "scancel", "sacct"],
      (cmdLine, context) => {
        const parsed = parseCommand(cmdLine);
        switch (parsed.command) {
          case "sinfo":
            return slurmSimulator.current.executeSinfo(parsed, context);
          case "squeue":
            return slurmSimulator.current.executeSqueue(parsed, context);
          case "scontrol":
            return slurmSimulator.current.executeScontrol(parsed, context);
          case "sbatch":
            return slurmSimulator.current.executeSbatch(parsed, context);
          case "srun":
            return slurmSimulator.current.executeSrun(parsed, context);
          case "scancel":
            return slurmSimulator.current.executeScancel(parsed, context);
          case "sacct":
            return slurmSimulator.current.executeSacct(parsed, context);
          default:
            return { output: "", exitCode: 0 };
        }
      },
    );

    commandRouter.registerMany(["docker", "ngc", "enroot"], (cmdLine, context) => {
      const parsed = parseCommand(cmdLine);
      return containerSimulator.current.execute(parsed, context);
    });

    commandRouter.registerMany(
      ["mst", "mlxconfig", "mlxlink", "mlxcables", "mlxup", "mlxfwmanager"],
      (cmdLine, context) => {
        const parsed = parseCommand(cmdLine);
        return mellanoxSimulator.current.execute(parsed, context);
      },
    );

    commandRouter.registerMany(["bcm", "bcm-node", "crm"], (cmdLine, context) => {
      const parsed = parseCommand(cmdLine);
      return bcmSimulator.current.execute(parsed, context);
    });

    commandRouter.register("cmsh", (cmdLine, context) => {
      const parsed = parseCommand(cmdLine);
      const result = cmshSimulator.current.execute(parsed, context);
      if (shouldEnterInteractiveMode(result, parsed.subcommands.length === 0)) {
        setShellState({ mode: "cmsh", prompt: result.prompt || "" });
      }
      return result;
    });

    commandRouter.registerMany(
      [
        "lscpu",
        "free",
        "dmidecode",
        "dmesg",
        "systemctl",
        "hostnamectl",
        "timedatectl",
        "lsmod",
        "modinfo",
        "top",
        "ps",
        "numactl",
        "uptime",
        "uname",
        "hostname",
        "sensors",
      ],
      (cmdLine, context) => {
        const parsed = parseCommand(cmdLine);
        return basicSystemSimulator.current.execute(parsed, context);
      },
    );

    commandRouter.registerMany(["lspci", "journalctl"], (cmdLine, context) => {
      const parsed = parseCommand(cmdLine);
      return pciToolsSimulator.current.execute(parsed, context);
    });

    commandRouter.register("nvlink-audit", (cmdLine, context) => {
      const parsed = parseCommand(cmdLine);
      return nvlinkAuditSimulator.current.execute(parsed, context);
    });

    commandRouter.register("nv-fabricmanager", (cmdLine, context) => {
      const parsed = parseCommand(cmdLine);
      return fabricManagerSimulator.current.execute(parsed, context);
    });

    commandRouter.register("nvidia-bug-report.sh", (cmdLine, context) => {
      const parsed = parseCommand(cmdLine);
      return nvidiaBugReportSimulator.current.execute(parsed, context);
    });

    commandRouter.registerMany(
      ["hpl", "nccl-test", "gpu-burn"],
      (cmdLine, context) => {
        const parsed = parseCommand(cmdLine);
        return benchmarkSimulator.current.execute(parsed, context);
      },
    );

    commandRouter.registerMany(["df", "mount", "lfs"], (cmdLine, context) => {
      const parsed = parseCommand(cmdLine);
      return storageSimulator.current.execute(parsed, context);
    });

    commandRouter.register("clusterkit", (cmdLine, context) => {
      const parsed = parseCommand(cmdLine);
      return clusterKitSimulator.current.execute(parsed, context);
    });

    commandRouter.register("nemo", (cmdLine, context) => {
      const parsed = parseCommand(cmdLine);
      return nemoSimulator.current.execute(parsed, context);
    });

    let currentLine = "";

    const executeCommand = async (cmdLine: string) => {
      if (!cmdLine.trim()) {
        prompt();
        return;
      }

      // Add to history
      appendCommandToHistory(cmdLine);
      currentContext.current.history.push(cmdLine);

      // Parse command
      const parts = cmdLine.trim().split(/\s+/);
      const command = parts[0];

      let result: import("@/types/commands").CommandResult = {
        output: "",
        exitCode: 0,
      };

      // INTERACTIVE SHELL MODE INTERCEPT
      // When in an interactive shell (nvsm, cmsh), route commands through that shell
      if (shellState.mode === "nvsm") {
        const newState = handleInteractiveShellInput(
          nvsmSimulator.current,
          cmdLine,
          currentContext.current,
          term,
          shellState,
          prompt,
        );
        setShellState(newState);
        return;
      }

      // cmsh interactive mode intercept
      if (shellState.mode === "cmsh") {
        const newState = handleInteractiveShellInput(
          cmshSimulator.current,
          cmdLine,
          currentContext.current,
          term,
          shellState,
          prompt,
        );
        setShellState(newState);
        return;
      }

      try {
        const handler = commandRouterRef.current?.get(command);
        if (handler) {
          result = await handler(cmdLine, currentContext.current);
        } else {
          result.output = `\x1b[31mbash: ${command}: command not found\x1b[0m`;
          result.exitCode = 127;

          const suggestion = getDidYouMeanMessage(command);
          if (suggestion) {
            result.output += "\n\n" + suggestion;
          } else {
            result.output +=
              "\n\nType \x1b[36mhelp\x1b[0m to see available commands.";
          }
        }

        // Apply pipe filters (grep, tail, head, etc.) to command output
        if (result.output && hasPipes(cmdLine)) {
          result.output = applyPipeFilters(result.output, cmdLine);
        }

        if (result.output) {
          term.writeln("\n" + result.output);
        }

        // Track command execution for validation
        commandTracker.recordCommand(cmdLine, result.output, result.exitCode);

        // Scenario Validation - Check for active scenario and validate command
        const store = useSimulationStore.getState();
        const {
          activeScenario,
          scenarioProgress,
          recordCommand,
          validateStep,
          validationConfig,
        } = store;

        if (
          activeScenario &&
          scenarioProgress[activeScenario.id] &&
          validationConfig.enabled
        ) {
          const progress = scenarioProgress[activeScenario.id];
          const currentStepIndex = progress.currentStepIndex;
          const currentStep = activeScenario.steps[currentStepIndex];
          const stepProgress = progress.steps[currentStepIndex];

          if (currentStep && stepProgress && !stepProgress.completed) {
            // Record the command for hint tracking (except special commands)
            if (
              command !== "hint" &&
              command !== "clear" &&
              command !== "help" &&
              command !== "explain"
            ) {
              recordCommand(activeScenario.id, currentStep.id, cmdLine);
            }

            // Only validate if command succeeded or if we want to provide feedback on failures
            const commandSucceeded = result.exitCode === 0;
            const commandFound = result.exitCode !== 127; // 127 = command not found

            // Special case: GPU reset commands should be validated even if they fail
            // This is because XID 79 errors make GPU reset fail, but attempting it is correct
            const isGpuResetAttempt =
              cmdLine.includes("--gpu-reset") ||
              (cmdLine.includes("nvidia-smi") && cmdLine.includes("-r"));

            if (
              (commandSucceeded && commandFound) ||
              (commandFound && isGpuResetAttempt)
            ) {
              // Validate using ScenarioValidator
              const validationResult = ScenarioValidator.validateCommand(
                cmdLine,
                result.output,
                currentStep,
                currentContext.current,
                stepProgress.commandsExecuted,
              );

              // Store validation result in state
              validateStep(activeScenario.id, currentStep.id, validationResult);

              // Show validation feedback if enabled
              if (
                validationConfig.immediatefeedback &&
                validationResult.feedback
              ) {
                term.writeln("");
                term.writeln(validationResult.feedback);
              }

              // Show progress bar if enabled and not yet complete
              if (
                validationConfig.showProgress &&
                !validationResult.passed &&
                validationResult.progress > 0
              ) {
                const progressBar = renderProgressBar(
                  validationResult.progress,
                );
                term.writeln(progressBar);
              }
            }
          }
        }
      } catch (error) {
        term.writeln(`\n\x1b[31mError executing command: ${error}\x1b[0m`);
      }

      prompt();
    };

    // Store executeCommand ref for external access (auto-SSH on node selection)
    executeCommandRef.current = executeCommand;

    term.onData((data) => {
      const result = handleKeyboardInput(data, {
        term,
        commandHistory: commandHistoryRef.current,
        historyIndex: historyIndexRef.current,
        currentLine,
        currentNode: currentContext.current.currentNode,
        onExecute: executeCommand,
        onHistoryChange: handleHistoryChange,
        onLineChange: setCurrentCommand,
        onPrompt: prompt,
      });

      if (result) {
        currentLine = result.currentLine;
        setCurrentCommand(result.currentLine);
        handleHistoryChange(result.historyIndex);
      }
    });

    return () => {
      resizeObserver.disconnect();
      term.dispose();
      setIsTerminalReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Terminal initialization runs once on mount

  // Lab Feedback - display messages when labs start/complete
  useLabFeedback(xtermRef.current, isTerminalReady, selectedNode || "dgx-00");

  return (
    <div data-testid="terminal" className={`terminal-container ${className}`}>
      <div className="terminal-node-indicator px-3 py-1.5 bg-gray-800 border-b border-gray-700 text-xs font-mono flex items-center gap-2">
        <span className="text-gray-400">Terminal connected to:</span>
        <span className="text-green-400 font-semibold">{connectedNode}</span>
      </div>
      <div ref={terminalRef} className="terminal-content" />
    </div>
  );
};
