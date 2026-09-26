---
"polymatic": minor
---

`use` checks that the parent's context provides what the child needs

`use(child)` now requires the parent's context type to include every field the child's context type declares, with the same types. Previously it accepted any child sharing at least one field with the parent, so a missing field went unnoticed.

This can report new type errors where a parent marks a field optional that its child requires, or where a middleware with no context type uses children that need fields. Declare those fields in the parent's context type. Requires TypeScript 5.4 or later.
