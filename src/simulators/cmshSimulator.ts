import type {
  CommandResult,
  CommandContext,
  ParsedCommand,
  SimulatorMetadata,
} from "@/types/commands";
import { BaseSimulator } from "./BaseSimulator";

/**
 * cmsh Mode State
 * Per spec Section 3.1: Mode-based prompt system
 * Prompt: [<user>@<headnode>-><mode>[<object>]]%
 */
interface CmshState {
  isInteractive: boolean;
  currentMode: string; // device, category, softwareimage, partition, etc.
  currentObject: string; // Selected object within mode (e.g., dgx-node01)
  user: string;
  headnode: string;
}

/**
 * cmsh Simulator
 * Implements Cluster Management Shell per spec Section 3
 *
 * Supports:
 * - Mode-based navigation (device, category, softwareimage)
 * - Dynamic prompt updates
 * - Device listing with table format
 * - JSON output with -d {} flag
 */
export class CmshSimulator extends BaseSimulator {
  private state: CmshState = {
    isInteractive: false,
    currentMode: "",
    currentObject: "",
    user: "root",
    headnode: "dgx-headnode",
  };

  getMetadata(): SimulatorMetadata {
    return {
      name: "cmsh",
      version: "10.3.0",
      description: "Cluster Management Shell",
      commands: [
        {
          name: "cmsh",
          description: "Cluster Management Shell interactive mode",
          usage: "cmsh [OPTIONS]",
          examples: ["cmsh", "cmsh --help"],
        },
      ],
    };
  }

  /**
   * Get current prompt based on mode state
   * Per spec Section 3.1: [<user>@<headnode>-><mode>[<object>]]%
   */
  getPrompt(): string {
    if (!this.state.currentMode) {
      return `[${this.state.user}@${this.state.headnode}]% `;
    }
    if (this.state.currentObject) {
      return `[${this.state.user}@${this.state.headnode}->${this.state.currentMode}[${this.state.currentObject}]]% `;
    }
    return `[${this.state.user}@${this.state.headnode}->${this.state.currentMode}]% `;
  }

  /**
   * Check if in interactive mode
   */
  isInteractive(): boolean {
    return this.state.isInteractive;
  }

  /**
   * Enter interactive cmsh mode
   */
  enterInteractiveMode(): CommandResult {
    this.state.isInteractive = true;
    this.state.currentMode = "";
    this.state.currentObject = "";
    return {
      output:
        '\nCluster Management Shell (cmsh)\nType "help" for available commands.\n',
      exitCode: 0,
      prompt: this.getPrompt(),
    };
  }

  /**
   * Exit interactive mode
   */
  exitInteractiveMode(): CommandResult {
    this.state.isInteractive = false;
    this.state.currentMode = "";
    this.state.currentObject = "";
    return { output: "", exitCode: 0 };
  }

  /**
   * Get cluster nodes from context
   */
  private getNodes(context: CommandContext) {
    return this.resolveAllNodes(context);
  }

