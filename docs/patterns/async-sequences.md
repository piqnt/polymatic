# Animated sequences with async functions

A game sequence that plays out over time, such as swapping two tiles, waiting, removing matches, waiting, and dropping new tiles, reads best as an async function. Wait for game time, advanced by the [frame loop](frame-loop.md), rather than with `setTimeout`, so sequences pause with the game and stay in step with rendering:

`FrameUpdate` is the frame event from the [frame loop](frame-loop.md).

```ts
/** Waits for game time, advanced with step() on every frame */
class Clock {
  private waits: { remaining: number; resolve: () => void }[] = [];

  wait(ms: number) {
    return new Promise<void>((resolve) => this.waits.push({ remaining: ms, resolve }));
  }

  step(dt: number) {
    const waits = this.waits;
    this.waits = [];
    for (const wait of waits) {
      wait.remaining -= dt;
      if (wait.remaining <= 0) wait.resolve();
      else this.waits.push(wait);
    }
  }

  busy() {
    return this.waits.length > 0;
  }

  /** Drop pending waits; the sequences waiting on them never continue */
  clear() {
    this.waits.length = 0;
  }
}

class Match extends Middleware<GameContext> {
  clock = new Clock();

  constructor() {
    super();
    this.on(FrameUpdate, (ev) => this.clock.step(ev.dt));
    this.on("deactivate", () => this.clock.clear());
    this.on(UserSwap, this.handleSwap);
  }

  handleSwap = async (swap: Swap) => {
    if (this.clock.busy()) return;
    swapTiles(this.context, swap);
    await this.clock.wait(200);
    while (removeMatches(this.context)) {
      await this.clock.wait(300);
      dropTiles(this.context);
      await this.clock.wait(200);
    }
  };
}
```

Clearing the clock on deactivate stops the sequences of a middleware that was removed, for example by a [screen switch](switching-screens.md). `busy()` tells input to wait until a sequence has finished. An error thrown in a sequence goes to `Failure` handlers like any handler's (see [Errors](https://github.com/piqnt/polymatic#errors)).
