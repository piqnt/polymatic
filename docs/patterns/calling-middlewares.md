# Calling another middleware directly

Events announce that something happened, and they don't return anything. When a middleware needs to ask another one, for example whether the board is still animating, or what the rules of the current game mode are, the other middleware can register itself in the context while it is active, and be called directly:

```ts
interface Board {
  busy(): boolean;
}

class GameContext {
  board: Board | null = null;
}

class BoardView extends Middleware<GameContext> implements Board {
  constructor() {
    super();
    this.on("activate", () => {
      this.context.board = this;
    });
    this.on("deactivate", () => {
      if (this.context.board === this) this.context.board = null;
    });
  }

  busy() {
    return this.animations.length > 0;
  }
}

class Input extends Middleware<GameContext> {
  handlePointerDown = () => {
    if (this.context.board?.busy()) return;
    // ...
  };
}
```

The context field has an interface type, so callers depend on what they need, not on which middleware provides it. Combined with a [switch](switching-screens.md), each game mode can register itself as `context.rules`, and the board always calls the current one.

Registration happens in `"activate"` handlers, which run parents first, so don't rely on it in another middleware's `"activate"` handler; use it from later events.