  /**
   * Execute command in interactive mode
   */
  executeInteractive(input: string, context: CommandContext): CommandResult {
    const parts = input.trim().split(/\s+/);
    const command = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    // Handle mode switches
    if (command === "device" && args.length === 0) {
      this.state.currentMode = "device";
      this.state.currentObject = "";
      return { output: "", exitCode: 0, prompt: this.getPrompt() };
    }

    if (command === "category" && args.length === 0) {
      this.state.currentMode = "category";
      this.state.currentObject = "";
      return { output: "", exitCode: 0, prompt: this.getPrompt() };
    }

    if (command === "softwareimage" && args.length === 0) {
      this.state.currentMode = "softwareimage";
      this.state.currentObject = "";
      return { output: "", exitCode: 0, prompt: this.getPrompt() };
    }

    if (command === "partition" && args.length === 0) {
      this.state.currentMode = "partition";
      this.state.currentObject = "";
      return { output: "", exitCode: 0, prompt: this.getPrompt() };
    }

    // Handle 'use' - select an object within current mode
    if (command === "use" && args[0]) {
      this.state.currentObject = args[0];
      return { output: "", exitCode: 0, prompt: this.getPrompt() };
    }

    // Handle 'list' - show objects in current mode
    if (command === "list") {
      return {
        output: this.handleList(args, context),
        exitCode: 0,
        prompt: this.getPrompt(),
      };
    }

    // Handle 'show' - show details of current object
    if (command === "show") {
      return {
        output: this.handleShow(context),
        exitCode: 0,
        prompt: this.getPrompt(),
      };
    }

    // Handle exit from mode
    if (command === "exit" || command === "quit") {
      if (this.state.currentMode) {
        this.state.currentMode = "";
        this.state.currentObject = "";
        return { output: "", exitCode: 0, prompt: this.getPrompt() };
      }
      return this.exitInteractiveMode();
    }

    // Handle help
    if (command === "help") {
      return {
        output: this.generateHelp(),
        exitCode: 0,
        prompt: this.getPrompt(),
      };
    }

    // Empty input
    if (!command) {
      return { output: "", exitCode: 0, prompt: this.getPrompt() };
    }

    // Unknown command
    return {
      output: `${command}: Command not found.`,
      exitCode: 1,
      prompt: this.getPrompt(),
    };
  }

  /**
   * Handle list command
   * Per spec Section 3.2: Device listings with table format
   */
  private handleList(args: string[], context: CommandContext): string {
    const nodes = this.getNodes(context);

    // Check for JSON output flag
    const jsonFlag = args.includes("-d") && args.includes("{}");

    // Note: -f flag for field filtering is parsed but not yet implemented

    if (this.state.currentMode === "device" || !this.state.currentMode) {
      if (jsonFlag) {
        // JSON output per spec Section 3.2
        const jsonData = nodes.map((node) => ({
          "Hostname (key)": node.hostname,
          IPAddress: `10.141.0.${parseInt(node.id.split("-")[1] || "1") + 1}`,
          Category: `dgx-${node.systemType.toLowerCase()}`,
        }));
        return JSON.stringify(jsonData, null, 2);
      }

      // Table output per spec Golden Output Reference - simple pipe-separated format
      let output =
        "Name (key)          | Network      | IP            | Mac                | Category\n";

      // Add headnode
      output += `dgx-headnode        | internalnet  | 10.141.0.1    | FA:16:3E:C4:28:1C  | headnode\n`;

      // Add compute nodes
      nodes.forEach((node, idx) => {
        const ip = `10.141.0.${idx + 2}`;
        const mac = `FA:16:3E:C4:28:${(0x1d + idx).toString(16).toUpperCase()}`;
        const category = `dgx-${node.systemType.toLowerCase()}`;
        output += `${node.hostname.padEnd(19)} | internalnet  | ${ip.padEnd(13)} | ${mac}  | ${category}\n`;
      });

      return output;
    }

    if (this.state.currentMode === "category") {
      let output = "Name (key)     | Nodes\n";
      output += "headnode       | 1\n";
      output += "dgx-h100       | 8\n";
      output += "dgx-gb200      | 0\n";
      return output;
    }

    if (this.state.currentMode === "softwareimage") {
      // Per spec Section 3.4
      let output =
        "Name (key)            | Path                            | Kernel version       | Nodes\n";
      output +=
        "baseos-image-v10      | /cm/images/baseos-image-v10     | 5.15.0-1035-nvidia   | 32\n";
      output +=
        "maintenance-image     | /cm/images/maintenance-image    | 5.15.0-1035-nvidia   | 0\n";
      return output;
    }

    if (this.state.currentMode === "partition") {
      let output = "Name (key)  | Nodes\n";
      output += "gpu         | 8\n";
      output += "debug       | 2\n";
      return output;
    }

    return "No objects in current context.";
  }

