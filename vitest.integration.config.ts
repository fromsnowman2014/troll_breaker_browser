// Separate config for live integration tests. Run via:
//   npm run test:integration  (with API keys in env)

import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globals: false,
    testTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "src/main/shared"),
    },
  },
});
