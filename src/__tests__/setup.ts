import { beforeAll, afterEach, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Setup test environment
beforeAll(() => {
  // Any global setup
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Cleanup after all tests
afterAll(() => {
  // Any global cleanup
});

// Mock console methods to reduce noise in tests (optional)
globalThis.console = {
  ...console,
  // Uncomment to suppress logs during tests
  // log: vi.fn(),
  // debug: vi.fn(),
  // info: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
};
