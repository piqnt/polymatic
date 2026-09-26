/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { type Inspector } from "../Inspector";
import { type Middleware } from "../Middleware";
import { nameOf, summarize } from "./format";

/** A handler that ran for an event */
export interface HandlerRecord {
  middleware: string;
  ms: number;
  stopped: boolean;
}

/** An event, from when it was sent to when its delivery ended */
export interface EventRecord {
  id: number;
  type: string;
  /** the middleware that sent it */
  from: string;
  /** a short text form of the payload, taken when it was sent */
  payload: string;
  /** when it was sent, in ms since the page loaded */
  sent: number;
  /** when its delivery started; unset while it is queued */
  delivered?: number;
  handlers: HandlerRecord[];
  /** how many handlers ran; unset while it is queued or being delivered */
  handled?: number;
}

export interface LifecycleRecord {
  time: number;
  middleware: string;
  change: "activate" | "deactivate";
  ms?: number;
}

/** Average and worst handler time of one middleware for one frame event */
export interface FrameCost {
  middleware: string;
  avg: number;
  max: number;
}

export interface RecorderOptions {
  /** events whose handlers are timed per frame; default "frame-update" and "frame-render" */
  frameEvents?: string[];
  /** how many events to keep; default 500 */
  maxEvents?: number;
  /** keep frame events in the event log too; default false, since they are many and timed per frame */
  logFrameEvents?: boolean;
}

const LIFECYCLE = new Set(["activate", "deactivate"]);
const FRAMES_KEPT = 60;

/** Records what runtimes do, as an inspector */
export class Recorder implements Inspector {
  readonly runtimes = new Set<Middleware<any>>();
  readonly events: EventRecord[] = [];
  readonly lifecycle: LifecycleRecord[] = [];
  /** how many times each event was sent */
  readonly sent = new Map<string, number>();
  /** how many times each event was delivered to no handler */
  readonly unhandled = new Map<string, number>();
  /** the id of the last event delivered, logged or not; 0 before any */
  lastId = 0;

  private frameEvents: Set<string>;
  private maxEvents: number;
  private logFrameEvents: boolean;
  private nextId = 1;
  private queued: { record: EventRecord; ev: unknown; runtime: Middleware<any> | null }[] = [];
  private current: EventRecord | null = null;
  private frames = new Map<string, Map<Middleware<any>, number>[]>();
  private frame: Map<Middleware<any>, number> | null = null;
  private listeners = new Set<(record: EventRecord) => void>();

  constructor(options: RecorderOptions = {}) {
    this.frameEvents = new Set(["frame-update", "frame-render"]);
    this.maxEvents = 500;
    this.logFrameEvents = false;
    this.configure(options);
  }

  /** Change settings; those left out stay as they are */
  configure(options: RecorderOptions) {
    if (options.frameEvents) this.frameEvents = new Set(options.frameEvents);
    if (options.logFrameEvents !== undefined) this.logFrameEvents = options.logFrameEvents;
    if (options.maxEvents !== undefined) {
      this.maxEvents = options.maxEvents;
      this.events.splice(0, Math.max(0, this.events.length - this.maxEvents));
      this.lifecycle.splice(0, Math.max(0, this.lifecycle.length - this.maxEvents));
    }
  }

