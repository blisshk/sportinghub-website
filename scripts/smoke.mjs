import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { JSDOM, VirtualConsole } from "jsdom";
import nextEnv from "@next/env";

// Exercise the exported markup and the same client entry point React mounts.
// JSDOM checks behavior; it does not provide layout or visual validation.
process.env.TZ = "Asia/Hong_Kong";
const root = fileURLToPath(new URL("../", import.meta.url));
nextEnv.loadEnvConfig(root);
const output = process.env.SMOKE_OUTPUT_DIR || path.join(root, "out");
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
const origin = "https://smoke.sportinghub.test";
const fixedNow = Date.parse("2026-10-24T04:00:00.000Z");
const locales = ["en", "zh-HK"];
const routeFiles = {
  home: "index.html",
  "coming-soon": "coming-soon/index.html",
  booking: "booking/index.html",
  terms: "terms/index.html",
};

try {
  await access(path.join(output, "en/index.html"));
} catch {
  console.error("Build the static export first: pnpm build");
  process.exit(1);
}

const fixtureMapping = JSON.parse(
  await readFile(path.join(root, "lib/venue-mapping.json"), "utf8"),
);
const fixtureServices = [];
for (const [sport, variants] of Object.entries(fixtureMapping.courts)) {
  for (const [variant, link] of Object.entries(variants)) {
    link.serviceId = 100 + fixtureServices.length;
    const roomId = 200 + fixtureServices.length;
    const off = ["pb", "bd", "tq"].includes(sport)
      ? 290
      : variant === "B"
      ? 390
      : 490;
    fixtureServices.push({
      id: link.serviceId,
      name: `Backend ${sport} ${variant}`,
      nameZh: `後台 ${sport} ${variant}`,
      placeRooms: [{ id: roomId, name: `Room ${roomId}`, branchId: 1 }],
      placeSettings: {
        enabled: true,
        nonPeakHourlyRateCents: off * 100,
        peakHourlyRateCents: (off + 100) * 100,
      },
    });
  }
}
const fixtureLessons = [
  { id: 901, name: "Volleyball session", course: { id: 41, name: "Volleyball class", description: "Backend class description", category: { id: 101, name: "Sports classes" }, category2: { id: 201, name: "Volleyball" } }, room: { id: 301, name: "Training court", branchId: 1 }, branch: { id: 1, name: "Sporting Hub", address: "Venue address" }, startTime: "2026-10-27T01:00:00.000Z", endTime: "2026-10-27T02:30:00.000Z", totalCents: 50000, currency: "HKD", spots: 4, canEnroll: true, coaches: ["Backend coach"] },
  { id: 902, name: "Workshop", course: { id: 42, name: "Pickleball workshop", description: "Real workshop", category: { id: 102, name: "Workshops" }, category2: { id: 202, name: "Pickleball" } }, room: { id: 302, name: "Court B", branchId: 1 }, branch: { id: 1, name: "Sporting Hub", address: "Venue address" }, startTime: "2026-11-28T11:30:00.000Z", endTime: "2026-11-28T13:00:00.000Z", totalCents: 65000, currency: "HKD", spots: 3, canEnroll: true, coaches: ["Workshop coach"] },
  { id: 903, name: "Full session", course: { id: 41, name: "Volleyball class", description: "", category: { id: 101, name: "Sports classes" }, category2: { id: 201, name: "Volleyball" } }, room: { id: 301, name: "Training court", branchId: 1 }, branch: { id: 1, name: "Sporting Hub", address: "Venue address" }, startTime: "2026-10-28T01:00:00.000Z", endTime: "2026-10-28T02:30:00.000Z", totalCents: 50000, currency: "HKD", spots: 0, canEnroll: false, coaches: ["Backend coach"] },
];
const courseSessions = [0, 7, 14].map((days, index) => ({
  ...fixtureLessons[0], id: 910 + index,
  course: { ...fixtureLessons[0].course, id: 43, name: "Complete volleyball course", category: { id: 103, name: "Full courses" } },
  startTime: new Date(Date.parse(fixtureLessons[0].startTime) + days * 86400000).toISOString(),
  endTime: new Date(Date.parse(fixtureLessons[0].endTime) + days * 86400000).toISOString(),
}));
const fixtureCourse = { ...courseSessions[0], pricingMode: "course", totalCents: 120000, lessons: courseSessions, lessonCount: 3, courseEndTime: courseSessions[2].endTime };
const fixtureOfferings = [...fixtureLessons, fixtureCourse];
const fixtureCheckouts = new Map();
function fixtureQuote(request) {
  const service = fixtureServices.find((s) => s.id === Number(request.serviceId));
  const room = service.placeRooms.find((r) => r.id === Number(request.roomId));
  const start = Date.parse(request.startTime), end = Date.parse(request.endTime);
  const segments = [];
  for (let instant = start; instant < end; instant += 3600000) {
    const local = new Date(instant + 8 * 3600000);
    const peak = local.getUTCHours() >= ([0, 6].includes(local.getUTCDay()) ? 7 : 16) && local.getUTCHours() < 23;
    const hourlyRateCents = peak ? service.placeSettings.peakHourlyRateCents : service.placeSettings.nonPeakHourlyRateCents;
    segments.push({ startTime: new Date(instant).toISOString(), endTime: new Date(instant + 3600000).toISOString(), period: peak ? "peak" : "nonPeak", minutes: 60, hourlyRateCents, amountCents: hourlyRateCents });
  }
  return { service, room, startTime: new Date(start).toISOString(), endTime: new Date(end).toISOString(), currency: "HKD", totalCents: segments.reduce((sum, segment) => sum + segment.amountCents, 0), segments, paymentAvailable: true, paymentMode: "deferred" };
}
function fixtureFetch(input, options = {}) {
  const url = new URL(input);
  assert.equal(url.searchParams.get("tenantId"), "3");
  let data;
  if (url.pathname.includes("/public/enrollment/")) {
    let data;
    if (url.pathname.endsWith("/courses")) data = fixtureOfferings;
    else if (url.pathname.endsWith("/quote")) {
      const lesson = url.searchParams.has("courseId") ? fixtureOfferings.find(l => l.pricingMode === "course" && l.course.id === Number(url.searchParams.get("courseId"))) : fixtureLessons.find(l => l.id === Number(url.searchParams.get("lessonId")));
      if (!lesson?.canEnroll) return Promise.resolve({ ok: false, status: 409, json: async () => ({}) });
      data = { ...lesson, courseId: lesson.course.id, lessonId: lesson.pricingMode === "course" ? undefined : lesson.id, paymentMode: "deferred" };
    } else if (url.pathname.endsWith("/checkouts")) {
      const body = JSON.parse(options.body), lesson = body.courseId ? fixtureOfferings.find(l => l.pricingMode === "course" && l.course.id === body.courseId) : fixtureLessons.find(l => l.id === body.lessonId);
      assert.equal(body.expectedTotalCents, lesson.totalCents);
      let entry = [...fixtureCheckouts.values()].find(e => e.token === body.checkoutToken);
      if (!entry) {
        const id = `enrollment-${fixtureCheckouts.size + 1}`;
        entry = { token: body.checkoutToken, record: { id, status: "Pending", pricingMode: lesson.pricingMode || "lesson", lessons: lesson.lessons || [lesson], lessonCount: lesson.lessonCount || 1, lesson, course: lesson.course, room: lesson.room, startTime: lesson.startTime, endTime: lesson.endTime, totalCents: lesson.totalCents, receivedCents: 0, dueCents: lesson.totalCents, currency: "HKD", reference: `TEST-ENROLL-${id}`, expiresAt: new Date(fixedNow + 900000).toISOString(), paymentStarted: false, customer: null } };
        fixtureCheckouts.set(id, entry);
      }
      data = entry.record;
    } else {
      const token = options.headers?.Authorization?.replace(/^Bearer /, ""), id = url.pathname.split("/checkouts/")[1]?.split("/")[0];
      const entry = id ? fixtureCheckouts.get(id) : [...fixtureCheckouts.values()].find(e => e.token === token && e.record.lesson);
      if (!entry || entry.token !== token) return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
      if (url.pathname.endsWith("/payment")) { entry.record.status = "Confirmed"; data = { checkout: entry.record, checkoutUrl: null }; }
      else if (url.pathname.endsWith("/cancel")) { entry.record.status = "Cancelled"; data = entry.record; }
      else data = entry.record;
    }
    return Promise.resolve({ ok: true, json: async () => structuredClone(data) });
  }
  if (url.pathname.endsWith("/services")) data = fixtureServices;
  else if (url.pathname.endsWith("/quote")) data = fixtureQuote(Object.fromEntries(url.searchParams));
  else if (url.pathname.endsWith("/checkouts")) {
    const body = JSON.parse(options.body);
    let entry = [...fixtureCheckouts.values()].find((value) => value.token === body.checkoutToken);
    if (!entry) {
      const quote = fixtureQuote(body);
      const id = `checkout-${fixtureCheckouts.size + 1}`;
      entry = { token: body.checkoutToken, record: { ...quote, id, status: "Pending", reference: `TEST-INV-${id}`, priceBreakdown: quote, receivedCents: 0, dueCents: quote.totalCents,
        customer: null, expiresAt: new Date(fixedNow + 15 * 60000).toISOString(), paymentStarted: false } };
      fixtureCheckouts.set(id, entry);
    }
    data = entry.record;
  } else if (url.pathname.includes("/checkouts/") || url.pathname.endsWith("/checkout-session")) {
    const token = options.headers?.Authorization?.replace(/^Bearer /, "");
    const id = url.pathname.split("/checkouts/")[1]?.split("/")[0];
    const entry = id ? fixtureCheckouts.get(id) : [...fixtureCheckouts.values()].find((value) => value.token === token);
    if (!entry || entry.token !== token) return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    if (url.pathname.endsWith("/payment")) { entry.record.status = "Confirmed"; entry.record.paymentStarted = false; data = { checkout: entry.record, checkoutUrl: null }; }
    else if (url.pathname.endsWith("/cancel")) { entry.record.status = "Cancelled"; data = entry.record; }
    else data = entry.record;
  } else {
    const serviceId = Number(url.searchParams.get("serviceId"));
    assert.equal(url.searchParams.has("roomId"), false);
    const rooms = fixtureServices.find((s) => s.id === serviceId).placeRooms;
    const date = url.searchParams.get("date");
    const settings = fixtureServices.find(
      (s) => s.id === serviceId,
    ).placeSettings;
    const start = Date.parse(`${date}T07:00:00+08:00`);
    const dayIdx = Math.round(
      (Date.parse(date) - Date.parse("2026-10-24")) / 86400000,
    );
    data = {
      serviceId,
      rooms,
      date,
      slots: Array.from({ length: 24 }, (_, i) => {
        const hour = (7 + i) % 24;
        const weekend = [0, 6].includes(new Date(start + i * 3600000).getDay());
        const peak = hour >= (weekend ? 7 : 16) && hour < 23;
        const available = i < 16 ? (dayIdx * 7 + i * 5) % 11 >= 3 : true;
        return {
          time: `${String(hour).padStart(2, "0")}:00`,
          available,
          availableRoomIds: available ? rooms.map((room) => room.id) : [],
          totalCents: peak
            ? settings.peakHourlyRateCents
            : settings.nonPeakHourlyRateCents,
          peak,
        };
      }),
    };
  }
  return Promise.resolve({ ok: true, json: async () => structuredClone(data) });
}
const bundled = await build({
  absWorkingDir: root,
  stdin: {
    contents:
      'export {initializeSite} from "./lib/site-runtime"; export {syncLocaleLinks} from "./lib/paths";',
    resolveDir: root,
    sourcefile: "smoke-entry.js",
  },
  bundle: true,
  platform: "browser",
  format: "iife",
  globalName: "SportingHubRuntime",
  write: false,
  define: {
    "process.env.NEXT_PUBLIC_BASE_PATH": JSON.stringify(basePath),
    "process.env.NEXT_PUBLIC_BOOKING_API_URL": JSON.stringify(
      "https://api.sportinghub.test",
    ),
  },
  plugins: [
    {
      name: "venue-fixture",
      setup(build) {
        build.onLoad({ filter: /venue-mapping\.json$/ }, () => ({
          contents: JSON.stringify(fixtureMapping),
          loader: "json",
        }));
      },
    },
  ],
});
const clientCode = bundled.outputFiles[0].text;
const html = Object.fromEntries(
  await Promise.all(
    locales.map(async (locale) => [
      locale,
      Object.fromEntries(
        await Promise.all(
          Object.entries(routeFiles).map(async ([route, file]) => [
            route,
            await readFile(path.join(output, locale, file), "utf8"),
          ]),
        ),
      ),
    ]),
  ),
);
const bookingSteps = [
  "group",
  "classes",
  "time",
  "details",
  "payment",
  "confirmation",
];
const bookingHtml = Object.fromEntries(
  await Promise.all(
    locales.map(async (locale) => [
      locale,
      Object.fromEntries(
        await Promise.all(
          bookingSteps.map(async (step) => [
            step,
            await readFile(
              path.join(output, locale, "booking", step, "index.html"),
              "utf8",
            ),
          ]),
        ),
      ),
    ]),
  ),
);

