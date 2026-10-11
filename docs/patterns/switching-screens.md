# Switching screens or modes

When only one of several middlewares should run at a time, such as a game's menu, play and game over screens, its modes, or an editor's tools, keep only the current one in the tree. A middleware removed with `unuse` is deactivated, so it stops receiving events and cleans up in its `"deactivate"` handler, and the one that replaces it starts in its `"activate"` handler:

```ts
type Screen = "menu" | "play" | "gameover";

export const SetScreen = EventType.create<Screen>("set-screen");

class ScreenSwitch extends Middleware<GameContext> {
  private screens: Record<Screen, Middleware<GameContext>> = {
    menu: new Menu(),
    play: new Play(),
    gameover: new GameOver(),
  };

  constructor() {
    super();
    this.on("activate", () => this.show(this.context.screen));
    this.on(SetScreen, (screen) => this.show(screen));
  }

  show(screen: Screen) {
    this.context.screen = screen;
    // remove the current screen before adding the next, so they don't overlap
    for (const key in this.screens) {
      if (key !== screen) this.unuse(this.screens[key]);
    }
    this.use(this.screens[screen]);
  }
}

// in any middleware
this.emit(SetScreen, "gameover");
```

The current screen is kept in the context, so other middlewares, such as rendering, can show it too. Each screen is created once and used again, so reset its state in its `"activate"` handler.
