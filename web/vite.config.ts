/// <reference types="vitest/config" />
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";

// WASM handling below is adapted from the official Midnight bulletin-board
// example's `bboard-ui/vite.config.ts`, then corrected for this project's
// installed Vite 8, which bundles with Rolldown rather than classic Rollup
// (confirmed: `vite`'s own package.json depends directly on `rolldown`, and
// `build.rollupOptions`/`optimizeDeps.esbuildOptions` are deprecated in
// favor of `rolldownOptions`). The reference's `vite-plugin-top-level-await`
// fails to load entirely against a Rolldown-based Vite (it does
// `require("rollup")` internally, which isn't installed here) — dropped, and
// not replaced with anything, since Rolldown targeting `esnext` supports
// top-level await natively with no separate plugin or flag needed.
//
// This exists to fix a real, reproduced bug, not a hypothetical one:
// without the WASM handling below, the browser throws `Uncaught
// ReferenceError: Failed to read the '__wbindgen_start' property from
// 'Module': Cannot access '__wbindgen_start' before initialization` when
// @midnight-ntwrk/compact-runtime's WASM dependency
// (@midnight-ntwrk/onchain-runtime-v3) initializes. Minification is
// disabled because it can reorder/mangle the wasm-bindgen glue code enough
// to trigger the same class of initialization-order error.
export default defineConfig({
  build: {
    target: "esnext",
    minify: false,
    rolldownOptions: {
      // deploy.html is organizer-only tooling, a separate entry point from
      // the participant app (index.html) — see DeployApp.tsx.
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        deploy: fileURLToPath(new URL("./deploy.html", import.meta.url)),
      },
      output: {
        manualChunks: (id) => {
          if (id.includes("onchain-runtime-v3") || id.includes("ledger-v8")) {
            return "wasm";
          }
        },
      },
    },
  },
  plugins: [
    react(),
    wasm(),
    {
      name: "wasm-module-resolver",
      resolveId(source, importer) {
        if (
          source === "@midnight-ntwrk/onchain-runtime-v3" &&
          importer &&
          importer.includes("@midnight-ntwrk/compact-runtime")
        ) {
          return { id: source, external: false, moduleSideEffects: true };
        }
        return null;
      },
    },
  ],
  optimizeDeps: {
    include: [
      "@midnight-ntwrk/compact-runtime",
      "@midnight-ntwrk/ledger-v8",
      "@midnight-ntwrk/compact-js",
    ],
    exclude: [
      "@midnight-ntwrk/onchain-runtime-v3",
      "@midnight-ntwrk/onchain-runtime-v3/midnight_onchain_runtime_wasm_bg.wasm",
      "@midnight-ntwrk/onchain-runtime-v3/midnight_onchain_runtime_wasm.js",
    ],
  },
  resolve: {
    extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json", ".wasm"],
    mainFields: ["browser", "module", "main"],
    // Fixes a real, reproduced bug: without forcing these to a single
    // canonical instance, Vite's dep pre-bundler can create two separate
    // copies of ledger-v8's wasm-bindgen module (reached via different
    // import paths — directly here in connect.ts vs. transitively through
    // @midnight-ntwrk/midnight-js-contracts/compact-js). wasm-bindgen
    // classes are tied to their specific module instance, so an object
    // built by one copy fails an `instanceof`/`_assertClass` check in the
    // other, surfacing as "expected instance of LedgerParameters" deep
    // inside partitionTranscript during any real callTx (submitPrediction,
    // closeMatch, etc.) — deploy is unaffected since it doesn't exercise
    // that code path the same way.
    dedupe: [
      "@midnight-ntwrk/ledger-v8",
      "@midnight-ntwrk/compact-runtime",
      "@midnight-ntwrk/compact-js",
      "@midnight-ntwrk/onchain-runtime-v3",
    ],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
});