function createPage(
  page,
  {
    query = "",
    hash = "",
    locale = "en",
    storedLanguage = locale === "en" ? "zh" : "en",
    reducedMotion = false,
    blockedStorage = false,
    fetch = fixtureFetch,
    step = "",
    sessionData = {},
    blockedSessionStorage = false,
  } = {},
) {
  const requests = [];
  const timers = new Map();
  let timerId = 0;
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => errors.push(error));
  const pathname = `/${locale}/${page === "home" ? "" : `${page}/`}${
    page === "booking" && step ? `${step}/` : ""
  }`;
  const dom = new JSDOM(
    page === "booking" && step ? bookingHtml[locale][step] : html[locale][page],
    {
      url: `${origin}${basePath}${pathname}${query ? `?${query}` : ""}${
        hash ? `#${hash}` : ""
      }`,
      runScripts: "outside-only",
      pretendToBeVisual: true,
      virtualConsole,
      beforeParse(window) {
        window.fetch = (input, options) => {
          requests.push({ url: new URL(input), options });
          return fetch(input, options);
        };
        const BrowserDate = window.Date;
        window.Date = class extends BrowserDate {
          constructor(...args) {
            super(...(args.length ? args : [fixedNow]));
          }
          static now() {
            return fixedNow;
          }
        };
        window.matchMedia = (media) => ({
          matches: reducedMotion && media.includes("prefers-reduced-motion"),
          media,
          onchange: null,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() {
            return true;
          },
        });
        Object.defineProperty(window, "scrollY", { value: 0, writable: true });
        window.scrollTo = (options) => {
          window.scrollY = options?.top ?? 0;
        };
        window.setInterval = (callback) => {
          timers.set(++timerId, callback);
          return timerId;
        };
        window.clearInterval = (id) => {
          timers.delete(id);
        };
      },
    },
  );
  const { window } = dom;
  const { document } = window;
  if (blockedSessionStorage)
    Object.defineProperty(window, "sessionStorage", {
      get() {
        throw new window.DOMException("Storage unavailable", "SecurityError");
      },
    });
  for (const [key, value] of Object.entries(sessionData))
    window.sessionStorage.setItem(key, value);
  if (blockedStorage) {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new window.DOMException("Storage unavailable", "SecurityError");
      },
    });
  } else {
    // A stale browser preference must never override the locale in the URL.
    window.localStorage.setItem("shhk-lang", storedLanguage);
  }
  document.documentElement.dataset.booking =
    page === "coming-soon" ? "soon" : "open";
  document.body.className =
    page === "booking"
      ? "bk-body has-bar"
      : page === "terms"
      ? "page-terms"
      : "page-home";
  const runtime = window.eval(`${clientCode}\nSportingHubRuntime;`);
  let dispose = null;
  const mount = () => {
    assert.equal(
      dispose,
      null,
      "Dispose the previous mount before mounting again",
    );
    dispose = runtime.initializeSite(page, locale);
    runtime.syncLocaleLinks(document, window.location);
  };
  const unmount = () => {
    dispose?.();
    dispose = null;
  };
  const find = (selector) => {
    const element = document.querySelector(selector);
    assert.ok(element, `Missing element: ${selector}`);
    return element;
  };
  const click = (selector) => {
    const element = find(selector);
    assert.equal(
      Boolean(element.disabled),
      false,
      `Control unexpectedly disabled: ${selector}`,
    );
    element.click();
    return element;
  };
  const fill = (selector, value) => {
    const element = find(selector);
    element.value = value;
    element.dispatchEvent(new window.Event("input", { bubbles: true }));
  };
  mount();
  return {
    window,
    document,
    find,
    click,
    fill,
    timers,
    requests,
    ready: () => new Promise(setImmediate),
    locale,
    mount,
    unmount,
    screen(id) {
      assert.equal(find(".screen.on").id, id);
    },
    close() {
      unmount();
      window.close();
      assert.deepEqual(errors, [], "Unexpected browser runtime errors");
    },
  };
}

async function withPage(page, options, run) {
  const session = createPage(page, options);
  try {
    await session.ready();
    await run(session);
  } finally {
    session.close();
  }
}

function fillContact(session) {
  for (const [id, value] of Object.entries({
    fFirst: "Smoke",
    fLast: "Check",
    fHkid: "A123",
    fEmail: "smoke@example.test",
    fPhone: "55849706",
  }))
    session.fill(`#${id}`, value);
}

