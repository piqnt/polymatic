# Frame loop

Polymatic has no built-in frame loop, because where frames come from depends on where the application runs: the browser's animation frames, a timer on a server, the network, or a test. Keep the frame source in one middleware, and have the other middlewares only listen to frame events. Then the same game middlewares run in all of these places, and each application picks its frame source.

## Frame events

```ts
export interface FrameEvent {
  /** time since the last frame, in ms */
  dt: number;
  now: number;
}

/** Advance the game by `dt` */
export const FrameUpdate = EventType.create<FrameEvent>("frame-update");

/** Draw */
export const FrameRender = EventType.create<FrameEvent>("frame-render");
```

Events are delivered in the order they are sent, so every `FrameUpdate` handler has run before any `FrameRender` handler: drawing always sees a finished step. Within one event, handlers run in tree order, so the order in which the game middlewares are added decides, for example, that physics runs before the rules that read its results.

Send a new event object each frame. An async handler that reads the event after an `await` would otherwise see a later frame's values.

These event names are the ones the [devtools](https://github.com/piqnt/polymatic#debugging) time per frame by default.

## In the browser

```ts
/** The longest frame; the browser doesn't send frames to hidden tabs, so the first one back can be long after the last */
const MAX_DT = 100;

export class BrowserFrameLoop extends Middleware {
  private request = 0;
  private last = 0;

  constructor() {
    super();
    this.on("activate", this.handleActivate);
    this.on("deactivate", this.handleDeactivate);
  }

  handleActivate = () => {
    this.last = performance.now();
    this.request = requestAnimationFrame(this.frame);
  };

  handleDeactivate = () => {
    cancelAnimationFrame(this.request);
  };

  frame = (now: number) => {
    const ev = { dt: Math.min(now - this.last, MAX_DT), now };
    this.last = now;
    this.emit(FrameUpdate, ev);
    this.emit(FrameRender, ev);
    this.request = requestAnimationFrame(this.frame);
  };
}
```

Cancel the requested frame on deactivate: otherwise a loop that is deactivated and activated again before that frame, for example by a screen switch, runs twice per frame.

### Fixed steps

`dt` changes from frame to frame, and with the display's refresh rate. Physics engines give steadier and repeatable results with a fixed step, and a game whose server uses one should step the same way in the browser. Add up the time, and send as many fixed steps as fit, then draw once:

```ts
const STEP = 1000 / 60;

// in BrowserFrameLoop, time not sent yet, and a new frame function
private rest = 0;

frame = (now: number) => {
  const dt = Math.min(now - this.last, MAX_DT);
  this.last = now;
  this.rest += dt;
  while (this.rest >= STEP) {
    this.rest -= STEP;
    this.emit(FrameUpdate, { dt: STEP, now });
  }
  this.emit(FrameRender, { dt, now });
  this.request = requestAnimationFrame(this.frame);
};
```

## On a server

There are no animation frames on a server. Use a timer, with a fixed `dt`:

```ts
export class ServerFrameLoop extends Middleware {
  step = 1000 / 20;
  private timer: ReturnType<typeof setInterval>;

  constructor() {
    super();
    this.on("activate", () => (this.timer = setInterval(this.frame, this.step)));
    this.on("deactivate", () => clearInterval(this.timer));
  }

  frame = () => {
    this.emit(FrameUpdate, { dt: this.step, now: Date.now() });
  };
}
```

Timers fire late when the server is busy, but each frame still advances the game by the same `dt`, so the result doesn't depend on timing: a busy server runs the game slower, not differently. There is nothing to draw, so there is no `FrameRender`. A middleware added after the game's, handling `FrameUpdate`, can send the state to the players once the step is done.

## Networked games

When a server runs the game, its clients don't: they show the state the server sends. The [8-Ball Pool](https://github.com/piqnt/polymatic-example-eight-ball) example builds three applications from the same middlewares:

```ts
// offline: the whole game runs in the browser
class MainOffline extends Middleware<GameContext> {
  constructor() {
    super();
    this.use(new BrowserFrameLoop());
    this.use(new Physics());
    this.use(new Rules());
    this.use(new Renderer());
  }
}

// server: the same game middlewares, on server frames, and the connections to the players
class MainServer extends Middleware<GameContext> {
  constructor() {
    super();
    this.use(new ServerFrameLoop());
    this.use(new Physics());
    this.use(new Rules());
    this.use(new RoomServer()); // sends the state to the players on each frame
  }
}

// online client: no game logic, it draws the state the server sends
class MainClient extends Middleware<GameContext> {
  constructor() {
    super();
    this.use(new BrowserFrameLoop());
    this.use(new RoomClient()); // copies the server's state into the context, sends the player's shots
    this.use(new Renderer());
  }
}
```

The renderer doesn't know which of these it is in: it draws the context on each `FrameRender`. The server sends state 20 times a second, and the client draws 60 times a second, so to move smoothly, the renderer can interpolate between the last two states it received.

Other kinds of networked games need their own frame source, and the game middlewares stay the same. In lockstep, where every player runs the game, the frame source sends a `FrameUpdate` only once every player's input for that frame has arrived. With client prediction, the client runs the game ahead of the server, and goes back to the server's state when it arrives.

## In tests

A test can be the frame source. It runs the game as fast as it can, without a browser, and the same way every time. Pass the frame source to the entry middleware, so an application and its tests can use different ones:

```ts
class Main extends Middleware<GameContext> {
  constructor(frames: Middleware<any>) {
    super();
    this.use(frames);
    this.use(new Physics());
    this.use(new Rules());
  }
}

/** Sends frames when told to */
class TestFrames extends Middleware {
  now = 0;

  async run(frames: number, dt = 1000 / 60) {
    for (let i = 0; i < frames; i++) {
      this.now += dt;
      this.emit(FrameUpdate, { dt, now: this.now });
      // let this frame's handlers, and what they started, run before the next frame
      await new Promise((resolve) => setTimeout(resolve));
    }
  }
}

// in the browser
Runtime.activate(new Main(new BrowserFrameLoop()), new GameContext());

// in a test
const frames = new TestFrames();
const context = new GameContext();
Runtime.activate(new Main(frames), context);
await frames.run(5 * 60); // five seconds of game time
expect(context.score).toBe(3);
```
