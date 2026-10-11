
## Common Patterns

Patterns from the demo games, for problems most applications run into:

- [Frame loop](https://github.com/piqnt/polymatic/blob/main/docs/patterns/frame-loop.md) — where frames come from: the browser, a server, the network, or a test, while the game's middlewares stay the same.
- [Keeping middleware objects in sync with the context](https://github.com/piqnt/polymatic/blob/main/docs/patterns/binding-data.md) — redrawing every frame, Binder and Driver, or signals.
- [Switching screens or modes](https://github.com/piqnt/polymatic/blob/main/docs/patterns/switching-screens.md) — only the current screen, game mode or tool is in the tree.
- [Calling another middleware directly](https://github.com/piqnt/polymatic/blob/main/docs/patterns/calling-middlewares.md) — asking another middleware something, which events can't return.
- [Animated sequences with async functions](https://github.com/piqnt/polymatic/blob/main/docs/patterns/async-sequences.md) — multi-step animations written as async functions, paced by game time.
