---
"polymatic": minor
---

Activate handlers run after the whole subtree is attached

Activation now runs in two passes: every middleware in the subtree is attached first, then `"activate"` handlers are called, parents before children as before. So a parent's activate handler can use its children, which previously were not attached yet. Deactivation mirrors it: `"deactivate"` handlers are called while the subtree is still attached, then it is detached.
