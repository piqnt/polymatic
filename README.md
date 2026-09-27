<p align="center">
  <img width="300px" height="300px" src="https://static.piqnt.com/polymatic/logo-text-sqaure.svg" />
</p>

Minimalist middleware framework for making modular games and interactive visual applications

## Demo Games

Six ([Play](https://piqnt.com/six/), [Source](https://github.com/piqnt/polymatic-example-six/)) - Hexagonal tile-matching game, made with Polymatic, Stage.js  
Ocean ([Play](https://piqnt.com/ocean/), [Source](https://github.com/piqnt/polymatic-example-ocean/)) - Ocean diving runner game, made with Polymatic, Stage.js  
Tile Box ([Play](https://piqnt.com/box/), [Source](https://github.com/piqnt/polymatic-example-tilebox)) - Polymatic, Pixi.js  
Watermelon Game ([Play](https://piqnt.github.io/polymatic-example-watermelon/), [Source](https://github.com/piqnt/polymatic-example-watermelon)) - Polymatic, Planck/Box2D, Pixi.js  
8-Ball Pool ([Play](https://eight-ball.piqnt.com/), [Source](https://github.com/piqnt/polymatic-example-eight-ball)) - Multiplayer including server and client implementation with Socket.io, Planck/Box2D, SVG  
Pinball ([Play](https://piqnt.github.io/polymatic-example-pinball/), [Source](https://github.com/piqnt/polymatic-example-pinball/)) - Pinball game with editable svg table design, with Polymatic and Planck/Box2D physics  
Breakout ([Play](https://piqnt.github.io/polymatic-example-breakout/), [Source](https://github.com/piqnt/polymatic-example-breakout/)) - Polymatic, Pixi.js  
Carrom ([Play](https://piqnt.github.io/polymatic-example-carrom/), [Source](https://github.com/piqnt/polymatic-example-carrom/)) - Polymatic, Planck, SVG  
Game of Life ([Play](https://piqnt.github.io/polymatic-example-life/), [Source](https://github.com/piqnt/polymatic-example-life)) - Polymatic, Pixi.js  
Air Traffic Control ([Play](https://piqnt.github.io/polymatic-example-traffic/), [Source](https://github.com/piqnt/polymatic-example-traffic)) - Polymatic, Pixi.js  
Same Game ([Play](https://piqnt.github.io/polymatic-example-samegame/), [Source](https://github.com/piqnt/polymatic-example-samegame)) - Polymatic, Pixi.js  
Asteroid ([Play](https://piqnt.github.io/polymatic-example-asteroid/), [Source](https://github.com/piqnt/polymatic-example-asteroid)) - Polymatic, Pixi.js  
Tic Tac Toe ([Play](https://piqnt.github.io/polymatic-example-tictactoe/), [Source](https://github.com/piqnt/polymatic-example-tictactoe)) - Polymatic, Pixi.js  
Orbital Defense ([Play](https://piqnt.github.io/polymatic-example-orbit/), [Source](https://github.com/piqnt/polymatic-example-orbit)) - Polymatic, Pixi.js  
Fly ([Play](https://piqnt.github.io/polymatic-example-fly/), [Source](https://github.com/piqnt/polymatic-example-fly)) - Polymatic, Pixi.js  



## Community

#### [GitHub](https://github.com/piqnt/polymatic) - [Discord](https://discord.gg/f4r7QWqaK4)



## Install

### NPM
```bash
  npm install polymatic
```

```js
  import { Middleware, Runtime } from "polymatic";
```

### ESM - jsDelivr
```html
  <script type="module">
    // esm import, script type should be module
    import { Middleware, Runtime } from "https://cdn.jsdelivr.net/npm/polymatic@0.3/+esm";
  </script>
```

### UMD - jsDelivr
```html
  <script src="https://cdn.jsdelivr.net/npm/polymatic@0.3"></script>
  <script>
    // global polymatic variable added via umd build
    const { Middleware, Runtime } = polymatic;
  </script>
```

AI chat sandboxes, such as Claude, ChatGPT and Grok, only allow jsDelivr.

The same files are also on unpkg and esm.sh, if jsDelivr is not reachable for you.

## User Guide - 5 Minutes

Polymatic is a minimalist framework for building games and interactive applications from small, composable units called **middlewares**. It does not include a built-in frame-loop, rendering, physics, or other game-specific features. Instead, it gives you a simple structure to organize your application logic, and to integrate any libraries you need, such as rendering, physics, sound, storage, and networking.

Polymatic is a plain JavaScript library, it works in browsers and servers, and with frontend and backend development tools. The API is small and predictable, which makes it easy to use for both people and AI.

A polymatic application is built on three core ideas:

- **Middleware** — a unit of application logic. Middlewares are composed into a tree using `use()`.
- **Context** — a single object shared by all middlewares in an application. Shared state and game entities live here.
- **Events** — how middlewares communicate. An emitted event is delivered to all middlewares in the application.

This guide builds a small application: balls bouncing around a canvas, with a bounce counter. The complete application is [docs/bounce-canvas.html](https://github.com/piqnt/polymatic/blob/main/docs/bounce-canvas.html), a single file that loads polymatic from jsDelivr: save it and open it in a browser to see it run. The code below is the same, with TypeScript types added.

### Middleware

A middleware is a class that implements one part of your application, such as game logic, rendering, input, networking, or the frame-loop. To create a middleware extend the `Middleware` class:

```ts
class Main extends Middleware {
}
```

Middlewares are composed into a tree with the `use` method. The bouncing balls have five middlewares: `FrameLoop` sends `"frame-update"` on every animation frame, `Physics` moves the balls and sends `"bounce"` when one hits a wall, `BounceCounter` counts the bounces, `Renderer` draws the balls and the count, and `Main` uses the other four:

```ts
class Main extends Middleware<BounceContext> {
  constructor() {
    super();
    this.use(new FrameLoop());
    this.use(new Physics());
    this.use(new BounceCounter());
    this.use(new Renderer());
  }
}
```

The order matters: events are delivered to middlewares in tree order, so on each frame `Physics` moves the balls before `Renderer` draws them.

You can call `use` at any time (not only in the constructor), and remove a child middleware with `unuse`.

### Context

The context is a single object shared by the entire application, used to store shared state and game entities. You can use any object as context. You create it and pass it to `Runtime.activate` when starting the application (see Activation below).

Every middleware accesses the same object through `this.context` — it is shared by reference, so changes made by one middleware are immediately visible to all others. This is the primary way middlewares share data; events are for signaling, context is for state.

The context of the bouncing balls holds the size of the area, the balls, and the bounce count:

```ts
interface Ball {
  position: { x: number, y: number };
  velocity: { x: number, y: number };
  radius: number;
  color: string;
}

class BounceContext {
  width = 300;
  height = 200;
  balls: Ball[] = [
    {
      position: { x: 40, y: 40 },
      velocity: { x: 140, y: 100 },
      radius: 10,
      color: "#e4572e"
    },
    {
      position: { x: 150, y: 120 },
      velocity: { x: -90, y: 160 },
      radius: 14,
      color: "#29335c"
    },
    {
      position: { x: 240, y: 60 },
      velocity: { x: 110, y: -130 },
      radius: 8,
      color: "#f3a712"
    },
  ];
  bounces = 0;
}
```

`Physics` moves the balls in the context on every frame:

```ts
class Physics extends Middleware<BounceContext> {
  constructor() {
    super();
    this.on("frame-update", this.handleFrameUpdate);
  }

  handleFrameUpdate = ({ dt }: { dt: number }) => {
    const { width, height, balls } = this.context;
    for (const ball of balls) {
      const { position, velocity, radius } = ball;
      position.x += velocity.x * dt;
      position.y += velocity.y * dt;
      if (position.x < radius) {
        position.x = radius;
        velocity.x *= -1;
        this.emit("bounce", { ball });
      }
      if (position.x > width - radius) {
        position.x = width - radius;
        velocity.x *= -1;
        this.emit("bounce", { ball });
      }
      if (position.y < radius) {
        position.y = radius;
        velocity.y *= -1;
        this.emit("bounce", { ball });
      }
      if (position.y > height - radius) {
        position.y = height - radius;
        velocity.y *= -1;
        this.emit("bounce", { ball });
      }
    }
  };
}
```

Handlers are usually arrow functions assigned to fields, like `handleFrameUpdate`, so that `this` is the middleware when polymatic calls them.

`Renderer` draws the same balls from the context, with the bounce count:

```ts
class Renderer extends Middleware<BounceContext> {
  private canvas!: CanvasRenderingContext2D;
  private status!: HTMLElement;

  constructor() {
    super();
    this.on("activate", this.handleActivate);
    this.on("frame-update", this.handleFrameUpdate);
  }

  handleActivate = () => {
    const view = document.getElementById("view") as HTMLCanvasElement;
    view.width = this.context.width;
    view.height = this.context.height;
    this.canvas = view.getContext("2d")!;
    this.status = document.getElementById("status")!;
  };

  handleFrameUpdate = () => {
    const { width, height, balls, bounces } = this.context;
    this.canvas.clearRect(0, 0, width, height);
    for (const ball of balls) {
      this.canvas.fillStyle = ball.color;
      this.canvas.beginPath();
      this.canvas.arc(ball.position.x, ball.position.y, ball.radius, 0, Math.PI * 2);
      this.canvas.fill();
    }
    this.status.textContent = `bounces: ${bounces}`;
  };
}
```

`Renderer` finds its canvas when it is activated, not when it is created, since the context, with the size to use, is only available while the middleware is activated.

A middleware's context type declares what it needs. When a middleware uses a child, its own context type must provide everything the child's declares, with the same types, so TypeScript reports a missing or mistyped field where the child is added:

```ts
class Physics extends Middleware<{ width: number; height: number; balls: Ball[] }> {
}

class BounceCounter extends Middleware<{ bounces: number }> {
}

class Renderer extends Middleware<{ width: number; height: number; balls: Ball[]; bounces: number }> {
}

class Main extends Middleware<BounceContext> {
  constructor() {
    super();
    this.use(new Physics()); // ok: BounceContext has balls
    this.use(new BounceCounter()); // ok: BounceContext has bounces
    this.use(new Renderer()); // ok: BounceContext has balls and bounces
  }
}
```

If `BounceContext` had no `bounces`, TypeScript would report it at `this.use(new BounceCounter())` and `this.use(new Renderer())`.

A field that a child requires must be required in the parent's type too, even if another middleware sets it later.

### Events

Middlewares communicate by sending and receiving events. Use `emit` to send an event, and `on` to register a handler (usually in the constructor). `Physics` sends `"bounce"` when a ball hits a wall, and `BounceCounter` counts them:

```ts
class BounceCounter extends Middleware<BounceContext> {
  constructor() {
    super();
    this.on("bounce", this.handleBounce);
  }

  handleBounce = () => {
    this.context.bounces += 1;
  };
}
```

`Physics` doesn't know who listens: a middleware that plays a sound on each bounce could be added without changing it.

In TypeScript you can define typed events. The payload is type-checked in `emit`, handlers are checked against it in `on`, and your editor can find every place the event is sent or handled:

```ts
export interface BounceData {
  ball: Ball;
}

export const Bounce = EventType.create<BounceData>("bounce");

// in Physics: the payload is checked
this.emit(Bounce, { ball });

// in BounceCounter: the handler is checked against the payload
this.on(Bounce, this.handleBounce);

handleBounce = (data: BounceData) => {
  this.context.bounces += 1;
};
```

A typed event uses its name on the wire, so it also reaches `on("bounce", …)` handlers.

How events are delivered:

- **Delivered to the entire application** — an emitted event first goes up to the runtime at the root, then is passed down to every activated middleware in the tree, in tree order (parents before children). Any middleware can listen to any event, regardless of which middleware emitted it — including the emitter itself.
- **Queued, but delivered in the same frame** — `emit` does not call handlers immediately. The event is queued and delivered asynchronously, as soon as the current synchronous code finishes — still within the same frame, before the browser renders or the next `requestAnimationFrame` fires. This means the code following an `emit` call always runs before any handler receives the event.
- **One handler per event type** — each middleware can register only one handler for a given event name (`on` throws if a handler already exists).
- **Stopping propagation** — if a handler returns `true`, the event is not passed to any further middlewares.

### Activation

To start a polymatic application, pass your entry middleware and the context object to `Runtime.activate`:

```ts
Runtime.activate(new Main(), new BounceContext());
```

This activates `Main` and, recursively, all middlewares it uses. A middleware can access the context and send and receive events only while it is activated.

When a middleware is activated it receives the `"activate"` event, and when it is deactivated it receives the `"deactivate"` event. Use them to initialize and clean up resources. `FrameLoop` starts requesting animation frames when it is activated, and stops when it is deactivated:

```ts
class FrameLoop extends Middleware {
  private timer = 0;
  private last = 0;

  constructor() {
    super();
    this.on("activate", this.handleActivate);
    this.on("deactivate", this.handleDeactivate);
  }

  handleActivate = () => {
    this.timer = requestAnimationFrame(this.tick);
  };

  handleDeactivate = () => {
    cancelAnimationFrame(this.timer);
  };

  tick = (now: number) => {
    // dt in seconds, at most 0.1, since the browser pauses animation frames in hidden tabs
    const dt = this.last ? Math.min((now - this.last) / 1000, 0.1) : 0;
    this.last = now;
    this.emit("frame-update", { dt });
    this.timer = requestAnimationFrame(this.tick);
  };
}
```

Middlewares added with `use` to an already activated middleware are activated immediately, and middlewares removed with `unuse` are deactivated. To stop an application call `Runtime.deactivate` with the entry middleware.

When a middleware is activated, its whole subtree is attached first, and then `"activate"` handlers are called, parents before children. So an activate handler can already use the middleware's children. When it is deactivated, `"deactivate"` handlers are called while the subtree is still attached.

## Working with data

Game state lives in the context as plain data, but middlewares often keep their own objects for it: a renderer has a sprite or an svg element for each entity, a physics middleware has a body. The bouncing balls come in two versions, which draw the same context in the two common ways: [docs/bounce-canvas.html](https://github.com/piqnt/polymatic/blob/main/docs/bounce-canvas.html) and [docs/bounce-svg.html](https://github.com/piqnt/polymatic/blob/main/docs/bounce-svg.html). Their other middlewares are the same.

### Redraw every frame

The simplest is to keep no objects at all, and draw the context from scratch on every frame. This is what the canvas version's `Renderer`, shown above, does: it clears the canvas and draws every ball. There is nothing to create or clean up, so nothing can get out of sync. This suits a canvas, and anything else that is drawn from scratch each frame.

### Binder and Driver

The svg version keeps a `<circle>` element for each ball, and clicking adds a ball. When entities come and go, and each one needs its own object that is created once, updated, and removed, such as a sprite, an svg element or a physics body, polymatic includes Binder and Driver:

- A **Driver** implements behavior for entities: it creates, updates, and removes a component for each entity that it handles.
- A **Binder** tracks entities between updates: each time you pass it the current entities, it detects which entities are new, which still exist, and which were removed, and calls the driver functions accordingly.

### Driver

A driver implements four functions:

- `filter`: returns true for entities this driver should handle
- `enter`: called when an entity first appears — create and return its component
- `update`: called for every entity on each data pass, including entities that just entered
- `exit`: called when an entity is removed — clean up its component

If `enter` returns `null`, the driver has no component for that entity, and `update` and `exit` are not called for it.

We can create a driver using the `Driver.create` method. The svg version's `Renderer` has a driver that creates, moves and removes a circle for each ball:

```ts
ballDriver = Driver.create<Ball, SVGCircleElement>({
  filter: () => true,
  enter: (ball) => {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("r", String(ball.radius));
    circle.setAttribute("fill", ball.color);
    this.view.append(circle);
    return circle;
  },
  update: (ball, circle) => {
    circle.setAttribute("cx", String(ball.position.x));
    circle.setAttribute("cy", String(ball.position.y));
  },
  exit: (ball, circle) => {
    circle.remove();
  },
});
```

### Binder

A binder needs a `key` function that uniquely identifies entities between updates, and a list of drivers. We can create a binder using the `Binder.create` method. In the svg version, each ball has an `id` for its key:

```ts
binder = Binder.create<Ball>({
  key: (ball) => ball.id,
  drivers: [this.ballDriver],
});
```

Keys must be non-empty strings, and unique within each data pass. Entities with an invalid or duplicate key are ignored with a warning. The key of an entity should not change while it is in the data.

Pass the current entities to the binder, and it will call the driver functions for entities that entered, updated, or exited since the last call. Passing no entities removes all the components:

```ts
handleFrameUpdate = () => {
  this.binder.setData(this.context.balls);
};

handleDeactivate = () => {
  this.binder.setData([]);
};
```

A middleware usually has one binder, with one driver for each kind of entity it handles. A renderer and a physics middleware each have their own binder for the same entities, so neither knows about the other.

## Errors

A handler that throws, or returns a promise that is rejected, doesn't stop the application: the event is still delivered to the other middlewares, and activation carries on with the rest of the tree. The error is reported like any uncaught error, in the console and to `window.onerror`.

A middleware can handle failures in its subtree, like an error boundary, with a `Failure` handler. Say `Main` also uses a `Sound` middleware that plays a sound on each bounce. Sound is a nice extra, so if it fails, `Main` reports the error to the server, and removes `Sound` so the game goes on without it:

```ts
class Main extends Middleware<BounceContext> {
  constructor() {
    super();
    this.use(new FrameLoop());
    this.use(new Physics());
    this.use(new BounceCounter());
    this.use(new Sound());
    this.use(new Renderer());

    this.on(Failure, this.handleFailure);
  }

  handleFailure = (failure: Failure) => {
    // failure.error, failure.middleware, and failure.type and failure.ev, the event it was handling
    navigator.sendBeacon("/errors", String(failure.error));
    if (failure.middleware instanceof Sound) this.unuse(failure.middleware);
    return true;
  };
}
```

Even without the `Failure` handler, a failing `Sound` doesn't stop the game: `BounceCounter` still receives every `"bounce"`, and the error is reported in the console.

A failure goes up the parent chain from the middleware that failed, to the nearest `Failure` handler, so a middleware's `Failure` handler handles its children's failures, not its own. If that returns `true`, the failure stops there; otherwise it goes on up, and is reported as uncaught if no handler stops it. The failed middleware stays in the tree unless it is removed, as `Main` does here.

## Debugging

The polymatic devtools show what your application's middlewares and events are doing, in a panel over the page and in the browser console. They can be added before or after the application is activated.

In the browser without a bundler, add them as a module script. It works with both the ESM and the UMD build of polymatic on the page:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/polymatic@0.3/dist/devtools-install.js"></script>
```

With a bundler, import `polymatic/devtools-install`, which installs them with the defaults:

```ts
import "polymatic/devtools-install";
```

Press **Alt+Shift+D** to open a panel over the page, with these tabs:

- **Tree** — every middleware, whether it is active, and the events it handles. Events that have not been sent yet are dimmed.
- **Events** — recent events, newest first: who sent each one, which handlers ran and how long they took, and which one stopped it. Click an event for its payload and its time in the queue.
- **Frame** — how long each middleware's `"frame-update"` and `"frame-render"` handlers take, over the last 60 frames.
- **Issues** — handlers that failed, with how often and whether a `Failure` handler stopped them; events sent to no handler, often a misspelt name; and events handled but not sent so far.
- **Context** — the context, browsed by path.

The same is available in the browser console, as `polymaticDevtools`:

```js
polymaticDevtools.install();           // start recording, if it is not installed yet
polymaticDevtools.tree();              // the middleware tree
polymaticDevtools.events("pointer");   // recent events, filtered
polymaticDevtools.failures();          // handlers that threw, or whose promise was rejected
polymaticDevtools.unmatched();         // events without handlers, and handlers without events
polymaticDevtools.frame();             // handler time per frame
polymaticDevtools.context("score");    // a value in the context
polymaticDevtools.watch("score");      // log it whenever it changes
polymaticDevtools.log("user-");        // log matching events as they are delivered
polymaticDevtools.panel();             // show or hide the panel
```

Settings can be changed with `config`, before or after installing, and take effect right away. Called without changes, it returns the current settings:

```js
polymaticDevtools.config({
  hotkey: true,                        // Alt+Shift+D toggles the panel
  frameEvents: ["frame-update", "frame-render"], // events timed per frame in the Frame tab
  logFrameEvents: false,               // keep frame events in the Events tab too
  maxEvents: 500,                      // how many events to keep
});
```

Middlewares are shown by class name. In a minified build, give a middleware a `displayName` to keep it readable.

To build your own tool, pass an `Inspector` to `inspect`: it is told when events are sent and delivered, how long each handler takes, when handlers fail, and when middlewares are activated and deactivated.

### Choosing when to record

Loading `polymatic/devtools` on its own only makes `polymaticDevtools` available: nothing is recorded, and the panel's hotkey is off, until `polymaticDevtools.install()` is called. So you can decide in code when they start, for example only with a `?debug` URL:

```ts
import polymaticDevtools from "polymatic/devtools";

if (new URLSearchParams(location.search).has("debug")) {
  polymaticDevtools.install();
}
```

Or ship them without installing them, and call `polymaticDevtools.install()` from the browser console of a live build when you need them. `polymaticDevtools.uninstall()` stops recording again.

To leave them out of production builds altogether, load them in development only:

```ts
if (import.meta.env.DEV) {
  import("polymatic/devtools").then(({ polymaticDevtools }) => polymaticDevtools.install());
}
```

### Automated tests and AI agents

Tests and AI agents that drive an application in a browser, for example with Playwright, can read the devtools instead of screenshots and fixed delays. Every method returns plain data, and these are made for it:

- `waitFor(type, options)` — resolves once the next event of that type has been delivered and its handlers have run. `after` also accepts one already delivered after an event id, `where` filters, and `timeout` (10 seconds by default) rejects.
- `report()` — failed handlers, the tree, the last events, unmatched events and frame times, as JSON. Look at `failures` first: an error the application's `Failure` handlers stopped doesn't reach the console.
- `snapshot(path, depth)` — a copy of the context, or part of it, as JSON: signals become their values, and cycles and deep objects are cut off.
- `config({ quiet: true })` — the methods return data without printing it.

Read `lastEventId` before an action, then wait for the event it causes after that id, so an event delivered in between is not missed:

```js
await page.evaluate(() => polymaticDevtools.install().config({ quiet: true }));

const { lastEventId } = await page.evaluate(() => polymaticDevtools.report());
await page.mouse.click(x, y);
const connect = await page.evaluate(
  (after) => polymaticDevtools.waitFor("user-connect", { after }),
  lastEventId,
);
// connect.handlers: which middlewares handled it, how long each took, and which one stopped it

const { failures, unmatched } = await page.evaluate(() => polymaticDevtools.report());
// failures: handlers that threw, with the message, stack and count
// unmatched.noHandler: events no middleware handled, often a misspelt name
const score = await page.evaluate(() => polymaticDevtools.snapshot("score"));
```

Events tell you when the application's state has changed, not when the screen has caught up: after an animated change, give the drawing a moment, or wait for your own state, before reading pixels. Frame events are timed but not kept in the event list, unless `config({ logFrameEvents: true })`.

## API

Every class the package exports, with the members you use:

```ts
// Middleware — a unit of application logic
class Middleware<S = object> {        // S: the context it needs
  use(child: Middleware): void;        // add a child middleware; this context must provide what the child needs
  unuse(child: Middleware): void;      // remove a child middleware
  on(type: string | EventType, handler: (ev: any) => any): void;  // one handler per type, return true to stop propagation
  emit(type: string | EventType, ev?: any): void;  // queued as a microtask, delivered to the whole application
  get context(): S;                    // the shared context, only while activated
  get activated(): boolean;
}

// EventType — a typed event, used in place of an event name in on and emit
class EventType<P> {
  static create<P = void>(name: string): EventType<P>;
  readonly name: string;
}

// Runtime — the root of the middleware tree
class Runtime<S = object> extends Middleware<S> {
  static activate<S extends object>(middleware: Middleware<S>, context: S): void;
  static deactivate(middleware: Middleware): boolean;
}

// Driver — creates, updates and removes a component for each entity it handles
abstract class Driver<E extends object, C> {
  static create<E, C>(config: {
    filter: (entity: E) => boolean;    // true for entities this driver handles
    enter: (entity: E) => C | null;    // entity appeared, create its component, or null for none
    update: (entity: E, component: C) => void;  // every pass, including the entering one
    exit: (entity: E, component: C) => void;    // entity removed, clean up
  }): Driver<E, C>;
  ref(key: string): C | undefined;     // the component for a key
}

// Binder — tracks entities between passes and calls the driver functions
abstract class Binder<E extends object> {
  static create<E>(config: {
    key: (entity: E) => string;        // non-empty, unique within a pass, stable over time
    drivers?: Driver<E, any>[];
  }): Binder<E>;
  setData(data: (E | undefined | null)[]): void;  // pass the current entities
}

// inspect — set an Inspector that is told what runtimes do, for debugging tools
function inspect(inspector: Inspector | null): void;

// Memo — returns true when the arguments changed since the last call
class Memo {
  static init(...args: any[]): Memo;
  update(...args: any[]): boolean;
  clear(): void;
}

// Dataset — deprecated, the former name of Binder
```

`Driver` and `Binder` can also be subclassed instead of using `create`, implementing the same
members. Middlewares receive `"activate"` when they are activated and `"deactivate"` when they are
deactivated. All other events are your own — the framework has no frame-loop, so `"frame-update"`
in the examples above is emitted by a middleware you write.

## License
Polymatic is licensed under the MIT License. You can use it for free in your projects, both open-source and commercial. License file is in the root directory of the project source code.
