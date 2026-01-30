<p align="center">
  <img width="300px" height="300px" src="https://static.piqnt.com/polymatic/logo-text-sqaure.svg" />
</p>

Minimalist middleware framework for making modular games and interactive visual applications

## Examples

[Ocean](https://github.com/piqnt/polymatic-example-ocean/) - Polymatic, Stage.js  
[Watermelon Game](https://github.com/piqnt/polymatic-example-watermelon) - Polymatic, Planck/Box2D, SVG  
[8-Ball Pool](https://github.com/piqnt/polymatic-example-eight-ball) - Multiplayer including server and client implementation with Socket.io, Planck/Box2D, SVG  
[Game of Life](https://github.com/piqnt/polymatic-example-life) - Polymatic, Stage.js, made with Grok Code  
[Air Traffic Control](https://github.com/piqnt/polymatic-example-air-traffic) - Polymatic, Stage.js  
[Same Game](https://github.com/piqnt/polymatic-example-samegame) - Polymatic, Stage.js  
[Tic Tac Toe](https://github.com/piqnt/polymatic-example-tictactoe) - Polymatic, Stage.js  
[Orbital Defense](https://github.com/piqnt/polymatic-example-orbit) - Polymatic, Stage.js  
[Drone](https://github.com/piqnt/polymatic-example-drone) - Polymatic, Stage.js  


## Community

#### [Discord](https://discord.gg/f4r7QWqaK4)

#### [GitHub](https://github.com/piqnt/polymatic)

## Install

#### NPM
```bash
  npm install polymatic
```

#### CDN - UNPKG
```html
  <script src="//unpkg.com/polymatic@0.0"></script>
```

#### CDN - jsDelivr
```html
  <script src="//cdn.jsdelivr.net/npm/polymatic@0.0"></script>
```

## User Guide - 5 Minutes

Polymatic is a lightweight framework for building modular applications, and easily integrating other libraries. It does not include built-in frame-loop, rendering, physics, or any other game specific functions. Instead, it provides a simple and modular way to implement your game, and integrate other libraries, such as rendering, sound, physics, storage, networking, etc.

Polymatic is distributed as a simple JavaScript library, and is compatible with frontend and backend development tools and environments.

### Middleware

Middlewares are the building blocks of a polymatic application. You can simplify a complex applications by breaking it down to small middlewares. Middlewares share data in the context, can send and receive events, and use other middlewares.

To create a middleware simply extend the Middleware class:

```ts
class Main extends Middleware {
}
```

#### Context

Context is an object which can be accessed by all middlewares in an application. It can be used be to store game entities and state. You can use any object as context.

```ts

class GameContext {
  score: number = 0;
}

class Main extends Middleware<GameContext> {
  handleGameover() {
    console.log(this.context.score); // access context
  }
}
```

#### Events

Middlewares can communicate by sending and receiving events. To send an event we use the `emit` method, and to receive an event we use the `on` method.

```ts
this.emit("event-name", data);

this.on("event-name", (data) => {
});
```

#### Activation

To start a polymatic application we need to activate the entry middleware. To activate a middleware we pass an instance of your application entry middleware and context object to `Runtime.activate()`:

```ts
  Runtime.activate(new Main(), new MainContext());
```

A middleware can communicate with other middlewares and access context object only if it is activated. All middlewares that are used by an activated middleware are also activated.

When a middleware is activated it will receive "activate" event, and when it is deactivated it will receive "deactivate" event. You could use them to initialize and cleanup resources.

#### Use

To use a middleware in another middleware we use the `use` method:

```ts
class Main extends Middleware {
  constructor() {
    super();
    this.use(new FrameLoop());
  }
}
```

### Working with data

Middlewares share game entities and state in the context. A middleware might have internal representation of game entities to implement new behavior for an entity. For example, in a user-interface middleware we create visual elements such as sprite, or svg element, or in a physics middleware we create and add new bodies to the physics simulation for each game entity. Binder and drivers are used by middlewares to map shared entities to middleware components.

Drivers are used to implement new behavior for entities. A driver is responsible for creating, updating and removing components for entities that it handles. A binder is used to track entities and call driver functions when entities are added, updated or removed.

#### Driver

To create a Driver we need to implement filter, enter, update and exit functions. When we pass new data to a binder, these functions are called on all drivers that are added to the binder:
- `filter`: select entities that a driver should handle
- `enter`: called when new entity is added to the data
- `update`: called for existing entities and new entities
- `exit`: called when an entity is removed from the data

We can create a driver by extending the Driver class, or using the `Driver.create` method:

```ts
const fruitRenderDriver = Driver.create<Fruit, Element>({
  filter: (entity) => data.type == "fruit",
  enter: (entity) => {
    // create new svg element, or add physics body
    return component;
  },
  update: (entity, component) => {
    // in the ui middleware update the svg element
    // in the physics middleware copy body position to data entity
  },
  exit: (entity, component) => {
    // remove the svg element or physics body
  },
});
```

#### Binder

Binder needs to uniquely identify entities between updates, so it requires a key function. We can create a binder by extending the Binder class, or using the `Binder.create` method:

```ts
// create binder with key function and drivers
const renderBinder = Binder.create({
  key: (entity) => entity.key,
  drivers: [fruitRenderDriver],
});
```

Now we can pass data to binder, and it will call driver functions:
```ts
// in rendering loop
// pass entities to binder
// this will call driver functions
renderBinder.data(entities);
```

## License
Polymatic is licensed under the MIT License. You can use it for free in your projects, both open-source and commercial. License file is in the root directory of the project source code.
