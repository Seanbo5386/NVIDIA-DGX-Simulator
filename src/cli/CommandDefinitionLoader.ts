import type { CommandDefinition, CommandCategory } from "./types";

// Import all JSON files from data/output using Vite's glob import
const commandModules = import.meta.glob("../data/output/**/*.json", {
  eager: true,
});

/**
 * Loads command definitions from JSON files in src/data/output/
 *
 * This loader uses Vite's glob import to statically include all JSON files
 * at build time, avoiding runtime file system access.
 */
export class CommandDefinitionLoader {
  private definitions: Map<string, CommandDefinition> = new Map();
  private loaded = false;

  /**
   * Load a single command definition by name
   */
  async load(commandName: string): Promise<CommandDefinition | undefined> {
    if (!this.loaded) {
      await this.loadAll();
    }
    return this.definitions.get(commandName);
  }

  /**
   * Load all command definitions from JSON files
   */
  async loadAll(): Promise<Map<string, CommandDefinition>> {
    if (this.loaded) {
      return this.definitions;
    }

    for (const [path, module] of Object.entries(commandModules)) {
      // Skip schema.json and state_domains.json
      if (path.includes("schema.json") || path.includes("state_domains.json")) {
        continue;
      }

      const def =
        (module as { default?: CommandDefinition }).default ||
        (module as CommandDefinition);

      if (def && typeof def === "object" && "command" in def) {
        this.definitions.set(def.command, def);
      }
    }

    this.loaded = true;
    return this.definitions;
  }

  /**
   * Get all commands in a specific category
   */
  getByCategory(category: CommandCategory): CommandDefinition[] {
    return Array.from(this.definitions.values()).filter(
      (def) => def.category === category,
    );
  }

  /**
   * Get all loaded command names
   */
  getCommandNames(): string[] {
    return Array.from(this.definitions.keys());
  }

  /**
   * Check if a command definition exists
   */
  has(commandName: string): boolean {
    return this.definitions.has(commandName);
  }

  /**
   * Get count of loaded definitions
   */
  get count(): number {
    return this.definitions.size;
  }
}

// Singleton instance
let loaderInstance: CommandDefinitionLoader | null = null;

export function getCommandDefinitionLoader(): CommandDefinitionLoader {
  if (!loaderInstance) {
    loaderInstance = new CommandDefinitionLoader();
  }
  return loaderInstance;
}
