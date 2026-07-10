import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Vitest 4's default "forks" pool URL-encodes paths when spawning workers,
    // which breaks on this project because the folder name contains a space
    // ("My Fab Estimator" → "My%20Fab%20Estimator" — worker can't resolve it,
    // timeout, no tests run). Threads share the parent process so paths are
    // never serialised via URL. Safe, faster on small test suites like ours.
    pool: "threads",
  },
});
