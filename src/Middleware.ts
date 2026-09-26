/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { type EventType } from "./EventType";
import { Failure } from "./Failure";
import { inspector } from "./Inspector";

/** @internal @hidden true while an event is passed up to the runtime, so only its sender is inspected */
let bubbling = false;

/** @internal @hidden how many handlers ran for the event being delivered, for the inspector */
let handled = 0;

export type EventHandler = (ev?: any) => any;
export type ContextSetter<S> = (context: S) => void;

/** @internal @hidden the payload type of an event type; any for an event name */
type PayloadOf<T> = T extends EventType<infer P> ? P : any;

/** @internal @hidden the payload argument, optional for events without one */
type EventArgs<P> = [P] extends [void | undefined] ? [ev?: P] : [ev: P];

export interface MiddlewareInterface<S> {
  get activated(): boolean;

  get context(): S;
  /** @hidden @deprecated Set context directly */
  setContext(setter: ContextSetter<S>): void;

  on(type: string, handler: (ev: any) => any): void;
  emit(type: string, ev?: any): void;
}

export class Middleware<S = object> implements MiddlewareInterface<S> {
  /** @internal @hidden */
  __handlers: Record<string, EventHandler> = {};
  /** @internal @hidden */
  __children: Middleware<any>[] = [];
  /** @internal @hidden */
  __parent: MiddlewareInterface<S> = null;
  /** @internal @hidden attached, activate handler not called yet */
  __pendingActivate = false;

  get activated() {
    return this.__parent ? this.__parent.activated : false;
  }

  /**
   * Add a child middleware.
   *
   * The child's context type is what it needs, and this middleware's context type must provide
   * all of it: fields it declares with the same types. A middleware that uses children with
   * different needs declares all of them in its own context type.
   */
  use<C>(this: Middleware<NoInfer<C>>, middleware: Middleware<C>) {
    const index = this.__children.indexOf(middleware);
    if (index !== -1) return;

    if (this.activated) {
      middleware.__attach(this);
      middleware.__activate();
    }
    this.__children.push(middleware);
  }

  unuse(middleware: Middleware<any>) {
    const index = this.__children.indexOf(middleware);
    if (index !== -1) {
      this.__children.splice(index, 1);
      middleware?.__deactivate();
      middleware?.__detach();
    }
  }

  /** @experimental Replace all child middlewares with provided list */
  _swap = (children: Middleware<any>[]) => {
    const current = this.__children;
    const removed: Middleware<any>[] = [];
    const added: Middleware<any>[] = [];
    for (const child of children) {
      if (current.indexOf(child) === -1) {
        added.push(child);
      }
    }
    for (const child of current) {
      if (children.indexOf(child) === -1) {
        removed.push(child);
      }
    }
    this.__children.length = 0;
    this.__children.push(...children);
    for (const child of removed) {
      child.__deactivate();
      child.__detach();
    }
    if (this.activated) {
      for (const child of added) {
        child.__attach(this);
        child.__activate();
      }
    }
  };

  /**
   * Activation runs in two passes over the subtree: `__attach` links every middleware to its
   * parent, then `__activate` calls activate handlers, parents before children. So an activate
   * handler can rely on the whole subtree being attached. Deactivation mirrors it: `__deactivate`
   * calls deactivate handlers while the subtree is still attached, then `__detach` unlinks it.
   *
   * @internal @hidden
   */
  __attach(parent: MiddlewareInterface<S>) {
    if (this.__parent) {
      return;
    }
    this.__parent = parent;
    this.__pendingActivate = true;
    for (let i = 0; i < this.__children.length; i++) {
      this.__children[i].__attach(this);
    }
  }

  /** @internal @hidden */
  __activate() {
    if (!this.__pendingActivate) {
      return;
    }
    this.__pendingActivate = false;
    inspector()?.activate?.(this);
    this._handle("activate");
    for (let i = 0; i < this.__children.length; i++) {
      this.__children[i].__activate();
    }
  }

