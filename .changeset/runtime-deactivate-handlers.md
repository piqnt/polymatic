---
"polymatic": patch
---

Fix `Runtime.deactivate` not calling `"deactivate"` handlers

The runtime marked itself inactive before calling them, and handlers only run while activated, so no `"deactivate"` handler ran when an application was stopped, for example on hot module reload. They now run, while the whole tree is still attached, before it is detached.
