/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * A middleware's name: its `displayName` if it has one, which survives minification, otherwise
 * its class name.
 */
export function nameOf(middleware: any): string {
  if (!middleware) return "?";
  return middleware.displayName ?? middleware.constructor?.name ?? "Middleware";
}

/** A short, one line text form of any value, for logs and the panel */
export function summarize(value: any, depth = 1, maxLength = 120): string {
  const text = format(value, depth, new WeakSet());
  return text.length > maxLength ? text.slice(0, maxLength - 1) + "…" : text;
}

function format(value: any, depth: number, seen: WeakSet<object>): string {
  if (value === undefined) return "";
  if (value === null) return "null";
  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "number":
      return Number.isInteger(value) ? String(value) : value.toFixed(2);
    case "boolean":
    case "bigint":
      return String(value);
    case "function":
      return "ƒ " + (value.name || "anonymous");
    case "symbol":
      return value.toString();
  }
  if (seen.has(value)) return "↻";
  seen.add(value);
  if (isSignal(value)) return "signal(" + format(value.peek(), depth, seen) + ")";
  if (value.__handlers && value.__children) return "<" + nameOf(value) + ">";
  if (typeof Node !== "undefined" && value instanceof Node) return "<" + value.nodeName.toLowerCase() + ">";
  if (Array.isArray(value)) {
    if (depth <= 0) return "[…" + value.length + "]";
    const items = value.slice(0, 5).map((item) => format(item, depth - 1, seen));
    return "[" + items.join(", ") + (value.length > 5 ? ", …" + (value.length - 5) : "") + "]";
  }
  const name = value.constructor && value.constructor !== Object ? value.constructor.name + " " : "";
  const keys = Object.keys(value);
  if (depth <= 0) return name + "{…" + keys.length + "}";
  const entries = keys.slice(0, 6).map((key) => key + ": " + format(value[key], depth - 1, seen));
  return name + "{" + entries.join(", ") + (keys.length > 6 ? ", …" : "") + "}";
}

/** A signal from @preact/signals or alike: a value, read without subscribing through peek() */
function isSignal(value: any) {
  return typeof value.peek === "function" && typeof value.subscribe === "function" && "value" in value;
}

/** The value at a dotted path, for example "mission.score" or "vertices.0" */
export function valueAt(root: any, path: string | undefined) {
  if (!path) return root;
  let value = root;
  for (const key of path.split(".").filter(Boolean)) {
    if (value == null) return undefined;
    value = isSignal(value) ? value.peek()?.[key] : value[key];
  }
  return value;
}

export function ms(value: number) {
  return value < 0.1 ? "<0.1ms" : value.toFixed(value < 10 ? 2 : 1) + "ms";
}

/**
 * A copy of a value that JSON can hold, for tools and agents reading the page: signals become
 * their values, middlewares and DOM nodes become their names, functions are left out, class
 * instances get a `$class` name, and a reference back up the path becomes "[Circular]". Below
 * `depth`, objects and arrays are summarized.
 */
export function toPlain(value: any, depth = 3, path: any[] = []): any {
  if (value === null || value === undefined) return value;
  switch (typeof value) {
    case "number":
      return Number.isFinite(value) ? value : String(value);
    case "string":
    case "boolean":
      return value;
    case "bigint":
    case "symbol":
      return value.toString();
    case "function":
      return undefined;
  }
  if (path.indexOf(value) >= 0) return "[Circular]";
  if (isSignal(value)) return toPlain(value.peek(), depth, path);
  if (value.__handlers && value.__children) return "<" + nameOf(value) + ">";
  if (typeof Node !== "undefined" && value instanceof Node) return "<" + value.nodeName.toLowerCase() + ">";
  const className = value.constructor && value.constructor !== Object ? value.constructor.name : "";
  if (depth <= 0) {
    if (Array.isArray(value)) return "[Array(" + value.length + ")]";
    return "[" + (className || "Object") + "]";
  }
  path.push(value);
  try {
    if (Array.isArray(value)) return value.map((item) => toPlain(item, depth - 1, path) ?? null);
    if (value instanceof Map) {
      const entries: any[] = [];
      value.forEach((v, k) => entries.push([toPlain(k, depth - 1, path), toPlain(v, depth - 1, path)]));
      return entries;
    }
    if (value instanceof Set) {
      const items: any[] = [];
      value.forEach((v) => items.push(toPlain(v, depth - 1, path)));
      return items;
    }
    const out: Record<string, any> = {};
    if (className) out.$class = className;
    for (const key of Object.keys(value)) {
      const plain = toPlain(value[key], depth - 1, path);
      if (plain !== undefined) out[key] = plain;
    }
    return out;
  } finally {
    path.pop();
  }
}