async function completeBooking(session) {
  session.click("#sumNext");
  await session.ready();
  session.screen("s7");
  assert.ok(session.document.body.classList.contains("in-checkout"));
  assert.equal(session.find("#summary").hidden, true);
  assert.ok(session.document.querySelector(".bk-body").classList.contains("is-payment-step"));
  assert.equal(session.find("#paymentNext").disabled, false);
  assert.equal(session.find("#paymentNext").textContent, session.find("#barNext").textContent);
  session.click("#paymentNext");
  await session.ready();
  session.screen("s8");
  assert.equal(session.find("#summary").hidden, true);
  assert.equal(session.find("#bar").style.display, "none");
  assert.match(session.find("#recap").textContent, new URL(session.window.location.href).searchParams.get("mode") === "pt" ? /SHHK-2026-0001/ : /TEST-(INV-checkout|ENROLL-enrollment)/);
  const calendar = new URL(session.find("#gcal").href);
  assert.equal(calendar.origin, "https://calendar.google.com");
  assert.equal(calendar.searchParams.get("ctz"), "Asia/Hong_Kong");
  const ics = decodeURIComponent(
    session.find("#ics").href.split(",").slice(1).join(","),
  );
  assert.match(ics, /BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /LOCATION:Sporting Hub Hong Kong/);
  return { calendar, ics };
}

let passed = 0;
let failed = 0;
async function check(name, run) {
  try {
    await run();
    passed++;
    console.log(`✓ ${name}`);
  } catch (error) {
    failed++;
    console.error(`✗ ${name}\n${error.stack ?? error}`);
  }
}

await check(
  "Exported routes, legacy aliases and local media exist",
  async () => {
    for (const locale of locales)
      for (const page of Object.keys(routeFiles)) {
        const document = new JSDOM(html[locale][page], {
          url: `${origin}${basePath}/${locale}/`,
        }).window.document;
        for (const element of document.querySelectorAll(
          "img[src], script[src], link[rel=stylesheet][href]",
        )) {
          const url = new URL(
            element.getAttribute("src") ?? element.getAttribute("href"),
            `${origin}${basePath}/`,
          );
          if (url.origin !== origin) continue;
          assert.ok(
            url.pathname.startsWith(`${basePath}/`),
            `Asset is outside base path: ${url.pathname}`,
          );
          await access(
            path.join(
              output,
              decodeURIComponent(url.pathname.slice(basePath.length + 1)),
            ),
          );
        }
        if (page !== "home") {
          assert.equal(
            await readFile(path.join(output, locale, `${page}.html`), "utf8"),
            html[locale][page],
          );
        }
        document.defaultView.close();
      }
  },
);

await check(
  "Both locales are rendered on the server with localized metadata and links",
  () => {
    const publicUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://whhoaf.github.io/hksh-prototype/";
    const siteUrl = new URL(
      publicUrl.endsWith("/") ? publicUrl : `${publicUrl}/`,
    );
    const headings = {
      home: {
        selector: '[data-str="pillar.title"]',
        en: "What you can book",
        "zh-HK": "你可以預約的項目",
      },
      "coming-soon": {
        selector: '[data-str="pillar.title"]',
        en: "What you can book",
        "zh-HK": "你可以預約的項目",
      },
      booking: { selector: "#s1 h1", en: "Which sport?", "zh-HK": "選擇運動" },
      terms: {
        selector: ".legal-title",
        en: "Terms and policies",
        "zh-HK": "條款與政策",
      },
    };
    for (const locale of locales)
      for (const page of Object.keys(routeFiles)) {
        const dom = new JSDOM(html[locale][page], {
          url: `${origin}${basePath}/${locale}/${
            page === "home" ? "" : `${page}/`
          }`,
        });
        const { document } = dom.window;
        try {
          assert.equal(
            document.documentElement.lang,
            locale,
            `${locale}/${page}: incorrect server-rendered html lang`,
          );
          assert.equal(
            document.querySelector(headings[page].selector)?.textContent,
            headings[page][locale],
          );
          const suffix = page === "home" ? "" : `${page}/`;
          assert.equal(
            document.querySelector('link[rel="canonical"]')?.href,
            new URL(`${locale}/${suffix}`, siteUrl).href,
          );
          for (const alternate of locales) {
            assert.equal(
              document.querySelector(
                `link[rel="alternate"][hreflang="${alternate}"]`,
              )?.href,
              new URL(`${alternate}/${suffix}`, siteUrl).href,
            );
            const switches = document.querySelectorAll(
              `a[data-locale="${alternate}"]`,
            );
            assert.ok(
              switches.length,
              `${locale}/${page}: missing locale link ${alternate}`,
            );
            for (const link of switches) {
              assert.equal(
                new URL(link.href).pathname,
                `${basePath}/${alternate}/${suffix}`,
              );
              assert.equal(
                link.getAttribute("aria-current"),
                alternate === locale ? "page" : null,
              );
            }
          }
          for (const link of document.querySelectorAll("a[href]")) {
            const href = link.getAttribute("href");
            if (
              !href ||
              href.startsWith("#") ||
              link.hasAttribute("data-locale")
            )
              continue;
            const url = new URL(link.href);
            if (url.origin !== origin) continue;
            assert.ok(
              url.pathname.startsWith(`${basePath}/${locale}/`),
              `${locale}/${page}: internal link changes locale: ${href}`,
            );
          }
        } finally {
          dom.window.close();
        }
      }
  },
);

await check(
  "Unprefixed bookmarks redirect to English and preserve query and fragment",
  async () => {
    for (const page of Object.keys(routeFiles)) {
      const suffix = page === "home" ? "" : `${page}/`;
      const files = [
        routeFiles[page],
        ...(page === "home" ? [] : [`${page}.html`]),
      ];
      for (const file of files) {
        const dom = new JSDOM(await readFile(path.join(output, file), "utf8"));
        let destination;
        const location = {
          search: "?mode=venue&court=vb&t=23%3A00",
          hash: "#booking-details",
          replace(value) {
            destination = value;
          },
        };
        const script = [
          ...dom.window.document.querySelectorAll("script:not([src])"),
        ].find((candidate) =>
          candidate.textContent.includes("window.location.replace"),
        );
        assert.ok(script, `${file}: missing redirect script`);
        runInNewContext(script.textContent, {
          location,
          window: { location },
          URL,
        });
        const url = new URL(destination, origin);
        assert.equal(
          url.pathname,
          `${basePath}/en/${suffix}`,
          `${file}: wrong redirect route`,
        );
        assert.equal(
          url.search,
          location.search,
          `${file}: dropped booking query`,
        );
        assert.equal(url.hash, location.hash, `${file}: dropped fragment`);
        dom.window.close();
      }
    }
    for (const invalid of ["fr", "de", "zh", "zh-Hant"]) {
      await assert.rejects(access(path.join(output, invalid, "index.html")), {
        code: "ENOENT",
      });
    }
  },
);

await check(
  "Locale switch URLs retain the current route, booking query and fragment",
  async () => {
    for (const locale of locales) {
      await withPage(
        "booking",
        {
          locale,
          query: "mode=venue&court=vb&t=23%3A00",
          hash: "booking-details",
        },
        (s) => {
          for (const target of locales)
            for (const link of s.document.querySelectorAll(
              `a[data-locale="${target}"]`,
            )) {
              const url = new URL(link.href);
              assert.equal(url.pathname, `${basePath}/${target}/booking/`);
              assert.equal(url.search, s.window.location.search);
              assert.equal(url.hash, s.window.location.hash);
            }
          assert.equal(
            s.document.documentElement.lang,
            locale,
            "Stored preference overrode the URL locale",
          );
        },
      );
    }
  },
);

