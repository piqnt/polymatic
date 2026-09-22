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
Game of Life ([Play](https://piqnt.github.io/polymatic-example-life/), [Source](https://github.com/piqnt/polymatic-example-life)) - Polymatic, Pixi.js  
Air Traffic Control ([Play](https://piqnt.github.io/polymatic-example-traffic/), [Source](https://github.com/piqnt/polymatic-example-traffic)) - Polymatic, Pixi.js  
Same Game ([Play](https://piqnt.github.io/polymatic-example-samegame/), [Source](https://github.com/piqnt/polymatic-example-samegame)) - Polymatic, Pixi.js  
Asteroid ([Play](https://piqnt.github.io/polymatic-example-asteroid/), [Source](https://github.com/piqnt/polymatic-example-asteroid)) - Polymatic, Pixi.js  
Tic Tac Toe ([Play](https://piqnt.github.io/polymatic-example-tictactoe/), [Source](https://github.com/piqnt/polymatic-example-tictactoe)) - Polymatic, Pixi.js  
Orbital Defense ([Play](https://piqnt.github.io/polymatic-example-orbit/), [Source](https://github.com/piqnt/polymatic-example-orbit)) - Polymatic, Pixi.js  
Fly ([Play](https://piqnt.github.io/polymatic-example-fly/), [Source](https://github.com/piqnt/polymatic-example-fly)) - Polymatic, Pixi.js  



## Community

#### [Discord](https://discord.gg/f4r7QWqaK4)

#### [GitHub](https://github.com/piqnt/polymatic)

## Install

#### NPM
```bash
  npm install polymatic
```

```js
  import { Middleware, Runtime } from "polymatic";
```

#### jsDelivr: ESM
```html
  <script type="module">
    // esm import, script type should be module
    import { Middleware, Runtime } from "https://cdn.jsdelivr.net/npm/polymatic@0.2/+esm";
  </script>
```

#### jsDelivr: UMD
```html
  <script src="https://cdn.jsdelivr.net/npm/polymatic@0.2"></script>
  <script>
    // global polymatic variable added via umd build
    const { Middleware, Runtime } = polymatic;
  </script>
```

#### ESM.RUN
```html
  <script type="module">
    // esm import, script type should be module
    import { Middleware, Runtime } from "https://esm.run/polymatic@0.2";
  </script>
```

#### ESM.SH
```html
  <script type="module">
    // esm import, script type should be module
    import { Middleware, Runtime } from "https://esm.sh/polymatic@0.2";
  </script>
```

#### UNPKG: UMD
```html
  <script src="https://unpkg.com/polymatic@0.2"></script>
  <script>
    // global polymatic variable added via umd build
    const { Middleware, Runtime } = polymatic;
  </script>
```

## User Guide - 5 Minutes

Polymatic is a minimalist framework for building games and interactive applications from small, composable units called **middlewares**. It does not include a built-in frame-loop, rendering, physics, or other game-specific features. Instead, it gives you a simple structure to organize your application logic, and to integrate any libraries you need, such as rendering, physics, sound, storage, and networking.

Polymatic is a plain JavaScript library, it works in browsers and servers, and with frontend and backend development tools. The API is small and predictable, which makes it easy to use for both people and AI.

A polymatic application is built on three core ideas:

- **Middleware** — a unit of application logic. Middlewares are composed into a tree using `use()`.
- **Context** — a single object shared by all middlewares in an application. Shared state and game entities live here.
- **Events** — how middlewares communicate. An emitted event is delivered to all middlewares in the application.

### Middleware

A middleware is a class that implements one part of your application, such as game logic, rendering, input, networking, or the frame-loop. To create a middleware extend the `Middleware` class:

```ts
class Main extends Middleware {
}
```

Middlewares are composed into a tree with the `use` method:

```ts
class Main extends Middleware {
  constructor() {
    super();
    this.use(new FrameLoop());
    this.use(new GameLogic());
    this.use(new Renderer());
  }
}
```

You can call `use` at any time (not only in the constructor), and remove a child middleware with `unuse`.

### Context

The context is a single object shared by the entire application, used to store shared state and game entities. You can use any object as context. You create it and pass it to `Runtime.activate` when starting the application (see Activation below).

Every middleware accesses the same object through `this.context` — it is shared by reference, so changes made by one middleware are immediately visible to all others. This is the primary way middlewares share data; events are for signaling, context is for state.

```ts
class GameContext {
  score: number = 0;
  fruits: Fruit[] = [];
}

class GameLogic extends Middleware<GameContext> {
  constructor() {
    super();
    this.on("collect-fruit", this.handleCollectFruit);
  }

  handleCollectFruit() {
    this.context.score += 1;
  }
}
```

Note that `this.context` is only available while the middleware is activated.

### Events

Middlewares communicate by sending and receiving events. Use `emit` to send an event, and `on` to register a handler (usually in the constructor):

```ts
// in one middleware
this.emit("game-over", { score: 21 });

// in another middleware
this.on("game-over", (ev) => {
  console.log(ev.score);
});
```

How events are delivered:

- **Delivered to the entire application** — an emitted event first goes up to the runtime at the root, then is passed down to every activated middleware in the tree, in tree order (parents before children). Any middleware can listen to any event, regardless of which middleware emitted it — including the emitter itself.
- **Queued, but delivered in the same frame** — `emit` does not call handlers immediately. The event is queued and delivered asynchronously, as soon as the current synchronous code finishes — still within the same frame, before the browser renders or the next `requestAnimationFrame` fires. This means the code following an `emit` call always runs before any handler receives the event.
- **One handler per event type** — each middleware can register only one handler for a given event name (`on` throws if a handler already exists).
- **Stopping propagation** — if a handler returns `true`, the event is not passed to any further middlewares.

### Activation

To start a polymatic application, pass your entry middleware and the context object to `Runtime.activate`:

```ts
Runtime.activate(new Main(), new GameContext());
```

This activates `Main` and, recursively, all middlewares it uses. A middleware can access the context and send and receive events only while it is activated.

When a middleware is activated it receives the `"activate"` event, and when it is deactivated it receives the `"deactivate"` event. Use them to initialize and clean up resources:

```ts
class FrameLoop extends Middleware {
  constructor() {
    super();
    this.on("activate", () => this.start());
    this.on("deactivate", () => this.stop());
  }
}
```

Middlewares added with `use` to an already activated middleware are activated immediately, and middlewares removed with `unuse` are deactivated. To stop an application call `Runtime.deactivate` with the entry middleware.

### Working with data: Binder and Driver

Game entities are stored in the context as plain data, but middlewares often need their own representation of those entities: a rendering middleware creates a sprite or an svg element for each entity, a physics middleware creates a physics body. Binder and Driver keep those middleware-specific components in sync with the shared entities:

- A **Driver** implements behavior for entities: it creates, updates, and removes a component for each entity that it handles.
- A **Binder** tracks entities between updates: each time you pass it the current entities, it detects which entities are new, which still exist, and which were removed, and calls the driver functions accordingly.

#### Driver

A driver implements four functions:

- `filter`: returns true for entities this driver should handle
- `enter`: called when an entity first appears — create and return its component
- `update`: called for every entity on each data pass, including entities that just entered
- `exit`: called when an entity is removed — clean up its component

If `enter` returns `null`, the driver has no component for that entity, and `update` and `exit` are not called for it.

We can create a driver by extending the `Driver` class, or using the `Driver.create` method:

```ts
const fruitRenderDriver = Driver.create<Fruit, SVGElement>({
  filter: (entity) => entity.type === "fruit",
  enter: (entity) => {
    // create a component for the entity,
    // for example an svg element, or a physics body
    return component;
  },
  update: (entity, component) => {
    // sync the component with the entity,
    // for example move the svg element to the entity position
  },
  exit: (entity, component) => {
    // clean up the component,
    // for example remove the svg element
  },
});
```

#### Binder

A binder needs a `key` function that uniquely identifies entities between updates, and a list of drivers. We can create a binder by extending the `Binder` class, or using the `Binder.create` method:

```ts
const renderBinder = Binder.create<Fruit>({
  key: (entity) => entity.id,
  drivers: [fruitRenderDriver],
});
```

Keys must be non-empty strings, and unique within each data pass. Entities with an invalid or duplicate key are ignored with a warning. The key of an entity should not change while it is in the data.

Pass the current entities to the binder, and it will call the driver functions for entities that entered, updated, or exited since the last call:

```ts
// for example on every frame
this.on("frame-update", () => {
  renderBinder.setData(this.context.fruits);
});
```

## License
Polymatic is licensed under the MIT License. You can use it for free in your projects, both open-source and commercial. License file is in the root directory of the project source code.