  /** @internal @hidden */
  __deactivate() {
    if (!this.__parent) {
      return;
    }
    // an activate handler that has not run yet has nothing to undo
    if (!this.__pendingActivate) {
      inspector()?.deactivate?.(this);
      this._handle("deactivate");
    }
    for (let i = 0; i < this.__children.length; i++) {
      this.__children[i].__deactivate();
    }
  }

  /** @internal @hidden */
  __detach() {
    if (!this.__parent) {
      return;
    }
    for (let i = 0; i < this.__children.length; i++) {
      this.__children[i].__detach();
    }
    this.__pendingActivate = false;
    this.__parent = null;
  }

  get context(): S {
    if (this.__parent) {
      return this.__parent.context;
    } else {
      return null;
    }
  }

  /** @hidden @deprecated Set context directly */
  setContext(setter: ContextSetter<S>) {
    if (this.__parent) {
      this.__parent.setContext(setter);
    } else {
      console.error("Middleware is not activated");
    }
  }

  /**
   * Add an event handler.
   *
   * If an event handler function returns true, it will stop propagation to any other middlewares.
   *
   * If it throws, or returns a promise that is rejected, the event is still delivered to the other
   * middlewares, and the error goes to `Failure` handlers up the parent chain.
   *
   * A middleware can have up to one handler for each event `type`.
   *
   * `type` is an event type, and the handler receives its payload type, or an event name.
   */
  on<T extends EventType<any> | string>(type: T, handler: (ev: PayloadOf<T>) => any): void {
    const name = typeof type === "string" ? type : type.name;
    if (this.__handlers[name]) throw Error(`Handler for ${name} already exists`);
    this.__handlers[name] = handler;
  }

  /**
   * This is used internally, calls event handler and passes down event to children.
   */
  _consume(type: string, ev?: any): boolean {
    const stop = this._handle(type, ev);
    if (stop) return true;

    for (let i = 0; i < this.__children.length; i++) {
      const stop = this.__children[i]._consume(type, ev);
      if (stop) return true;
    }
    return false;
  }

  /**
   * This is used internally, calls event handler.
   */
  _handle(type: string, ev?: any): boolean {
    if (!this.activated) return;

    const handler = this.__handlers && this.__handlers[type];
    if (handler) {
      if (typeof handler === "function") {
        handled++;
        const inspect = inspector();
        const start = inspect?.handle ? performance.now() : 0;
        let result: any;
        let failed = false;
        let error: unknown;
        try {
          result = handler.call(this, ev);
        } catch (e) {
          failed = true;
          error = e;
        }
        const stop = result === true;
        inspect?.handle?.(type, ev, this, performance.now() - start, stop);
        if (failed) {
          fail({ error, middleware: this, type, ev });
        } else if (result && typeof result.then === "function") {
          result.then(undefined, (e: unknown) => fail({ error: e, middleware: this, type, ev }));
        }
        return stop;
      }
    }
    return false;
  }

  /**
   * Send an event to all active middlewares.
   *
   * An event is first bubbled to the runtime through middleware parent chain.
   * Runtime queues events as microtask -- they are asynchronously but in the same animation frame.
   * Events are then recursively passed down to all active middlewares and their children.
   *
   * If an event handler returns true, delivering the event is stopped.
   *
   * `type` is an event type, and `ev` must be its payload type, or an event name.
   */
  emit<T extends EventType<any> | string>(type: T, ...[ev]: EventArgs<PayloadOf<T>>): void {
    if (!this.activated) return;

    const name = typeof type === "string" ? type : (type as EventType<any>).name;
    if (!bubbling) inspector()?.emit?.(name, ev, this);

    if (this.__parent) {
      const outer = bubbling;
      bubbling = true;
      try {
        this.__parent.emit(name, ev);
      } finally {
        bubbling = outer;
      }
    } else {
      console.error(Error("Not active!"));
    }
  }

  /** @hidden @deprecated */
  static activate<S extends object>(middleware: Middleware<S>, context: S) {
    return Runtime.activate(middleware, context);
  }
}

