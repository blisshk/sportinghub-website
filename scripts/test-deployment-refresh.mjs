import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

const { outputFiles } = await build({
  entryPoints: ["lib/deployment-refresh.ts"],
  bundle: true,
  write: false,
  format: "iife",
  globalName: "deploymentRefresh",
  define: { "process.env.NEXT_PUBLIC_BASE_PATH": JSON.stringify("/sports") },
});
const current = { id: "current", builtAt: 100 };
const newer = { id: "new", builtAt: 200 };
const settle = () => new Promise((resolve) => setImmediate(resolve));

function fixture({ latest = newer, path = "/en/", fetch, storageBlocked = false } = {}) {
  const dom = new JSDOM("<input />", {
    url: `https://example.test/sports${path}?source=test#section`,
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  let reloads = 0;
  const requests = [];
  window.fetch = async (url, options) => {
    requests.push({ url, options });
    return fetch ? fetch(url, options) : { ok: true, json: async () => latest };
  };
  if (storageBlocked) Object.defineProperty(window, "sessionStorage", {
    get() { throw new Error("Storage blocked"); },
  });
  window.eval(`${outputFiles[0].text}\nwindow.deploymentRefresh = deploymentRefresh;`);
  const start = () => window.deploymentRefresh.startDeploymentRefresh(current, () => { reloads++; });
  return { window, requests, start, reloads: () => reloads, close: () => dom.window.close() };
}

test("refreshes for a newer build and guards subsequent mounts against loops", async () => {
  const f = fixture();
  try {
    let stop = f.start();
    await settle();
    assert.equal(f.reloads(), 1);
    assert.match(f.requests[0].url, /^\/sports\/version\.json\?t=\d+$/);
    assert.equal(f.requests[0].options.cache, "no-store");
    assert.equal(f.window.location.search, "?source=test");
    assert.equal(f.window.location.hash, "#section");
    stop();
    stop = f.start();
    await settle();
    assert.equal(f.reloads(), 1);
    stop();
  } finally { f.close(); }
});

test("ignores same, older, invalid, failed and offline responses", async () => {
  for (const options of [
    { latest: current },
    { latest: { id: "older", builtAt: 50 } },
    { latest: { id: "bad" } },
    { latest: null },
    { latest: { id: "", builtAt: 200 } },
    { latest: { id: "bad", builtAt: "200" } },
    { fetch: async () => ({ ok: false }) },
    { fetch: async () => { throw new Error("Offline"); } },
    { storageBlocked: true },
  ]) {
    const f = fixture(options);
    try { const stop = f.start(); await settle(); assert.equal(f.reloads(), 0); stop(); }
    finally { f.close(); }
  }
});

test("defers booking and focused input refreshes until browsing resumes", async () => {
  for (const path of ["/en/booking/", "/zh-HK/booking/details/", "/booking.html"]) {
    const f = fixture({ path });
    try {
      const stop = f.start();
      await settle();
      assert.equal(f.requests.length, 0);
      f.window.history.pushState(null, "", "/sports/en/");
      f.window.document.querySelector("input").focus();
      f.window.dispatchEvent(new f.window.Event("focus"));
      await settle();
      assert.equal(f.requests.length, 0);
      f.window.document.querySelector("input").blur();
      f.window.dispatchEvent(new f.window.Event("focus"));
      await settle();
      assert.equal(f.reloads(), 1);
      stop();
    } finally { f.close(); }
  }
});

test("does not refresh a hidden tab or act after disposal or entering booking", async () => {
  for (const mode of ["hidden", "disposed", "booking"]) {
    let resolve;
    const f = fixture({ fetch: () => new Promise((done) => { resolve = done; }) });
    try {
      const stop = f.start();
      if (mode === "hidden") Object.defineProperty(f.window.document, "visibilityState", { value: "hidden" });
      if (mode === "booking") f.window.history.pushState(null, "", "/sports/en/booking/payment/");
      if (mode === "disposed") { stop(); assert.equal(f.requests[0].options.signal.aborted, true); }
      resolve({ ok: true, json: async () => newer });
      await settle();
      assert.equal(f.reloads(), 0);
      stop();
    } finally { f.close(); }
  }
});
