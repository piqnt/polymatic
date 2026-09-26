---
"polymatic": minor
---

Typed events with `EventType`

`EventType.create<Payload>(name)` declares a typed event. `on(eventType, handler)` gives the handler its payload type, and `emit(eventType, payload)` requires it. Declare it once next to the middleware that sends it, and import it where it is handled. Its name is its name on the wire, so it works together with string handlers and emitters of the same name. Plain string event names still work, untyped.
