# polymatic

## 0.3.0

### Minor Changes

- d484608: Devtools, and an inspector for debugging tools

  - `polymatic/devtools` records what the application does, and shows it in a panel over the page (Alt+Shift+D) and in the browser console as `polymaticDevtools`, which loading it makes available; nothing is recorded until `polymaticDevtools.install()` is called. It shows the middleware tree, events with the handlers that ran and which one stopped them, events without handlers, handler time per frame, and the context. Settings are changed any time with `polymaticDevtools.config()`. For automated tests and AI agents, `waitFor(type)` resolves when an event has been delivered, `report()` and `snapshot(path)` return state as JSON, and `config({ quiet: true })` stops printing. Import `polymaticDevtools` from `polymatic/devtools` (default or named export) and call `install()`, or import `polymatic/devtools-install`, which installs it; in the browser without a bundler, `dist/devtools-install.js` works as a single module script next to the ESM or the UMD build.
  - `inspect(inspector)` sets an `Inspector` that is told when events are sent and delivered, how long each handler takes, and when middlewares are activated and deactivated.
  - The undocumented `debug_include`/`watch_include` localStorage flags, which logged events and wrapped the context in a Proxy, are removed.

- d241b90: Handler errors no longer stop the application, and can be handled like error boundaries

  - A handler that throws, or returns a promise that is rejected, no longer stops the event: it is still delivered to the other middlewares, and activation carries on with the rest of the tree. Before, one failing handler kept the event from every middleware after it, and left a tree half activated.
  - A failure goes up the parent chain to `Failure` handlers, `this.on(Failure, (failure) => …)`, with the error, the middleware and the event. A handler that returns true stops it; one that no handler stops is reported with `reportError`, like an uncaught error.
  - The devtools list failed handlers, counted, in the Issues tab, `polymaticDevtools.failures()` and `report().failures`, and mark them in the Events tab. `Inspector` has a `failure` method.

- 8df5055: Activate handlers run after the whole subtree is attached

  Activation now runs in two passes: every middleware in the subtree is attached first, then `"activate"` handlers are called, parents before children as before. So a parent's activate handler can use its children, which previously were not attached yet. Deactivation mirrors it: `"deactivate"` handlers are called while the subtree is still attached, then it is detached.

- 0def015: Typed events with `EventType`

  `EventType.create<Payload>(name)` declares a typed event. `on(eventType, handler)` gives the handler its payload type, and `emit(eventType, payload)` requires it. Declare it once next to the middleware that sends it, and import it where it is handled. Its name is its name on the wire, so it works together with string handlers and emitters of the same name. Plain string event names still work, untyped.

- 2919692: `use` checks that the parent's context provides what the child needs

  `use(child)` now requires the parent's context type to include every field the child's context type declares, with the same types. Previously it accepted any child sharing at least one field with the parent, so a missing field went unnoticed.

  This can report new type errors where a parent marks a field optional that its child requires, or where a middleware with no context type uses children that need fields. Declare those fields in the parent's context type. Requires TypeScript 5.4 or later.

### Patch Changes

- 8df5055: Fix `Runtime.deactivate` not calling `"deactivate"` handlers

  The runtime marked itself inactive before calling them, and handlers only run while activated, so no `"deactivate"` handler ran when an application was stopped, for example on hot module reload. They now run, while the whole tree is still attached, before it is detached.

## 0.2.1

### Patch Changes

- 9e7a22f: Deprecate the `Dataset` name, use `Binder` instead

  `Dataset` is the former name of `Binder`, and is still exported as an alias. It is now marked
  `@deprecated`, so editors show it struck through and suggest `Binder`. Behavior is unchanged —
  `Dataset` and `Binder` remain the same class at runtime, and the alias still works as a value,
  as a type, and as a base class.

## 0.2.0

### Minor Changes

- 79b1f54: Binder: validate and dedupe keys, and skip update/exit when enter returns null

  - Entities with an invalid key (not a non-empty string) are ignored with a warning, instead of colliding under a coerced key such as `"undefined"`.
  - Entities with a key that is already used in the same data pass are ignored with a warning. Previously a duplicate key entered twice and then re-entered on every following pass, leaking a component each time.
  - `exit` now uses the key the entity was added with, instead of recomputing it. Previously, if the key of a live entity changed, its component was never exited and leaked.
  - `update` and `exit` are no longer called when `enter` returned `null`, so they always receive a component.

## 0.1.0

### Minor Changes

- 503962c: Emit runs promise microtask instead of setTimeout

## 0.0.14

### Patch Changes

- 86eeb51: Change umd.cjs to umd.js to fix cdn mime-type
- 4d0fc14: Fix \_swap

## 0.0.13

### Patch Changes

- 399d904: activated return false instead of null
- a45331d: Replace Driver data() with setData()
- 9c6b2bf: Deprecate setContext

## 0.0.12

### Patch Changes

- 712faca: Add Provenance statement to npm package
- 0a27dd0: Add experimental Middleware.\_swap

## 0.0.11

### Patch Changes

- ac05047: Rename Dataset to Binder

## 0.0.10

### Patch Changes

- 666ff13: Add drivers to dataset config

## 0.0.9

### Patch Changes

- 3b43a72: Fix addDriver return type
- 69edfb1: Fix create factory return type

## 0.0.8

### Patch Changes

- 6636b17: Do not emit or handle events when not activated

## 0.0.7

### Patch Changes

- 9f15ed3: Add Runtime.deactivate
- 4c113fb: Allow undefined value in Dataset data
- 7acbbf9: Rename middleware internal fields
