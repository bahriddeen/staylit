import { defineConfig } from "vitest/config";

// Static, client-only app. Relative base so it works on any static host
// (Vercel / Netlify / Cloudflare Pages) and from a subpath.
export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    cssMinify: true,
    sourcemap: false,
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/test/setup.ts"],
  },
});
