/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { type Middleware } from "./Middleware";

/**
 * Receives what runtimes do, for debugging tools such as `polymatic/devtools`. Every method is
 * optional. Set one with `inspect`.
 */
export interface Inspector {
  /** A middleware sent an event; it is queued, and delivered shortly after. */
  emit?(type: string, ev: unknown, from: Middleware<any>): void;

  /** Delivery of a queued event starts, from `runtime` down its tree. */
  dispatch?(type: string, ev: unknown, runtime: Middleware<any>): void;

  /** A middleware's handler ran for the event being delivered, or for activate or deactivate. */
  handle?(type: string, ev: unknown, middleware: Middleware<any>, ms: number, stopped: boolean): void;

  /** Delivery of the event ended; `handled` is how many handlers ran. */
  dispatched?(type: string, ev: unknown, handled: number): void;

  /** A middleware is being activated, before its activate handler runs. */
  activate?(middleware: Middleware<any>): void;

  /** A middleware is being deactivated, before its deactivate handler runs. */
  deactivate?(middleware: Middleware<any>): void;
}

/**
 * Where the inspector is kept: a global, so a tool can attach to an application that uses a
 * different copy of polymatic, for example a browser extension.
 */
const INSPECTOR_KEY = "__POLYMATIC_INSPECTOR__";

/** Set the inspector that receives what all runtimes do, or null to remove it. */
export function inspect(inspector: Inspector | null) {
  (globalThis as any)[INSPECTOR_KEY] = inspector ?? undefined;
}

/** @internal @hidden */
export function inspector(): Inspector | undefined {
  return (globalThis as any)[INSPECTOR_KEY];
}