  /** Called with each event once its delivery ends */
  onDelivered(listener: (record: EventRecord) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clear() {
    this.events.length = 0;
    this.lifecycle.length = 0;
    this.sent.clear();
    this.unhandled.clear();
    this.frames.clear();
  }

  // --- inspector

  emit(type: string, ev: unknown, from: Middleware<any>) {
    const runtime = rootOf(from);
    if (runtime) this.runtimes.add(runtime);
    this.sent.set(type, (this.sent.get(type) ?? 0) + 1);
    const record: EventRecord = {
      id: this.nextId++,
      type,
      from: nameOf(from),
      payload: summarize(ev, 1, 80),
      sent: performance.now(),
      handlers: [],
    };
    this.queued.push({ record, ev, runtime });
  }

  dispatch(type: string, ev: unknown, runtime: Middleware<any>) {
    this.runtimes.add(runtime);
    const index = this.queued.findIndex((q) => q.record.type === type && q.ev === ev && q.runtime === runtime);
    const record =
      index >= 0
        ? this.queued.splice(index, 1)[0].record
        : { id: this.nextId++, type, from: "?", payload: summarize(ev, 1, 80), sent: performance.now(), handlers: [] };
    record.delivered = performance.now();
    this.current = record;
    this.frame = this.frameEvents.has(type) ? new Map() : null;
  }

  handle(type: string, ev: unknown, middleware: Middleware<any>, ms: number, stopped: boolean) {
    if (LIFECYCLE.has(type) && this.current?.type !== type) {
      // a lifecycle handler, maybe run while another event is being delivered
      const last = this.lifecycle[this.lifecycle.length - 1];
      if (last && last.change === type && last.middleware === nameOf(middleware)) last.ms = ms;
      return;
    }
    if (!this.current || this.current.type !== type) return;
    this.current.handlers.push({ middleware: nameOf(middleware), ms, stopped });
    this.frame?.set(middleware, (this.frame.get(middleware) ?? 0) + ms);
  }

  dispatched(type: string, ev: unknown, handled: number) {
    const record = this.current;
    this.current = null;
    if (!record) return;
    record.handled = handled;
    this.lastId = record.id;
    if (handled === 0 && !LIFECYCLE.has(type)) {
      this.unhandled.set(type, (this.unhandled.get(type) ?? 0) + 1);
    }
    if (this.frame) {
      let samples = this.frames.get(type);
      if (!samples) this.frames.set(type, (samples = []));
      samples.push(this.frame);
      if (samples.length > FRAMES_KEPT) samples.shift();
      this.frame = null;
    }
    if (this.logFrameEvents || !this.frameEvents.has(type)) {
      this.events.push(record);
      if (this.events.length > this.maxEvents) this.events.shift();
    }
    this.listeners.forEach((listener) => listener(record));
  }

  activate(middleware: Middleware<any>) {
    if (!middleware.__parent) this.runtimes.add(middleware);
    this.pushLifecycle(middleware, "activate");
  }

  deactivate(middleware: Middleware<any>) {
    this.pushLifecycle(middleware, "deactivate");
  }

  private pushLifecycle(middleware: Middleware<any>, change: "activate" | "deactivate") {
    this.lifecycle.push({ time: performance.now(), middleware: nameOf(middleware), change });
    if (this.lifecycle.length > this.maxEvents) this.lifecycle.shift();
  }

  // --- queries

  /** Average and worst handler time per middleware, over the last frames of each frame event */
  frameCosts(): Record<string, FrameCost[]> {
    const result: Record<string, FrameCost[]> = {};
    this.frames.forEach((samples, type) => {
      const totals = new Map<Middleware<any>, { sum: number; max: number }>();
      for (const sample of samples) {
        sample.forEach((ms, middleware) => {
          const t = totals.get(middleware) ?? { sum: 0, max: 0 };
          t.sum += ms;
          t.max = Math.max(t.max, ms);
          totals.set(middleware, t);
        });
      }
      result[type] = [...totals.entries()]
        .map(([middleware, t]) => ({ middleware: nameOf(middleware), avg: t.sum / samples.length, max: t.max }))
        .sort((a, b) => b.avg - a.avg);
    });
    return result;
  }

  /** Events sent to no handler, and handlers in the tree for events not sent so far */
  unmatched() {
    const noHandler = [...this.unhandled.entries()].map(([type, count]) => ({ type, count }));
    const handlers = new Map<string, string[]>();
    for (const runtime of this.runtimes) {
      walk(runtime, (middleware) => {
        if (!middleware.activated) return;
        for (const type of Object.keys(middleware.__handlers)) {
          if (LIFECYCLE.has(type) || this.sent.has(type)) continue;
          handlers.set(type, [...(handlers.get(type) ?? []), nameOf(middleware)]);
        }
      });
    }
    const notSent = [...handlers.entries()].map(([type, middlewares]) => ({ type, middlewares }));
    return { noHandler, notSent };
  }
}

/** The runtime at the root of a middleware's tree, or null if it is not attached */
export function rootOf(middleware: Middleware<any>): Middleware<any> | null {
  let m: any = middleware;
  while (m?.__parent) m = m.__parent;
  return m && m !== middleware ? m : m?.activated ? m : null;
}

/** Visit a middleware and all of its children */
export function walk(middleware: Middleware<any>, visit: (m: Middleware<any>, depth: number) => void, depth = 0) {
  visit(middleware, depth);
  for (const child of middleware.__children) walk(child, visit, depth + 1);
}
