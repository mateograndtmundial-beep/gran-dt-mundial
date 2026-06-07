import { defineConfig } from "vitest/config";

// Tests unitarios de lógica pura (scoring). No tocan la DB ni Next.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
