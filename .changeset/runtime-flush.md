---
"polymatic": minor
---

`Runtime.flush(middleware)` delivers queued events at once

Events are still queued by `emit` and delivered on a microtask. `Runtime.flush(middleware)` delivers the events queued in that middleware's application now, and the events their handlers send, until none is left, so an application can be run synchronously. A server or a client that steps the same simulation many times in a row, to run a shot to its end or to replay one, emits each step and flushes it, with no `await` between steps.
