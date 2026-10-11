# Using Signals

For values that change now and then, rather than every frame, such as the score, the current screen, or a message, keep a signal in the context, and update what shows it when it changes. This works with any signals library, for example [@preact/signals-core](https://github.com/preactjs/signals):

```ts
import { effect, signal } from "@preact/signals-core";

class GameContext {
  score = signal(0);
}

class ScoreText extends Middleware<GameContext> {
  private dispose: (() => void) | null = null;

  constructor(private element: HTMLElement) {
    super();
    this.on("activate", () => {
      this.dispose = effect(() => {
        this.element.textContent = String(this.context.score.value);
      });
    });
    this.on("deactivate", () => {
      this.dispose?.();
      this.dispose = null;
    });
  }
}

// in the game logic
this.context.score.value += 1;
```

Start the effect in the `"activate"` handler, and dispose of it in the `"deactivate"` handler, so a middleware that is removed stops updating. UI components, for example in Preact, Solid or React, can read the same signals from the context.

An effect runs as soon as the value changes, in the code that changed it. It is not an event: it isn't queued, and it doesn't show in the devtools' Events tab. An error in it is thrown in the code that changed the value, so when that is an event handler, the failure is reported for the handler's middleware rather than the effect's. The devtools show signals in the context as their values.

## Which to use

| | good for | you write |
| --- | --- | --- |
| Redraw every frame | canvas drawing, few objects | a draw function |
| Binder and Driver | entities that come and go, each with its own sprite, element or body | enter, update and exit for each kind of entity |
| Signals | values that change now and then: score, screen, HUD, menus | an effect, or a UI component |

Every demo game draws its entities with Binder. The larger ones, such as Six, Ocean and 8-Ball Pool, also use signals for their HUD and screens.
