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
const output = path.join(root, "out");
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
  define: { "process.env.NEXT_PUBLIC_BASE_PATH": JSON.stringify(basePath) },
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

function createPage(
  page,
  {
    query = "",
    hash = "",
    locale = "en",
    storedLanguage = locale === "en" ? "zh" : "en",
    reducedMotion = false,
    blockedStorage = false,
  } = {},
) {
  const timers = new Map();
  let timerId = 0;
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => errors.push(error));
  const pathname = `/${locale}/${page === "home" ? "" : `${page}/`}`;
  const dom = new JSDOM(html[locale][page], {
    url: `${origin}${basePath}${pathname}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`,
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
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
  });
  const { window } = dom;
  const { document } = window;
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
    await run(session);
  } finally {
    session.close();
  }
}

function fillContact(session) {
  for (const [id, value] of Object.entries({
    fFirst: "Smoke",
    fLast: "Check",
    fHkid: "1234",
    fEmail: "smoke@example.test",
    fPhone: "55849706",
  }))
    session.fill(`#${id}`, value);
}

function completeBooking(session) {
  session.click("#sumNext");
  session.screen("s7");
  assert.ok(session.document.body.classList.contains("in-checkout"));
  session.click("#sumNext");
  session.screen("s8");
  assert.equal(session.find("#summary").hidden, true);
  assert.equal(session.find("#bar").style.display, "none");
  assert.match(session.find("#recap").textContent, /SHHK-2026-0001/);
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
          url: `${origin}${basePath}/${locale}/${page === "home" ? "" : `${page}/`}`,
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
  "Venue booking validates details and carries midnight dates into QR and calendars",
  async () => {
    for (const locale of locales)
      await withPage(
        "booking",
        { locale, query: "mode=venue&court=vb&t=23:00" },
        (s) => {
          s.screen("s1");
          assert.equal(s.find("#sumNext").disabled, true);
          s.click('[data-csize="A"]');
          s.click("#sumNext");
          s.screen("s2");
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
          const { calendar, ics } = completeBooking(s);
          assert.equal(
            calendar.searchParams.get("dates"),
            "20261024T230000/20261025T010000",
          );
          assert.match(ics, /DTSTART:20261024T230000/);
          assert.match(ics, /DTEND:20261025T010000/);
          assert.ok(s.find("#qrpass .qr svg"));
          assert.ok(s.find("#qrpass .qr-sample").textContent.trim());
          assert.ok(s.document.body.classList.contains("qr-on"));
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
        (s) => {
          s.click('[data-csize="B"]');
          s.click("#sumNext");
          s.click('#dates2 [data-d="1"]');
          s.click('[data-t="07:00"]');
          assert.equal(
            s.find("#sumTotal").textContent,
            "HK$ 490",
            "Sunday daytime uses peak price",
          );
          s.click('#dates2 [data-d="2"]');
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

await check(
  "Workshop filters, extended details and one-session calendar export",
  async () => {
    for (const locale of locales)
      await withPage("booking", { locale, query: "mode=class" }, (s) => {
        s.screen("s1c");
        assert.equal(s.document.querySelector('[data-cat="cert"]'), null);
        s.click('[data-cat="sport"]');
        s.click("#sumNext");
        s.screen("s3");
        // The chosen session governs its form even after changing category filters.
        s.click('#classChips [data-f="sport"]');
        s.click('#classChips [data-f="ws"]');
        s.click('#sportChips [data-s="pb"]');
        assert.equal(s.document.querySelectorAll("#classList .opt").length, 1);
        s.click('[data-cls="w2"]');
        s.click("#sumNext");
        s.screen("s6");
        assert.equal(s.find("#s6extra").hidden, false);
        assert.equal(s.find("#fNotesRow").hidden, false);
        fillContact(s);
        s.click("#cWaiver");
        assert.equal(
          s.find("#sumNext").disabled,
          true,
          "Workshop extra fields must be required",
        );
        s.fill("#fDob", "1990-01-01");
        s.fill("#fGender", "f");
        s.fill("#fHear", "friend");
        assert.equal(s.find("#sumTotal").textContent, "HK$ 2,000");
        const { calendar, ics } = completeBooking(s);
        assert.equal(
          calendar.searchParams.get("dates"),
          "20261128T193000/20261128T210000",
        );
        assert.match(calendar.searchParams.get("text"), /Pickleball|匹克球/);
        assert.match(ics, /DTEND:20261128T210000/);
        assert.equal(s.document.querySelector("#qrpass"), null);
        assert.equal(s.document.body.classList.contains("qr-on"), false);
      });
  },
);

await check(
  "Sport classes use the short form and their next scheduled session",
  async () => {
    for (const locale of locales)
      await withPage("booking", { locale, query: "mode=class" }, (s) => {
        s.click('[data-cat="sport"]');
        s.click("#sumNext");
        assert.equal(s.find("#dates3wrap").hidden, true);
        assert.equal(s.find("#dowWrap").hidden, true);
        s.click('[data-cls="c1"]');
        s.click("#sumNext");
        s.screen("s6");
        assert.equal(s.find("#s6extra").hidden, true);
        assert.equal(s.find("#fNotesRow").hidden, true);
        fillContact(s);
        s.click("#cWaiver");
        const { calendar } = completeBooking(s);
        assert.equal(
          calendar.searchParams.get("dates"),
          "20261027T090000/20261027T103000",
        );
        assert.equal(s.document.querySelector("#qrpass"), null);
      });
  },
);

await check(
  "Personal training filters reset selections and book a single hour",
  async () => {
    for (const locale of locales)
      await withPage("booking", { locale, query: "mode=pt" }, (s) => {
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
        const { calendar } = completeBooking(s);
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

console.log(`\n${passed} smoke checks passed; ${failed} failed.`);
process.exitCode = failed ? 1 : 0;
