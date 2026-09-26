---
"polymatic": minor
---

Devtools, and an inspector for debugging tools

- `polymatic/devtools` records what the application does, and shows it in a panel over the page (Alt+Shift+D) and in the browser console as `polymaticDevtools`, which loading it makes available; nothing is recorded until `polymaticDevtools.install()` is called. It shows the middleware tree, events with the handlers that ran and which one stopped them, events without handlers, handler time per frame, and the context. Settings are changed any time with `polymaticDevtools.config()`. For automated tests and AI agents, `waitFor(type)` resolves when an event has been delivered, `report()` and `snapshot(path)` return state as JSON, and `config({ quiet: true })` stops printing. Import `polymaticDevtools` from `polymatic/devtools` (default or named export) and call `install()`, or import `polymatic/devtools-install`, which installs it; in the browser without a bundler, `dist/devtools-install.js` works as a single module script next to the ESM or the UMD build.
- `inspect(inspector)` sets an `Inspector` that is told when events are sent and delivered, how long each handler takes, and when middlewares are activated and deactivated.
- The undocumented `debug_include`/`watch_include` localStorage flags, which logged events and wrapped the context in a Proxy, are removed.