await check("Home pricing, drawer, slideshow and mount cleanup", () =>
  withPage("home", {}, (s) => {
    assert.equal(s.document.documentElement.lang, "en");
    assert.equal(s.document.querySelectorAll("#rateRows tr").length, 9);
    assert.equal(s.find("#memberFee").textContent, "HK$ 350");
    assert.match(s.find('[data-price-cat="court"]').textContent, /HK\$ 290/);
    assert.match(
      s.find('[data-price-cat="class"]').textContent,
      /coming soon/i,
    );
    assert.equal(s.find("#pricePdf").hidden, true);
    assert.equal(s.find("#shop").hasAttribute("href"), false);
    for (const link of s.document.querySelectorAll("[data-book]")) {
      const url = new URL(link.href);
      assert.equal(url.pathname, `${basePath}/en/booking/`);
      assert.ok(
        ["venue", "class", "pt"].includes(url.searchParams.get("mode")),
      );
    }
    assert.equal(
      s.find('[data-str="pillar.title"]').textContent,
      "What you can book",
    );
    assert.match(s.find("#mapFrame").src, /!1sen/);
    s.click("#burger");
    assert.equal(s.find("#burger").getAttribute("aria-expanded"), "true");
    assert.equal(s.document.body.style.overflow, "hidden");
    s.window.document.dispatchEvent(
      new s.window.KeyboardEvent("keydown", { key: "Escape" }),
    );
    assert.equal(s.find("#burger").getAttribute("aria-expanded"), "false");
    assert.equal(s.document.activeElement, s.find("#burger"));
    s.click("#burger");
    s.click("#drawerScrim");
    assert.equal(s.find("#drawer").classList.contains("is-open"), false);
    const slides = [...s.document.querySelectorAll(".hero-slide")];
    assert.ok(slides[0].classList.contains("is-active"));
    s.click(".hero-arrow.next");
    assert.ok(slides[1].classList.contains("is-active"));
    s.click(".hero-dot:last-child");
    assert.ok(slides[3].classList.contains("is-active"));
    assert.equal(s.timers.size, 1);
    [...s.timers.values()][0]();
    assert.ok(slides[0].classList.contains("is-active"));
    s.find(".hero-slideshow").dispatchEvent(new s.window.Event("mouseenter"));
    assert.equal(s.timers.size, 0);
    s.find(".hero-slideshow").dispatchEvent(new s.window.Event("mouseleave"));
    assert.equal(s.timers.size, 1);
    s.window.scrollY = 100;
    s.window.dispatchEvent(new s.window.Event("scroll"));
    assert.ok(s.document.documentElement.classList.contains("nav-scrolled"));
    s.unmount();
    assert.equal(s.timers.size, 0);
    s.click("#burger");
    assert.equal(s.find("#drawer").classList.contains("is-open"), false);
    s.window.scrollY = 0;
    s.window.dispatchEvent(new s.window.Event("scroll"));
    assert.ok(
      s.document.documentElement.classList.contains("nav-scrolled"),
      "Disposed scroll handler still runs",
    );
    s.mount();
    assert.equal(s.timers.size, 1);
    assert.equal(
      s.document.documentElement.classList.contains("nav-scrolled"),
      false,
    );
    assert.equal(s.document.documentElement.lang, "en");
  }),
);

await check("Reduced motion disables automatic slideshow changes", () =>
  withPage("home", { reducedMotion: true }, (s) => {
    assert.equal(s.timers.size, 0);
    s.click(".hero-arrow.next");
    assert.ok(
      s.document
        .querySelectorAll(".hero-slide")[1]
        .classList.contains("is-active"),
    );
    assert.equal(s.timers.size, 0);
  }),
);

await check(
  "Coming-soon links lead to enquiries or page sections in both locales",
  async () => {
    for (const locale of locales)
      await withPage("coming-soon", { locale }, (s) => {
        for (const link of s.document.querySelectorAll("[data-book]")) {
          if (link.dataset.bookSoon) {
            assert.equal(link.getAttribute("href"), link.dataset.bookSoon);
            assert.ok(s.document.querySelector(link.dataset.bookSoon));
          } else {
            assert.equal(new URL(link.href).hostname, "wa.me");
            assert.ok(new URL(link.href).searchParams.get("text"));
            assert.equal(link.target, "_blank");
          }
        }
        assert.equal(s.document.documentElement.dataset.booking, "soon");
        assert.equal(
          s.find(".book-pill").textContent,
          s.find('[data-str="find.waBtn"]').textContent,
        );
      });
  },
);

await check(
  "Terms preserve legal anchors, route language and contact links",
  async () => {
    for (const locale of locales)
      await withPage("terms", { locale }, (s) => {
        assert.equal(s.document.documentElement.lang, locale);
        for (const id of ["terms", "privacy", "refund"]) {
          const bodyClass = locale === "en" ? "legal-en" : "legal-zh";
          const otherClass = locale === "en" ? "legal-zh" : "legal-en";
          assert.ok(s.find(`#${id} .${bodyClass}`).textContent.trim());
          assert.equal(s.document.querySelector(`#${id} .${otherClass}`), null);
          assert.ok(s.find(`a[href="#${id}"]`));
        }
        assert.equal(new URL(s.find("#waTerms").href).hostname, "wa.me");
        assert.match(
          s.find(".legal-title").textContent,
          locale === "en" ? /Terms|Policies/i : /條款|政策/,
        );
      });
  },
);

await check(
  "Venue checkout validates details and carries real references and midnight dates into calendars",
  async () => {
    for (const locale of locales)
      await withPage(
        "booking",
        { locale, query: "mode=venue&court=vb&t=23:00" },
        async (s) => {
          s.screen("s1");
          assert.equal(s.find("#sumNext").disabled, true);
          s.click('[data-csize="A"]');
          s.click("#sumNext");
          s.screen("s2");
          assert.equal(
            s.find("#sumNext").disabled,
            true,
            "Wait for backend availability",
          );
          await s.ready();
          assert.ok(s.find('[data-t="23:00"]').classList.contains("on"));
          assert.equal(s.find('[data-t="07:00"]').disabled, true);
          s.click('[data-t="00:00"]');
          assert.equal(s.document.querySelectorAll(".tslot.on").length, 2);
          assert.equal(s.find("#sumTotal").textContent, "HK$ 980");
          assert.ok(s.find('[data-t="00:00"] .nd').textContent.trim());
          s.click('[data-t="10:00"]');
          assert.equal(s.document.querySelectorAll(".tslot.on").length, 1);
          s.click('[data-t="11:00"]');
          assert.equal(s.document.querySelectorAll(".tslot.on").length, 2);
          s.click('[data-t="11:00"]');
          assert.equal(s.document.querySelectorAll(".tslot.on").length, 1);
          s.click('[data-t="23:00"]');
          s.click('[data-t="00:00"]');
          assert.equal(s.document.querySelectorAll(".tslot.on").length, 2);
          assert.equal(s.find("#sumTotal").textContent, "HK$ 980");
          s.click("#sumNext");
          await s.ready();
          s.screen("s6");
          assert.equal(s.find("#s6extra").hidden, true);
          assert.equal(s.find("#sumNext").disabled, true);
          fillContact(s);
          assert.equal(
            s.find("#sumNext").disabled,
            true,
            "Waiver must be required",
          );
          s.click("#cWaiver");
          assert.equal(s.find("#sumNext").disabled, false);
          assert.equal(
            new URL(s.find("#tcOpen").href).pathname,
            `${basePath}/${locale}/terms/`,
          );
          assert.equal(new URL(s.find("#tcOpen").href).hash, "#terms");
          const { calendar, ics } = await completeBooking(s);
          assert.equal(
            calendar.searchParams.get("dates"),
            "20261024T230000/20261025T010000",
          );
          assert.match(ics, /DTSTART:20261024T230000/);
          assert.match(ics, /DTEND:20261025T010000/);
          assert.equal(s.document.querySelector("#qrpass"), null);
          assert.equal(s.document.body.classList.contains("qr-on"), false);
          assert.match(s.find("#recap").textContent, /TEST-INV-checkout/);
        },
      );
  },
);

await check(
  "Court B pricing follows weekday peak boundaries and clears changed dates",
  async () => {
    for (const locale of locales)
      await withPage(
        "booking",
        { locale, query: "mode=venue&court=fb" },
        async (s) => {
          s.click('[data-csize="B"]');
          s.click("#sumNext");
          s.click('#dates2 [data-d="1"]');
          await s.ready();
          s.click('[data-t="07:00"]');
          assert.equal(
            s.find("#sumTotal").textContent,
            "HK$ 490",
            "Sunday daytime uses peak price",
          );
          s.click('#dates2 [data-d="2"]');
          await s.ready();
          assert.equal(s.document.querySelectorAll(".tslot.on").length, 0);
          assert.equal(s.find("#sumNext").disabled, true);
          s.click('[data-t="15:00"]');
          s.click('[data-t="16:00"]');
          assert.equal(
            s.find("#sumTotal").textContent,
            "HK$ 880",
            "Monday 15:00 off-peak plus 16:00 peak",
          );
        },
      );
  },
);

