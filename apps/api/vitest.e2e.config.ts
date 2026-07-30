import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["test/e2e/**/*.e2e-spec.ts"],
    fileParallelism: false,
    hookTimeout: 30_000,
    testTimeout: 20_000,
  },
});
