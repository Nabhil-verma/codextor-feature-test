import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

/*
 * `bun run build:analyze` (vite build --mode analyze) also writes
 * dist/stats.html — a treemap of the real production bundle, so the route
 * code splitting is something we measure instead of assume. Plain
 * `vite build` stays exactly as fast as before; the plugin never runs.
 */
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    ...(mode === "analyze"
      ? [
          visualizer({
            filename: "dist/stats.html",
            gzipSize: true,
            template: "treemap",
          }),
        ]
      : []),
  ],
  server: {
    host: "0.0.0.0",
    port: Number(process.env.PORT) || 5173,
    hmr: false,
  },
  preview: {
    host: "0.0.0.0",
    port: Number(process.env.PORT) || 4173,
  },
}));
