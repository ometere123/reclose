// Build-time entry point only - bundled by scripts/build-frontend-vendor.mjs into
// frontend/vendor/genlayer-client.js, a browser-consumable ESM bundle with no remaining bare
// specifiers. The frontend itself has no bundler/import-map-driven module resolution (it is served
// as plain static files), so genlayer-js@2.0.0-rc.1 (the pinned SDK) cannot be imported by a bare
// specifier directly from browser-loaded code - this is the one, minimal build step that makes the
// EXACT pinned SDK reachable from the browser without upgrading it or inventing a second signing
// protocol. Nothing here is reimplemented: this file only re-exports the pinned package's own
// public surface.
export { createClient } from "genlayer-js";
export { studioDevnet } from "genlayer-js/chains";
