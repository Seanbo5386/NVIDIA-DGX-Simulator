// src/cli/__tests__/CommandDefinitionLoader.test.ts
import { describe, it, expect } from "vitest";
import { CommandDefinitionLoader } from "../CommandDefinitionLoader";

describe("CommandDefinitionLoader", () => {
  it("should load nvidia-smi definition", async () => {
    const loader = new CommandDefinitionLoader();
    const def = await loader.load("nvidia-smi");

    expect(def).toBeDefined();
    expect(def!.command).toBe("nvidia-smi");
    expect(def!.category).toBe("gpu_management");
  });

  it("should return undefined for unknown command", async () => {
    const loader = new CommandDefinitionLoader();
    const def = await loader.load("nonexistent-command");

    expect(def).toBeUndefined();
  });

  it("should load all definitions", async () => {
    const loader = new CommandDefinitionLoader();
    const all = await loader.loadAll();

    expect(all.size).toBeGreaterThan(50);
    expect(all.has("nvidia-smi")).toBe(true);
    expect(all.has("squeue")).toBe(true);
    expect(all.has("ibstat")).toBe(true);
  });

  it("should get commands by category", async () => {
    const loader = new CommandDefinitionLoader();
    await loader.loadAll();

    const gpuCommands = loader.getByCategory("gpu_management");
    expect(gpuCommands.length).toBeGreaterThan(0);
    expect(gpuCommands.some((c) => c.command === "nvidia-smi")).toBe(true);
  });
});
