import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), tsconfigPaths()],
    build: {
      outDir: "out/main",
      lib: {
        entry: resolve(__dirname, "src/main/index.ts"),
        formats: ["es"],
        fileName: () => "index.js",
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin(), tsconfigPaths()],
    build: {
      outDir: "out/preload",
      rollupOptions: {
        input: {
          "chrome-preload": resolve(__dirname, "src/chrome-renderer/preload.ts"),
          "page-preload": resolve(__dirname, "src/page-preload/preload.ts"),
        },
        output: { format: "cjs", entryFileNames: "[name].cjs" },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, "src/chrome-renderer"),
    plugins: [react(), tailwindcss(), tsconfigPaths()],
    build: {
      outDir: resolve(__dirname, "out/renderer"),
      rollupOptions: {
        input: resolve(__dirname, "src/chrome-renderer/index.html"),
      },
    },
    resolve: {
      alias: {
        "@shared": resolve(__dirname, "src/main/shared"),
        "@renderer": resolve(__dirname, "src/chrome-renderer"),
      },
    },
  },
});
