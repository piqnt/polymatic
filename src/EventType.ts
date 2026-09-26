/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * A typed event, declared once, usually next to the middleware that sends it, and imported by the
 * middlewares that receive it:
 *
 * ```ts
 * export const FrameUpdate = EventType.create<{ dt: number }>("frame-update");
 *
 * this.on(FrameUpdate, (ev) => ev.dt);
 * this.emit(FrameUpdate, { dt });
 * ```
 *
 * `name` is the event's name on the wire, so string listeners and emitters of the same name
 * receive and send it too.
 */
export class EventType<P = void> {
  static create<P = void>(name: string): EventType<P> {
    return new EventType<P>(name);
  }

  /** @internal @hidden carries the payload type, never set */
  declare readonly __payload?: P;

  private constructor(readonly name: string) {}
}
