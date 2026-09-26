/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { EventType } from "./EventType";
import { type Middleware } from "./Middleware";

/** A handler that threw, or whose promise was rejected */
export interface Failure {
  error: unknown;
  /** the middleware whose handler failed */
  middleware: Middleware<any>;
  /** the event it was handling, or "activate" or "deactivate" */
  type: string;
  /** the event's payload */
  ev: unknown;
}

/**
 * Handle failures in a middleware's subtree, like an error boundary:
 *
 * ```ts
 * this.on(Failure, (failure) => {
 *   this.unuse(failure.middleware);
 *   return true;
 * });
 * ```
 *
 * A failure goes up the parent chain from the middleware that failed, to the first `Failure`
 * handler. If that handler returns true the failure stops there, otherwise it goes on up. A failure
 * that no handler stops is reported like an uncaught error, with `reportError`.
 *
 * A failed handler doesn't stop the event: it is still delivered to the other middlewares.
 */
export const Failure = EventType.create<Failure>("polymatic:failure");
