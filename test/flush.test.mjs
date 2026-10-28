// Runtime.flush against the build (`npm run build` first): the order of delivery with and without it.
import { test } from "node:test";
import assert from "node:assert/strict";

import { Middleware, Runtime } from "../dist/polymatic.js";

/** a tree that logs what it gets: a root, and a child after it */
function tree(setup) {
  const log = [];
  const root = new Middleware();
  const child = new Middleware();
  root.use(child);
  for (const name of ["a", "b", "c", "d", "nest"]) child.on(name, () => log.push(`child-${name}`));
  setup(root, log);
  Runtime.activate(root, {});
  return { root, log };
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test("a flush delivers the queued events in order, and the events their handlers send, until none is left", async () => {
  const { root, log } = tree((root, log) => {
    root.on("a", () => (log.push("a"), root.emit("c")));
    root.on("b", () => log.push("b"));
    root.on("c", () => log.push("c"));
  });
  root.emit("a");
  root.emit("b");
  assert.equal(Runtime.flush(root), true);
  assert.deepEqual(log, ["a", "child-a", "b", "child-b", "c", "child-c"]);
  await tick();
  assert.equal(log.length, 6, "the microtasks left behind deliver nothing twice");
});

test("without a flush, delivery is as before: an event sent by a handler comes after those already queued", async () => {
  const { root, log } = tree((root, log) => {
    root.on("a", () => (log.push("a"), root.emit("c")));
    root.on("b", () => log.push("b"));
    root.on("c", () => log.push("c"));
  });
  root.emit("a");
  root.emit("b");
  await tick();
  assert.deepEqual(log, ["a", "child-a", "b", "child-b", "c", "child-c"]);
});

test("a flush after a microtask delivered some delivers the rest, in order", async () => {
  const { root, log } = tree((root, log) => {
    root.on("a", () => (log.push("a"), root.emit("c")));
    root.on("b", () => log.push("b"));
    root.on("c", () => log.push("c"));
  });
  root.emit("a");
  await Promise.resolve();
  root.emit("b");
  Runtime.flush(root);
  assert.deepEqual(log, ["a", "child-a", "c", "child-c", "b", "child-b"]);
  await tick();
  assert.equal(log.length, 6);
});

test("a flush from a handler of the same runtime does nothing: the event being handled reaches the whole tree first", async () => {
  let flushed;
  const { root, log } = tree((root, log) => {
    root.on("nest", () => {
      log.push("nest");
      root.emit("d");
      flushed = Runtime.flush(root);
    });
    root.on("d", () => log.push("d"));
  });
  root.emit("nest");
  await tick();
  assert.equal(flushed, false);
  assert.deepEqual(log, ["nest", "child-nest", "d", "child-d"]);
});

test("a flush from a handler of another runtime runs that one", async () => {
  const inner = tree((root, log) => root.on("a", () => log.push("a")));
  const outer = tree((root) => {
    root.on("b", () => {
      inner.root.emit("a");
      assert.equal(Runtime.flush(inner.root), true);
      assert.deepEqual(inner.log, ["a", "child-a"]);
    });
  });
  outer.root.emit("b");
  await tick();
  assert.deepEqual(outer.log, ["child-b"]);
});

test("a middleware that isn't activated has nothing to flush", () => {
  const { root } = tree(() => {});
  assert.equal(Runtime.flush(new Middleware()), false);
  Runtime.deactivate(root);
  assert.equal(Runtime.flush(root), false);
});