await check("Classes use backend categories, coaches, prices, seats and enrollment references", async () => {
  for (const locale of locales) await withPage("booking", { locale, query: "mode=class" }, async (s) => {
    s.screen("s1c"); assert.match(s.find("#catList").textContent, /Sports classes/);
    s.click('[data-cat="101"]'); s.click("#sumNext"); s.screen("s3");
    assert.equal(s.find('[data-cls="903"]').disabled, true);
    assert.match(s.find('[data-cls="901"]').textContent, /Backend coach/);
    assert.match(s.find('[data-cls="901"]').textContent, /HK\$ 500/);
    s.click('#classChips [data-f="101"]'); s.click('#classChips [data-f="102"]');
    s.click('#sportChips [data-s="202"]');
    assert.equal(s.document.querySelectorAll("#classList .opt").length, 1);
    s.click('[data-cls="902"]'); s.click("#sumNext"); await s.ready(); s.screen("s6");
    assert.equal(s.find("#s6extra").hidden, true); fillContact(s); s.click("#cWaiver");
    assert.equal(s.find("#sumTotal").textContent, "HK$ 650");
    const {calendar,ics}=await completeBooking(s);
    assert.equal(calendar.searchParams.get("dates"), "20261128T193000/20261128T210000");
    assert.match(calendar.searchParams.get("text"), /Pickleball/);
    assert.match(ics, /TEST-ENROLL-/);
    assert.ok(s.find("#recap").textContent.includes("HK$ 0"));
    assert.ok(s.requests.some(r => r.url.pathname === "/public/enrollment/checkouts"));
  });
});

await check("Full-course pricing books every lesson, restores course URLs and exports the entire schedule", async () => {
  for (const locale of locales) await withPage("booking", { locale, step: "classes" }, async s => {
    const card = s.find('[data-cls="course-43"]');
    assert.match(card.textContent, /HK\$ 1,200/);
    assert.match(card.textContent, locale === "en" ? /Full course/ : /整期課程/);
    assert.match(s.find('[data-cls="901"]').textContent, locale === "en" ? /Single lesson/ : /單堂課堂/);
    s.click('[data-cls="course-43"]');
    assert.equal(s.find("#courseSchedule").hidden, false);
    assert.equal(s.document.querySelectorAll("#courseSchedule li").length, 3);
    s.click("#sumNext"); await s.ready(); s.screen("s6");
    const query = s.window.location.search.slice(1), url = new URL(s.window.location.href);
    assert.equal(url.searchParams.get("courseId"), "43");
    assert.equal(url.searchParams.has("lessonId"), false);
    assert.equal(url.searchParams.has("classId"), false);
    await withPage("booking", { locale, step: "details", query }, restored => { restored.screen("s6"); assert.equal(restored.find("#sumTotal").textContent,"HK$ 1,200"); });
    fillContact(s); s.click("#cWaiver");
    const { calendar, ics } = await completeBooking(s);
    assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 3);
    assert.match(ics, /20261110T090000/);
    assert.equal(calendar.searchParams.get("dates"), "20261027T090000/20261027T103000");
    assert.match(s.find("#gcal").textContent, locale === "en" ? /first lesson/ : /首堂/);
    const posted = s.requests.find(r => r.url.pathname === "/public/enrollment/checkouts");
    assert.equal(JSON.parse(posted.options.body).courseId,43);
    assert.equal(JSON.parse(posted.options.body).lessonId,undefined);
    const sessionData = Object.fromEntries(Object.keys(s.window.sessionStorage).map(k => [k,s.window.sessionStorage.getItem(k)]));
    await withPage("booking", { locale, step:"confirmation", query:s.window.location.search.slice(1), sessionData, fetch:(input,options) => new URL(input).pathname.endsWith("/courses") ? Promise.resolve({ok:true,json:async()=>[]}) : fixtureFetch(input,options) }, refreshed => {
      refreshed.screen("s8"); assert.match(refreshed.find("#recap").textContent, /HK\$ 1,200/);
      const downloaded = decodeURIComponent(refreshed.find("#ics").href.split(",").slice(1).join(","));
      assert.equal((downloaded.match(/BEGIN:VEVENT/g) || []).length,3);
    });
  });
});

await check("Enrollment confirmations restore without public availability and reject missing guest credentials", async () => {
  for (const locale of locales) await withPage("booking", { locale, step: "details", query: "mode=class&lessonId=901" }, async (s) => {
    s.screen("s6"); fillContact(s); s.click("#cWaiver"); await completeBooking(s);
    const query = s.window.location.search.slice(1);
    const sessionData = Object.fromEntries(Object.keys(s.window.sessionStorage).map(k => [k,s.window.sessionStorage.getItem(k)]));
    await withPage("booking", { locale, step: "confirmation", query, sessionData, fetch: (input,options) => {
      if (new URL(input).pathname.endsWith("/courses")) return Promise.resolve({ok:true,json:async()=>[]});
      return fixtureFetch(input,options);
    } }, refreshed => { refreshed.screen("s8"); assert.match(refreshed.find("#recap").textContent,/TEST-ENROLL-/); assert.match(refreshed.find("#s8 .sub").textContent,/HK\$ 0/); });
    await withPage("booking", {locale,step:"confirmation",query}, stranger => {stranger.screen("s7");assert.equal(stranger.find("#paymentNext").disabled,true);});
  });
});

await check("Legacy booking IDs recover through the private session and receipts show balances without profile data", async () => {
  for (const locale of locales) await withPage("booking", { locale, step:"details", query:"mode=class&lessonId=901" }, async s => {
    fillContact(s); s.click("#cWaiver"); await completeBooking(s);
    const canonical = new URL(s.window.location.href), actualId = canonical.searchParams.get("checkoutId");
    const legacyId = "11111111-2222-4333-8444-555555555555";
    const sessionData = {};
    for (const key of Object.keys(s.window.sessionStorage)) {
      const value = JSON.parse(s.window.sessionStorage.getItem(key));
      if (value?.token) sessionData[key] = JSON.stringify({ ...value, id: legacyId });
    }
    canonical.searchParams.set("checkoutId",legacyId);
    await withPage("booking",{locale,step:"confirmation",query:canonical.search.slice(1),sessionData},refreshed=>{
      refreshed.screen("s8");
      assert.equal(new URL(refreshed.window.location.href).searchParams.get("checkoutId"),actualId);
      assert.ok(refreshed.requests.some(r=>r.url.pathname.endsWith("/checkout-session")));
      assert.match(refreshed.find("#recap").textContent,/HK\$ 0/);
      assert.match(refreshed.find("#recap").textContent,/HK\$ 500/);
      assert.equal(refreshed.find("#recap").textContent.includes("Smoke Check"),false);
    });
  });
});

await check("Direct classes route loads real lessons, handles API errors and ignores forged details", async () => {
  for (const locale of locales) {
    let failed = true;
    await withPage("booking", { locale, step:"classes", fetch: async (input, options) => {
      if (new URL(input).pathname.endsWith("/courses") && failed) throw new Error("Offline");
      return fixtureFetch(input, options);
    } }, async (s) => {
      s.screen("s3"); assert.ok(s.find("#classStatus").textContent); assert.equal(s.find("#sumNext").disabled,true);
      failed=false; s.click("#classRetry"); await s.ready();
      assert.equal(s.document.querySelectorAll("#classList .opt").length,4);
      s.click('[data-cls="901"]'); s.click("#sumNext"); await s.ready(); s.screen("s6");
      assert.equal(new URL(s.window.location.href).searchParams.get("lessonId"),"901");
      assert.equal(s.find("#sumTotal").textContent,"HK$ 500");
    });
    await withPage("booking",{locale,step:"details",query:"mode=class&lessonId=999999"},s=>{s.screen("s3");assert.equal(s.find("#sumNext").disabled,true);});
  }
});

