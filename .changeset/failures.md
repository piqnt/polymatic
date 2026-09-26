---
"polymatic": minor
---

Handler errors no longer stop the application, and can be handled like error boundaries

- A handler that throws, or returns a promise that is rejected, no longer stops the event: it is still delivered to the other middlewares, and activation carries on with the rest of the tree. Before, one failing handler kept the event from every middleware after it, and left a tree half activated.
- A failure goes up the parent chain to `Failure` handlers, `this.on(Failure, (failure) => …)`, with the error, the middleware and the event. A handler that returns true stops it; one that no handler stops is reported with `reportError`, like an uncaught error.
- The devtools list failed handlers, counted, in the Issues tab, `polymaticDevtools.failures()` and `report().failures`, and mark them in the Events tab. `Inspector` has a `failure` method.
