/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { inspect } from "../Inspector";
import { type Middleware } from "../Middleware";
import { Panel } from "./Panel";
import { type EventRecord, type FrameCost, Recorder, walk } from "./Recorder";
import { ms, nameOf, summarize, toPlain, valueAt } from "./format";

export type { EventRecord, FrameCost, HandlerRecord, LifecycleRecord } from "./Recorder";

/** Devtools settings, changed with `polymaticDevtools.config()` */
export interface DevtoolsConfig {
  /** toggle the panel with Alt+Shift+D; default true */
  hotkey: boolean;
  /** events whose handlers are timed per frame; default "frame-update" and "frame-render" */
  frameEvents: string[];
  /** how many events to keep; default 500 */
  maxEvents: number;
  /** keep frame events in the event log too; default false, since they are many and timed per frame */
  logFrameEvents: boolean;
  /**
   * don't print what tree, events, unmatched, frame and report return; default false. Useful when
   * a tool or an agent reads the returned data. log and watch still print, as that is what they do.
   */
  quiet: boolean;
}

const settings: DevtoolsConfig = {
  hotkey: true,
  frameEvents: ["frame-update", "frame-render"],
  maxEvents: 500,
  logFrameEvents: false,
  quiet: false,
};

/** console output of the query methods, off when quiet */
const say = {
  log: (...args: any[]) => settings.quiet || console.log(...args),
  table: (data: any) => settings.quiet || console.table(data),
  info: (...args: any[]) => settings.quiet || console.info(...args),
};

/** A middleware in the tree, as plain data */
export interface TreeNode {
  name: string;
  active: boolean;
  /** the events it handles */
  events: string[];
  children: TreeNode[];
}

/** An event, in short */
export interface EventSummary {
  id: number;
  type: string;
  from: string;
  /** how many handlers ran */
  handled: number | undefined;
  /** the middleware that stopped it, if one did */
  stoppedBy?: string;
  /** total handler time, in ms */
  ms: number;
  payload: string;
}

/** Everything at once, as plain data that JSON can hold */
export interface Report {
  installed: boolean;
  /** the id of the last event delivered; pass it to `waitFor(type, { after })` */
  lastEventId: number;
  tree: TreeNode[];
  /** the last events, oldest first */
  events: EventSummary[];
  unmatched: { noHandler: { type: string; count: number }[]; notSent: { type: string; middlewares: string[] }[] };
  frame: Record<string, FrameCost[]>;
}

export interface WaitOptions {
  /**
   * Also accept an event already delivered after this event id, from `report().lastEventId`. Get
   * the id before the action that sends the event, so an event delivered in between is not missed.
   */
  after?: number;
  /** only an event this returns true for */
  where?: (event: EventRecord) => boolean;
  /** give up after this many ms, rejecting the promise; default 10000, 0 for never */
  timeout?: number;
}

/**
 * The devtools, also available in the browser console as `polymaticDevtools`. Nothing is recorded
 * until `install()` is called; the other methods need it.
 */
export interface Devtools {
  /** Start recording what polymatic runtimes do, before or after the application is activated */
  install(): Devtools;
  /** Change settings, before or after installing, and return them; call without changes to read them */
  config(changes?: Partial<DevtoolsConfig>): DevtoolsConfig;
  /** Stop recording, and remove the panel and the hotkey; `install()` starts again */
  uninstall(): void;
  /** Whether it is recording */
  readonly installed: boolean;

  /** The middleware tree of each runtime; printed, and returned */
  tree(): TreeNode[];
  /** The last events, optionally only those whose type or sender contains `filter`; printed, and returned */
  events(filter?: string): EventRecord[];
  /** Events sent to no handler, and handlers for events not sent so far; printed, and returned */
  unmatched(): ReturnType<Recorder["unmatched"]>;
  /** Handler time per middleware for each frame event, over the last 60 frames; printed, and returned */
  frame(): Record<string, FrameCost[]>;
  /** Everything at once, as plain data that JSON can hold: tree, last events, unmatched events, frame times */
  report(options?: { events?: number }): Report;
  /** Resolves with the next event of this type once its delivery ends, after its handlers ran */
  waitFor(type: string | { name: string }, options?: WaitOptions): Promise<EventRecord>;
  /** A copy of the first runtime's context, or of the value at a dotted path in it, that JSON can hold */
  snapshot(path?: string, depth?: number): any;
  /** The first runtime's context, or the value at a dotted path in it */
  context(path?: string): any;
  /** Log a context path whenever it changes after an event */
  watch(path: string): void;
  /** Stop logging a context path, or all of them */
  unwatch(path?: string): void;
  /** Log events whose type matches, as they are delivered; null to stop */
  log(pattern: string | RegExp | null): void;
  /** Show or hide the panel, or toggle it */
  panel(show?: boolean): void;
  /** Forget recorded events */
  clear(): void;
  /** What has been recorded, or null before `install()` */
  readonly recorder: Recorder | null;
}

