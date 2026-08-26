/**
 * A minimal Chrome DevTools Protocol client for the landing-page capture scripts.
 *
 * Uses Node's global WebSocket (Node >= 22) rather than puppeteer/playwright: the two
 * capture scripts need navigate / evaluate / screenshot and nothing else, which is not
 * worth a browser-automation dependency plus its pinned Chromium download.
 */

import { spawn } from "node:child_process";

export const DEFAULT_CHROME =
  process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Launch headless Chrome with a devtools port. Returns the child process. */
export function launchChrome({ port, userDataDir }) {
  return spawn(
    DEFAULT_CHROME,
    [
      "--headless",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
}

export async function assertReachable(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (error) {
    throw new Error(`Cannot reach ${url} (${error.message}). Start the dev server first: npm run dev`);
  }
}

export async function connectPage({ port, tries = 40 }) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const page = (await res.json()).find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (page) return await openSocket(page.webSocketDebuggerUrl);
    } catch {
      /* chrome is still starting */
    }
    await sleep(250);
  }
  throw new Error("No CDP page target appeared; is the CHROME path correct?");
}

function openSocket(url) {
  return new Promise((resolveSocket, rejectSocket) => {
    const ws = new WebSocket(url);
    const pending = new Map();
    let id = 0;

    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      const entry = pending.get(msg.id);
      if (!entry) return;
      pending.delete(msg.id);
      if (msg.error) entry.reject(new Error(msg.error.message));
      else entry.resolve(msg.result);
    });
    ws.addEventListener("error", () => rejectSocket(new Error("DevTools socket error")));
    ws.addEventListener("open", () =>
      resolveSocket({
        send(method, params = {}) {
          id += 1;
          const messageId = id;
          return new Promise((ok, fail) => {
            pending.set(messageId, { resolve: ok, reject: fail });
            ws.send(JSON.stringify({ id: messageId, method, params }));
          });
        },
        close: () => ws.close(),
      }),
    );
  });
}

/** Runtime.evaluate that returns a plain value and throws page-side errors. */
export async function evaluate(page, body) {
  const { result, exceptionDetails } = await page.send("Runtime.evaluate", {
    expression: `(() => { ${body} })()`,
    returnByValue: true,
    awaitPromise: true,
  });
  if (exceptionDetails) {
    throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  }
  return result.value;
}

/**
 * Click the left rail's group button by its visible label ("工具", "思考", "主题", …).
 * The rail is the only place these exact strings appear as a button's whole label.
 */
export async function clickRail(page, label) {
  const result = await evaluate(
    page,
    `const hits = [...document.querySelectorAll("button")]
       .filter((el) => (el.textContent || "").trim() === ${JSON.stringify(label)});
     if (!hits.length) return "MISS";
     const el = hits[hits.length - 1];
     const r = el.getBoundingClientRect();
     el.click();
     return { x: r.x + r.width / 2, y: r.y + r.height / 2 };`,
  );
  if (result === "MISS") {
    throw new Error(`No rail button labelled "${label}" — did the rail copy change?`);
  }
  return result;
}

/**
 * Click a left-rail group tile by its stable `data-preset-group` id (e.g. "conversation",
 * "tool-calls", "theme").
 *
 * Not by visible label. `clickRail` matches any button whose whole label is the string and
 * takes the last hit, which is fine for the labels the landing demo uses but gets fragile
 * across the whole rail: "输出" and "模型" also read as complete labels elsewhere in the
 * editor, and "last in document order" is not a promise the DOM makes. Worse, a label is
 * locale-dependent — the same tile reads "对话" or "Chat" — so a label-keyed tour only
 * records in one language. The group id is the one identifier that is neither.
 */
export async function clickRailTile(page, groupId) {
  const result = await evaluate(
    page,
    `const el = document.querySelector('button.preset-icon-tile[data-preset-group="${groupId}"]');
     if (!el) return "MISS";
     const r = el.getBoundingClientRect();
     el.click();
     return { x: r.x + r.width / 2, y: r.y + r.height / 2 };`,
  );
  if (result === "MISS") {
    throw new Error(`No rail tile for group "${groupId}" — did the group ids change?`);
  }
  return result;
}

/** Rect of a rail tile without clicking it, for moving a pointer there first. */
export async function railTileCenter(page, groupId) {
  return evaluate(
    page,
    `const el = document.querySelector('button.preset-icon-tile[data-preset-group="${groupId}"]');
     if (!el) return null;
     const r = el.getBoundingClientRect();
     return { x: r.x + r.width / 2, y: r.y + r.height / 2 };`,
  );
}

/**
 * Click a preset card by its stable `data-option-id` (e.g. "thinking-shimmer",
 * "warm-graphite"). The card's own text content is empty — the label is a sibling — so
 * matching on the id is both shorter and immune to copy changes.
 */
export async function clickPresetOption(page, optionId) {
  const result = await evaluate(
    page,
    `const cell = document.querySelector('.preset-option-cell[data-option-id="${optionId}"]');
     const button = cell && cell.querySelector(".preset-option");
     if (!button) return "MISS";
     const r = button.getBoundingClientRect();
     button.click();
     return { x: r.x + r.width / 2, y: r.y + r.height / 2 };`,
  );
  if (result === "MISS") {
    throw new Error(`No preset option "${optionId}"`);
  }
  return result;
}

/** Rect of a preset card without clicking it, for moving a pointer there first. */
export async function presetOptionCenter(page, optionId) {
  return evaluate(
    page,
    `const cell = document.querySelector('.preset-option-cell[data-option-id="${optionId}"]');
     const button = cell && cell.querySelector(".preset-option");
     if (!button) return null;
     const r = button.getBoundingClientRect();
     return { x: r.x + r.width / 2, y: r.y + r.height / 2 };`,
  );
}

/** Rect of a rail button without clicking it. */
export async function railCenter(page, label) {
  return evaluate(
    page,
    `const hits = [...document.querySelectorAll("button")]
       .filter((el) => (el.textContent || "").trim() === ${JSON.stringify(label)});
     if (!hits.length) return null;
     const r = hits[hits.length - 1].getBoundingClientRect();
     return { x: r.x + r.width / 2, y: r.y + r.height / 2 };`,
  );
}
