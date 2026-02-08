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
