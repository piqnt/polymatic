---
"polymatic": patch
---

Deprecate the `Dataset` name, use `Binder` instead

`Dataset` is the former name of `Binder`, and is still exported as an alias. It is now marked
`@deprecated`, so editors show it struck through and suggest `Binder`. Behavior is unchanged —
`Dataset` and `Binder` remain the same class at runtime, and the alias still works as a value,
as a type, and as a base class.