/**
 * Send a failure up the parent chain from the middleware that failed, to `Failure` handlers, until
 * one returns true. Report it as an uncaught error if none does.
 */
function fail(failure: Failure) {
  let stoppedBy: Middleware<any> | null = null;
  let m: any = failure.middleware.__parent;
  while (m && !stoppedBy) {
    const handler = m.activated && m.__handlers?.[Failure.name];
    if (typeof handler === "function") {
      try {
        if (handler.call(m, failure) === true) stoppedBy = m;
      } catch (e) {
        // a failure handler that fails is reported, and the failure goes on up
        report(e);
      }
    }
    m = m.__parent;
  }
  inspector()?.failure?.(failure, stoppedBy);
  if (!stoppedBy) report(failure.error);
}

function report(error: unknown) {
  const reportError = (globalThis as any).reportError;
  if (typeof reportError === "function") reportError(error);
  else console.error(error);
}

export class Runtime<S = object> extends Middleware<S> {
  /** @internal @hidden */
  __handlers: Record<string, EventHandler> = {};
  /** @internal @hidden */
  __children: Middleware<any>[] = [];

  private _activated = false;
  get activated() {
    return this._activated;
  }

  _activate(context: S) {
    if (this._activated) {
      return;
    }

    this._context = context;

    this._activated = true;
    for (let i = 0; i < this.__children.length; i++) {
      this.__children[i].__attach(this);
    }
    inspector()?.activate?.(this);
    this._handle("activate");
    for (let i = 0; i < this.__children.length; i++) {
      this.__children[i].__activate();
    }
  }

  _deactivate() {
    if (!this._activated) {
      return;
    }
    // still activated while deactivate handlers run, since handlers only run while activated
    inspector()?.deactivate?.(this);
    this._handle("deactivate");
    for (let i = 0; i < this.__children.length; i++) {
      this.__children[i].__deactivate();
    }
    for (let i = 0; i < this.__children.length; i++) {
      this.__children[i].__detach();
    }
    this._activated = false;
  }

  private _context: S;
  get context() {
    return this._context;
  }

  private contextUpdateEmitTimeout: any;
  private contextUpdateEmit = () => {
    this.emit("context-change");
  };

  setContext(setter: ContextSetter<S>) {
    if (typeof setter !== "function") {
      console.error("Setter is not a function: ", setter);
      return;
    }
    setter(this.context);
    clearTimeout(this.contextUpdateEmitTimeout);
    this.contextUpdateEmitTimeout = setTimeout(this.contextUpdateEmit);
  }

  private _microtask = Promise.resolve();

  emit<T extends EventType<any> | string>(type: T, ...[ev]: EventArgs<PayloadOf<T>>): void {
    const name = typeof type === "string" ? type : (type as EventType<any>).name;
    if (!bubbling) inspector()?.emit?.(name, ev, this);
    this._microtask.then(() => this.__dispatch(name, ev));
  }

  /** @internal @hidden delivers a queued event down the tree */
  __dispatch(name: string, ev: any) {
    const inspect = inspector();
    if (!inspect) {
      this._consume(name, ev);
      return;
    }
    inspect.dispatch?.(name, ev, this);
    const outer = handled;
    handled = 0;
    try {
      this._consume(name, ev);
    } finally {
      const count = handled;
      handled = outer;
      inspect.dispatched?.(name, ev, count);
    }
  }

  static activate<S extends object>(middleware: Middleware<S>, context: S) {
    const manager = new Runtime<S>();
    manager.use(middleware);
    manager._activate(context);
  }

  static deactivate(middleware: Middleware<any>) {
    if ("_deactivate" in middleware && typeof middleware._deactivate === "function") {
      middleware._deactivate();
      return true;
    }
    const parent = middleware.__parent;
    if (parent && "_deactivate" in parent && typeof parent._deactivate === "function") {
      parent._deactivate();
      return true;
    }
    return false;
  }
}
