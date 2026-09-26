/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { type ComponentChildren, type JSX, render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { type Middleware } from "../Middleware";
import { type EventRecord, type Recorder, walk } from "./Recorder";
import { ms, nameOf, summarize, valueAt } from "./format";

const LIFECYCLE = new Set(["activate", "deactivate"]);

/** How often the open tab is updated from the recorder, in ms */
const REFRESH = 500;

/**
 * A floating panel over the page, showing what the recorder saw. Preact updates only what changed,
 * so text can be selected and copied while the panel refreshes.
 */
export class Panel {
  private host: HTMLElement;
  private root: ShadowRoot;

  constructor(private recorder: Recorder) {
    this.host = document.createElement("div");
    this.host.setAttribute("data-polymatic-devtools", "");
    this.root = this.host.attachShadow({ mode: "open" });
  }

  get visible() {
    return this.host.isConnected;
  }

  show() {
    if (!this.visible) document.body.append(this.host);
    this.render();
  }

  hide() {
    this.host.remove();
    this.render();
  }

  toggle() {
    if (this.visible) this.hide();
    else this.show();
  }

  private render() {
    // kept rendered while hidden, so the open tab and its state are there when it is shown again
    render(<App recorder={this.recorder} visible={this.visible} onClose={() => this.hide()} />, this.root);
  }
}

type TabKey = "tree" | "events" | "frame" | "issues" | "context";

const TABS: { key: TabKey; title: string }[] = [
  { key: "tree", title: "Tree" },
  { key: "events", title: "Events" },
  { key: "frame", title: "Frame" },
  { key: "issues", title: "Issues" },
  { key: "context", title: "Context" },
];

function App(props: { recorder: Recorder; visible: boolean; onClose: () => void }) {
  const { recorder, visible } = props;
  const [tab, setTab] = useState<TabKey>("events");
  const [, setTick] = useState(0);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => setTick((n) => n + 1), REFRESH);
    return () => clearInterval(timer);
  }, [visible]);

  const drag = (start: MouseEvent) => {
    if ((start.target as HTMLElement).closest("button")) return;
    const el = panel.current;
    const rect = el.getBoundingClientRect();
    const dx = start.clientX - rect.left;
    const dy = start.clientY - rect.top;
    const move = (e: MouseEvent) => {
      el.style.left = Math.max(0, e.clientX - dx) + "px";
      el.style.top = Math.max(0, e.clientY - dy) + "px";
      el.style.right = "auto";
      el.style.bottom = "auto";
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    start.preventDefault();
  };

  return (
    <>
      <style>{STYLE}</style>
      <div class="panel" ref={panel}>
        <div class="header" onMouseDown={drag}>
          <span class="title">polymatic</span>
          <div class="tabs">
            {TABS.map((t) => {
              // failures show on the Issues tab from any tab
              const failed = t.key === "issues" ? recorder.failures.length : 0;
              return (
                <button
                  key={t.key}
                  class={"tab" + (t.key === tab ? " active" : "") + (failed ? " error" : "")}
                  onClick={() => setTab(t.key)}
                >
                  {t.title}
                  {failed ? " (" + failed + ")" : ""}
                </button>
              );
            })}
          </div>
          <button class="close" title="Close (Alt+Shift+D)" onClick={props.onClose}>
            ×
          </button>
        </div>
        {/* each tab keeps its own state while another is open */}
        <div class="tab-view" hidden={tab !== "tree"}>
          {tab === "tree" && <TreeTab recorder={recorder} />}
        </div>
        <EventsTab recorder={recorder} hidden={tab !== "events"} />
        <div class="tab-view" hidden={tab !== "frame"}>
          {tab === "frame" && <FrameTab recorder={recorder} />}
        </div>
        <div class="tab-view" hidden={tab !== "issues"}>
          {tab === "issues" && <IssuesTab recorder={recorder} />}
        </div>
        <ContextTab recorder={recorder} hidden={tab !== "context"} />
      </div>
    </>
  );
}

/** Whether the user has selected text, so a click that ends a selection doesn't also act */
function selecting() {
  return String(document.getSelection() ?? "").length > 0;
}

function TreeTab({ recorder }: { recorder: Recorder }) {
  const rows: JSX.Element[] = [];
  for (const runtime of recorder.runtimes) {
    walk(runtime, (m: Middleware<any>, depth) => {
      rows.push(
        <div class={"row" + (m.activated ? "" : " inactive")} style={{ paddingLeft: depth * 14 + 4 + "px" }}>
          <span class="dot" title={m.activated ? "active" : "inactive"}>
            {m.activated ? "●" : "○"}
          </span>
          <span class="name">{nameOf(m)}</span>
          {Object.keys(m.__handlers).map((type) => (
            <span key={type} class={"chip" + (LIFECYCLE.has(type) || recorder.sent.has(type) ? "" : " dim")}>
              {type}
            </span>
          ))}
        </div>
      );
    });
  }
  return <div class="content tree">{rows.length ? rows : <div class="empty">No runtime seen yet</div>}</div>;
}