await check(
  "Personal training filters reset selections and book a single hour",
  async () => {
    for (const locale of locales)
      await withPage("booking", { locale, query: "mode=pt" }, async (s) => {
        s.screen("s5");
        s.click('[data-coach="marco"]');
        s.click('#coachFilters [data-t="sc"]');
        assert.equal(
          s.find("#sumNext").disabled,
          true,
          "A filtered-out coach must be cleared",
        );
        s.click('[data-coach="ken"]');
        s.click("#sumNext");
        s.screen("s5b");
        s.click('[data-size="8"]');
        s.click("#sumNext");
        s.screen("s2");
        assert.equal(s.document.querySelector("#slotNight"), null);
        s.click('[data-t="10:00"]');
        s.click('[data-t="11:00"]');
        assert.equal(s.document.querySelectorAll(".tslot.on").length, 1);
        s.click("#sumNext");
        s.screen("s6");
        assert.equal(s.find("#s6extra").hidden, true);
        fillContact(s);
        s.click("#cWaiver");
        assert.equal(s.find("#sumTotal").textContent, "HK$ 1,000");
        const { calendar } = await completeBooking(s);
        assert.equal(
          calendar.searchParams.get("dates"),
          "20261024T110000/20261024T120000",
        );
        assert.equal(s.document.querySelector("#qrpass"), null);
      });
  },
);

await check(
  "Language and booking render when browser storage is unavailable",
  () =>
    withPage("booking", { locale: "zh-HK", blockedStorage: true }, (s) => {
      s.screen("s1");
      assert.equal(s.document.documentElement.lang, "zh-HK");
      assert.equal(s.find("#s1 h1").textContent, "選擇運動");
      s.click('[data-court="bb"]');
      s.click("#sumNext");
      s.screen("s2");
    }),
);

await check(
  "Venue catalog failure disables courts and retries in both locales",
  async () => {
    for (const locale of locales) {
      let fail = true;
      await withPage(
        "booking",
        {
          locale,
          query: "mode=venue",
          fetch(input) {
            return fail
              ? Promise.reject(new Error("Offline"))
              : fixtureFetch(input);
          },
        },
        async (s) => {
          assert.equal(s.find("#venueRetry").hidden, false);
          assert.ok(
            [...s.document.querySelectorAll("[data-court]")].every(
              (b) => b.disabled,
            ),
          );
          assert.equal(s.find("#sumNext").disabled, true);
          assert.doesNotMatch(s.find("#courtList").textContent, /HK\$/);
          assert.equal(
            s.find('[data-court="vb"] .d').textContent,
            s.find("#venueStatus").textContent,
            "Request failures must show the load error on court cards",
          );
          fail = false;
          s.click("#venueRetry");
          await s.ready();
          s.click('[data-court="bb"]');
          assert.equal(s.find("#sumNext").disabled, false);
        },
      );
    }
  },
);

await check("Services without backend rooms stay unavailable", async () => {
  await withPage(
    "booking",
    {
      query: "mode=venue&court=bb",
      fetch: async () => ({
        ok: true,
        json: async () =>
          fixtureServices.map((service) => ({ ...service, placeRooms: [] })),
      }),
    },
    (s) => {
      assert.equal(s.find('[data-court="bb"]').disabled, true);
      assert.equal(s.find("#sumNext").disabled, true);
      assert.equal(s.find("#venueRetry").hidden, true);
    },
  );
});

await check(
  "Venue slots use backend prices, recover from errors, and ignore outdated responses",
  async () => {
    const pending = [];
    await withPage(
      "booking",
      {
        query: "mode=venue&court=bb",
        fetch(input) {
          if (new URL(input).pathname.endsWith("/services"))
            return fixtureFetch(input);
          return new Promise((resolve, reject) =>
            pending.push({ input, resolve, reject }),
          );
        },
      },
      async (s) => {
        s.click("#sumNext");
        assert.equal(s.find('[data-t="10:00"]').disabled, true);
        pending[0].reject(new Error("Offline"));
        await s.ready();
        assert.equal(s.find("#slotRetry").hidden, false);
        assert.equal(s.find("#sumNext").disabled, true);
        s.click("#slotRetry");
        s.click('#dates2 [data-d="1"]');
        s.click('#dates2 [data-d="0"]');
        const latest = await (await fixtureFetch(pending[3].input)).json();
        latest.slots.forEach((slot) => {
          slot.available = true;
          slot.availableRoomIds = latest.rooms.map((room) => room.id);
          slot.totalCents = 67890;
        });
        pending[3].resolve({ ok: true, json: async () => latest });
        await s.ready();
        assert.equal(s.find("#slotRetry").hidden, true);
        assert.match(s.find("#s2sub").textContent, /Backend bb default/);
        s.click('[data-t="10:00"]');
        assert.match(s.find("#s2sub").textContent, /Room/);
        assert.equal(s.find("#sumTotal").textContent, "HK$ 678.9");
        const outdated = await (await fixtureFetch(pending[1].input)).json();
        outdated.slots.forEach((slot) => {
          slot.available = false;
        });
        pending[1].resolve({ ok: true, json: async () => outdated });
        pending[2].reject(new Error("Old request failed"));
        await s.ready();
        assert.equal(s.find('[data-t="10:00"]').disabled, false);
        assert.equal(s.find("#sumTotal").textContent, "HK$ 678.9");
        assert.equal(s.find("#sumNext").disabled, false);
      },
    );
  },
);

await check(
  "Service-only mapping handles multiple rooms without joining hours in different rooms",
  async () => {
    await withPage(
      "booking",
      {
        query: "mode=venue&court=bb",
        fetch: async (input) => {
          const response = await fixtureFetch(input);
          if (new URL(input).pathname.endsWith("/services")) return response;
          const data = await response.json();
          const firstId = data.rooms[0].id;
          const secondId = firstId + 1000;
          data.rooms.push({ id: secondId, name: "Second room", branchId: 1 });
          for (const slot of data.slots) {
            slot.available = true;
            slot.availableRoomIds =
              slot.time === "10:00"
                ? [firstId]
                : slot.time === "11:00"
                ? [secondId]
                : [firstId, secondId];
          }
          return { ok: true, json: async () => data };
        },
      },
      async (s) => {
        s.click("#sumNext");
        await s.ready();
        s.click('[data-t="10:00"]');
        assert.equal(
          s.find('[data-t="11:00"]').classList.contains("adj"),
          false,
        );
        s.click('[data-t="11:00"]');
        assert.equal(s.document.querySelectorAll(".tslot.on").length, 1);
        assert.match(s.find("#s2sub").textContent, /Second room/);
        s.click('[data-t="12:00"]');
        assert.equal(s.document.querySelectorAll(".tslot.on").length, 2);
        assert.equal(s.find("#sumNext").disabled, false);
        assert.match(s.find("#s2sub").textContent, /Second room/);
      },
    );
  },
);

await check(
  "Booking steps are exported in both languages and legacy step URLs preserve parameters",
  async () => {
    for (const locale of locales)
      for (const step of bookingSteps) {
        assert.match(bookingHtml[locale][step], /id="courtList"/);
        const doc = new JSDOM(bookingHtml[locale][step]).window.document;
        assert.equal(
          new URL(
            doc.querySelector('link[rel="canonical"]').href,
          ).pathname.endsWith(`/${locale}/booking/${step}/`),
          true,
        );
      }
    for (const step of bookingSteps) {
      const doc = new JSDOM(
        await readFile(
          path.join(output, "booking", step, "index.html"),
          "utf8",
        ),
      ).window.document;
      const script = [...doc.querySelectorAll("script:not([src])")].find((s) =>
        s.textContent.includes("window.location.replace"),
      );
      let target;
      const location = {
        search: "?mode=venue&roomId=200&date=2026-10-24&time=23%3A00",
        hash: "",
        replace(value) {
          target = value;
        },
      };
      runInNewContext(script.textContent, { window: { location }, location });
      assert.equal(target, `${basePath}/en/booking/${step}/${location.search}`);
    }
  },
);

