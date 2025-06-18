/**
 * Jest test setup file
 * Global test configuration and utilities
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

// Mock console methods to reduce test output noise
const originalConsole = { ...console };

beforeAll(() => {
  // You can mock console methods here if needed
  // console.log = jest.fn();
  // console.info = jest.fn();
  // console.warn = jest.fn();
});

afterAll(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
});

// Global test timeout
jest.setTimeout(10000);

// Add custom matchers or global test utilities here
declare global {
  namespace jest {
    interface Matchers<R> {
      // Add custom matchers here if needed
    }
  }
}

