import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// PORT is only meaningful for `vite dev` / `vite preview` (local development).
// Production serving on Render uses `sirv-cli` instead, which reads PORT
// itself at runtime — so we must NOT require PORT during `vite build`,
// or the Render build step (which doesn't set PORT) would fail.
const port = process.env.PORT ? Number(process.env.PORT) : 5172;

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
}

// BASE_PATH controls Vite's `base` config (the public URL path the app is
// served from). Some hosting platforms (e.g. Vercel) can pass an empty
// string for unset env vars rather than leaving them undefined, which
// would otherwise bypass the `?? "/"` fallback below and break both asset
// paths and client-side routing. Treat "" the same as unset.
const basePath = process.env.BASE_PATH && process.env.BASE_PATH.length > 0 ? process.env.BASE_PATH : "/";

export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