await check(
  "Venue routes carry room, date and midnight hours, restore drafts, and support browser back",
  async () => {
    for (const locale of locales) {
      await withPage(
        "booking",
        { locale, query: "mode=venue&court=vb" },
        async (s) => {
          s.click('[data-csize="A"]');
          s.click("#sumNext");
          assert.equal(
            s.window.location.pathname,
            `${basePath}/${locale}/booking/time/`,
          );
          await s.ready();
          s.click('[data-t="23:00"]');
          s.click('[data-t="00:00"]');
          const timeUrl = new URL(s.window.location.href);
          assert.equal(
            timeUrl.searchParams.get("serviceId"),
            String(fixtureMapping.courts.vb.A.serviceId),
          );
          assert.equal(
            timeUrl.searchParams.get("roomId"),
            String(fixtureServices[0].placeRooms[0].id),
          );
          assert.equal(timeUrl.searchParams.get("date"), "2026-10-24");
          assert.equal(timeUrl.searchParams.get("time"), "23:00,00:00");
          s.click("#sumNext");
          await s.ready();
          s.screen("s6");
          assert.equal(
            s.window.location.pathname,
            `${basePath}/${locale}/booking/details/`,
          );
          fillContact(s);
          await new Promise((resolve) => {
            s.window.addEventListener("popstate", resolve, { once: true });
            s.window.history.back();
          });
          await s.ready();
          s.screen("s2");
          assert.equal(s.window.location.search, timeUrl.search);
          assert.equal(s.document.querySelectorAll(".tslot.on").length, 2);
          for (const target of locales) {
            const link = new URL(s.find(`a[data-locale="${target}"]`).href);
            assert.equal(link.pathname, `${basePath}/${target}/booking/time/`);
            assert.equal(link.search, timeUrl.search);
          }
          await new Promise((resolve) => {
            s.window.addEventListener("popstate", resolve, { once: true });
            s.window.history.forward();
          });
          await s.ready();
          s.screen("s6");
          assert.equal(s.find("#fEmail").value, "smoke@example.test");
          s.click("#cWaiver");
          s.click("#sumNext");
          await s.ready();
          s.screen("s7");
          const paymentUrl = new URL(s.window.location.href);
          assert.equal(
            paymentUrl.pathname,
            `${basePath}/${locale}/booking/payment/`,
          );
          assert.doesNotMatch(
            paymentUrl.href,
            /smoke%40|1234|55849706|Smoke|Check/,
          );
          const sessionData = Object.fromEntries(
            Object.keys(s.window.sessionStorage).map((key) => [
              key,
              s.window.sessionStorage.getItem(key),
            ]),
          );
          await withPage(
            "booking",
            {
              locale,
              step: "payment",
              query: paymentUrl.search.slice(1),
              sessionData,
            },
            async (refreshed) => {
              refreshed.screen("s7");
              assert.equal(
                refreshed.find("#fEmail").value,
                "smoke@example.test",
              );
              assert.equal(refreshed.find("#sumTotal").textContent, "HK$ 980");
              assert.equal(refreshed.window.location.search, paymentUrl.search);
              refreshed.click("#sumNext");
              await refreshed.ready();
              refreshed.screen("s8");
              const confirmationDraft = Object.fromEntries(
                Object.keys(refreshed.window.sessionStorage).map((key) => [
                  key,
                  refreshed.window.sessionStorage.getItem(key),
                ]),
              );
              await withPage(
                "booking",
                {
                  locale,
                  step: "confirmation",
                  query: paymentUrl.search.slice(1),
                  sessionData: confirmationDraft,
                },
                (confirmation) => {
                  confirmation.screen("s8");
                },
              );
            },
          );
          // History cannot turn a server-confirmed booking into an editable draft.
          await new Promise((resolve) => {
            s.window.addEventListener("popstate", resolve, { once: true });
            s.window.history.back();
          });
          await s.ready();
          s.screen("s8");
          assert.match(s.window.location.pathname, /booking\/confirmation\/$/);
          assert.match(s.find("#recap").textContent, /TEST-INV-/);
          assert.ok(s.find("#recap").textContent.includes("HK$ 0"));
          assert.ok(s.find("#recap").textContent.includes("HK$ 980"));
          assert.ok(s.find("#s8 .sub").textContent.includes("HK$ 0"));
        },
      );
    }
  },
);

const venueSelectionQuery = () => new URLSearchParams({ mode: "venue", serviceId: String(fixtureServices[0].id), roomId: String(fixtureServices[0].placeRooms[0].id), date: "2026-10-24", time: "23:00,00:00" }).toString();

await check("Venue quote and checkout errors use API state and never produce a confirmation", async () => {
  for (const locale of locales) {
    await withPage("booking", { locale, step: "time", query: venueSelectionQuery(), fetch: async (input, options) => {
      if (new URL(input).pathname.endsWith("/quote")) return { ok: true, json: async () => ({ ...fixtureQuote(Object.fromEntries(new URL(input).searchParams)), totalCents: 12345 }) };
      if (new URL(input).pathname.endsWith("/checkouts")) {
        assert.equal(JSON.parse(options.body).expectedTotalCents, 12345);
        return { ok: false, status: 409, json: async () => ({ message: "Conflict" }) };
      }
      return fixtureFetch(input, options);
    } }, async (s) => {
      s.screen("s2"); s.click("#sumNext"); await s.ready(); s.screen("s6");
      assert.equal(s.find("#sumTotal").textContent, "HK$ 123.45");
      fillContact(s); s.click("#cWaiver"); s.click("#sumNext"); await s.ready();
      s.screen("s2"); assert.ok(s.find("#quoteStatus").textContent);
      assert.equal(s.window.location.search.includes("checkoutId"), false);
      assert.equal(s.requests.some((r) => r.url.pathname.endsWith("/payment")), false);
    });
    await withPage("booking", { locale, step: "time", query: venueSelectionQuery(), fetch: async (input, options) => {
      if (new URL(input).pathname.endsWith("/quote")) return { ok: true, json: async () => ({ ...fixtureQuote(Object.fromEntries(new URL(input).searchParams)), paymentAvailable: false }) };
      return fixtureFetch(input, options);
    } }, async (s) => {
      s.click("#sumNext"); await s.ready(); s.screen("s6"); fillContact(s); s.click("#cWaiver");
      assert.equal(s.find("#sumNext").disabled, false, "Deferred confirmation does not require payment availability");
      assert.equal(s.find("#detailsStatus").textContent, "");
      s.click("#sumNext"); await s.ready(); s.screen("s7");
      s.click("#sumNext"); await s.ready(); s.screen("s8");
      assert.ok(s.find("#s8 .sub").textContent.includes("HK$ 0"));
    });
  }
});

await check("Venue contact details explain why Next is disabled and respond to input and change", async () => {
  for (const locale of locales) await withPage("booking", { locale, step: "details", query: venueSelectionQuery() }, async (s) => {
    s.screen("s6");
    assert.equal(s.find("#sumNext").disabled, true);
    assert.ok(s.find("#detailsStatus").textContent.includes(s.find('label[for="fHkid"]').textContent.trim()));
    fillContact(s);
    assert.equal(s.find("#sumNext").disabled, true);
    assert.match(s.find("#detailsStatus").textContent, locale === "en" ? /Terms of Service Policy/ : /服務條款政策/);
    s.find("#cWaiver").checked = true;
    s.find("#cWaiver").dispatchEvent(new s.window.Event("change", { bubbles: true }));
    assert.equal(s.find("#sumNext").disabled, false);
    assert.equal(s.find("#detailsStatus").textContent, "");
    assert.equal(s.find("#cMkt").checked, false, "Marketing consent is optional");
    s.fill("#fHkid", "1234");
    assert.equal(s.find("#sumNext").disabled, true);
    assert.match(s.find("#detailsStatus").textContent, /A123.*AB12/);
    s.fill("#fHkid", "AB12");
    assert.equal(s.find("#sumNext").disabled, false);
    s.fill("#fEmail", "invalid-email");
    assert.equal(s.find("#sumNext").disabled, true);
    assert.ok(s.find("#detailsStatus").textContent);
    s.fill("#fEmail", "smoke@example.test");
    s.fill("#fPhone", "invalid-phone");
    assert.equal(s.find("#sumNext").disabled, true);
    assert.ok(s.find("#detailsStatus").textContent);
    s.fill("#fPhone", "+852 55849706");
    assert.equal(s.find("#sumNext").disabled, false);
    assert.equal(s.find("#detailsStatus").textContent, "");
    s.click("#sumNext"); await s.ready(); s.screen("s7");
  });
});

await check("Lost checkout responses retry with the same bearer and create only one booking", async () => {
  let loseResponse = true;
  const count = fixtureCheckouts.size;
  await withPage("booking", { step: "details", query: venueSelectionQuery(), fetch: async (input, options) => {
    const response = await fixtureFetch(input, options);
    if (new URL(input).pathname.endsWith("/checkouts") && loseResponse) { loseResponse = false; throw new Error("Response lost after commit"); }
    return response;
  } }, async (s) => {
    fillContact(s); s.click("#cWaiver"); s.click("#sumNext"); await s.ready();
    s.screen("s6"); assert.ok(s.find("#detailsStatus").textContent);
    s.click("#sumNext"); await s.ready(); s.screen("s7");
    const bodies = s.requests.filter((r) => r.url.pathname.endsWith("/checkouts")).map((r) => JSON.parse(r.options.body));
    assert.equal(bodies.length, 2); assert.equal(bodies[0].checkoutToken, bodies[1].checkoutToken);
    assert.equal(fixtureCheckouts.size, count + 1);
    assert.equal(s.window.location.href.includes(bodies[0].checkoutToken), false);
  });
});