function EventsTab({ recorder, hidden }: { recorder: Recorder; hidden: boolean }) {
  const [filter, setFilter] = useState("");
  const [paused, setPaused] = useState<EventRecord[] | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());

  const toggle = (id: number) => {
    if (selecting()) return;
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  const events = paused ?? recorder.events;
  const f = filter.trim().toLowerCase();
  const shown = hidden
    ? []
    : events
        .filter((e) => !f || e.type.toLowerCase().includes(f) || e.from.toLowerCase().includes(f))
        .slice(-200)
        .reverse();

  return (
    <div class="tab-view" hidden={hidden}>
      <div class="toolbar bar">
        <input
          placeholder="filter events"
          value={filter}
          onInput={(e) => setFilter((e.target as HTMLInputElement).value)}
        />
        <label>
          <input
            type="checkbox"
            checked={!!paused}
            onChange={(e) => setPaused((e.target as HTMLInputElement).checked ? recorder.events.slice() : null)}
          />{" "}
          pause
        </label>
        <button
          onClick={() => {
            recorder.clear();
            setExpanded(new Set());
            if (paused) setPaused([]);
          }}
        >
          clear
        </button>
      </div>
      <div class="content events">
        {!shown.length && <div class="empty">{events.length ? "No matching events" : "No events yet"}</div>}
        {shown.map((e) => (
          <EventRow key={e.id} event={e} open={expanded.has(e.id)} onToggle={toggle} />
        ))}
      </div>
    </div>
  );
}

