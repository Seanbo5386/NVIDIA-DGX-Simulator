import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createDebouncedStorage } from "../debouncedStorage";

describe("createDebouncedStorage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should read from localStorage immediately", () => {
    localStorage.setItem("test-key", "stored-value");
    const storage = createDebouncedStorage(500);
    expect(storage.getItem("test-key")).toBe("stored-value");
  });

  it("should not write to localStorage until delay elapses", () => {
    const storage = createDebouncedStorage(500);
    storage.setItem("test-key", "new-value");

    // Not yet written
    expect(localStorage.getItem("test-key")).toBeNull();

    // Advance past debounce
    vi.advanceTimersByTime(500);
    expect(localStorage.getItem("test-key")).toBe("new-value");
  });

  it("should only write the final value for rapid sequential writes", () => {
    const storage = createDebouncedStorage(500);
    const spy = vi.spyOn(Storage.prototype, "setItem");

    storage.setItem("test-key", "value-1");
    vi.advanceTimersByTime(100);
    storage.setItem("test-key", "value-2");
    vi.advanceTimersByTime(100);
    storage.setItem("test-key", "value-3");

    // Advance past debounce from last write
    vi.advanceTimersByTime(500);

    // Only one localStorage.setItem call with the final value
    const calls = spy.mock.calls.filter(([key]) => key === "test-key");
    expect(calls).toHaveLength(1);
    expect(calls[0][1]).toBe("value-3");
    expect(localStorage.getItem("test-key")).toBe("value-3");

    spy.mockRestore();
  });

  it("should remove from localStorage immediately", () => {
    localStorage.setItem("test-key", "existing");
    const storage = createDebouncedStorage(500);

    storage.removeItem("test-key");
    expect(localStorage.getItem("test-key")).toBeNull();
  });

  it("should cancel pending write when removeItem is called", () => {
    const storage = createDebouncedStorage(500);
    storage.setItem("test-key", "pending-value");

    // Remove before debounce fires
    storage.removeItem("test-key");
    vi.advanceTimersByTime(1000);

    expect(localStorage.getItem("test-key")).toBeNull();
  });

  it("should handle different keys independently", () => {
    const storage = createDebouncedStorage(500);

    storage.setItem("key-a", "value-a");
    storage.setItem("key-b", "value-b");
    vi.advanceTimersByTime(500);

    expect(localStorage.getItem("key-a")).toBe("value-a");
    expect(localStorage.getItem("key-b")).toBe("value-b");
  });
});
