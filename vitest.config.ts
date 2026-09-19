import { defineConfig } from "vitest/config";

// Test config lives separately from vite.config.ts so the Vitest type world
// (which bundles its own copy of Vite) doesn't clash with the Vite plugins used
// for the app build (e.g. vite-plugin-pwa).
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/test/setup.ts"],
  },
});
