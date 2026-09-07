/**
 * Browser shim for the `isomorphic-ws` package.
 *
 * `isomorphic-ws@5` ships a browser entry (`browser.js`) with only a
 * `default` export, but @midnight-ntwrk/midnight-js-indexer-public-data-provider
 * reads the named `ws.WebSocket` binding (`webSocketImpl = ws.WebSocket`) to
 * build its Apollo WebSocket link. Under Vite/Rolldown that named import
 * resolves to `undefined`, so live ledger subscriptions would fail in the
 * production bundle. Aliasing `isomorphic-ws` to this file exports both the
 * named `WebSocket` and a `default`, pointing at the platform WebSocket.
 */

type WebSocketConstructor = typeof globalThis.WebSocket;

const WebSocketImpl: WebSocketConstructor | undefined =
  globalThis.WebSocket ??
  (globalThis as { MozWebSocket?: WebSocketConstructor }).MozWebSocket;

export { WebSocketImpl as WebSocket };
export default WebSocketImpl;
