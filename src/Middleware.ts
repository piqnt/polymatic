/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { debug, watch } from "./internal/debug";

/** @internal @hidden */
const debugEvent = debug("middleware.event", (type: string) => {
  return !(type?.endsWith("-move") || type === "hotsyncWorld");
});

/** @internal @hidden */
const debugMiddleware = debug("middleware.lifecycle");

/** @internal @hidden */
type DeepPartial<S> = {
  [P in keyof S]?: S[P] extends object ? DeepPartial<S[P]> : S[P];
};

// todo: type this
export type EventHandler = (ev?: any) => any;
export type ContextSetter<S> = (context: S) => void;

export interface MiddlewareInterface<S> {
  get activated(): boolean;

  get context(): S;
  setContext(setter: ContextSetter<S>): void;

  on(type: string, handler: (ev: any) => any): void;
  emit(type: string, ev: any): void;
}

export class Middleware<S = object> implements MiddlewareInterface<S> {
  protected handlers: Record<string, EventHandler> = {};
  protected children: Middleware<DeepPartial<S>>[] = [];
  protected parent: MiddlewareInterface<S> = null;

  get activated() {
    return this.parent && this.parent.activated;
  }

  /** Add a child middleware */
  use(middleware: Middleware<DeepPartial<S>>) {
    const index = this.children.indexOf(middleware);
    if (index !== -1) return;

    if (this.activated) {
      middleware.__attach(this);
    }
    this.children.push(middleware);
  }

  unuse(middleware: Middleware<DeepPartial<S>>) {
    const index = this.children.indexOf(middleware);
    if (index !== -1) {
      this.children.splice(index, 1);
      middleware?.__detach();
    }
  }

  /** @internal @hidden */
  __attach(parent: MiddlewareInterface<S>) {
    if (this.parent) {
      return;
    }
    this.parent = parent;
    debugMiddleware("activate", "+", this.constructor.name);
    this._handle("activate");
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].__attach(this);
    }
  }

  /** @internal @hidden */
  __detach() {
    if (!this.parent) {
      return;
    }
    debugMiddleware("deactivate", "-", this.constructor.name);
    this._handle("deactivate");
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].__detach();
    }
    this.parent = null;
  }

  get context(): S {
    if (this.parent) {
      return this.parent.context;
    } else {
      return null;
    }
  }

  setContext(setter: ContextSetter<S>) {
    if (this.parent) {
      this.parent.setContext(setter);
    } else {
      console.error("Middleware is not activated");
    }
  }

  /**
   * Add an event handler
   */
  on(type: string, handler: (ev: any) => any): void {
    if (this.handlers[type]) throw Error(`Handler for ${type} already exists`);
    this.handlers[type] = handler;
  }

  /**
   * "capture" an event: call handlers and pass it to children.
   */
  _consume(type: string, ev?: any): boolean {
    // debugEvent(name, "↓", this.constructor.name, ev);

    const stop = this._handle(type, ev);
    if (stop) return true;

    for (let i = 0; i < this.children.length; i++) {
      const stop = this.children[i]._consume(type, ev);
      if (stop) return true;
    }
    return false;
  }

  /**
   * Call event handler registered on this middleware
   */
  _handle(type: string, ev?: any): boolean {
    const handler = this.handlers && this.handlers[type];
    if (handler) {
      if (typeof handler === "function") {
        debugEvent(type, "→", this.constructor.name, ev);

        const stop = handler.call(this, ev);
        if (stop === true) return true;
      }
    }
    return false;
  }

  /**
   * "bubble" an event to parent, pass to parent until it reaches the top.
   */
  emit(type: string, ev?: any): void {
    debugEvent(type, "↑", this.constructor.name, ev);

    if (this.parent) {
      this.parent.emit(type, ev);
    } else {
      console.error(Error("Not active!"));
    }
  }

  /** @hidden @deprecated */
  static activate<S extends object>(middleware: Middleware<S>, context: S) {
    return Runtime.activate(middleware, context);
  }
}

export class Runtime<S = object> extends Middleware<S> {
  protected handlers: Record<string, EventHandler> = {};
  protected children: Middleware<DeepPartial<S>>[] = [];

  private _activated = false;
  get activated() {
    return this._activated;
  }

  _activate(context: S) {
    if (this._activated) {
      return;
    }

    context = watch("middleware.context", context as object) as S;

    this._context = context;

    this._activated = true;
    this._handle("activate");
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].__attach(this);
    }
  }

  _deactivate() {
    if (!this._activated) {
      return;
    }
    this._activated = false;
    this._handle("deactivate");
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].__detach();
    }
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

  emit(name: string, ev?: any): void {
    // todo: use queue
    setTimeout(() => {
      this._consume(name, ev);
    });
  }

  static activate<S extends object>(middleware: Middleware<S>, context: S) {
    const manager = new Runtime();
    manager.use(middleware);
    manager._activate(context);
  }
}