await check("Legacy pending payments require verification and gateway fragments restore receipts without storage", async () => {
  for (const locale of locales) await withPage("booking", { locale, step: "details", query: venueSelectionQuery(), fetch: async (input, options) => {
    if (new URL(input).pathname.endsWith("/payment")) {
      const id = new URL(input).pathname.split("/checkouts/")[1].split("/")[0];
      const entry = fixtureCheckouts.get(id); entry.record.paymentStarted = true;
      return { ok: true, json: async () => ({ checkout: structuredClone(entry.record), checkoutUrl: null }) };
    }
    return fixtureFetch(input, options);
  } }, async (s) => {
    fillContact(s); s.click("#cWaiver"); s.click("#sumNext"); await s.ready(); s.screen("s7");
    s.click("#sumNext"); await s.ready(); s.screen("s7");
    const url = new URL(s.window.location.href); const entry = fixtureCheckouts.get(url.searchParams.get("checkoutId"));
    assert.equal(entry.record.status, "Pending"); assert.ok(s.find("#paymentStatus").textContent);
    entry.record.status = "Paid";
    s.click("#paymentRefresh"); await s.ready(); s.screen("s8");
    await withPage("booking", { locale, step: "payment", query: url.search.slice(1), hash: `checkoutToken=${entry.token}`, blockedSessionStorage: true }, async (returned) => {
      returned.screen("s8"); assert.equal(returned.window.location.hash, "");
      assert.match(returned.find("#recap").textContent, new RegExp(entry.record.reference));
      assert.equal(returned.requests.some((r) => /availability/.test(r.url.pathname)), false);
      for (const target of locales) assert.equal(returned.find(`a[data-locale="${target}"]`).href.includes(entry.token), false);
    });
    await withPage("booking", { locale, step: "confirmation", query: url.search.slice(1) }, (stranger) => {
      stranger.screen("s7"); assert.equal(stranger.find("#sumNext").disabled, true);
      assert.ok(stranger.find("#paymentStatus").textContent);
      assert.equal(stranger.find("#recap").textContent.includes(entry.record.reference), false);
    });
  });
});

await check("Editing an unpaid checkout cancels its room hold; expired holds cannot pay", async () => {
  await withPage("booking", { step: "details", query: venueSelectionQuery() }, async (s) => {
    fillContact(s); s.click("#cWaiver"); s.click("#sumNext"); await s.ready(); s.screen("s7");
    const id = new URL(s.window.location.href).searchParams.get("checkoutId");
    s.click("#back"); await s.ready(); s.screen("s2");
    assert.equal(fixtureCheckouts.get(id).record.status, "Cancelled");
    assert.equal(new URL(s.window.location.href).searchParams.has("checkoutId"), false);
  });
  await withPage("booking", { step: "details", query: venueSelectionQuery() }, async (s) => {
    fillContact(s); s.click("#cWaiver"); s.click("#sumNext"); await s.ready(); s.screen("s7");
    const entry = fixtureCheckouts.get(new URL(s.window.location.href).searchParams.get("checkoutId"));
    entry.record.status = "Expired"; s.click("#paymentRefresh"); await s.ready(); s.screen("s7");
    assert.equal(s.find("#sumNext").disabled, true); assert.ok(s.find("#paymentStatus").textContent);
    assert.equal(s.requests.some((r) => r.url.pathname.endsWith("/payment")), false);
  });
});

await check(
  "Deep links validate room ownership, availability, dates and adjacent hours before later steps",
  async () => {
    const serviceId = fixtureMapping.courts.vb.A.serviceId;
    const roomId = fixtureServices[0].placeRooms[0].id;
    const query = `mode=venue&serviceId=${serviceId}&roomId=${roomId}&date=2026-10-24&time=23:00,00:00`;
    await withPage("booking", { step: "details", query }, (s) => {
      s.screen("s6");
      assert.equal(s.find("#sumTotal").textContent, "HK$ 980");
    });
    await withPage("booking", { step: "confirmation", query }, (s) => {
      s.screen("s6");
      assert.match(s.window.location.pathname, /\/booking\/details\/$/);
    });
    for (const invalid of [
      query.replace(`roomId=${roomId}`, "roomId=999999"),
      query.replace("23:00,00:00", "10:00,12:00"),
      query.replace("2026-10-24", "2026-02-30"),
      query.replace("2026-10-24", "2025-10-24"),
    ]) {
      await withPage("booking", { step: "details", query: invalid }, (s) => {
        s.screen("s2");
        assert.equal(s.find("#sumNext").disabled, true);
        assert.equal(
          new URL(s.window.location.href).searchParams.has("time"),
          false,
        );
      });
    }
    await withPage(
      "booking",
      {
        step: "details",
        query,
        fetch: async (input) => {
          const response = await fixtureFetch(input);
          if (new URL(input).pathname.endsWith("/services")) return response;
          const data = await response.json();
          for (const slot of data.slots) {
            slot.available = false;
            slot.availableRoomIds = [];
          }
          return { ok: true, json: async () => data };
        },
      },
      (s) => {
        s.screen("s2");
        assert.equal(s.find("#sumNext").disabled, true);
      },
    );
  },
);

await check(
  "Class and personal training steps have refreshable routes",
  async () => {
    await withPage(
      "booking",
      {
        step: "details",
        query: "mode=class&lessonId=901&date=2026-10-27&time=09:00",
      },
      async (s) => {
        s.screen("s6");
        fillContact(s);
        s.click("#cWaiver");
        s.click("#sumNext");
        await s.ready();
        s.screen("s7");
        const sessionData = Object.fromEntries(
          Object.keys(s.window.sessionStorage).map((key) => [
            key,
            s.window.sessionStorage.getItem(key),
          ]),
        );
        await withPage(
          "booking",
          {
            step: "payment",
            query: s.window.location.search.slice(1),
            sessionData,
          },
          (refreshed) => {
            refreshed.screen("s7");
            assert.equal(refreshed.find("#fEmail").value, "smoke@example.test");
          },
        );
      },
    );
    await withPage(
      "booking",
      { step: "classes", query: "mode=class&category=102" },
      async (s) => {
        s.screen("s3");
        s.click('[data-cls="902"]');
        s.click("#sumNext");
        await s.ready();
        s.screen("s6");
        assert.match(s.window.location.pathname, /\/booking\/details\/$/);
        assert.equal(
          new URL(s.window.location.href).searchParams.get("classId"),
          "902",
        );
        assert.equal(
          new URL(s.window.location.href).searchParams.get("date"),
          "2026-11-28",
        );
        assert.equal(
          new URL(s.window.location.href).searchParams.get("time"),
          "19:30",
        );
      },
    );
    await withPage(
      "booking",
      {
        step: "time",
        query: "mode=pt&coach=marco&size=1&date=2026-10-24&time=11:00",
      },
      (s) => {
        s.screen("s2");
        assert.equal(s.find('[data-t="11:00"]').classList.contains("on"), true);
        s.click("#sumNext");
        s.screen("s6");
      },
    );
  },
);

await check(
  "Booking navigation works without session storage and refresh returns safely to contact details",
  async () => {
    const serviceId = fixtureMapping.courts.vb.A.serviceId;
    const roomId = fixtureServices[0].placeRooms[0].id;
    const query = `mode=venue&serviceId=${serviceId}&roomId=${roomId}&date=2026-10-24&time=23:00`;
    await withPage(
      "booking",
      { step: "details", query, blockedSessionStorage: true },
      async (s) => {
        s.screen("s6");
        fillContact(s);
        s.click("#cWaiver");
        s.click("#sumNext");
        await s.ready();
        s.screen("s7");
        await withPage(
          "booking",
          { step: "payment", query, blockedSessionStorage: true },
          (refreshed) => {
            refreshed.screen("s6");
            assert.equal(refreshed.find("#fEmail").value, "");
          },
        );
      },
    );
  },
);

await check(
  "Disposing the page aborts venue reads and prevents late rendering",
  async () => {
    let resolve;
    const s = createPage("booking", {
      query: "mode=venue",
      fetch: () =>
        new Promise((done) => {
          resolve = done;
        }),
    });
    try {
      const before = s.find("#courtList").innerHTML;
      const signal = s.requests[0].options.signal;
      s.unmount();
      assert.equal(signal.aborted, true);
      resolve({ ok: true, json: async () => fixtureServices });
      await s.ready();
      assert.equal(s.find("#courtList").innerHTML, before);
    } finally {
      s.close();
    }
  },
);

console.log(`\n${passed} smoke checks passed; ${failed} failed.`);
process.exitCode = failed ? 1 : 0;