function EventRow({ event: e, open, onToggle }: { event: EventRecord; open: boolean; onToggle: (id: number) => void }) {
  const stopped = e.handlers.find((handler) => handler.stopped);
  const total = e.handlers.reduce((sum, handler) => sum + handler.ms, 0);
  return (
    <>
      <div class={"row event" + (e.handled === 0 ? " unhandled" : "")} onClick={() => onToggle(e.id)}>
        <span class="time">{((e.delivered ?? e.sent) / 1000).toFixed(2) + "s"}</span>
        <span class="name">{e.type}</span>
        <span class="muted">from {e.from}</span>
        <span class={"badge" + (e.handled === 0 ? " warn" : "")}>{String(e.handled ?? "…")}</span>
        {e.handlers.some((handler) => handler.failed) && <span class="error">failed</span>}
        {stopped && <span class="stop">stopped by {stopped.middleware}</span>}
        <span class="muted right">{ms(total)}</span>
      </div>
      {open && (
        <div class="details">
          <div class="muted">payload {e.payload || "(none)"}</div>
          <div class="muted">queued {ms((e.delivered ?? e.sent) - e.sent)} before delivery</div>
          {!e.handlers.length && <div class="warn">no middleware handled it</div>}
          {e.handlers.map((handler, i) => (
            <div key={i} class="handler">
              <span>{handler.middleware}</span>
              <span class="muted">{ms(handler.ms)}</span>
              {handler.failed && <span class="error">threw</span>}
              {handler.stopped && <span class="stop">stopped</span>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function FrameTab({ recorder }: { recorder: Recorder }) {
  const costs = recorder.frameCosts();
  const types = Object.keys(costs);
  return (
    <div class="content">
      {!types.length && <div class="empty">No frame events yet</div>}
      {types.map((type) => {
        const rows = costs[type];
        const total = rows.reduce((sum, row) => sum + row.avg, 0);
        return (
          <div key={type}>
            <div class="section">
              {type} — {ms(total)} per frame, last 60 frames
            </div>
            {rows.map((row) => (
              <div key={row.middleware} class="row">
                <span class="name">{row.middleware}</span>
                <span class="bar-graph" style={{ width: Math.min(100, (row.avg / (total || 1)) * 100) + "%" }} />
                <span class="muted right">
                  {ms(row.avg)} avg, {ms(row.max)} max
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function IssuesTab({ recorder }: { recorder: Recorder }) {
  const { noHandler, notSent } = recorder.unmatched();
  const failures = recorder.failures.slice().reverse();
  return (
    <div class="content">
      <div class="section">Failed handlers</div>
      {!failures.length && <div class="empty">None</div>}
      {failures.map((f) => (
        <div key={f.middleware + " " + f.type + " " + f.message} class="row" title={f.stack ?? f.message}>
          <span class="name error">{f.middleware}</span>
          <span class="muted">handling {f.type}</span>
          <span class="value">{f.message}</span>
          <span class="muted right">
            {f.stoppedBy ? "stopped by " + f.stoppedBy : "uncaught"} · {f.count}×
          </span>
        </div>
      ))}
      <div class="section">Sent, but no middleware handled them</div>
      {!noHandler.length && <div class="empty">None</div>}
      {noHandler.map((item) => (
        <div key={item.type} class="row">
          <span class="name warn">{item.type}</span>
          <span class="muted right">{item.count}×</span>
        </div>
      ))}
      <div class="section">Handled, but not sent so far</div>
      {!notSent.length && <div class="empty">None</div>}
      {notSent.map((item) => (
        <div key={item.type} class="row">
          <span class="name">{item.type}</span>
          <span class="muted">by {item.middlewares.join(", ")}</span>
        </div>
      ))}
      <div class="hint">Events that only happen later, like game over, show up here until they are sent.</div>
    </div>
  );
}

function ContextTab({ recorder, hidden }: { recorder: Recorder; hidden: boolean }) {
  const [path, setPath] = useState("");
  const runtime = [...recorder.runtimes][0];

  let body: ComponentChildren;
  if (hidden) {
    body = null;
  } else if (!runtime) {
    body = <div class="empty">No runtime seen yet</div>;
  } else {
    const value = valueAt(runtime.context, path);
    const target = value && typeof value === "object" && typeof value.peek === "function" ? value.peek() : value;
    if (!target || typeof target !== "object") {
      body = (
        <div class="row">
          <span class="value">{summarize(target, 2, 400) || "undefined"}</span>
        </div>
      );
    } else {
      body = Object.keys(target).map((key) => {
        const child = target[key];
        const nested = child && typeof child === "object";
        return (
          <div
            key={key}
            class={"row" + (nested ? " link" : "")}
            onClick={nested ? () => !selecting() && setPath((path ? path + "." : "") + key) : undefined}
          >
            <span class="name">{key}</span>
            <span class="value">{summarize(child, 1, 160)}</span>
          </div>
        );
      });
    }
  }

  return (
    <div class="tab-view" hidden={hidden}>
      <div class="toolbar bar">
        <input
          placeholder="path, for example mission.score"
          value={path}
          onInput={(e) => setPath((e.target as HTMLInputElement).value.trim())}
        />
        <button onClick={() => setPath(path.split(".").slice(0, -1).join("."))}>up</button>
      </div>
      <div class="content">{body}</div>
    </div>
  );
}

const STYLE = `
.panel {
  position: fixed; right: 12px; bottom: 12px; z-index: 2147483647;
  width: 460px; height: 380px; min-width: 280px; min-height: 160px;
  display: flex; flex-direction: column; resize: both; overflow: hidden;
  background: #1e1f24; color: #d6d7dc; border: 1px solid #3a3c44; border-radius: 6px;
  font: 11px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
}
.header { display: flex; align-items: center; gap: 6px; padding: 4px 6px; background: #26282e; cursor: move; user-select: none; }
.title { font-weight: 600; color: #9fb4ff; margin-right: 4px; }
.tabs { display: flex; gap: 2px; flex: 1; }
button { font: inherit; color: inherit; background: #33363e; border: 1px solid #44474f; border-radius: 3px; padding: 1px 6px; cursor: pointer; }
button:hover { background: #3d4049; }
.tab.active { background: #4a5d9e; border-color: #5b70b8; color: #fff; }
.close { background: none; border: none; font-size: 15px; line-height: 1; padding: 0 4px; }
.tab-view { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.tab-view[hidden] { display: none; }
.toolbar { padding: 4px 6px; border-bottom: 1px solid #33363e; }
.bar { display: flex; gap: 6px; align-items: center; }
input:not([type]) { flex: 1; font: inherit; color: inherit; background: #15161a; border: 1px solid #3a3c44; border-radius: 3px; padding: 2px 5px; }
.content { flex: 1; overflow: auto; padding: 2px 0; }
.row { display: flex; gap: 6px; align-items: baseline; padding: 1px 6px; white-space: nowrap; }
.tree .row { flex-wrap: wrap; row-gap: 2px; }
.row:hover { background: #26282e; }
.event, .link { cursor: pointer; }
.inactive { opacity: 0.45; }
.dot { color: #6fcf8e; }
.inactive .dot { color: #888; }
.name { color: #e8e9ee; }
.muted { color: #8b8e98; }
.right { margin-left: auto; }
.value { color: #b6c4e8; overflow: hidden; text-overflow: ellipsis; }
.chip { color: #a6b0c8; background: #2c2f37; border-radius: 3px; padding: 0 4px; }
.chip.dim { color: #6b6e78; font-style: italic; }
.badge { background: #2f3e2f; color: #9fd8a5; border-radius: 8px; padding: 0 5px; }
.badge.warn, .warn { color: #ffb86b; }
.badge.warn { background: #45351f; }
.unhandled .name { color: #ffb86b; }
.stop { color: #ff8a8a; }
.error, .name.error { color: #ff6b6b; }
.time { color: #6b6e78; width: 52px; text-align: right; }
.details { padding: 2px 6px 4px 64px; border-left: 2px solid #4a5d9e; margin-left: 6px; }
.handler { display: flex; gap: 8px; }
.section { padding: 6px 6px 2px; color: #9fb4ff; font-weight: 600; }
.bar-graph { height: 6px; background: #4a5d9e; border-radius: 2px; align-self: center; min-width: 1px; }
.empty, .hint { padding: 4px 6px; color: #6b6e78; }
.hint { padding-top: 10px; white-space: normal; }
`;
