/**
 * Minimal polyfills needed because the Midnight SDK packages (written for
 * Node) assume some Node globals exist. Import this before anything else.
 * Adapted from the official Midnight bulletin-board example's
 * `bboard-ui/src/globals.ts` (Apache-2.0).
 */
import { Buffer } from "buffer";

// @ts-expect-error — third-party libraries in the dependency chain expect `process.env.NODE_ENV`.
globalThis.process = {
  env: {
    NODE_ENV: import.meta.env.MODE,
  },
};

globalThis.Buffer = Buffer;
