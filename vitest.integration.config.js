import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.js'],
    testTimeout: 60000, // Longer timeout for browser tests
    hookTimeout: 30000,
    pool: 'forks', // Better isolation for Playwright tests
    poolOptions: {
      forks: {
        singleFork: true // Run tests sequentially to avoid browser conflicts
      }
    }
  }
});