  /**
   * Handle show command
   * Per spec Section 3.3: Key-value alignment
   */
  private handleShow(context: CommandContext): string {
    if (this.state.currentMode === "category" && this.state.currentObject) {
      // Per spec Section 3.3 Golden Output Reference
      let output = "\nParameter                       Value\n";
      output +=
        "------------------------------- ----------------------------------------\n";
      output += `Name                            ${this.state.currentObject}\n`;
      output += "Software image                  baseos-image-v10\n";
      output += "Slurm client                    yes\n";
      output += "Slurm submit                    yes\n";
      output += "Assign to role                  default\n";
      return output;
    }

    if (this.state.currentMode === "device" && this.state.currentObject) {
      const nodes = this.getNodes(context);
      const node = nodes.find(
        (n) =>
          n.hostname === this.state.currentObject ||
          n.id === this.state.currentObject,
      );

      if (node) {
        let output = "\nParameter                       Value\n";
        output +=
          "------------------------------- ----------------------------------------\n";
        output += `Hostname                        ${node.hostname}\n`;
        output += `Category                        dgx-${node.systemType.toLowerCase()}\n`;
        output += `IP                              10.141.0.${parseInt(node.id.split("-")[1] || "1") + 1}\n`;
        output += `Status                          ${node.healthStatus === "OK" ? "UP" : "DOWN"}\n`;
        output += `GPU Count                       ${node.gpus.length}\n`;
        return output;
      }

      return `Error: Object '${this.state.currentObject}' not found.`;
    }

    if (!this.state.currentObject) {
      return 'Error: No object selected. Use "use <object>" first.';
    }

    return "No details available.";
  }

  /**
   * Generate help output
   */
  private generateHelp(): string {
    let output = "\nCluster Management Shell (cmsh) Commands\n\n";
    output += "Modes:\n";
    output += "  device         Enter device management mode\n";
    output += "  category       Enter category management mode\n";
    output += "  softwareimage  Enter software image mode\n";
    output += "  partition      Enter partition management mode\n\n";
    output += "Commands (within modes):\n";
    output += "  list           List objects in current mode\n";
    output += "  list -d {} -f <fields>  JSON output with field filter\n";
    output += "  use <object>   Select an object to work with\n";
    output += "  show           Show details of selected object\n";
    output += "  exit           Exit current mode or shell\n\n";
    output += "Examples:\n";
    output += "  device -> list -> use dgx-node01 -> show\n";
    return output;
  }

  /**
   * Main execute method - handles both interactive and non-interactive modes
   */
  execute(parsed: ParsedCommand, _context: CommandContext): CommandResult {
    // Handle --help flag
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      let output = "Cluster Management Shell (cmsh)\n\n";
      output += "Usage: cmsh [OPTIONS]\n\n";
      output += "Options:\n";
      output += "  -h, --help       Show this help message\n\n";
      output += 'Run "cmsh" without arguments to enter interactive mode.\n';
      return this.createSuccess(output);
    }

    // Handle --version flag
    if (this.hasAnyFlag(parsed, ["version", "v"])) {
      return this.handleVersion();
    }

    // No subcommands - enter interactive mode
    if (parsed.subcommands.length === 0) {
      return this.enterInteractiveMode();
    }

    // Direct command execution (non-interactive)
    const command = parsed.subcommands[0];

    if (
      command === "device" ||
      command === "category" ||
      command === "softwareimage"
    ) {
      // Set mode and execute subcommand
      this.state.currentMode = command;
      const remainingCommands = parsed.subcommands.slice(1).join(" ");
      const result = this.executeInteractive(remainingCommands, _context);
      this.state.currentMode = ""; // Reset mode after non-interactive execution
      return { output: result.output, exitCode: result.exitCode };
    }

    return this.createError(
      `cmsh: unknown command '${command}'. Run 'cmsh --help' for usage.`,
    );
  }
}
