import type { StateStorage } from "zustand/middleware";

/**
 * Creates a Zustand-compatible StateStorage adapter that debounces writes.
 * Rapid sequential setItem calls within the delay window only produce one
 * actual localStorage write (the final value).
 *
 * @param delay - Debounce delay in milliseconds (default: 2000)
 */
export function createDebouncedStorage(delay = 2000): StateStorage {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  return {
    getItem: (name: string) => localStorage.getItem(name),
    setItem: (name: string, value: string) => {
      const existing = timers.get(name);
      if (existing) clearTimeout(existing);
      timers.set(
        name,
        setTimeout(() => {
          localStorage.setItem(name, value);
          timers.delete(name);
        }, delay),
      );
    },
    removeItem: (name: string) => {
      const existing = timers.get(name);
      if (existing) clearTimeout(existing);
      timers.delete(name);
      localStorage.removeItem(name);
    },
  };
}
