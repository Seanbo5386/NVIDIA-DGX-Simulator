// src/cli/__tests__/explainCommand.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { generateExplainOutput } from "../explainCommand";
import { CommandDefinitionRegistry } from "../CommandDefinitionRegistry";

describe("explainCommand", () => {
  let registry: CommandDefinitionRegistry;

  beforeAll(async () => {
    registry = new CommandDefinitionRegistry();
    await registry.initialize();
  });

  it("should explain nvidia-smi with rich details", async () => {
    const output = await generateExplainOutput("nvidia-smi", registry);

    expect(output).toContain("nvidia-smi");
    expect(output).toContain("NVIDIA");
    expect(output).toContain("Examples:");
  });

  it("should explain nvidia-smi -q flag", async () => {
    const output = await generateExplainOutput("nvidia-smi -q", registry);

    expect(output).toContain("-q");
    expect(output).toContain("query");
  });

  it("should explain squeue with Slurm details", async () => {
    const output = await generateExplainOutput("squeue", registry);

    expect(output).toContain("squeue");
    expect(output).toContain("Slurm");
  });

  it("should show error messages section when available", async () => {
    const output = await generateExplainOutput("nvidia-smi", registry, {
      includeErrors: true,
    });

    expect(output).toContain("Common Errors:");
  });

  it("should handle unknown commands gracefully", async () => {
    const output = await generateExplainOutput("nonexistent", registry);

    expect(output).toContain("not found");
  });

  it("should show subcommands when available", async () => {
    const output = await generateExplainOutput("nvidia-smi", registry);

    expect(output).toContain("Subcommands:");
    expect(output).toContain("topo"); // First subcommand shown
  });

  it("should show related commands when available", async () => {
    const output = await generateExplainOutput("nvidia-smi", registry);

    expect(output).toContain("Related Commands:");
  });
});
