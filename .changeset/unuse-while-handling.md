---
"polymatic": patch
---

Fix removing middlewares from a handler

- A handler that removed a middleware with `unuse` while an event was being delivered, for example a `Failure` handler removing the middleware that failed, made the next sibling miss that event. The same happened to `"activate"` and `"deactivate"` handlers.
- A `"deactivate"` handler that removed its own middleware ran twice.
- The devtools show the runtime as `Runtime` in minified builds too, such as jsDelivr's `+esm`.
