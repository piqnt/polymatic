# polymatic

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