/** What exists while installed */
interface Session {
  recorder: Recorder;
  panel: Panel | null;
  logPattern: RegExp | null;
  watched: Map<string, string>;
  /** add or remove the hotkey listener */
  setHotkey: (on: boolean) => void;
  stop: () => void;
}

let session: Session | null = null;

/** The session, or null with a note in the console when the devtools are not installed */
function active(): Session | null {
  if (!session) say.info(NOT_INSTALLED);
  return session;
}

const NOT_INSTALLED = "[polymatic] devtools are not installed, call polymaticDevtools.install() first";

function buildTree(s: Session): TreeNode[] {
  const build = (m: Middleware<any>): TreeNode => ({
    name: nameOf(m),
    active: m.activated,
    events: Object.keys(m.__handlers),
    children: m.__children.map(build),
  });
  return [...s.recorder.runtimes].map(build);
}

function summary(e: EventRecord): EventSummary {
  return {
    id: e.id,
    type: e.type,
    from: e.from,
    handled: e.handled,
    stoppedBy: e.handlers.find((h) => h.stopped)?.middleware,
    ms: Math.round(e.handlers.reduce((sum, h) => sum + h.ms, 0) * 1000) / 1000,
    payload: e.payload,
  };
}

function getPanel(s: Session) {
  return (s.panel ??= new Panel(s.recorder));
}

function firstContext(s: Session) {
  const runtime = [...s.recorder.runtimes][0] as Middleware<any> | undefined;
  return runtime?.context;
}

