import { describe, it, expect } from "vitest";
import { CommandRouter, type CommandHandler } from "../commandRouter";

describe("CommandRouter", () => {
  it("should register and resolve a handler", () => {
    const router = new CommandRouter();
    const handler: CommandHandler = () => ({ output: "ok", exitCode: 0 });

    router.register("nvidia-smi", handler);

    expect(router.resolve("nvidia-smi")).toBe(handler);
  });

  it("should return null for unregistered commands", () => {
    const router = new CommandRouter();

    expect(router.resolve("unknown")).toBeNull();
  });

  it("should registerMany handlers", () => {
    const router = new CommandRouter();
    const handler: CommandHandler = () => ({
      output: "container",
      exitCode: 0,
    });

    router.registerMany(["docker", "enroot", "ngc"], handler);

    expect(router.resolve("docker")).toBe(handler);
    expect(router.resolve("enroot")).toBe(handler);
    expect(router.resolve("ngc")).toBe(handler);
  });

  it("should report has() correctly", () => {
    const router = new CommandRouter();
    const handler: CommandHandler = () => ({ output: "", exitCode: 0 });

    router.register("help", handler);

    expect(router.has("help")).toBe(true);
    expect(router.has("missing")).toBe(false);
  });

  it("should allow overriding a handler", () => {
    const router = new CommandRouter();
    const first: CommandHandler = () => ({ output: "first", exitCode: 0 });
    const second: CommandHandler = () => ({ output: "second", exitCode: 0 });

    router.register("cmd", first);
    router.register("cmd", second);

    expect(router.resolve("cmd")).toBe(second);
  });
});
