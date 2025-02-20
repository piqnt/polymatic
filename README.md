<p align="center">
  <img width="300px" height="300px" src="https://static.piqnt.com/polymatic/logo-text-sqaure.svg" />
</p>

Minimalist middleware framework for making games and interactive visual application

## Examples

[Watermelon Game](https://github.com/piqnt/polymatic-example-watermelon)

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

## User Guide

Polymatic is a minimalist middleware framework. It does not have game loop, rendering, physics, or any other game specific functions. Instead, it provides a simple way to implement your game functions, and integrate other libraries. Polymatic is designed to use other libraries for rendering, sound, physics, storage, networking, etc.

Polymatic is inspired by ECS (entity-component-system) architecture; *middlewares* can be used to implement systems, and *data-drivers* can be used to decouple data (entity) from behavior (component). However unlike mainstream ECS framework, Polymatic does not manage your data, and doesn't have queries.

Polymatic is distributed as a simple js library and works with existing web development tools such dependency management, build, deployment, etc.

### Middleware

Middlewares are the building blocks of a polymatic application. You can simplify a complex applications by breaking it down to small middlewares. Middlewares share data in the context, can send and receive events, and use other middlewares.

To create a middleware simply extend the Middleware class:

```ts
class Main extends Middleware {
}
```

#### Context

Context is an object which can be accessed by all middlewares in an application. It can be used be to store game entities and state. You can use any object as context.

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

A middleware can communicate with other middlewares and access context object if it is activated. All middlewares that are used by an activated middleware are also activated.

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

### Data Driver

Middlewares share game entities and state in the context. A middleware might have internal representation of game entities to implement new behavior for an entity. For example in a user-interface middleware we create visual elements (such as sprite, or svg element), or in physics middleware we create and add new bodies to the physics simulation for each game entity. Data drivers are used by middlewares to map game entities to middleware components.

To use data-drivers we first create a Dataset to track game entities, and then add Driver to the dataset to map components.

#### Dataset

Dataset needs to uniquely identify entities between updates, so it requires a key function. We can create a dataset by extending the Dataset class, or using the `Dataset.create` method:

```ts
// create dataset
const dataset = Dataset.create({
  key: (entity) => entity.key,
});

// add driver to dataset
dataset.addDriver(driver);

// assign data to dataset
// this will call driver functions
dataset.data([...]);
```

#### Driver

To create a Driver we need to implement filter, enter, update and exit functions. When we assign new data to a dataset, these functions are called on all drivers that listen to the dataset:
- `filter`: select entities that a driver should handle
- `enter`: called when new entity is added to the dataset
- `update`: called for existing entities and new entities
- `exit`: called when an entity is removed from the dataset

We can create a driver by extending the Driver class, or using the `Driver.create` method:

```ts
const driver = Driver.create<Fruit, Element>({
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

dataset.addDriver(driver);
```

## License
Polymatic is licensed under the MIT License. You can use it for free in your projects, both open-source and commercial. License file is in the root directory of the project source code.

