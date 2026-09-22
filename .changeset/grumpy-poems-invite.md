---
"polymatic": minor
---

Binder: validate and dedupe keys, and skip update/exit when enter returns null

- Entities with an invalid key (not a non-empty string) are ignored with a warning, instead of colliding under a coerced key such as `"undefined"`.
- Entities with a key that is already used in the same data pass are ignored with a warning. Previously a duplicate key entered twice and then re-entered on every following pass, leaking a component each time.
- `exit` now uses the key the entity was added with, instead of recomputing it. Previously, if the key of a live entity changed, its component was never exited and leaked.
- `update` and `exit` are no longer called when `enter` returned `null`, so they always receive a component.