/** The devtools; the same object as the `polymaticDevtools` global */
export const polymaticDevtools: Devtools = {
  get installed() {
    return !!session;
  },

  get recorder() {
    return session?.recorder ?? null;
  },

  config(changes?: Partial<DevtoolsConfig>) {
    Object.assign(settings, changes ?? {});
    session?.recorder.configure(settings);
    session?.setHotkey(settings.hotkey);
    return { ...settings, frameEvents: [...settings.frameEvents] };
  },

  install() {
    if (session) return polymaticDevtools;

    const recorder = new Recorder(settings);
    const s: Session = {
      recorder,
      panel: null,
      logPattern: null,
      watched: new Map(),
      setHotkey: () => {},
      stop: () => {},
    };

    const stopListening = recorder.onDelivered((record) => {
      if (s.logPattern && s.logPattern.test(record.type)) {
        const handlers = record.handlers.map((h) => h.middleware + (h.stopped ? " (stopped)" : "")).join(", ");
        console.log(
          `%c${record.type}%c from ${record.from} → ${handlers || "no handler"}`,
          "color:#5b70b8;font-weight:bold",
          "color:inherit",
          record.payload
        );
      }
      if (s.watched.size) {
        const context = firstContext(s);
        s.watched.forEach((last, path) => {
          const now = summarize(valueAt(context, path), 2, 200);
          if (now !== last) {
            console.log(`[polymatic] context.${path}: ${last} → ${now}`, `(after ${record.type})`);
            s.watched.set(path, now);
          }
        });
      }
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.code === "KeyD") getPanel(s).toggle();
    };
    let hotkey = false;
    s.setHotkey = (on) => {
      on = on && typeof window !== "undefined";
      if (on === hotkey) return;
      hotkey = on;
      if (on) window.addEventListener("keydown", onKey);
      else window.removeEventListener("keydown", onKey);
    };
    s.setHotkey(settings.hotkey);

    s.stop = () => {
      stopListening();
      s.panel?.hide();
      s.setHotkey(false);
    };

    session = s;
    inspect(recorder);
    return polymaticDevtools;
  },

  uninstall() {
    if (!session) return;
    inspect(null);
    session.stop();
    session = null;
  },

  tree() {
    const s = active();
    if (!s) return [];
    const trees = buildTree(s);
    for (const runtime of s.recorder.runtimes) {
      const lines: string[] = [];
      walk(runtime, (m, depth) => {
        const events = Object.keys(m.__handlers);
        lines.push(
          "  ".repeat(depth) +
            (m.activated ? "● " : "○ ") +
            nameOf(m) +
            (events.length ? "  [" + events.join(", ") + "]" : "")
        );
      });
      say.log(lines.join("\n"));
    }
    if (!trees.length) say.log("[polymatic] no runtime seen yet");
    return trees;
  },

  events(filter?: string) {
    const s = active();
    if (!s) return [];
    const f = filter?.toLowerCase();
    const events = s.recorder.events.filter(
      (e) => !f || e.type.toLowerCase().includes(f) || e.from.toLowerCase().includes(f)
    );
    say.table(
      events.slice(-50).map((e) => ({
        type: e.type,
        from: e.from,
        handled: e.handled,
        "stopped by": e.handlers.find((h) => h.stopped)?.middleware ?? "",
        "handler time": ms(e.handlers.reduce((sum, h) => sum + h.ms, 0)),
        payload: e.payload,
      }))
    );
    return events;
  },

  unmatched() {
    const s = active();
    if (!s) return { noHandler: [], notSent: [] };
    const result = s.recorder.unmatched();
    say.log("[polymatic] sent, but no middleware handled them:");
    say.table(result.noHandler);
    say.log("[polymatic] handled, but not sent so far:");
    say.table(result.notSent.map((n) => ({ type: n.type, by: n.middlewares.join(", ") })));
    return result;
  },

  frame() {
    const s = active();
    if (!s) return {};
    const costs = s.recorder.frameCosts();
    for (const type of Object.keys(costs)) {
      say.log(`[polymatic] ${type}, last 60 frames:`);
      say.table(costs[type].map((r) => ({ middleware: r.middleware, avg: ms(r.avg), max: ms(r.max) })));
    }
    return costs;
  },

  report(options?: { events?: number }) {
    const s = active();
    const empty = { noHandler: [], notSent: [] };
    if (!s) return { installed: false, lastEventId: 0, tree: [], events: [], unmatched: empty, frame: {} };
    const round = (n: number) => Math.round(n * 1000) / 1000;
    const costs = s.recorder.frameCosts();
    const frame: Record<string, FrameCost[]> = {};
    for (const type of Object.keys(costs)) {
      frame[type] = costs[type].map((c) => ({ middleware: c.middleware, avg: round(c.avg), max: round(c.max) }));
    }
    const report: Report = {
      installed: true,
      lastEventId: s.recorder.lastId,
      tree: buildTree(s),
      events: s.recorder.events.slice(-(options?.events ?? 20)).map(summary),
      unmatched: s.recorder.unmatched(),
      frame,
    };
    say.log("[polymatic] report", report);
    return report;
  },

  waitFor(type: string | { name: string }, options: WaitOptions = {}) {
    const s = session;
    if (!s) return Promise.reject(new Error(NOT_INSTALLED));
    const name = typeof type === "string" ? type : type.name;
    const { after, where, timeout = 10000 } = options;
    const matches = (e: EventRecord) =>
      e.type === name && (after === undefined || e.id > after) && (!where || where(e));

    const done = after !== undefined ? s.recorder.events.find(matches) : undefined;
    if (done) return Promise.resolve(done);

    return new Promise<EventRecord>((resolve, reject) => {
      let timer: any = null;
      const stop = s.recorder.onDelivered((e) => {
        if (!matches(e)) return;
        stop();
        clearTimeout(timer);
        resolve(e);
      });
      if (timeout > 0) {
        timer = setTimeout(() => {
          stop();
          reject(new Error(`[polymatic] timed out after ${timeout}ms waiting for "${name}"`));
        }, timeout);
      }
    });
  },

  snapshot(path?: string, depth = 3) {
    const s = active();
    return s ? toPlain(valueAt(firstContext(s), path), depth) : undefined;
  },

  context(path?: string) {
    const s = active();
    return s ? valueAt(firstContext(s), path) : undefined;
  },

  watch(path: string) {
    const s = active();
    if (s) s.watched.set(path, summarize(valueAt(firstContext(s), path), 2, 200));
  },

  unwatch(path?: string) {
    if (!session) return;
    if (path) session.watched.delete(path);
    else session.watched.clear();
  },

  log(pattern: string | RegExp | null) {
    const s = active();
    if (s) s.logPattern = pattern === null ? null : typeof pattern === "string" ? new RegExp(pattern) : pattern;
  },

  panel(show?: boolean) {
    const s = active();
    if (!s) return;
    if (show === undefined) getPanel(s).toggle();
    else if (show) getPanel(s).show();
    else s.panel?.hide();
  },

  clear() {
    session?.recorder.clear();
  },
};

// loading the devtools makes them available in the console, recording starts with install()
if (typeof globalThis !== "undefined" && !(globalThis as any).polymaticDevtools) {
  (globalThis as any).polymaticDevtools = polymaticDevtools;
}

export default polymaticDevtools;
