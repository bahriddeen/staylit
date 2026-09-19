import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Static, client-only app deployed at the domain root. Absolute base so that
// per-route prerendered HTML (e.g. /clock/index.html) and the service worker
// resolve assets from the root regardless of URL depth.
export default defineConfig({
  base: "/",
  build: {
    target: "es2022",
    cssMinify: true,
    sourcemap: false,
  },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      // Precache the app shell so it installs and runs fully offline; the
      // history-API routes fall back to index.html when offline.
      includeAssets: ["favicon.svg", "icon-maskable.svg", "og.png"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,svg,png,json,webmanifest}"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: "Awake Clock",
        short_name: "Awake",
        description:
          "Keep your screen awake in the browser, plus full-screen digital and flip clocks and a timer. No install, no sign-up.",
        lang: "en",
        theme_color: "#6678f7",
        background_color: "#101317",
        display: "standalone",
        orientation: "any",
        start_url: "./",
        scope: "./",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});
