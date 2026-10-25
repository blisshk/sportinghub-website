import { BOOKING_DATA } from "./data";
import { withBasePath, localizedPath, syncLocaleLinks } from "./paths";
import { bookingPath, bookingScreen, bookingDateIndex } from "./booking-routes";
import { createSiteTranslator } from "../i18n/translate";
import { venueMapping, mappedVenueRows, readVenueData, requestVenueData } from "./venue-api";
import { cancelCheckout, checkoutTimes, checkoutToken as newCheckoutToken, createCheckout, escapeBookingText, hongKongDate, loadCheckout, payCheckout } from "./venue-checkout";

/**
 * Mount the site's browser interactions after React has rendered the page.
 * Booking state, event handlers, and slideshow timers belong to this mount,
 * so navigation and React Strict Mode can dispose and initialize them safely.
 * @param {'home' | 'coming-soon' | 'booking' | 'terms'} page
 * @param {import('../i18n/config').Locale} locale
 * @returns {() => void}
 */
export function initializeSite(page, locale) {
  const t = createSiteTranslator(locale);
  const listeners = new Set();
  const clickHandlers = new WeakMap();
  const intervals = new Set();
  let routeActive = false;
  let restoringRoute = false;
  let requestedStep = 0;
  let requestedRoomId = null;
  let bookingCompleted = false;
  let bookingDraft = null;
  const checkout = { busy: false, loading: false, error: "", quote: null, quoteKey: null, record: null, token: null, id: null, request: 0 };
  const venueAbort = new AbortController();
  const venue = {
    loading: true,
    error: false,
    services: [],
    rooms: [],
    key: null,
    request: 0,
    slots: null,
    slotError: false,
  };
  const venueRows = (id) => mappedVenueRows(id, venue.services);
  const ratesFor = (id) =>
    page === "booking" && MODE === "venue" ? venueRows(id) : RATES[id] || [];
  const selectedVenue = () =>
    venueRows(S.court).find((r) => !r.court || r.court === S.csize);
  // A multi-hour booking must fit in one physical room for the whole span.
  const availableVenueRooms = (times) =>
    times.length
      ? (venue.slots?.find((s) => s.time === times[0])?.availableRoomIds || [])
          .filter((id) => times.every((time) =>
            venue.slots?.find((s) => s.time === time)?.availableRoomIds.includes(id),
          ))
      : [];
  const siteRoot =
    document.body.querySelector(".site-body, .bk-body") || document.body;
  const fallbackStorage = new Map();
  const storage = {
    getItem(key) {
      try {
        return (
          window.localStorage.getItem(key) ?? fallbackStorage.get(key) ?? null
        );
      } catch {
        return fallbackStorage.get(key) ?? null;
      }
    },
    setItem(key, value) {
      fallbackStorage.set(key, String(value));
      try {
        window.localStorage.setItem(key, String(value));
      } catch {}
    },
  };
  function on(target, type, listener, options) {
    if (!target) return () => {};
    target.addEventListener(type, listener, options);
    const dispose = () => {
      target.removeEventListener(type, listener, options);
      listeners.delete(dispose);
    };
    listeners.add(dispose);
    return dispose;
  }
  function onClick(target, listener) {
    if (target) clickHandlers.set(target, listener);
  }
  function every(callback, delay) {
    const timer = window.setInterval(callback, delay);
    intervals.add(timer);
    return timer;
  }
  function cancelEvery(timer) {
    window.clearInterval(timer);
    intervals.delete(timer);
  }
  function setPageClass(name, enabled) {
    document.body.classList.toggle(name, enabled);
    siteRoot.classList.toggle(name, enabled);
  }
  // Dynamic booking lists replace their buttons on every render. One root
  // listener and weak keys let detached buttons and their handlers be collected.
  on(siteRoot, "click", (event) => {
    for (const target of event.composedPath()) {
      const listener = clickHandlers.get(target);
      if (listener) {
        if (page === "booking" && checkout.busy) break;
        if (page === "booking") {
          routeActive = true;
          if (target.dataset && ["court", "csize", "cat", "cls", "coach", "size", "d", "t"].some((key) => key in target.dataset))
            { bookingCompleted = false; checkout.quote = null; checkout.quoteKey = null; checkout.error = ""; }
        }
        if (listener.call(target, event) === false) event.preventDefault();
      }
      if (target === siteRoot || event.cancelBubble) break;
    }
  });
  const WA_NUMBER =
    "85255849706"; /* general enquiries, +852 5584 9706 (Suki, contact card 2026-10-04) */
  /* Corporate enquiries get their own number (Suki: "i will share later").
   Until it arrives they go to the general number, still labelled by the
   corporate prefill. Replace this one line when it comes. */
  const WA_NUMBER_CORP = WA_NUMBER;

  // The URL locale owns language; legacy storage preferences cannot override it.
  const lang = () => (locale === "zh-HK" ? "zh" : "en");

  function applyTranslations() {
    document.documentElement.lang = locale;
    document.querySelectorAll("[data-str]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-str"));
    });
    document.querySelectorAll("[data-str-ph]").forEach((el) => {
      el.placeholder = t(el.getAttribute("data-str-ph"));
    });
    document.querySelectorAll("[data-str-aria]").forEach((el) => {
      el.setAttribute("aria-label", t(el.getAttribute("data-str-aria")));
    });
    document.querySelectorAll("[data-str-title]").forEach((el) => {
      el.setAttribute("title", t(el.getAttribute("data-str-title")));
    });
  }

  /* ---------- WhatsApp deep link ---------- */
  /* wa.me link with a per-page prefill, so enquiries arrive labelled. Text is
   passed in already resolved by next-intl, so no
   Chinese/English literal lives in this helper. */
  function waHref(text, number) {
    return (
      "https://wa.me/" +
      (number || WA_NUMBER) +
      "?text=" +
      encodeURIComponent(text || "")
    );
  }
  function waLink(id, text, number) {
    const a = document.getElementById(id);
    if (!a) return;
    a.href = waHref(text, number);
  }

  /* HomePage is shared by the open-booking and coming-soon routes.
   Coming-soon booking links lead to enquiry messages or on-page anchors. */
  function bookingMode() {
    return document.documentElement.getAttribute("data-booking") === "soon"
      ? "soon"
      : "open";
  }

  function wireBooking() {
    const soon = bookingMode() === "soon";
    document.querySelectorAll("[data-book]").forEach((a) => {
      const mode = a.getAttribute("data-book");
      const sport = a.getAttribute("data-sport");
      const anchor = a.getAttribute("data-book-soon");
      if (!soon) {
        a.href =
          localizedPath("/booking/", locale) +
          "?mode=" +
          mode +
          (sport ? "&court=" + sport : "");
        a.removeAttribute("target");
        a.removeAttribute("rel");
        return;
      }
      const label = a.getAttribute("data-str-soon");
      if (label) a.textContent = t(label);
      if (anchor) {
        a.href = anchor;
        a.removeAttribute("target");
        a.removeAttribute("rel");
        return;
      }
      let text = t("wa.prefillBook");
      if (mode === "venue" && sport)
        text = t("wa.prefillCourt", { sport: t("sport." + sport + ".name") });
      if (mode === "class") text = t("wa.prefillClass");
      if (mode === "pt") text = t("wa.prefillPt");
      const forced = a.getAttribute("data-wa");
      if (forced) text = t(forced);
      a.href = waHref(text);
      a.target = "_blank";
      a.rel = "noopener";
    });
  }

  /* ---------- mobile drawer ---------- */

  function initNav() {
    const burger = document.getElementById("burger");
    const drawer = document.getElementById("drawer");
    const drawerScrim = document.getElementById("drawerScrim");
    const closeX = document.getElementById("drawerX");
    if (!burger || !drawer) return; /* booking.html has no burger/drawer */
    const open = (v) => {
      drawer.classList.toggle("is-open", v);
      if (drawerScrim) drawerScrim.classList.toggle("is-open", v);
      burger.setAttribute("aria-expanded", String(v));
      document.body.style.overflow = v ? "hidden" : "";
      if (v) {
        const first = drawer.querySelector("a");
        if (first) first.focus();
      }
    };
    onClick(burger, () => open(!drawer.classList.contains("is-open")));
    if (closeX)
      onClick(closeX, () => {
        open(false);
        burger.focus();
      });
    if (drawerScrim) onClick(drawerScrim, () => open(false));
    drawer.querySelectorAll("a").forEach((a) => onClick(a, () => open(false)));
    on(document, "keydown", (e) => {
      if (e.key === "Escape" && drawer.classList.contains("is-open")) {
        open(false);
        burger.focus();
      }
    });
  }

  function boot(after) {
    initView();
    initNav();
    applyTranslations();
    if (after) after();
  }

  /* ---------- dev / client view (2026-09-09) ---------- */
  /* index.html's tweaks panel writes the choice to storage 'shhk-mock-view'.
   booking.html has no panel and shipped with data-view="dev" hard-coded, so a
   client who had switched to Client on the landing page still saw every dev
   tag and the three "Backend change request" callouts on the booking screens.
   Both pages now read the same key here; ?view=client|dev on either URL sets
   it. Client view hides .tbc, .photo-slot, .dev-note and .cr via CSS.

   Round 2 (client review 2026-09-19, item 8): the DEFAULT is now client, not
   dev. A first-time visitor with nothing in storage and no query param
   sees the presentable page; dev annotations are opt-in through ?view=dev or
   the landing page's panel switch, and persist exactly as before. Nothing
   else about the panel logic changes. booking.html inherits this unchanged,
   since it calls the same boot() -> initView() and has no panel of its own. */
  function initView() {
    const KEY = "shhk-mock-view";
    let v = null;
    try {
      const forced = new URLSearchParams(location.search).get("view");
      if (forced === "client" || forced === "dev") {
        storage.setItem(KEY, forced);
      }
      v = storage.getItem(KEY);
    } catch (e) {}
    document.documentElement.setAttribute(
      "data-view",
      v === "dev" ? "dev" : "client",
    );
  }

  const PRICES = {
    court: null,
    class: 2000,
    pt: 1000,
  }; /* null renders as HK$ TBC */
  /* 2026-10-13: one class per booking. Sport and S&C classes book a single
   session instead of a term, and certificate courses (several weeks, the
   prepaid shape KPay refused) leave the online flow. false brings back the
   round 4 term and certificate model. */
  const ONE_CLASS_PER_BOOKING = true;
  function money(v) {
    return v == null
      ? '<span class="price-tbc" data-price="tbc">HK$ TBC</span>'
      : "HK$ " + Number(v).toLocaleString("en-US"); /* 1,180, not 1180 */
  }

  /* ---------- round 5: court hire rate card, HK$ per court per hour ----------
   Source: the client's rate card, transcribed from the shared sheet
   2026-10-01 and cross-checked figure for figure against the official
   workbook 2026-10-03 (raw/assets/hksh-round5/). Volleyball and floorball
   price two courts differently, so they carry one row per court.
   Peak is 16:00 to 23:00 Monday to Friday, 07:00 to 23:00 on Saturdays,
   Sundays and public holidays; every other hour is off-peak.
   The commercial tier on the same sheet (HKEVA, HK Star, event) is marked
   "can't be booked online" and is deliberately not published here.
   The landing page's price table renders from RATES. Venue booking reads
   live service rates and hourly prices from the backend instead. */
  const RATES = {
    vb: [
      { court: "A", peak: 590, off: 490 },
      { court: "B", peak: 490, off: 390 },
    ],
    bb: [{ peak: 590, off: 490 }],
    pb: [{ peak: 390, off: 290 }],
    fb: [
      { court: "A", peak: 590, off: 490 },
      { court: "B", peak: 490, off: 390 },
    ],
    tq: [{ peak: 390, off: 290 }],
    db: [{ peak: 590, off: 490 }],
    bd: [{ peak: 390, off: 290 }],
  };
  const RATE_ORDER = [
    "vb",
    "bb",
    "pb",
    "fb",
    "tq",
    "db",
    "bd",
  ]; /* the rate card's own order */
  const MEMBERSHIP_FEE = 350; /* one-off, sport class members: account plus training kit (2026-09-25 call) */
  /* "from" prices for the landing page tiles: the lowest off-peak court rate,
   and TBC where the client's sheet is not readable yet (classes, PT). The
   2026-10-13 dummies in PRICES stay inside the booking flow, so the main
   site and the coming-soon page still say "Prices coming soon". */
  const FROM_PRICES = {
    court: Math.min(...RATE_ORDER.flatMap((id) => RATES[id].map((r) => r.off))),
    class: null,
    pt: null,
  };

  const ymd = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  const twoCourts = (id) =>
    page === "booking" && MODE === "venue"
      ? Object.keys(venueMapping.courts[id] || {}).length > 1
      : !!(RATES[id] && RATES[id].length > 1);
  /* the rate row for the chosen court, or null while a two-court sport has no court picked */
  function rateRow() {
    const rows = ratesFor(S.court);
    if (!rows.length) return null;
    return !twoCourts(S.court)
      ? rows[0]
      : rows.find((r) => r.court === S.csize) || null;
  }
  function slotPrice(t) {
    const slot = venue.slots?.find((s) => s.time === t);
    return slot ? slot.totalCents / 100 : null;
  }
  /* the lowest rate the current choice can cost per hour, for "from" lines */
  function fromRate(id) {
    const rows = ratesFor(id);
    const pool =
      id === S.court && S.csize
        ? rows.filter((r) => r.court === S.csize)
        : rows;
    return pool.length ? Math.min(...pool.map((r) => r.off)) : null;
  }
  /* venue total: exact once every hour has its slot, else "from" the lowest
   rate times the hours; null (HK$ TBC) for classes and personal training */
  function courtTotal() {
    if (MODE !== "venue" || !S.court) return null;
    if (
      S.times.length &&
      rateRow() &&
      availableVenueRooms(S.times).length
    )
      return {
        exact: true,
        v: S.times.reduce((a, t) => a + slotPrice(t), 0),
      };
    const f = fromRate(S.court);
    return f == null ? null : { exact: false, v: f };
  }
  /* 2026-10-13: a class or an hour of personal training is one session at
   the dummy price, so its total is exact from the first step */
  function bookingTotal() {
    if (onlineBooking && checkout.record) return { exact: true, v: checkout.record.totalCents / 100 };
    if (onlineBooking && checkout.quote) return { exact: true, v: checkout.quote.totalCents / 100 };
    if (MODE === "venue") return courtTotal();
    const v = MODE === "pt" ? PRICES.pt : CLASSES.find(c => c.id === S.cls)?.priceCents / 100;
    return !Number.isFinite(v) ? null : { exact: true, v };
  }

  // Keep schedules and relationships in the booking model; translate display
  // fields through catalog keys built from the stable record IDs.
  const qs = new URLSearchParams(location.search);
  const MODE = ["venue", "class", "pt"].includes(qs.get("mode"))
    ? qs.get("mode")
    : location.pathname.replace(/\/$/, "").endsWith("/classes") || qs.has("lessonId") || qs.has("courseId") ? "class" : "venue";
  const onlineBooking = MODE !== "pt";
  const checkoutScope = MODE === "class" ? "enrollment" : "place";
  const checkoutStorageKey = MODE === "class" ? "shhk-enrollment-checkout" : "shhk-venue-checkout";
  const classes = { loading: MODE === "class", error: false };
  const COURTS = BOOKING_DATA.COURTS;
  let CATS = MODE === "class" ? [] : BOOKING_DATA.CATS;
  let CLASSES = MODE === "class" ? [] : BOOKING_DATA.CLASSES;
  const COACHES = BOOKING_DATA.COACHES;
  const SIZES = BOOKING_DATA.SIZES;
  /* 2026-10-13: what the online flow offers. One class per booking leaves
   certificate courses out: they run for weeks, the shape KPay refused. */
  let BOOKABLE_CATS = ONE_CLASS_PER_BOOKING
    ? CATS.filter((c) => c.id !== "cert")
    : CATS;
  let BOOKABLE_CLASSES = CLASSES.filter((c) =>
    BOOKABLE_CATS.some((k) => k.id === c.cat),
  );
  const sportName = (id) => MODE === "class" ? escapeBookingText(CLASSES.find(c => c.sport === id)?.sportName || id) : t("sport." + id + ".name");
  const modelNamespaces = new Map([
    ...COURTS.map((item) => [item, "court"]),
    ...CATS.map((item) => [item, "cat"]),
    ...CLASSES.map((item) => [item, "class"]),
    ...COACHES.map((item) => [item, "coach"]),
    ...SIZES.map((item) => [item, "size"]),
  ]);
  const coachName = (coach) => (coach ? t("coach." + coach.id + ".name") : "");
  const coachTags = (coach) => [
    t("coach." + coach.id + ".tag1"),
    t("coach." + coach.id + ".tag2"),
  ];
  const coachRole = (role) => {
    const coach = COACHES.find((item) => item.n === role || item.id === role);
    return coach ? coachName(coach) : role;
  };

  /* Round 2 item 9: one neutral avatar glyph. Was inline in renderCoaches;
   lifted to a const so the coach line on the class session cards uses the
   same mark.
   (Round 2's COACH_TAGS specialty map was retired in round 4: the personal
   training filter is by sport now, read straight off each coach's `sport`
   field, so there is nothing to derive from the tag labels.) */
  const AVATAR = `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.4" stroke="currentColor" stroke-width="1.6"/><path d="M5 19c1.2-3.6 4-5.4 7-5.4s5.8 1.8 7 5.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  const coachVal = (role) => `${coachRole(role)}, ${T("coach_tbc")}`;
  const coachLine = (role) => `${T("l_coach")}: ${coachVal(role)}`;

  /* ---------- hours: round 3 to 5 used a stepper; round 6 lets the time grid
   set the length (one hour, or two back to back), see pickSlot() ---------- */
  const MAX_HOURS = 2; /* max 2 hours a day per HKID, back to back (client 2026-09-19; Siu 2026-10-04) */

  /* Round 4: three of the seven bookable sports had no court diagram, so they
   got a neutral outline rather than an invented approximation. Round 5
   (client, 2026-09-25): Suki drew the three herself (floorball, Teqvoly,
   dodgeball) and they now sit in DIA beside the agency's four, same role:
   the sport mark on the cards customers choose from (Alfred, 2026-10-03).
   DIA_TBC stays as the fallback for any future court with no art yet. */
  const DIA_TBC = `<svg viewBox="0 0 106.15 94.01" aria-hidden="true" focusable="false"><rect x="8" y="8" width="90.15" height="78.01" rx="3" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 4" opacity="0.55"/><line x1="53.07" y1="8" x2="53.07" y2="86.01" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 4" opacity="0.55"/></svg>`;
  const diaFor = (c) => (c && c.dia && DIA[c.dia] ? DIA[c.dia] : DIA_TBC);

  /* ---------- round 2 item 11: fixed details the calendar event quotes ---------- */
  const VENUE =
    "Sporting Hub Hong Kong"; /* brand name, identical in both locales per strings.en.json's glossary */
  const REF = "SHHK-2026-0001"; /* was inline in renderRecap */

  const TIMES = [
    "07:00",
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
    "21:00",
    "22:00",
  ];
  /* ---------- 2026-10-17: overnight court hire, 23:00 to 07:00 ----------
   ID-door call (2026-10-10): from 07:00 to 23:00 people check in at the front
   desk with their HKID. From 23:00 to 07:00 entry is by QR code: a booking
   that reaches that window gets one on the confirmation page (not by email)
   that opens the door, one code for the whole group, valid from the
   booking's start to its end.
   A night belongs to the evening it starts on. The date strip picks the
   evening, and 00:00 to 06:00 are the next calendar day: the grid marks them
   "next day", and the summary, the QR validity line and the calendar event
   carry the real date. That date change at midnight is the trap the call
   flagged. Court hire only: classes and personal training run 07:00 to
   23:00, so their grid stays TIMES.
   2026-10-18: one switch for the whole block. false takes the night hours off
   the court grid, so no booking reaches the QR window and every confirmation
   shows the front-desk line (waits on Suki: overnight bookable online?). */
  const OVERNIGHT_ONLINE = true;
  const NIGHT_TIMES = OVERNIGHT_ONLINE
    ? ["23:00", "00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00"]
    : [];
  const ALL_TIMES = TIMES.concat(NIGHT_TIMES);
  const QR_FROM = 23,
    QR_UNTIL = 7; /* the QR entry window */
  /* class session start times, one per card position. Lifted out of
   renderClasses (round 2 item 11) so the calendar link can read back the time
   the chosen card actually showed. */
  const CLASS_TIMES = ["09:00", "12:30", "18:00", "19:30", "20:30"];
  const CLS_TIME = {};
  /* deterministic "already booked" pattern, so the demo looks the same every load.
   2026-10-17: the night slots (index 16 up) use a sparser pattern of their
   own, so the 07:00 to 22:00 pattern is unchanged. */
  const taken = (dayIdx, i) =>
    i < TIMES.length ? (dayIdx * 7 + i * 5) % 11 < 3 : (dayIdx + i) % 7 === 0;

  /* ---------- state ---------- */
  const FLOWS = {
    venue: ["s1", "s2", "s6", "s7", "s8"],
    class: ["s1c", "s3", "s6", "s7", "s8"],
    pt: ["s5", "s5b", "s2", "s6", "s7", "s8"],
  };
  const RAIL = {
    venue: ["st_court", "st_when", "st_you", "st_pay"],
    class: ["st_cat", "st_session", "st_you", "st_pay"],
    pt: ["st_coach", "st_size", "st_when", "st_you", "st_pay"],
  };
  /* hours (round 3, hours per booking), times (round 3, one slot per hour),
   ctag (round 2, the coach specialty filter), sport (round 4 N1, the sport
   filter on the session list) and dow (round 4 N2, the weekday picker for
   term courses) are the additions to v1's state object. */
  const S = {
    i: 0,
    court: null,
    cat: null,
    cls: null,
    coach: null,
    size: null,
    day: 0,
    times: [],
    filters: [],
    ctag: "",
    sport: "",
    dow: null,
    csize: null,
    roomId: null,
  };

  const contactFields = [
    "fFirst",
    "fLast",
    "fHkid",
    "fEmail",
    "fPhone",
    "fDob",
    "fGender",
    "fHear",
    "fNotes",
  ];
  const draftKey = () =>
    JSON.stringify([
      MODE,
      S.court,
      S.csize,
      S.cat,
      S.cls,
      S.coach,
      S.size,
      MODE === "class" && S.cls
        ? ymd(sessionDate(CLASSES.find((c) => c.id === S.cls)))
        : ymd(dayDate(S.day)),
      S.roomId,
      S.times,
    ]);
  function saveBookingDraft() {
    if (restoringRoute || S.i < FLOWS[MODE].indexOf("s6")) return;
    bookingDraft = {
      key: draftKey(),
      savedAt: Date.now(),
      completed: bookingCompleted,
      fields: Object.fromEntries(
        contactFields.map((id) => [
          id,
          document.getElementById(id)?.value || "",
        ]),
      ),
      waiver: document.getElementById("cWaiver").checked,
      marketing: document.getElementById("cMkt").checked,
    };
    try {
      window.sessionStorage.setItem(
        "shhk-booking-draft",
        JSON.stringify(bookingDraft),
      );
    } catch {}
  }
  function restoreBookingDraft() {
    bookingCompleted = false;
    let draft = null;
    let saved = bookingDraft;
    try {
      saved =
        JSON.parse(window.sessionStorage.getItem("shhk-booking-draft")) ||
        saved;
    } catch {}
    if (saved?.key === draftKey() && Date.now() - saved.savedAt < 2 * 3600000)
      draft = saved;
    for (const id of contactFields) {
      const input = document.getElementById(id);
      if (input)
        input.value =
          typeof draft?.fields?.[id] === "string" ? draft.fields[id] : "";
    }
    document.getElementById("cWaiver").checked = draft?.waiver === true;
    document.getElementById("cMkt").checked = draft?.marketing === true;
    bookingCompleted = draft?.completed === true;
  }
  function contactProblem() {
    const missing = requiredFields().filter((id) => !document.getElementById(id)?.value.trim());
    if (missing.length) return T("contact_required", {
      fields: missing.map((id) => document.querySelector(`label[for="${id}"]`).textContent.trim()).join(locale === "zh-HK" ? "、" : ", "),
    });
    if (onlineBooking) {
      if (!document.getElementById("fEmail").checkValidity()) return T("contact_email_invalid");
      if (!/^\+?[0-9 ()-]{8,24}$/.test(document.getElementById("fPhone").value.trim())) return T("contact_phone_invalid");
      if (!/^[A-Za-z](?:\d{3}|[A-Za-z]\d{2})$/.test(document.getElementById("fHkid").value.trim())) return T("contact_hkid_invalid");
    }
    return document.getElementById("cWaiver").checked ? "" : T("contact_terms_required");
  }
  function validContact() {
    return !contactProblem();
  }
  function restoreBookingRoute() {
    if (onlineBooking) {
      checkout.record = null; checkout.quote = null; checkout.quoteKey = null;
      checkout.loading = false; checkout.busy = false; checkout.error = "";
    }
    const params = new URLSearchParams(location.search);
    const flow = FLOWS[MODE];
    requestedStep = flow.indexOf(bookingScreen(location.pathname, flow));
    routeActive =
      location.pathname !== bookingPath(flow[0], locale) ||
      ["serviceId", "roomId", "date", "time"].some((key) => params.has(key));
    restoringRoute = true;
    venue.request++;
    venue.key = null;
    venue.slots = null;
    venue.rooms = [];
    S.court = COURTS.some((c) => c.id === params.get("court"))
      ? params.get("court")
      : null;
    S.csize = params.get("courtSize");
    if (MODE === "venue" && params.has("serviceId")) {
      const matches = Object.entries(venueMapping.courts).flatMap(
        ([court, variants]) =>
          Object.entries(variants)
            .filter(
              ([, link]) =>
                String(link.serviceId) === params.get("serviceId") &&
                Number.isSafeInteger(link.serviceId),
            )
            .map(([variant]) => ({
              court,
              variant: variant === "default" ? null : variant,
            })),
      );
      const match =
        matches.find((m) => m.court === S.court && m.variant === S.csize) ||
        matches[0];
      S.court = match?.court || null;
      S.csize = match?.variant || null;
    }
    S.cat = BOOKABLE_CATS.some((c) => c.id === params.get("category"))
      ? params.get("category")
      : null;
    S.cls =
      BOOKABLE_CLASSES.find((c) => c.pricingMode === "course"
        ? !params.has("lessonId") && String(c.courseId) === params.get("courseId")
        : c.id === (params.get("lessonId") || params.get("classId")))?.id || null;
    if (S.cls) S.cat = BOOKABLE_CLASSES.find((c) => c.id === S.cls).cat;
    S.filters = S.cat ? [S.cat] : [];
    S.coach = COACHES.some((c) => c.id === params.get("coach"))
      ? params.get("coach")
      : null;
    S.size = SIZES.some((s) => s.id === params.get("size"))
      ? params.get("size")
      : null;
    const day = params.has("date")
      ? bookingDateIndex(params.get("date"), ymd(dayDate(0)))
      : 0;
    S.day = day ?? 0;
    const times = (params.get("time") || params.get("t") || "")
      .split(",")
      .filter(Boolean);
    const allowed = MODE === "venue" ? ALL_TIMES : TIMES;
    S.times =
      MODE !== "class" &&
      day !== null &&
      times.length <= (MODE === "venue" ? MAX_HOURS : 1) &&
      times.every(
        (time, i) =>
          allowed.includes(time) &&
          (!i || allowed.indexOf(time) === allowed.indexOf(times[i - 1]) + 1),
      )
        ? times
        : [];
    const room = params.get("roomId");
    requestedRoomId =
      room && /^[1-9]\d*$/.test(room) && Number.isSafeInteger(Number(room))
        ? Number(room)
        : null;
    S.roomId = requestedRoomId;
    if (room && !requestedRoomId) S.times = [];
    restoreBookingDraft();
    if (onlineBooking && restoreCheckoutSession(params)) return;
    if (onlineBooking) { checkout.id = null; checkout.token = null; }
    settleBookingRoute();
    render();
  }
  function settleBookingRoute() {
    if (!restoringRoute) return;
    if (onlineBooking && (checkout.loading || checkout.record)) return;
    const flow = FLOWS[MODE];
    let limit = flow.length - 1;
    if (MODE === "venue" && requestedStep > 0) {
      if (venue.loading) {
        S.i = 0;
        return;
      }
      if (!selectedVenue()) limit = 0;
      else {
        S.i = 1;
        ensureVenueSlots();
        if (!venue.slots && !venue.slotError) return;
        if (!S.times.length || !availableVenueRooms(S.times).length) limit = 1;
      }
    } else if (MODE === "class") {
      if (classes.loading) { S.i = requestedStep ? 1 : 0; return; }
      if (!S.cls || !CLASSES.find(c => c.id === S.cls)?.available) limit = 1;
    } else if (MODE === "pt") {
      if (!S.coach) limit = 0;
      else if (!S.size) limit = 1;
      else if (!S.times.length) limit = 2;
    }
    if (!validContact()) limit = Math.min(limit, flow.indexOf("s6"));
    if (!bookingCompleted) limit = Math.min(limit, flow.indexOf("s7"));
    if (onlineBooking && !checkout.record) limit = Math.min(limit, flow.indexOf("s6"));
    S.i = Math.min(requestedStep, limit);
    restoringRoute = false;
  }
  function writeBookingRoute(push = false) {
    if (page !== "booking" || restoringRoute || (!routeActive && !push)) return;
    const url = new URL(location.href);
    url.pathname = bookingPath(FLOWS[MODE][S.i], locale);
    const params = url.searchParams;
    for (const key of [
      "court",
      "courtSize",
      "serviceId",
      "roomId",
      "date",
      "time",
      "t",
      "category",
      "classId", "lessonId", "courseId",
      "coach",
      "size",
      "checkoutId",
    ])
      params.delete(key);
    params.set("mode", MODE);
    if (onlineBooking && checkout.id) params.set("checkoutId", checkout.id);
    if (MODE === "venue") {
      const selected = selectedVenue();
      if (S.court) params.set("court", S.court);
      if (S.csize) params.set("courtSize", S.csize);
      if (selected) params.set("serviceId", String(selected.serviceId));
      if (S.roomId && S.times.length) params.set("roomId", String(S.roomId));
    } else {
      for (const [key, value] of [
        ["category", S.cat],
        ["classId", S.cls],
        ["coach", S.coach],
        ["size", S.size],
      ])
        if (value) params.set(key, value);
    }
    if (S.i > 0 || S.times.length) params.set("date", ymd(dayDate(S.day)));
    if (S.times.length) params.set("time", S.times.join(","));
    if (MODE === "class" && S.cls) {
      const session = CLASSES.find((c) => c.id === S.cls);
      if (session.pricingMode === "course") params.delete("classId");
      else params.set("lessonId", String(session.lessonId));
      params.set("courseId", String(session.courseId));
      params.set("date", ymd(sessionDate(session)));
      params.set("time", session.start || CLASS_TIMES[0]);
    }
    if (url.href !== location.href)
      window.history[push ? "pushState" : "replaceState"](null, "", url.href);
    syncLocaleLinks();
  }

  function venueRequest() {
    if (MODE === "class") {
      const selected = CLASSES.find(c => c.id === S.cls);
      return !selected ? null : selected.pricingMode === "course" ? { courseId: selected.courseId } : { lessonId: selected.lessonId };
    }
    const row = selectedVenue();
    if (!row || !S.roomId || !S.times.length) return null;
    const start = new Date(`${ymd(slotDate(S.day, S.times[0]))}T${S.times[0]}:00+08:00`);
    return { serviceId: row.serviceId, roomId: S.roomId, startTime: start.toISOString(), endTime: new Date(start.getTime() + S.times.length * 3600000).toISOString() };
  }
  const selectionKey = () => MODE === "class" ? JSON.stringify(checkout.record
    ? checkout.record.pricingMode === "course" || checkout.record.lesson.pricingMode === "course" ? { courseId: checkout.record.course.id } : { lessonId: checkout.record.lesson.id }
    : venueRequest()) : JSON.stringify(checkout.record ? { serviceId: checkout.record.service.id, roomId: checkout.record.room.id,
    startTime: checkout.record.startTime, endTime: checkout.record.endTime } : venueRequest());
  function rememberCheckout() {
    checkout.session = { id: checkout.id, token: checkout.token, key: selectionKey() };
    try { window.sessionStorage.setItem(checkoutStorageKey, JSON.stringify(checkout.session)); } catch {}
  }
  function clearCheckout() {
    checkout.id = null; checkout.token = null; checkout.record = null; checkout.error = "";
    checkout.quote = null; checkout.quoteKey = null;
    checkout.session = null;
    try { window.sessionStorage.removeItem(checkoutStorageKey); } catch {}
  }
  function checkoutError(error) {
    return error?.status === 409 ? MODE === "class" ? "enrollment_conflict" : "booking_conflict" : error?.status === 404 ? "booking_session_error" : error?.status === 503 ? "booking_payment_unavailable" : "booking_error";
  }
  function applyCheckoutRecord(record) {
    if (!record.customer && document.getElementById("fFirst").value && document.getElementById("fLast").value) {
      record = { ...record, customer: { firstName: document.getElementById("fFirst").value, lastName: document.getElementById("fLast").value, email: document.getElementById("fEmail").value } };
    }
    checkout.record = record; checkout.id = record.id;
    if (MODE === "class") {
      const model = enrollmentModel(record.lesson);
      CLASSES = [...CLASSES.filter(c => c.id !== model.id), model]; BOOKABLE_CLASSES = CLASSES;
      if (!CATS.some(c => c.id === model.cat)) CATS.push({ id: model.cat, name: record.course.category?.name || T("classes_other"), kind: "term", api: true });
      BOOKABLE_CATS = CATS; S.cls = model.id; S.cat = model.cat;
    } else {
    S.roomId = record.room.id; S.day = 0; S.times = checkoutTimes(record);
    for (const [court, variants] of Object.entries(venueMapping.courts)) for (const [variant, link] of Object.entries(variants)) {
      if (link.serviceId === record.service.id) { S.court = court; S.csize = variant === "default" ? null : variant; }
    }
    venue.rooms = [record.room];
    venue.slots = S.times.map((time) => ({ time, available: true, availableRoomIds: [record.room.id], totalCents: record.totalCents / S.times.length }));
    }
    bookingCompleted = ["Paid", "Confirmed"].includes(record.status);
    S.i = bookingCompleted ? FLOWS.venue.indexOf("s8") : FLOWS.venue.indexOf("s7");
    restoringRoute = false; routeActive = true;
    rememberCheckout();
  }
  function restoreCheckoutSession(params) {
    let saved = checkout.session || null;
    try { saved = JSON.parse(window.sessionStorage.getItem(checkoutStorageKey)) || saved; } catch {}
    const id = params.get("checkoutId");
    const fragment = new URLSearchParams(location.hash.slice(1));
    const token = fragment.get("checkoutToken") || (saved && (!id || saved.id === id) ? saved.token : null);
    const recover = !id && requestedStep >= FLOWS.venue.indexOf("s6") && saved?.key === selectionKey();
    if (!id && !recover) return false;
    checkout.id = id || saved?.id; checkout.token = token; checkout.record = null;
    checkout.loading = true; checkout.busy = true; checkout.error = "";
    S.i = FLOWS.venue.indexOf("s7");
    if (fragment.has("checkoutToken")) {
      fragment.delete("checkoutToken");
      window.history.replaceState(null, "", location.pathname + location.search + (fragment.toString() ? `#${fragment}` : ""));
    }
    // Persist the bearer before fetching, so a reload after the gateway return
    // still works. It is never copied into a query string or language link.
    rememberCheckout();
    const request = ++checkout.request;
    (token ? loadCheckout(checkout.id, token, venueAbort.signal, checkoutScope) : Promise.reject({ status: 404 }))
      .then((record) => { if (!venueAbort.signal.aborted && checkout.request === request) applyCheckoutRecord(record); })
      .catch((error) => {
        if (venueAbort.signal.aborted || checkout.request !== request) return;
        checkout.error = checkoutError(error); restoringRoute = false;
      }).finally(() => {
        if (venueAbort.signal.aborted || checkout.request !== request) return;
        checkout.loading = false; checkout.busy = false; render();
      });
    render();
    return true;
  }
  async function ensureVenueQuote() {
    const request = venueRequest();
    if (!request) throw new Error("No selected venue");
    const key = selectionKey();
    if (checkout.quoteKey === key && checkout.quote) return checkout.quote;
    const quote = MODE === "class" ? await requestVenueData("quote", { scope: checkoutScope, params: request, signal: venueAbort.signal }) : await readVenueData("quote", { ...request, serviceId: String(request.serviceId), roomId: String(request.roomId) }, venueAbort.signal);
    if (MODE === "class") {
      if ((request.courseId ? quote.courseId !== request.courseId || quote.pricingMode !== "course" || !Array.isArray(quote.lessons) || !quote.lessons.length : quote.lessonId !== request.lessonId || quote.pricingMode === "course") || quote.currency !== "HKD" || !Number.isSafeInteger(quote.totalCents) || quote.totalCents < 0) throw new Error("Invalid enrollment quote");
    } else if (quote.service?.id !== request.serviceId || quote.room?.id !== request.roomId || quote.currency !== "HKD" ||
      !Number.isSafeInteger(quote.totalCents) || quote.totalCents < 0 || !Array.isArray(quote.segments)) throw new Error("Invalid quote response");
    checkout.quote = quote; checkout.quoteKey = key;
    return quote;
  }
  async function advanceVenue() {
    if (checkout.busy) return;
    const screen = FLOWS[MODE][S.i];
    checkout.busy = true; checkout.error = ""; sync();
    try {
      if (screen === "s2" || screen === "s3") {
        await ensureVenueQuote();
        if (venueAbort.signal.aborted) return;
        S.i++;
      } else if (screen === "s6") {
        const quote = await ensureVenueQuote();
        if (!checkout.token) checkout.token = newCheckoutToken();
        rememberCheckout();
        saveBookingDraft();
        const record = await createCheckout({ ...venueRequest(), checkoutToken: checkout.token, expectedTotalCents: quote.totalCents,
          locale, firstName: document.getElementById("fFirst").value.trim(), lastName: document.getElementById("fLast").value.trim(),
          email: document.getElementById("fEmail").value.trim(), phone: document.getElementById("fPhone").value.trim(),
          hkidPrefix: document.getElementById("fHkid").value.trim(), termsAccepted: document.getElementById("cWaiver").checked,
          marketingConsent: document.getElementById("cMkt").checked,
        }, venueAbort.signal, checkoutScope);
        if (venueAbort.signal.aborted) return;
        applyCheckoutRecord(record);
      } else if (screen === "s7") {
        const response = await payCheckout(checkout.id, checkout.token, venueAbort.signal, checkoutScope);
        if (venueAbort.signal.aborted) return;
        applyCheckoutRecord(response.checkout);
        if (response.checkoutUrl) { window.location.assign(response.checkoutUrl); return; }
      }
      routeActive = true; writeBookingRoute(true);
    } catch (error) {
      if (venueAbort.signal.aborted) return;
      checkout.error = screen === "s7" && error.status === 409 ? "booking_payment_started" : checkoutError(error);
      if (error.status === 409 && !checkout.record) {
        checkout.quote = null; checkout.quoteKey = null; S.i = FLOWS[MODE].indexOf(MODE === "class" ? "s3" : "s2"); venue.key = null;
      }
    } finally {
      if (!venueAbort.signal.aborted) { checkout.busy = false; render(); }
    }
  }
  async function refreshVenuePayment() {
    if (checkout.busy || !checkout.id || !checkout.token) return;
    checkout.busy = true; checkout.error = ""; sync();
    try {
      const record = await loadCheckout(checkout.id, checkout.token, venueAbort.signal, checkoutScope);
      if (!venueAbort.signal.aborted) { applyCheckoutRecord(record); writeBookingRoute(); }
    } catch (error) { if (!venueAbort.signal.aborted) checkout.error = checkoutError(error); }
    finally { if (!venueAbort.signal.aborted) { checkout.busy = false; render(); } }
  }
  async function editVenueBooking() {
    if (checkout.busy) return;
    checkout.busy = true; checkout.error = ""; sync();
    try {
      if (checkout.record?.status === "Pending") await cancelCheckout(checkout.id, checkout.token, venueAbort.signal, checkoutScope);
      if (venueAbort.signal.aborted) return;
      if (MODE === "class") {
        clearCheckout(); S.cls = null; S.i = 1; writeBookingRoute(true); await loadClasses(); return;
      }
      const date = new Date(Date.parse(checkout.record.startTime) + 3600000).toISOString().slice(0, 10);
      const times = checkoutTimes(checkout.record);
      clearCheckout();
      const day = bookingDateIndex(date, ymd(dayDate(0)));
      S.day = day ?? 0; S.times = day === null ? [] : times;
      S.i = FLOWS.venue.indexOf("s2"); venue.key = null;
      writeBookingRoute(true);
    } catch { if (!venueAbort.signal.aborted) checkout.error = "booking_payment_started"; }
    finally { if (!venueAbort.signal.aborted) { checkout.busy = false; render(); } }
  }
  function renderCheckoutStatus() {
    if (page !== "booking" || !onlineBooking) return;
    const screen = FLOWS[MODE][S.i];
    let message = checkout.error ? T(checkout.error) : "";
    if (checkout.busy) message = T(checkout.loading ? "booking_loading" : ["s2", "s3"].includes(screen) ? "booking_checking" : screen === "s6" ? "booking_saving" : "booking_processing_payment");
    else if (!message && checkout.record) {
      const record = checkout.record;
      message = record.status === "Confirmed" ? T("booking_confirmed", { received: "HK$ " + Number(record.receivedCents / 100).toLocaleString("en-US") }) : T(record.status === "Paid" ? "booking_paid" : record.status === "Expired" ? "booking_expired" : record.status === "Cancelled" ? "booking_cancelled" : record.paymentStarted ? "booking_payment_started" : "booking_pending",
        record.status === "Pending" && !record.paymentStarted ? { until: new Date(record.expiresAt).toLocaleTimeString(loc(), { timeZone: "Asia/Hong_Kong", hour: "2-digit", minute: "2-digit" }) } : undefined);
    }
    if (!message && screen === "s6") message = contactProblem();
    if (MODE === "class" && screen === "s3") {
      renderClassStatus();
      if (message) document.getElementById("classStatus").textContent = message;
    }
    for (const [id, target] of [["quoteStatus", "s2"], ["detailsStatus", "s6"], ["paymentStatus", "s7"]])
      document.getElementById(id).textContent = target === screen ? message : "";
    document.getElementById("paymentRefresh").hidden = !checkout.id || !checkout.token || ["Paid", "Confirmed"].includes(checkout.record?.status);
    for (const input of document.querySelectorAll("#s6 input, #s6 select, #s6 textarea")) input.disabled = checkout.busy;
    document.getElementById("s6").querySelector(".sub").textContent = T("booking_contact_sub");
    document.getElementById("s7").querySelector(".sub").textContent = T("booking_review");
    document.getElementById("s8").querySelector(".sub").textContent = checkout.record?.status === "Confirmed" ? T("booking_confirmed", { received: "HK$ " + Number(checkout.record.receivedCents / 100).toLocaleString("en-US") }) : T("booking_paid");
  }

  const L = () => lang();
  const T = (key, values) => t("bk." + key, values);
  const pick = (item, field) => {
    if (item?.api) return escapeBookingText(item.description || "");
    const namespace = modelNamespaces.get(item);
    const messageField = { d: "desc", h: "hall", x: "exp" }[field];
    return namespace && messageField
      ? t(`${namespace}.${item.id}.${messageField}`)
      : "";
  };
  const nm = (item) => {
    if (item?.api) return escapeBookingText(item.name);
    const namespace = modelNamespaces.get(item);
    if (namespace === "coach") return coachTags(item).join(" · ");
    return namespace ? t(`${namespace}.${item.id}.name`) : "";
  };

  const DIA = {
    volleyball: `<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 106.15 94.01"><defs><style>.cls-1 {fill: currentColor;}</style></defs><g id="Layer_1-2" data-name="Layer 1"><g><path class="cls-1" d="M106.15,94.01H0l.05-.22L21.57,0h63.01l.03.14,21.54,93.87ZM.45,93.65h105.25L84.29.36H21.86L.45,93.65Z"/><rect class="cls-1" x="17.56" y="15.21" width="70.36" height=".36"/><rect class="cls-1" x="13.89" y="35.16" width="78.44" height=".36"/><rect class="cls-1" x="8.13" y="59.19" width="89.88" height=".36"/><g><rect class="cls-1" x="12.53" y="7.01" width="81.53" height=".18"/><rect class="cls-1" x="12.53" y="9.67" width="81.53" height=".18"/><rect class="cls-1" x="12.53" y="11.96" width="81.53" height=".18"/><rect class="cls-1" x="12.53" y="14.62" width="81.53" height=".18"/><rect class="cls-1" x="12.53" y="16.92" width="81.53" height=".18"/><rect class="cls-1" x="12.53" y="18.86" width="81.53" height=".18"/><rect class="cls-1" x="12.53" y="21.5" width="81.53" height=".18"/><rect class="cls-1" x="17.47" y="5.4" width=".18" height="16.19"/><rect class="cls-1" x="19.84" y="5.4" width=".18" height="16.19"/><rect class="cls-1" x="23.32" y="5.4" width=".18" height="16.19"/><rect class="cls-1" x="26.8" y="5.4" width=".18" height="16.19"/><rect class="cls-1" x="30.28" y="5.4" width=".18" height="16.19"/><rect class="cls-1" x="33.75" y="5.4" width=".18" height="16.19"/><rect class="cls-1" x="37.23" y="5.4" width=".18" height="16.19"/><rect class="cls-1" x="40.71" y="5.4" width=".18" height="16.19"/><rect class="cls-1" x="44.19" y="5.4" width=".18" height="16.19"/><rect class="cls-1" x="47.66" y="5.4" width=".18" height="16.19"/><rect class="cls-1" x="51.14" y="5.4" width=".18" height="16.19"/><rect class="cls-1" x="54.62" y="5.4" width=".18" height="16.19"/><rect class="cls-1" x="58.1" y="5.4" width=".18" height="16.19"/><rect class="cls-1" x="61.57" y="5.4" width=".18" height="16.19"/><rect class="cls-1" x="65.05" y="5.4" width=".18" height="16.19"/><rect class="cls-1" x="68.53" y="5.4" width=".18" height="16.19"/><rect class="cls-1" x="72.01" y="5.4" width=".18" height="16.19"/><rect class="cls-1" x="75.48" y="5.4" width=".18" height="16.19"/><rect class="cls-1" x="78.96" y="5.4" width=".18" height="16.19"/><rect class="cls-1" x="82.44" y="5.4" width=".18" height="16.19"/><rect class="cls-1" x="85.92" y="5.4" width=".18" height="16.19"/><rect class="cls-1" x="89.4" y="5.4" width=".18" height="16.19"/><path class="cls-1" d="M94.07,5.94H12.53c-.3,0-.54-.24-.54-.54s.24-.54.54-.54h81.53c.3,0,.54.24.54.54s-.24.54-.54.54Z"/><path class="cls-1" d="M12.53,39.64c-.59,0-1.07-.48-1.07-1.07V5.4c0-.59.48-1.07,1.07-1.07s1.07.48,1.07,1.07v33.16c0,.59-.48,1.07-1.07,1.07Z"/><path class="cls-1" d="M94.07,39.64c-.59,0-1.07-.48-1.07-1.07V5.4c0-.59.48-1.07,1.07-1.07s1.07.48,1.07,1.07v33.16c0,.59-.48,1.07-1.07,1.07Z"/></g></g></g></svg>`,
    basketball: `<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180.92 77.25"><defs><style>.cls-1 {fill: currentColor;}</style></defs><g id="Layer_1-2" data-name="Layer 1"><g><path class="cls-1" d="M118.78,38.24h-.76c0-8.57-12.2-15.55-27.2-15.55s-27.2,6.97-27.2,15.55h-.76c0-8.99,12.54-16.3,27.96-16.3s27.96,7.31,27.96,16.3Z"/><path class="cls-1" d="M131.45,77.25H49.84l13.14-39.39h55.7l.08.26,12.69,39.12ZM50.89,76.49h79.52l-12.28-37.87h-54.61l-12.63,37.87Z"/><rect class="cls-1" x="121.7" y="48.02" width="7.36" height=".76"/><rect class="cls-1" x="124.39" y="56.32" width="7.3" height=".76"/><rect class="cls-1" x="127.66" y="65.61" width="7.47" height=".76"/><rect class="cls-1" x="52.6" y="48.02" width="7.36" height=".76"/><rect class="cls-1" x="49.96" y="56.32" width="7.3" height=".76"/><rect class="cls-1" x="46.52" y="65.61" width="7.47" height=".76"/><path class="cls-1" d="M180.92,77.25H0l.06-.43c.03-.19,2.94-19.43,15.53-38.4,7.4-11.15,16.64-20.04,27.48-26.41C56.61,4.04,72.67,0,90.82,0c17.15,0,32.55,4.04,45.79,12.01,10.59,6.37,19.81,15.26,27.42,26.41,12.95,18.97,16.77,38.2,16.8,38.39l.09.45ZM.88,76.49h179.12c-.66-3-4.84-20.44-16.61-37.68-7.55-11.05-16.69-19.86-27.19-26.17C123.1,4.76,107.83.76,90.82.76c-18.01,0-33.94,4-47.36,11.89-10.73,6.31-19.9,15.11-27.23,26.16C4.77,56.07,1.39,73.55.88,76.49Z"/><g><path class="cls-1" d="M118.34,41.15l-.72-.22c.27-.88.41-1.78.41-2.68h.76c0,.97-.15,1.95-.44,2.9Z"/><path class="cls-1" d="M90.82,54.55c-.97,0-1.95-.03-2.92-.09l.05-.75c1.91.12,3.87.11,5.76,0l.05.75c-.96.06-1.95.09-2.93.09ZM82.1,53.74c-1.97-.38-3.88-.88-5.66-1.51l.25-.71c1.75.61,3.62,1.11,5.55,1.48l-.14.74ZM99.56,53.74l-.14-.74c1.94-.37,3.81-.87,5.55-1.48l.25.71c-1.78.62-3.69,1.13-5.66,1.51ZM71.09,49.8c-1.84-1.07-3.41-2.28-4.67-3.59l.55-.52c1.21,1.26,2.73,2.43,4.51,3.46l-.38.65ZM110.57,49.8l-.38-.65c1.78-1.03,3.29-2.2,4.51-3.46l.55.52c-1.26,1.32-2.83,2.53-4.67,3.59Z"/><path class="cls-1" d="M63.31,41.15c-.29-.95-.44-1.93-.44-2.9h.76c0,.9.14,1.8.41,2.68l-.72.22Z"/></g></g></g></svg>`,
    pickleball: `<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 106.15 94.01"><defs><style>.cls-1 {fill: currentColor;}</style></defs><g id="Layer_1-2" data-name="Layer 1"><g><g><path class="cls-1" d="M106.15,94.01H0l.05-.22L21.57,0h63.01l.03.14,21.54,93.87ZM.45,93.65h105.25L84.29.36H21.86L.45,93.65Z"/><polygon class="cls-1" points="80.53 15.57 26.2 15.57 17.65 15.21 89.16 15.21 80.53 15.57"/><polygon class="cls-1" points="97.92 59.54 7.91 59.54 17.56 59.19 89.16 59.19 97.92 59.54"/><rect class="cls-1" x="53.18" y="15.39" width=".36" height="43.98"/></g><rect class="cls-1" x="14.04" y="20.17" width="78.66" height=".18"/><rect class="cls-1" x="14.04" y="22.82" width="78.66" height=".18"/><rect class="cls-1" x="14.04" y="25.12" width="78.66" height=".18"/><rect class="cls-1" x="14.04" y="27.78" width="78.66" height=".18"/><rect class="cls-1" x="14.04" y="30.08" width="78.66" height=".18"/><rect class="cls-1" x="14.04" y="32.01" width="78.66" height=".18"/><rect class="cls-1" x="14.04" y="34.66" width="78.66" height=".18"/><rect class="cls-1" x="65.05" y="20.26" width=".18" height="14.49"/><rect class="cls-1" x="68.53" y="20.26" width=".18" height="14.49"/><g><rect class="cls-1" x="17.47" y="20.26" width=".18" height="14.49"/><rect class="cls-1" x="19.84" y="20.26" width=".18" height="14.49"/><rect class="cls-1" x="23.32" y="20.26" width=".18" height="14.49"/><rect class="cls-1" x="26.8" y="20.26" width=".18" height="14.49"/><rect class="cls-1" x="30.28" y="20.26" width=".18" height="14.49"/><rect class="cls-1" x="33.75" y="20.26" width=".18" height="14.49"/><rect class="cls-1" x="37.23" y="20.26" width=".18" height="14.49"/><rect class="cls-1" x="40.71" y="20.26" width=".18" height="14.49"/><rect class="cls-1" x="44.19" y="20.26" width=".18" height="14.49"/><rect class="cls-1" x="47.66" y="20.26" width=".18" height="14.49"/><rect class="cls-1" x="51.14" y="20.26" width=".18" height="14.49"/><rect class="cls-1" x="54.62" y="20.26" width=".18" height="14.49"/><rect class="cls-1" x="58.1" y="20.26" width=".18" height="14.49"/><rect class="cls-1" x="61.57" y="20.26" width=".18" height="14.49"/><rect class="cls-1" x="72.01" y="20.26" width=".18" height="14.49"/><rect class="cls-1" x="75.48" y="20.26" width=".18" height="14.49"/><rect class="cls-1" x="78.96" y="20.26" width=".18" height="14.49"/><rect class="cls-1" x="82.44" y="20.26" width=".18" height="14.49"/><rect class="cls-1" x="85.92" y="20.26" width=".18" height="14.49"/><rect class="cls-1" x="89.4" y="20.26" width=".18" height="14.49"/></g><path class="cls-1" d="M13.61,36.21c-.4,0-.72-.32-.72-.72v-16.22c0-.4.32-.72.72-.72s.72.32.72.72v16.22c0,.4-.32.72-.72.72Z"/><path class="cls-1" d="M93.05,36.21c-.4,0-.72-.32-.72-.72v-16.22c0-.4.32-.72.72-.72s.72.32.72.72v16.22c0,.4-.32.72-.72.72Z"/></g></g></svg>`,
    badminton: `<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 106.15 94.01"><defs><style>.cls-1 {fill: currentColor;}</style></defs><g id="Layer_1-2" data-name="Layer 1"><g><g><path class="cls-1" d="M106.15,94.01H0l.05-.22L21.57,0h63.01l.03.14,21.54,93.87ZM.45,93.65h105.25L84.29.36H21.86L.45,93.65Z"/><rect class="cls-1" x="86.61" y="-.12" width=".36" height="94.83" transform="translate(-7.49 17.61) rotate(-11.11)"/><rect class="cls-1" x="-27.48" y="47.12" width="94.83" height=".36" transform="translate(-30.33 57.7) rotate(-78.84)"/><rect class="cls-1" x="26.2" y="15.21" width="54.33" height=".36"/><rect class="cls-1" x="17.56" y="59.19" width="71.6" height=".36"/><rect class="cls-1" x="53.18" y="15.39" width=".36" height="43.98"/></g><g><rect class="cls-1" x="12.42" y="12.41" width="81.53" height=".18"/><rect class="cls-1" x="12.42" y="15.07" width="81.53" height=".18"/><rect class="cls-1" x="12.42" y="17.37" width="81.53" height=".18"/><rect class="cls-1" x="12.42" y="20.02" width="81.53" height=".18"/><rect class="cls-1" x="12.42" y="22.32" width="81.53" height=".18"/><rect class="cls-1" x="12.42" y="24.26" width="81.53" height=".18"/><rect class="cls-1" x="12.42" y="26.9" width="81.53" height=".18"/><rect class="cls-1" x="17.36" y="10.8" width=".18" height="16.19"/><rect class="cls-1" x="19.72" y="10.8" width=".18" height="16.19"/><rect class="cls-1" x="23.2" y="10.8" width=".18" height="16.19"/><rect class="cls-1" x="26.68" y="10.8" width=".18" height="16.19"/><rect class="cls-1" x="30.16" y="10.8" width=".18" height="16.19"/><rect class="cls-1" x="33.64" y="10.8" width=".18" height="16.19"/><rect class="cls-1" x="37.11" y="10.8" width=".18" height="16.19"/><rect class="cls-1" x="40.59" y="10.8" width=".18" height="16.19"/><rect class="cls-1" x="44.07" y="10.8" width=".18" height="16.19"/><rect class="cls-1" x="47.55" y="10.8" width=".18" height="16.19"/><rect class="cls-1" x="51.02" y="10.8" width=".18" height="16.19"/><rect class="cls-1" x="54.5" y="10.8" width=".18" height="16.19"/><rect class="cls-1" x="57.98" y="10.8" width=".18" height="16.19"/><rect class="cls-1" x="61.46" y="10.8" width=".18" height="16.19"/><rect class="cls-1" x="64.93" y="10.8" width=".18" height="16.19"/><rect class="cls-1" x="68.41" y="10.8" width=".18" height="16.19"/><rect class="cls-1" x="71.89" y="10.8" width=".18" height="16.19"/><rect class="cls-1" x="75.37" y="10.8" width=".18" height="16.19"/><rect class="cls-1" x="78.84" y="10.8" width=".18" height="16.19"/><rect class="cls-1" x="82.32" y="10.8" width=".18" height="16.19"/><rect class="cls-1" x="85.8" y="10.8" width=".18" height="16.19"/><rect class="cls-1" x="89.28" y="10.8" width=".18" height="16.19"/><path class="cls-1" d="M93.95,11.34H12.42c-.3,0-.54-.24-.54-.54s.24-.54.54-.54h81.53c.3,0,.54.24.54.54s-.24.54-.54.54Z"/><path class="cls-1" d="M12.42,40.88c-.59,0-1.07-.48-1.07-1.07V10.8c0-.59.48-1.07,1.07-1.07s1.07.48,1.07,1.07v29c0,.59-.48,1.07-1.07,1.07Z"/><path class="cls-1" d="M93.95,40.88c-.59,0-1.07-.48-1.07-1.07V10.8c0-.59.48-1.07,1.07-1.07s1.07.48,1.07,1.07v29c0,.59-.48,1.07-1.07,1.07Z"/></g></g></g></svg>`,
    floorball: `<svg aria-hidden="true" focusable="false" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68.26 65.52"><defs><style> .cls-1 { fill: currentColor; } </style></defs><g data-name="Layer 1"><g><g><g><path class="cls-1" d="M13.37,63.98c-1.68-1.04-2.81-2.73-3.16-4.65-.19-1.02-.07-1.97.22-2.95.34-1.16.92-2.2,1.94-2.91,1.14-.79,2.59-1.09,3.96-.74,1.79.45,3.56.65,5.42.39,4.82-.66,8.99-3.48,12.17-7.04,1.16-1.42,2.71-2.39,4.57-2.49L48.87.27c.05-.21.27-.3.43-.26l2.11.51c.13.13.18.29.13.49l-10.43,43.51c1.3.99,1.54,2.57,1.27,4.1-.25,1.16-.71,2.25-1.45,3.2-3.14,4.02-7.25,7.73-11.75,10.18-4.12,2.25-8.66,3.45-13.35,2.82-.89-.12-1.68-.36-2.47-.85ZM39.81,45.83c-.43-.36-.94-.55-1.51-.54-.72.02-1.4.25-2.02.65.37,1.4.66,2.77.89,4.22,1.01.13,1.99.18,3.01.18.79-1.31,1.23-3.64-.38-4.5ZM35.5,49.85l-.51-2.71-1.9,1.98c.81.3,1.57.54,2.41.73ZM36,55.08l-.25-3.39c-1.38-.27-2.65-.68-3.92-1.25.08,1.62.08,3.16.02,4.72.96.45,1.89.79,2.87,1.08l1.29-1.15ZM30.28,54.31l.05-2.92-2.2,1.39c.69.57,1.38,1.07,2.15,1.53ZM38.85,52.08l-1.42-.11.16,1.51,1.26-1.4ZM29.73,59.8l.41-3.49c-1.31-.74-2.45-1.6-3.53-2.61-.28,1.69-.63,3.28-1.04,4.91.8.78,1.64,1.45,2.53,2.07l1.63-.88ZM24.25,57.18l.71-2.98c-.85.28-1.59.48-2.43.65.54.82,1.08,1.6,1.72,2.33ZM14.65,62.52l2.04-2.92c-.76-1.61-1.33-3.25-1.78-4.99-.95.13-1.8.62-2.34,1.4-.28.43-.43.9-.53,1.41-.21.67-.24,1.33-.06,2.02.38,1.37,1.36,2.52,2.67,3.08ZM19.17,55.11c-.92-.05-1.71-.16-2.57-.35.33,1.05.69,2.05,1.15,3.07l1.42-2.73ZM22.45,62.67l1.21-3.46c-1.08-1.21-1.98-2.5-2.79-3.93-.66,1.56-1.35,3.01-2.15,4.49.62,1.12,1.32,2.19,2.1,3.18l1.64-.28ZM32.97,57.63l-1.25-.51-.14,1.51,1.39-1ZM26.11,61.56l-1.1-.96-.48,1.52,1.58-.56ZM18.63,63.07l-.94-1.52-.9,1.43c.62.06,1.22.09,1.84.09Z"/><path class="cls-1" d="M49.71,50.63c4.03-.47,7.63,2.44,8.08,6.4s-2.41,7.61-6.42,8.06-7.56-2.39-8.04-6.36c-.48-3.96,2.35-7.63,6.38-8.1ZM50.45,51.38c-.98.06-1.66.9-1.59,1.82s.87,1.63,1.81,1.56,1.64-.86,1.58-1.8-.82-1.65-1.8-1.58ZM44.28,58.69c.46.76,1.36,1.07,2.17.72s1.2-1.19.95-2.04c-.23-.77-1.01-1.31-1.85-1.19s-1.47.82-1.47,1.69c0,.3.05.56.21.83ZM55.25,56.17c-.98.06-1.65.9-1.59,1.82s.87,1.62,1.81,1.56,1.64-.86,1.58-1.8-.82-1.64-1.8-1.58ZM50.16,61.01c-.96.23-1.48,1.19-1.24,2.08s1.14,1.43,2.03,1.22,1.48-1.13,1.27-2.04-1.1-1.48-2.05-1.26Z"/></g></g><rect class="cls-1" x="0" y="64.77" width="68.26" height=".75"/></g></g></svg>`,
    teqvoly: `<svg aria-hidden="true" focusable="false" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 117.42 44.49"><defs><style> .cls-1 { fill: currentColor; } </style></defs><g data-name="Layer 1"><g><path class="cls-1" d="M2.68,19.21S27.23,4.98,58.11,6.43c0,0,42.53,2.33,59.13,6.34,0,0-24.38-9.08-65.21,11.78-3.68,2.09-5.03,4.22-9.09,4.03S.17,21.81.17,21.81c0,0-.77-.74,2.52-2.6Z"/><path class="cls-1" d="M90.29,15.54c-.11,0-.23-.01-.35-.03-2.1-.39-6.53-.78-6.57-.78v-.15c.06,0,4.49.39,6.6.78.46.08.86,0,1.19-.26.93-.73,1.04-2.56,1.05-2.57,0,0-.19-1.96,0-5.06.19-3.02-2.72-3.59-2.84-3.61-.45-.04-45.49-3.63-48.17-3.69-.63,0-1.14.18-1.53.59-.99,1.02-.88,3.04-.88,3.06v3.65h-.15v-3.64c0-.08-.11-2.1.93-3.17.42-.44.97-.65,1.64-.64,2.68.06,47.73,3.65,48.19,3.69.04,0,3.17.61,2.97,3.77-.19,3.09,0,5.03,0,5.05,0,.09-.12,1.93-1.1,2.7-.28.22-.6.33-.95.33Z"/><path class="cls-1" d="M42.23,30.57c-2.02,0-3.53-.28-3.56-.29-.36-.06-36.2-6.03-37.46-6.19C-.2,23.92,0,21.88.02,21.79l.31.03s-.18,1.83.92,1.97c1.26.16,36,5.94,37.47,6.19.06.01,6.06,1.12,10.11-1.14.25-.14.6-.34,1.04-.6,3.32-1.92,12.13-7.02,23.13-10.94,13.83-4.93,26.19-6.31,36.74-4.11.05.01,4.56,1.09,5.83,1.31.54.09.94.02,1.19-.22.29-.27.39-.78.31-1.49l.31-.04c.09.82-.04,1.41-.4,1.75-.32.31-.81.41-1.45.3-1.29-.21-5.8-1.3-5.85-1.31-11.3-2.35-30.84-1.66-59.65,15.02-.44.26-.79.46-1.05.6-2.1,1.17-4.69,1.46-6.75,1.46Z"/><path class="cls-1" d="M34.06,39.76l-9.4-12.12,5.65.94.04.05,5.69,7.7,19.43-1.22.42,3.24-21.83,1.41ZM25.38,28.08l8.82,11.37,21.34-1.38-.34-2.63-19.31,1.21-.05-.07-5.71-7.71-4.75-.79Z"/><rect class="cls-1" x="32.74" y="37.01" width="23" height=".31" transform="translate(-2.1 2.66) rotate(-3.36)"/><polygon class="cls-1" points="60.5 44.49 57.95 23.94 58.26 23.91 60.71 43.69 65.41 37.4 90.84 35.79 104.97 12.77 103.02 12.61 90.19 33.15 90.11 33.16 65.82 34.67 65.8 34.36 90.01 32.86 102.86 12.28 105.49 12.51 91.02 36.09 90.94 36.09 65.57 37.69 60.5 44.49"/><polygon class="cls-1" points="61.36 40.72 58.92 23.47 59.15 23.44 61.5 40.13 69.2 29.76 70.15 18.48 70.38 18.5 69.42 29.84 69.4 29.87 61.36 40.72"/><polygon class="cls-1" points="60.98 35.76 60.8 35.61 65.42 29.76 66.13 20.11 66.36 20.13 65.65 29.84 65.62 29.87 60.98 35.76"/><polygon class="cls-1" points="64.66 36.14 64.64 35.83 90.38 34.27 103.99 12.46 104.25 12.63 90.56 34.57 64.66 36.14"/><rect class="cls-1" x="90.13" y="32.98" width=".31" height="1.46" transform="translate(-5.57 23.69) rotate(-14.5)"/><polygon class="cls-1" points="60.61 44.24 56.35 44.24 53.98 26.04 54.28 26 56.62 43.94 60.61 43.94 60.61 44.24"/><polygon class="cls-1" points="67.39 34.49 67.21 34.35 69.19 31.68 69.19 29.91 65.53 29.91 65.53 29.68 69.42 29.68 69.42 31.76 67.39 34.49"/><rect class="cls-1" x="65.29" y="35.94" width=".31" height="1.61" transform="translate(-2.1 4.02) rotate(-3.46)"/><rect class="cls-1" x="32.62" y="37" width="3.48" height=".31" transform="translate(-11.7 16.18) rotate(-22.76)"/></g></g></svg>`,
    dodgeball: `<svg aria-hidden="true" focusable="false" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108.79 97.26"><defs><style> .cls-1 { fill: currentColor; } </style></defs><g data-name="Layer 1"><g><path class="cls-1" d="M106.15,94.01H0l.05-.22L21.57,0h63.01l.03.14,21.54,93.87ZM.45,93.65h105.25L84.29.36H21.86L.45,93.65Z"/><rect class="cls-1" x="13.61" y="34.45" width="78.93" height=".5"/><rect class="cls-1" x="18.45" y="15.08" width="69.62" height=".25"/><rect class="cls-1" x="7.91" y="58.99" width="90.02" height=".75"/><g data-name="7a9uOk"><g><path class="cls-1" d="M100.92,94.83l-7.35-17.55-11.23-10.66c-3.79,1.06-7.01-1-8.18-4.67-1.97-6.21-3.05-12.48-2.88-19.18l-11.05.2c-1.15.02-2.06-.94-2.54-1.87l-3.05-9.17c2.21-.08,3.87-.72,5.64-2.04l2.36,7.01,14.94-.29c3.56-.07,6.46,2.67,6.39,6.23-.12,5.84.83,11.41,2.98,16.76l13.57,12.89,7.93,18.97c.9,2.15-.04,4.52-2.06,5.43s-4.52.21-5.47-2.06Z"/><path class="cls-1" d="M79.63,82.09l-11.81,13.63c-1.57,1.82-4.18,2-5.88.52-1.87-1.62-1.88-4.2-.24-6.09l10.51-12.1,3.17-11.41c2.04,1.45,4.11,2.04,6.42,1.58l1.36,1.27-3.54,12.59Z"/><path class="cls-1" d="M85.47,42.38c-.13-2.66-1.43-4.33-3.18-5.96,3.76-.54,7.29.42,10.74-.33,3.89-.84,7.44-2.7,11.22-3.82,1.65-.49,3.19.31,3.75,1.88.43,1.22-.06,3.14-1.63,3.68-4.12,1.42-8.07,3.22-12.3,4.29-2.74.7-5.64-.17-8.6.25Z"/><path class="cls-1" d="M76,21.16c3.73-1.08,7.34,1.1,8.27,4.72.86,3.34-1.09,6.98-4.61,7.95s-7.06-.94-8.11-4.49c-.97-3.3.78-7.12,4.46-8.18Z"/><path class="cls-1" d="M53.59,17.11c3.86-.76,7.28,1.82,7.98,5.39.73,3.7-1.72,7.32-5.48,8.01-3.56.65-7.09-1.64-7.88-5.32s1.42-7.31,5.38-8.08ZM55.24,18.52c-2.67-.31-4.91,1.53-5.55,3.98,2.39-.31,4.32-1.84,5.55-3.98ZM49.92,25.12c3.65-.71,6.13-2.69,7.74-5.75-.36-.38-1.04-.69-1.54-.65-1.41,2.51-3.58,4.24-6.5,4.71-.13.61-.08,1.25.31,1.7ZM60.08,23.41c.07-1.65-.6-2.6-1.68-3.6l-.66,1.31,2.34,2.3ZM59.19,26.85c2.02-2-.66-3.72-2.01-5.05-.47.51-.9,1-1.05,1.26,1.37,1.29,2.13,2.32,3.06,3.79ZM57.12,28.58c.38-.1,1.13-.56,1.26-.96-.46-1.53-1.61-3.02-2.98-3.97l-1.45.94c1.62,1.12,2.43,2.25,3.17,3.98ZM56.18,28.96c-.31-1.79-1.67-3.22-3.32-3.81l-2.83.88c1.14,2.31,3.49,3.62,6.15,2.94Z"/><path class="cls-1" d="M46.05,22.97h-9.17c-.22,0-.75-.3-.66-.43s.44-.4.66-.4h9.25c.19,0,.53.19.58.34s-.44.49-.66.49Z"/><path class="cls-1" d="M69.31,19.68l-6.92-.02c-.26,0-.71-.6-.54-.8l7.43-.03c.16,0,.48.1.59.15s.12.48.01.53-.44.16-.57.16Z"/><path class="cls-1" d="M38.56,19.67h-6.12c-.21,0-.58-.29-.66-.4s.41-.42.55-.42h6.2c.16,0,.53.3.61.41s-.4.42-.58.42Z"/><path class="cls-1" d="M47.23,19.69h-5.16s-.57-.43-.57-.43c-.13-.1.5-.44.66-.44l5.84.04c-.11.49-.43.76-.76.83Z"/><path class="cls-1" d="M67.91,28.52l-5.98-.04c-.02-.29.43-.83.69-.83l5.07.02c.13,0,.52.11.63.13.12.02-.22.72-.41.72Z"/><path class="cls-1" d="M40.89,28.52h-4.59c-.19,0-.66-.29-.63-.45s.42-.4.59-.4h4.45c.15.01.56.17.67.21.16.06-.3.64-.48.64Z"/><path class="cls-1" d="M34.3,22.33c1.87.64-5.38,1.05-5.22.22.29-.74,4.71-.39,5.22-.22Z"/><path class="cls-1" d="M47.81,28.47l-3.42.05c-.15,0-.63-.37-.55-.46s.37-.36.5-.36l2.87-.04c.24,0,.6.52.61.81Z"/><path class="cls-1" d="M76.16,19.18c-1.11.82-2.74.79-3.94,0,1.33-.5,2.56-.53,3.94,0Z"/><path class="cls-1" d="M66.4,22.39c-.85.93-2.33.85-3.53.1,1.07-.54,2.29-.47,3.53-.1Z"/></g></g></g></g></svg>`,
  };

  function days() {
    const out = [],
      base = dayDate(0);
    for (let i = 0; i < 10; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      out.push({
        dw: d.toLocaleDateString(L() === "zh" ? "zh-HK" : "en-GB", {
          weekday: "short",
        }),
        dn: d.getDate(),
        full: d.toLocaleDateString(L() === "zh" ? "zh-HK" : "en-GB", {
          weekday: "long",
          day: "numeric",
          month: L() === "zh" ? "long" : "short",
        }),
      });
    }
    return out;
  }

  /* ---------- rendering ---------- */
  function enrollmentModel(lesson) {
    const start = new Date(Date.parse(lesson.startTime) + 8 * 3600000).toISOString(), end = new Date(Date.parse(lesson.endTime) + 8 * 3600000).toISOString();
    const pricingMode = lesson.pricingMode || "lesson";
    return { id: pricingMode === "course" ? `course-${lesson.course.id}` : String(lesson.id), lessonId: lesson.id, courseId: lesson.course.id,
      pricingMode, sessions: lesson.lessons || [lesson], lessonCount: lesson.lessonCount || 1,
      courseEndTime: lesson.courseEndTime || lesson.endTime, unavailableReason: lesson.unavailableReason,
      name: lesson.course.name + (lesson.name !== lesson.course.name ? ` · ${lesson.name}` : ""),
      description: lesson.course.description || "", api: true, cat: String(lesson.course.category?.id || "other"),
      sport: lesson.course.category2 ? String(lesson.course.category2.id) : null, sportName: lesson.course.category2?.name,
      date: start.slice(0, 10), start: start.slice(11, 16), end: end.slice(11, 16), dur: (Date.parse(lesson.endTime) - Date.parse(lesson.startTime)) / 60000,
      room: lesson.room, coach: lesson.coaches?.join(", ") || T("coach_tbc"), spots: lesson.spots,
      priceCents: lesson.totalCents, available: lesson.canEnroll,
    };
  }
  function renderClassStatus() {
    const message = classes.loading ? T("classes_loading") : classes.error ? T("classes_error") : !CLASSES.length ? T("no_classes") : "";
    for (const id of ["classStatus", "categoryStatus"]) document.getElementById(id).textContent = message;
    for (const id of ["classRetry", "categoryRetry"]) document.getElementById(id).hidden = !classes.error;
  }
  async function loadClasses() {
    classes.loading = true; classes.error = false;
    renderClassStatus(); sync();
    try {
      const lessons = await requestVenueData("courses", { scope: "enrollment", signal: venueAbort.signal });
      if (venueAbort.signal.aborted) return;
      if (!Array.isArray(lessons) || lessons.some(l => !Number.isSafeInteger(l.id) || !Number.isSafeInteger(l.course?.id) || !Number.isFinite(Date.parse(l.startTime)) || !Number.isFinite(Date.parse(l.endTime)))) throw new Error("Invalid class catalog");
      CLASSES = lessons.map(enrollmentModel); BOOKABLE_CLASSES = CLASSES;
      CATS = [...new Map(lessons.map(l => { const id = String(l.course.category?.id || "other"); return [id, { id, name: l.course.category?.name || T("classes_other"), kind: "term", api: true }]; })).values()];
      BOOKABLE_CATS = CATS;
    } catch {
      if (venueAbort.signal.aborted) return;
      classes.error = true; CLASSES = []; BOOKABLE_CLASSES = []; CATS = []; BOOKABLE_CATS = [];
    }
    classes.loading = false;
    if (checkout.record) applyCheckoutRecord(checkout.record); else restoreBookingRoute();
    renderClassStatus(); render();
  }

  async function loadVenues() {
    venue.loading = true;
    venue.error = false;
    renderCourts();
    sync();
    try {
      const services = await readVenueData("services", {}, venueAbort.signal);
      if (venueAbort.signal.aborted) return;
      if (
        !Array.isArray(services) ||
        services.some((s) => !s || !Array.isArray(s.placeRooms))
      )
        throw new Error("Invalid venue catalog");
      venue.services = services;
    } catch {
      if (venueAbort.signal.aborted) return;
      venue.services = [];
      venue.error = true;
    }
    venue.loading = false;
    settleBookingRoute();
    render();
  }

  function ensureVenueSlots() {
    const row = selectedVenue();
    if (!row) {
      venue.request++;
      venue.key = null;
      venue.slots = null;
      S.times = [];
      return;
    }
    const date = ymd(dayDate(S.day));
    const key = `${row.serviceId}/${date}`;
    if (venue.key === key) return;
    venue.key = key;
    const request = ++venue.request;
    venue.slots = null;
    venue.rooms = [];
    venue.slotError = false;
    readVenueData(
      "availability",
      {
        serviceId: String(row.serviceId),
        date,
      },
      venueAbort.signal,
    )
      .then((data) => {
        if (venueAbort.signal.aborted || venue.request !== request) return;
        if (
          data.serviceId !== row.serviceId ||
          !Array.isArray(data.rooms) ||
          !data.rooms.length ||
          data.rooms.some((room) =>
            !Number.isSafeInteger(room.id) || room.id < 1 || typeof room.name !== "string",
          ) ||
          data.date !== date ||
          !Array.isArray(data.slots) ||
          data.slots.length !== 24 ||
          new Set(data.slots.map((s) => s.time)).size !== 24 ||
          data.slots.some(
            (s) =>
              !ALL_TIMES.includes(s.time) ||
              typeof s.available !== "boolean" ||
              !Array.isArray(s.availableRoomIds) ||
              s.available !== (s.availableRoomIds.length > 0) ||
              s.availableRoomIds.some((id) =>
                !data.rooms.some((room) => room.id === id),
              ) ||
              !Number.isSafeInteger(s.totalCents) ||
              s.totalCents < 0,
          )
        )
          throw new Error("Invalid venue availability");
        venue.slots = data.slots;
        venue.rooms = data.rooms;
        if (requestedRoomId && (!data.rooms.some((room) => room.id === requestedRoomId) ||
          S.times.some((time) => !data.slots.find((slot) => slot.time === time)?.availableRoomIds.includes(requestedRoomId)))) {
          S.times = [];
          S.roomId = null;
        }
        requestedRoomId = null;
        S.times = S.times.filter((t) =>
          data.slots.some((s) => s.time === t && s.available),
        );
        if (S.times.length && !availableVenueRooms(S.times).length)
          S.times = S.times.slice(0, 1);
        const wasRestoring = restoringRoute;
        settleBookingRoute();
        if (wasRestoring) render();
        else {
          if (FLOWS[MODE][S.i] === "s2") renderSlots();
          sync();
        }
      })
      .catch(() => {
        if (venueAbort.signal.aborted || venue.request !== request) return;
        venue.slotError = true;
        venue.slots = null;
        S.times = [];
        requestedRoomId = null;
        S.roomId = null;
        const wasRestoring = restoringRoute;
        settleBookingRoute();
        if (wasRestoring) render();
        else {
          if (FLOWS[MODE][S.i] === "s2") renderSlots();
          sync();
        }
      });
  }

  function renderRail() {
    const flow = FLOWS[MODE],
      keys = RAIL[MODE];
    document.getElementById("rail").innerHTML = keys
      .map((k, n) => {
        const cls = n === S.i ? "on" : n < S.i ? "done" : "";
        return `<li class="${cls}"><span class="n">${n < S.i ? "✓" : n + 1}</span><span class="t">${T(k)}</span></li>`;
      })
      .join("");
  }

  /* Round 5: the price line on a court card. A single-court sport, or a
   two-court sport once its court is picked, shows its off-peak to peak
   range; a two-court sport before the pick shows "from" its lowest rate. */
  function courtPriceLine(c) {
    if (venue.error) return T("venue_error");
    const rows = ratesFor(c.id);
    if (!rows.length)
      return T(venue.loading ? "venue_loading" : "venue_unmapped");
    const r =
      S.court === c.id && S.csize
        ? rows.find((x) => x.court === S.csize)
        : rows.length === 1
          ? rows[0]
          : null;
    return r
      ? T("rate_range", { off: money(r.off), peak: money(r.peak) })
      : T("rate_from", { p: money(fromRate(c.id)) });
  }
  /* Round 5: Court A (larger) or Court B (smaller), for the two sports priced
   by court. Renders between the selected card and the hours stepper, joined
   to them as one panel (booking.css .csize). No default: the customer
   chooses, because the two courts cost different amounts. */
  function csizeHTML(c) {
    return `
    <div class="csize" role="group" aria-label="${T("l_court")}">
      <span class="csize-l">${T("l_court")}</span>
      ${venueRows(c.id)
        .map(
          (r) => `<button type="button" class="csize-b" data-csize="${
            r.court
          }" aria-pressed="${S.csize === r.court}">
        <span class="cs-t">${t(
          "prices.court" + r.court,
        )}</span><span class="cs-p">${T("rate_from", {
            p: money(r.off),
          })}</span></button>`,
        )
        .join("")}
    </div>`;
  }
  function renderCourts() {
    document.getElementById("venueStatus").textContent = venue.loading
      ? T("venue_loading")
      : venue.error
      ? T("venue_error")
      : "";
    document.getElementById("venueRetry").hidden = !venue.error;
    document.getElementById("courtList").innerHTML = COURTS.map((c) => {
      const sel = S.court === c.id;
      return `
    <button class="opt ${sel ? "sel" : ""} ${
        sel && twoCourts(c.id) ? "has-panel" : ""
      }" data-court="${c.id}" ${!venueRows(c.id).length ? "disabled" : ""}>
      <span class="dia">${diaFor(c)}</span>
      <span class="txt"><span class="t">${nm(c)}</span>
        <span class="d">${courtPriceLine(c)}</span></span>
    </button>${sel && twoCourts(c.id) ? csizeHTML(c) : ""}`;
    }).join("");
    /* Switching from one court to a DIFFERENT one resets the hours and clears
     any slots, since those were picked against the old court's availability.
     Choosing a court for the first time (S.court still null) must not, or a
     ?t= deep link would be wiped by the very first click. */
    bind("courtList", "court", (v) => {
      if (S.court && S.court !== v) {
        S.times = [];
        S.csize = null;
        S.roomId = null;
      }
      S.court = v;
    });
    document.querySelectorAll("#courtList .csize-b").forEach((b) =>
      onClick(b, () => {
        if (S.csize && S.csize !== b.dataset.csize) {
          S.times = [];
          S.roomId = null;
        }
        S.csize = b.dataset.csize;
        renderCourts();
        sync();
      }),
    );
  }
  function renderCats() {
    document.getElementById("catList").innerHTML = BOOKABLE_CATS.map(
      (c) => `
    <button class="opt ${S.cat === c.id ? "sel" : ""}" data-cat="${c.id}">
      <span class="txt"><span class="t">${nm(c)}</span><span class="d">${pick(c, "d")}</span></span>
    </button>`,
    ).join("");
    bind("catList", "cat", (v) => {
      S.cat = v;
      S.filters = [v];
    });
  }
  function renderCoaches() {
    /* Round 4 N9: the filter chips are SPORTS, not specialty tags. The client
     overwrote All / Pickleball / Youth / Family with VOLLEYBALL, PICKLE BALL,
     BADMINTON, S&C, TEQVOLY and a trailing "......". Coaches carry a sport
     via their dia key, which is the court id; S&C has no court, so a coach
     whose specialty tags mention strength is grouped under 'sc'.
     Filtering stays client-side, and if the chosen coach falls outside the
     new filter the choice is cleared, so Next never stays enabled for a card
     nobody can see. */
    const cf = document.getElementById("coachFilters");
    if (cf) {
      const ids = [...new Set(COACHES.map((c) => c.sport).filter(Boolean))];
      cf.innerHTML =
        `<button type="button" class="chip ${S.ctag ? "" : "on"}" data-t="">${T("filter_all")}</button>` +
        ids
          .map(
            (id) =>
              `<button type="button" class="chip ${S.ctag === id ? "on" : ""}" data-t="${id}">${sportName(id)}</button>`,
          )
          .join("");
      cf.querySelectorAll(".chip").forEach((b) =>
        onClick(b, () => {
          S.ctag = b.dataset.t;
          const cur = COACHES.find((c) => c.id === S.coach);
          if (cur && S.ctag && cur.sport !== S.ctag) S.coach = null;
          renderCoaches();
          sync();
        }),
      );
    }
    const list = COACHES.filter((c) => !S.ctag || c.sport === S.ctag);
    document.getElementById("coachList").innerHTML = list
      .map(
        (c) => `
    <button class="opt ${S.coach === c.id ? "sel" : ""}" data-coach="${c.id}">
      <span class="av" aria-hidden="true">${AVATAR}</span>
      <span class="txt"><span class="t">${coachName(c)}</span><span class="d">${nm(c)}</span>
        <span class="d">${pick(c, "x")}</span>
        <span class="tags">${coachTags(c)
          .map((tag) => `<span class="tag">${tag}</span>`)
          .join("")}</span></span>
    </button>`,
      )
      .join("");
    bind("coachList", "coach", (v) => {
      S.coach = v;
    });
  }
  function renderSizes() {
    document.getElementById("sizeList").innerHTML = SIZES.map(
      (s) => `
    <button class="opt ${S.size === s.id ? "sel" : ""}" data-size="${s.id}">
      <span class="txt"><span class="t">${nm(s)}</span><span class="d">${pick(s, "d")}</span>
      <span class="d">${money(PRICES.pt)} / ${T(
        ONE_CLASS_PER_BOOKING ? "unit_session" : "unit_person",
      )}</span></span>
    </button>`,
    ).join("");
    bind("sizeList", "size", (v) => {
      S.size = v;
    });
  }
  /* Round 4 N2: the four categories are two different products. A term course
   (sport classes, S&C) runs a fixed number of lessons on one weekday, so the
   customer picks a WEEKDAY. A one-off event (certificate, workshop) happens
   on a single date, so the date picker stays. kindOf() reads which model the
   current filter selection implies; with a mixed or empty filter it falls
   back to the date picker, which is the safer default because it never hides
   a real date. */
  const DOW_KEYS = [
    "dow_sun",
    "dow_mon",
    "dow_tue",
    "dow_wed",
    "dow_thu",
    "dow_fri",
    "dow_sat",
  ];
  function kindOf() {
    const on = CATS.filter(
      (c) => !S.filters.length || S.filters.includes(c.id),
    );
    const kinds = new Set(on.map((c) => c.kind));
    return kinds.size === 1 ? [...kinds][0] : "event";
  }
  /* 2026-10-13: with one class per booking a card is one session on one date.
   A weekly class shows its next meeting, tomorrow at the earliest (prototype
   dates, like the court and personal training flows); a one-off event shows
   its own date. */
  function sessionDate(c) {
    if (c.date) return new Date(c.date + "T00:00:00");
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + ((c.weekday - d.getDay() + 7) % 7 || 7));
    return d;
  }
  const sessionDay = (c) =>
    sessionDate(c).toLocaleDateString(L() === "zh" ? "zh-HK" : "en-GB", {
      weekday: "long",
      day: "numeric",
      month: L() === "zh" ? "long" : "short",
      year: "numeric",
    });
  /* Round 4 N4: a term course card shows its term range, weekday and lesson
   count; a one-off event shows its date and full time range. */
  function sessionLabel(session) {
    const date = value => new Date(value).toLocaleString(loc(), { timeZone: "Asia/Hong_Kong", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    return `${date(session.startTime)} ${T("time_to")} ${date(session.endTime)}`;
  }
  function classMeta(c) {
    if (c.pricingMode === "course") return `<span class="d">${T("pricing_course")} · ${c.lessonCount} ${T("lessons_n")}</span><span class="d">${sessionDay(c)} ${T("time_to")} ${sessionDay({ date: new Date(Date.parse(c.courseEndTime) + 8 * 3600000).toISOString().slice(0, 10) })}</span>`;
    const t = [];
    /* 2026-10-13: "to" stayed English in the Chinese view */
    const span = c.end
      ? `${c.start} ${T("time_to")} ${c.end}`
      : `${c.start} · ${c.dur} ${T("mins")}`;
    if (ONE_CLASS_PER_BOOKING) {
      t.push(sessionDay(c), span);
    } else if (c.lessons != null) {
      const dow = T(DOW_KEYS[c.weekday]);
      t.push(`${T("l_term")}: ${c.term} (${dow})`);
      t.push(`${c.start} · ${c.dur} ${T("mins")}`);
      t.push(`${T("l_lessons")}: ${c.lessons}`);
    } else {
      const d = c.date ? new Date(c.date + "T00:00:00") : null;
      const ds = d
        ? d.toLocaleDateString(L() === "zh" ? "zh-HK" : "en-GB", {
            day: "numeric",
            month: L() === "zh" ? "long" : "short",
            year: "numeric",
          })
        : "";
      if (ds) t.push(ds);
      t.push(span);
    }
    return t.map((x) => `<span class="d">${x}</span>`).join("");
  }
  function renderClasses() {
    const chips = document.getElementById("classChips");
    chips.innerHTML = BOOKABLE_CATS.map(
      (c) =>
        `<button class="chip ${S.filters.includes(c.id) ? "on" : ""}" data-f="${c.id}">${nm(c)}</button>`,
    ).join("");
    chips.querySelectorAll(".chip").forEach((b) =>
      onClick(b, () => {
        const v = b.dataset.f;
        S.filters = S.filters.includes(v)
          ? S.filters.filter((x) => x !== v)
          : S.filters.concat(v);
        S.cls = null;
        S.dow = null;
        renderClasses();
        sync();
      }),
    );

    /* Round 4 N1: a sport filter row under the category chips. The client drew
     VOLLEYBALL, BADMINTON, BASKETBALL and an explicit "......", meaning the
     list continues, so every sport that actually has a class is listed. */
    const sf = document.getElementById("sportChips");
    if (sf) {
      const ids = [
        ...new Set(BOOKABLE_CLASSES.map((c) => c.sport).filter(Boolean)),
      ];
      sf.innerHTML =
        `<button type="button" class="chip ${S.sport ? "" : "on"}" data-s="">${T("sport_all")}</button>` +
        ids
          .map(
            (id) =>
              `<button type="button" class="chip ${S.sport === id ? "on" : ""}" data-s="${id}">${sportName(id)}</button>`,
          )
          .join("");
      sf.querySelectorAll(".chip").forEach((b) =>
        onClick(b, () => {
          S.sport = b.dataset.s;
          S.cls = null;
          renderClasses();
          sync();
        }),
      );
    }

    /* 2026-10-13: 'single' = one class per booking, every card carries its own
     date, so neither the weekday chips nor the date strip show */
    const kind = ONE_CLASS_PER_BOOKING ? "single" : kindOf();
    const dateWrap = document.getElementById("dates3wrap");
    const dowWrap = document.getElementById("dowWrap");
    const D = days();
    if (dateWrap) dateWrap.hidden = kind !== "event";
    if (dowWrap) dowWrap.hidden = kind !== "term";

    if (kind === "single") {
      document.getElementById("s3sub").textContent = "";
    } else if (kind === "term" && dowWrap) {
      /* weekdays that at least one visible course actually meets on */
      const avail = new Set(
        BOOKABLE_CLASSES.filter((c) => c.lessons != null).map((c) => c.weekday),
      );
      document.getElementById("dow").innerHTML = DOW_KEYS.map(
        (k, i) =>
          `<button type="button" class="chip ${S.dow === i ? "on" : ""}" data-w="${i}" ${avail.has(i) ? "" : "disabled"}>${T(k)}</button>`,
      ).join("");
      document
        .getElementById("dow")
        .querySelectorAll(".chip")
        .forEach((b) =>
          onClick(b, () => {
            const w = +b.dataset.w;
            S.dow = S.dow === w ? null : w;
            S.cls = null;
            renderClasses();
            sync();
          }),
        );
      document.getElementById("s3sub").textContent = "";
    } else {
      document.getElementById("dates3").innerHTML = D.map(
        (d, i) =>
          `<button class="date ${S.day === i ? "on" : ""}" data-d="${i}"><span class="dw">${d.dw}</span><span class="dn">${d.dn}</span></button>`,
      ).join("");
      document
        .getElementById("dates3")
        .querySelectorAll(".date")
        .forEach((b) =>
          onClick(b, () => {
            S.day = +b.dataset.d;
            S.cls = null;
            renderClasses();
            sync();
          }),
        );
      document.getElementById("s3sub").textContent = D[S.day].full;
    }

    const list = BOOKABLE_CLASSES.filter(
      (c) =>
        (!S.filters.length || S.filters.includes(c.cat)) &&
        (!S.sport || c.sport === S.sport) &&
        (kind !== "term" || S.dow == null || c.weekday === S.dow),
    );
    /* round 2 item 11: remember the time each card shows, so the s8 calendar
     link can use the session's real start rather than guessing it. */
    list.forEach((c) => {
      CLS_TIME[c.id] = c.start || CLASS_TIMES[0];
    });
    /* round 2 item 9: the coach moves off the meta line onto a line of its own,
     with the avatar glyph, because the client asked to see who is
     responsible. The "name to confirm" half stays visible in client view,
     same convention as HK$ TBC. */
    document.getElementById("classList").innerHTML = list.length
      ? list
          .map(
            (c) => `
    <button class="opt ${S.cls === c.id ? "sel" : ""}" data-cls="${c.id}" ${c.available ? "" : "disabled"}>
      <span class="txt"><span class="t">${nm(c)}</span>
        ${classMeta(c)}
        <span class="d">${pick(c, "d")}</span>
        <span class="cl"><span class="cl-av" aria-hidden="true">${AVATAR}</span>${c.api ? `${T("l_coach")}: ${escapeBookingText(c.coach)}` : coachLine(c.coach)}</span>
        <span class="tags"><span class="tag">${c.spots} ${T("spots")}</span><span class="tag">${T(c.pricingMode === "course" ? "pricing_course" : "pricing_lesson")}</span>${c.unavailableReason === "course_ended" ? `<span class="tag">${T("course_ended")}</span>` : ""}</span></span>
      <span class="p">${money(c.priceCents === null ? null : c.priceCents / 100)} / ${T(c.pricingMode === "course" ? "unit_course" : "unit_lesson")}</span>
    </button>`,
          )
          .join("")
      : `<p class="meta">${T("no_classes")}</p>`;
    bind("classList", "cls", (v) => {
      S.cls = v;
    });
    const schedule = document.getElementById("courseSchedule");
    const selected = CLASSES.find(c => c.id === S.cls);
    if (schedule) {
      schedule.hidden = selected?.pricingMode !== "course";
      schedule.innerHTML = selected?.pricingMode === "course" ? `<h2 class="pick-h">${T("course_schedule")}</h2><p class="meta">${T("course_all_lessons")}</p><ul>${selected.sessions.map(session => `<li>${sessionLabel(session)} · ${escapeBookingText(session.room.name)}</li>`).join("")}</ul>` : "";
    }
  }
  /* Round 6 (N39, Siu 2026-10-04): up to two hours a day, back to back. The
   time grid sets the length, so the round 3 hours stepper is gone: tap a
   start time for one hour, then the hour just before or after it for two.
   Tapping any other free slot starts again from there. No free slot is ever
   disabled for being over the count: round 5 drew those in the booked style,
   which is why 10:00 and 12:00 looked taken to Siu. Only booked slots are
   struck through. Personal training still books one slot. */
  const hourOf = (t) => Number(t.slice(0, 2));
  /* 2026-10-17: neighbours are read off the grid's order, not the clock, so
   23:00 and 00:00 sit side by side and 06:00 (next morning) is not next to
   07:00 (this morning) */
  const slotIdx = (t) => ALL_TIMES.indexOf(t);
  function adjacentTo(t) {
    return (
      MODE === "venue" &&
      S.times.length === 1 &&
      Math.abs(slotIdx(t) - slotIdx(S.times[0])) === 1 &&
      availableVenueRooms([...S.times, t]).length > 0
    );
  }
  function pickSlot(t) {
    if (S.times.includes(t)) {
      S.times = S.times.filter((x) => x !== t);
      return;
    }
    if (adjacentTo(t) && S.times.length < MAX_HOURS) {
      S.times = S.times.concat(t).sort((a, b) => slotIdx(a) - slotIdx(b));
      return;
    }
    S.times = [t];
  }

  /* ---------- 2026-10-17: night hours, real dates, the QR window ---------- */
  const afterMidnight = (t) =>
    hourOf(t) < QR_UNTIL; /* 00:00 to 06:00 on the grid */
  const inQrWindow = (t) => hourOf(t) >= QR_FROM || hourOf(t) < QR_UNTIL;
  /* the calendar date an hour on the grid falls on: the picked date, or the
   day after it for 00:00 to 06:00 */
  function slotDate(dayIdx, t) {
    return dayDate(dayIdx + (afterMidnight(t) ? 1 : 0));
  }
  function slotStart(dayIdx, t) {
    const d = slotDate(dayIdx, t);
    d.setHours(hourOf(t), 0, 0, 0);
    return d;
  }
  /* start and end of the booked hours (pickSlot keeps them back to back) */
  function bookingSpan() {
    if (MODE === "venue" && checkout.record) return [hongKongDate(checkout.record.startTime), hongKongDate(checkout.record.endTime)];
    if (!S.times.length) return null;
    const a = slotStart(S.day, S.times[0]);
    return [a, new Date(a.getTime() + S.times.length * 3600000)];
  }
  const loc = () => (L() === "zh" ? "zh-HK" : "en-GB");
  /* same shape as days().full, for any date */
  const dayLong = (d) =>
    d.toLocaleDateString(loc(), {
      weekday: "long",
      day: "numeric",
      month: L() === "zh" ? "long" : "short",
    });
  const dayShort = (d) =>
    d.toLocaleDateString(loc(), {
      weekday: "short",
      day: "numeric",
      month: L() === "zh" ? "long" : "short",
    });
  const hm = (d) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  /* both ends of a span: the end carries its own date only when the span
   crosses midnight, e.g. "Saturday 17 Oct, 23:00" and "Sunday 18 Oct, 01:00" */
  function spanEnds(a, b) {
    return [
      `${dayLong(a)}, ${hm(a)}`,
      ymd(a) === ymd(b) ? hm(b) : `${dayLong(b)}, ${hm(b)}`,
    ];
  }
  /* a date and time never splits across lines; the span breaks at "to" */
  const nw = (s) => `<span class="nw">${s}</span>`;
  function needed() {
    return 1;
  }
  function renderSlots() {
    if (MODE === "venue") ensureVenueSlots();
    const D = days();
    document.getElementById("dates2").innerHTML = D.map(
      (d, i) =>
        `<button class="date ${S.day === i ? "on" : ""}" data-d="${i}"><span class="dw">${d.dw}</span><span class="dn">${d.dn}</span></button>`,
    ).join("");
    document
      .getElementById("dates2")
      .querySelectorAll(".date")
      .forEach((b) =>
        onClick(b, () => {
          S.day = +b.dataset.d;
          S.times = [];
          S.roomId = null;
          renderSlots();
          sync();
        }),
      );
    const who =
      MODE === "pt"
        ? coachName(COACHES.find((c) => c.id === S.coach))
        : nm(COURTS.find((c) => c.id === S.court) || { en: "", zh: "" }) +
          (MODE === "venue" && twoCourts(S.court) && S.csize
            ? ", " + t("prices.court" + S.csize)
            : ""); /* round 6: A and B cost different amounts */
    const chosen = MODE === "venue" ? selectedVenue() : null;
    const roomIds = availableVenueRooms(S.times);
    const room = venue.rooms.find((r) => r.id === S.roomId && roomIds.includes(r.id)) ||
      venue.rooms.find((r) => roomIds.includes(r.id));
    const venueName = chosen
      ? `${
          locale === "zh-HK"
            ? chosen.service.nameZh || chosen.service.name
            : chosen.service.name
        }${room ? " · " + room.name : ""}`
      : who;
    document.getElementById("s2sub").textContent =
      venueName + " · " + D[S.day].full;
    document.getElementById("slotStatus").textContent =
      MODE !== "venue"
        ? ""
        : venue.slotError
        ? T("venue_slots_error")
        : !venue.slots
        ? T("venue_slots_loading")
        : !venue.slots.some((s) => s.available)
        ? T("venue_slots_empty")
        : "";
    document.getElementById("slotRetry").hidden =
      MODE !== "venue" || !venue.slotError;
    const slot = (t, i) => {
      const liveSlot =
        MODE === "venue" ? venue.slots?.find((s) => s.time === t) : null;
      const gone = MODE === "venue" ? !liveSlot?.available : taken(S.day, i);
      const on = S.times.includes(t);
      /* the free hour either side of a single pick: tap it for two hours */
      const adj = !on && !gone && adjacentTo(t);
      /* round 5: on a court booking each slot shows what that hour costs */
      const p = MODE === "venue" ? slotPrice(t) : null;
      const price = p == null ? "" : `<span class="tp">${money(p)}</span>`;
      /* 2026-10-17: 00:00 to 06:00 fall on the next calendar day */
      const nd = afterMidnight(t)
        ? `<span class="nd">${T("next_day")}</span>`
        : "";
      return `<button class="tslot ${on ? "on" : ""} ${adj ? "adj" : ""} ${
        liveSlot?.peak ? "peak" : ""
      } ${inQrWindow(t) ? "night" : ""}" data-t="${t}" ${
        gone ? "disabled" : ""
      }>${t}${nd}${price}</button>`;
    };
    /* 2026-10-17: court hire adds the overnight block under its own heading,
     which names the evening and the morning it runs into */
    const night =
      MODE === "venue" && NIGHT_TIMES.length
        ? `<div class="slot-night" id="slotNight"><p class="sn-h">${T(
            "night_h",
          )}</p>` +
          `<p class="sn-sub">${T("night_sub", {
            d1: dayShort(dayDate(S.day)),
            d2: dayShort(dayDate(S.day + 1)),
          })}</p></div>` +
          NIGHT_TIMES.map((t, j) => slot(t, TIMES.length + j)).join("")
        : "";
    document.getElementById("slots").innerHTML =
      TIMES.map((t, i) => slot(t, i)).join("") + night;
    const rn = document.getElementById("s2rates");
    if (rn) rn.hidden = true;
    const sn = document.getElementById("s2note");
    if (sn) sn.hidden = MODE !== "venue";
    document
      .getElementById("slots")
      .querySelectorAll(".tslot")
      .forEach((b) =>
        onClick(b, () => {
          pickSlot(b.dataset.t);
          renderSlots();
          sync();
        }),
      );
  }
  function bind(id, key, fn) {
    document
      .getElementById(id)
      .querySelectorAll(".opt")
      .forEach((b) =>
        onClick(b, () => {
          fn(b.dataset[key]);
          render();
          sync();
        }),
      );
  }

  /* ---------- summary ---------- */
  /* Round 3: several slots read as one value, e.g. "Tuesday 4 Nov, 08:00 and
   10:00". Joined with the locale's own conjunction so no dash or slash
   enters the copy. */
  function whenText() {
    const D = days();
    if (!S.times.length) return null;
    /* 2026-10-17: a court booking that reaches the night reads as a span with
     the real dates, because 00:00 onwards is the next calendar day */
    if (MODE === "venue" && S.times.some(inQrWindow)) {
      const [from, to] = spanEnds(...bookingSpan());
      return `<span class="spanv">${nw(from)} ${T("time_to")} ${nw(to)}</span>`;
    }
    const sep = L() === "zh" ? "、" : ", ";
    return `${D[S.day].full}, ${S.times.join(sep)}`;
  }
  function lines() {
    const out = [],
      D = days();
    if (MODE === "venue") {
      const c = COURTS.find((x) => x.id === S.court);
      out.push([
        T("l_court"),
        c
          ? nm(c) +
            (twoCourts(c.id) && S.csize
              ? ", " + t("prices.court" + S.csize)
              : "")
          : null,
      ]);
      /* round 3: hours booked rides its own line, so it reaches the summary
       aside, the s7 block and the s8 recap in one place */
      out.push([T("qty_l"), S.times.length ? String(S.times.length) : null]);
      const source = checkout.record || checkout.quote;
      if (source) out.push([T("hall"), escapeBookingText(source.room.name)]);
      if (checkout.record?.customer) {
        const customer = checkout.record.customer;
        out.push([T("booking_customer"), escapeBookingText(`${customer.firstName || ""} ${customer.lastName || ""}`.trim())]);
        out.push([T("f_email"), escapeBookingText(customer.email)]);
      }
      if (Number.isSafeInteger(checkout.record?.receivedCents)) out.push([T("booking_received"), money(checkout.record.receivedCents / 100)]);
      if (Number.isSafeInteger(checkout.record?.dueCents)) out.push([T("booking_due"), money(checkout.record.dueCents / 100)]);
      out.push([T("l_when"), whenText()]);
    }
    if (MODE === "class") {
      const cat = bookedCat(),
        cl = CLASSES.find((x) => x.id === S.cls);
      out.push([T("st_cat"), cat ? nm(cat) : null]);
      out.push([T("l_class"), cl ? nm(cl) : null]);
      /* round 2 item 9: who is responsible, in the summary and the recap too.
       .wrapv lets this one value wrap, since .li .v is nowrap by default. */
      if (cl)
        out.push([
          T("l_coach"),
          `<span class="wrapv">${cl.api ? escapeBookingText(cl.coach) : coachVal(cl.coach)}</span>`,
        ]);
      if (cl?.api) out.push([T("hall"), escapeBookingText(cl.room.name)]);
      if (checkout.record?.customer) {
        const customer = checkout.record.customer;
        out.push([T("booking_customer"), escapeBookingText(`${customer.firstName} ${customer.lastName}`)]);
        out.push([T("f_email"), escapeBookingText(customer.email)]);
      }
      if (Number.isSafeInteger(checkout.record?.receivedCents)) out.push([T("booking_received"), money(checkout.record.receivedCents / 100)]);
      if (Number.isSafeInteger(checkout.record?.dueCents)) out.push([T("booking_due"), money(checkout.record.dueCents / 100)]);
      if (cl?.pricingMode === "course") {
        out.push([T("l_billing"), T("pricing_course")]);
        out.push([T("l_lessons"), String(cl.lessonCount)]);
        out.push([T("course_schedule"), `<span class="wrapv">${cl.sessions.map(sessionLabel).join("<br>")}</span>`]);
      } else if (cl) {
        out.push([T("l_billing"), T("pricing_lesson")]);
        out.push([T("l_dur"), `${cl.dur} ${T("mins")}`]);
      }
      /* round 4 N4: a term course is described by its term, weekday and lesson
       count; a one-off event by its date. 2026-10-13: with one class per
       booking, the card's own date and start time, and one lesson. */
      if (cl?.pricingMode === "course") {
        out.push([T("l_term"), `${sessionDay(cl)} ${T("time_to")} ${sessionDay({ date: new Date(Date.parse(cl.courseEndTime) + 8 * 3600000).toISOString().slice(0, 10) })}`]);
      } else if (ONE_CLASS_PER_BOOKING) {
        out.push([T("l_when"), cl ? `${sessionDay(cl)}, ${cl.start}` : null]);
        out.push([T("l_lessons"), "1"]);
      } else if (cl && cl.lessons != null) {
        out.push([T("l_term"), `${cl.term} (${T(DOW_KEYS[cl.weekday])})`]);
        out.push([T("l_lessons"), String(cl.lessons)]);
      } else {
        out.push([T("l_when"), S.cls ? D[S.day].full : null]);
      }
    }
    if (MODE === "pt") {
      const co = COACHES.find((x) => x.id === S.coach),
        sz = SIZES.find((x) => x.id === S.size);
      out.push([T("l_coach"), co ? coachName(co) : null]);
      /* round 4 N10: group size became a coaching ratio */
      out.push([T("l_ratio"), sz ? nm(sz) : null]);
      out.push([T("l_when"), whenText()]);
      /* 2026-10-13: one session of one hour, said outright for the KPay review */
      if (ONE_CLASS_PER_BOOKING) {
        out.push([T("l_dur"), `60 ${T("mins")}`]);
        out.push([T("l_lessons"), "1"]);
      }
    }
    return out;
  }
  function lineHTML() {
    return lines()
      .map(
        ([k, v]) =>
          `<div class="li ${v ? "" : "empty"}"><span class="k">${k}</span><span class="v">${v || T("l_none")}</span></div>`,
      )
      .join("");
  }
  function renderSummary() {
    const html = lineHTML();
    document.getElementById("sumLines").innerHTML = html;
    /* round 3: the sticky bar carries no line list, so the hours ride on its
     total instead. */
    /* round 5: court bookings show a real total, exact once every hour has a
     slot and "from" before that. 2026-10-13: classes and personal training
     show their one-session dummy price from the first step. */
    const tot = bookingTotal();
    const totHTML =
      tot == null
        ? money(null)
        : tot.exact
          ? money(tot.v)
          : t("price.fromTemplate", { p: money(tot.v) });
    const st = document.getElementById("sumTotal");
    if (st) {
      st.innerHTML = totHTML;
      st.classList.toggle("price-tbc", tot == null);
    }
    const bt = document.getElementById("barTotal");
    if (bt) {
      bt.innerHTML = totHTML + '<span id="barQty"></span>';
      bt.classList.toggle("price-tbc", tot == null);
    }
    const s7 = document.getElementById("s7lines");
    /* Round 4 N11: personal training itemises coaching and court hire as
     separate lines before the total, because the client's receipt does.
     Both read HK$ TBC until the rate card lands, like every other price.
     2026-10-13: the dummy hour is all in, so the court fee line waits for
     real prices rather than sit at TBC beside an exact total. */
    const split =
      MODE === "pt"
        ? `<div class="li"><span class="k">${T("l_coaching")}</span><span class="v">${money(PRICES.pt)}</span></div>` +
          (ONE_CLASS_PER_BOOKING
            ? ""
            : `<div class="li"><span class="k">${T("l_courtfee")}</span><span class="v">${money(PRICES.court)}</span></div>`)
        : "";
    if (s7)
      s7.innerHTML = `<div class="summary payment-summary">${html}${split}
    <div class="total"><span>${T("sum_total")}</span><span>${totHTML}</span></div>
    <p class="policy">${T("policy")} <a href="${localizedPath("/terms/", locale)}#refund" target="_blank" rel="noopener">${T("policy_link")}</a></p></div>`;
  }

  /* ---------- flow control ---------- */
  /* Round 4 N7: the details form differs per category. Workshop and
   certificate courses ask a fuller set (date of birth, gender, how did you
   hear about us); venue, personal training and training classes ask the
   short set. Training classes should follow EVA's member registration
   exactly (client, 2026-09-24), but nobody has supplied EVA's field list, so
   they keep the short set and carry a change-request callout rather than an
   invented form.
   The category is read off the CHOSEN CLASS, not S.cat: S.cat records the
   pre-select on s1c, but the session list lets the customer filter to a
   different category and book from it, so the class is the truth. */
  function bookedCat() {
    const cl = CLASSES.find((c) => c.id === S.cls);
    if (cl) return CATS.find((c) => c.id === cl.cat) || null;
    return CATS.find((c) => c.id === S.cat) || null;
  }
  function formKind() {
    if (MODE !== "class") return "short";
    const cat = bookedCat();
    return cat && cat.kind === "event" ? "full" : "short";
  }
  function requiredFields() {
    const base = ["fFirst", "fLast", "fHkid", "fEmail", "fPhone"];
    return formKind() === "full"
      ? base.concat("fDob", "fGender", "fHear")
      : base;
  }
  function canAdvance() {
    if (restoringRoute || (onlineBooking && checkout.busy)) return false;
    const id = FLOWS[MODE][S.i];
    if (id === "s1") return !!selectedVenue();
    if (id === "s1c") return !!S.cat;
    if (id === "s5") return !!S.coach;
    if (id === "s5b") return !!S.size;
    if (id === "s3") return !classes.loading && !!CLASSES.find(c => c.id === S.cls && c.available);
    /* round 6: one slot, or two back to back (pickSlot keeps them adjacent) */
    if (id === "s2")
      return (
        S.times.length >= needed() &&
        (MODE !== "venue" ||
          availableVenueRooms(S.times).length > 0)
      );
    if (id === "s6" && onlineBooking) return validContact();
    if (id === "s7" && onlineBooking) return !!checkout.record && ["Pending", "Paid", "Confirmed"].includes(checkout.record.status);
    if (id === "s6")
      return (
        requiredFields().every((i) => {
          const el = document.getElementById(i);
          return !el || el.closest("[hidden]") ? true : el.value.trim();
        }) && document.getElementById("cWaiver").checked
      );
    return true;
  }
  /* Round 4 N7/N8: show the fields this category actually asks for, point the
   terms link at the right body of terms, and surface the EVA change request
   on training classes. */
  function renderForm() {
    const full = formKind() === "full";
    const ex = document.getElementById("s6extra");
    if (ex) ex.hidden = !full;
    /* the notes field survives on workshop and certificate only: the client
     said LCSD does not ask it for court hire (round 3), then listed it for
     workshops and certificates (round 4) */
    const notes = document.getElementById("fNotesRow");
    if (notes) notes.hidden = !full;
    const eva = document.getElementById("crEva");
    if (eva) eva.hidden = !(MODE === "class" && !full);

    /* Round 3 A6 / round 4 N8: make the words "Terms of Service Policy" inside
     the checkbox sentence a link, in whichever position that phrase occupies
     in the current language. Built here rather than in the markup because
     both halves are translated strings: appending a second copy of the phrase
     after the sentence would print it twice.
     2026-10-23: the client's terms arrived as one set for every category
     (KPay approval), so the link opens terms.html in a new tab instead of the
     per-category placeholder panel. A link inside a <label> does not toggle
     the checkbox when clicked. */
    const wt = document.getElementById("waiverText");
    if (wt) {
      const sentence = T("c_waiv"),
        phrase = T("tc_link");
      const at = sentence.indexOf(phrase);
      const esc = (s) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const link = `<a class="tc-open" id="tcOpen" href="${localizedPath("/terms/", locale)}#terms" target="_blank" rel="noopener">${esc(phrase)}</a>`;
      wt.innerHTML =
        at === -1
          ? `${esc(sentence)} ${link}`
          : esc(sentence.slice(0, at)) +
            link +
            esc(sentence.slice(at + phrase.length));
    }
  }

  function render() {
    const flow = FLOWS[MODE],
      id = flow[S.i];
    document
      .querySelectorAll(".screen")
      .forEach((s) => s.classList.toggle("on", s.id === id));
    renderRail();
    if (id === "s1") renderCourts();
    if (id === "s1c") renderCats();
    if (id === "s5") renderCoaches();
    if (id === "s5b") renderSizes();
    if (id === "s3") renderClasses();
    if (id === "s2") renderSlots();
    if (id === "s6") renderForm(); /* round 4 N7 */
    if (id === "s8") {
      renderRecap();
      renderCal();
    } /* round 2 item 11 */
    renderSummary();

    const last = id === "s8";
    const isPay = id === "s7";
    /* 2026-10-17: the QR confirmation is made to be screenshotted, so it
     tightens up and the WhatsApp bubble stays off the card */
    setPageClass("qr-on", false);
    document.getElementById("summary").hidden = last || isPay;
    setPageClass("is-payment-step", isPay);
    document.getElementById("bar").style.display = last ? "none" : "";
    setPageClass("has-bar", !last);
    setPageClass("in-checkout", isPay || id === "s6");
    const label = isPay ? T(onlineBooking ? "booking_confirm_button" : "pay") : T("next");
    document.getElementById("sumNext").textContent = label;
    document.getElementById("barNext").textContent = label;
    document.getElementById("paymentNext").textContent = label;
    sync();
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function sync() {
    if (MODE === "venue" && venue.slots) {
      const roomIds = availableVenueRooms(S.times);
      S.roomId = roomIds.includes(S.roomId) ? S.roomId : roomIds[0] || null;
    }
    const ok = canAdvance();
    document.getElementById("sumNext").disabled = !ok;
    document.getElementById("barNext").disabled = !ok;
    document.getElementById("paymentNext").disabled = !ok;
    renderSummary();
    saveBookingDraft();
    writeBookingRoute();
    renderCheckoutStatus();
  }
  function next() {
    if (!canAdvance()) {
      if (FLOWS[MODE][S.i] === "s6")
        document.getElementById("fWarn").classList.add("on");
      return;
    }
    document.getElementById("fWarn").classList.remove("on");
    if (onlineBooking && ["s2", "s3", "s6", "s7"].includes(FLOWS[MODE][S.i])) {
      advanceVenue();
      return;
    }
    if (S.i < FLOWS[MODE].length - 1) {
      saveBookingDraft();
      if (FLOWS[MODE][S.i] === "s7") bookingCompleted = true;
      S.i++;
      routeActive = true;
      writeBookingRoute(true);
      render();
    }
  }
  function prev() {
    if (onlineBooking && ["Paid", "Confirmed"].includes(checkout.record?.status)) { location.href = localizedPath("/", locale); return; }
    if (onlineBooking && checkout.record) { editVenueBooking(); return; }
    if (S.i > 0) {
      saveBookingDraft();
      S.i--;
      if (MODE === "venue" && FLOWS[MODE][S.i] === "s2") { venue.key = null; checkout.quote = null; checkout.quoteKey = null; }
      writeBookingRoute(true);
      render();
    } else {
      location.href = localizedPath("/", locale);
    }
  }
  function renderRecap() {
    const art =
      MODE === "venue"
        ? diaFor(COURTS.find((c) => c.id === S.court))
        : DIA["basketball"];
    const rc = document.getElementById("recap");
    rc.classList.remove("has-qr");
    rc.innerHTML =
      `<div class="watermark">${art}</div>${lineHTML()}
     <div class="li"><span class="k">${T("ref")}</span><span class="v">${onlineBooking ? escapeBookingText(checkout.record?.reference) : REF}</span></div>` +
      `<p class="checkin">${T(MODE === "venue" && S.times.some(inQrWindow) ? "booking_night_checkin" : "checkin_desk")}</p>`;
    const cr = document.getElementById("crQr");
    if (cr) cr.hidden = true;
  }
  /* ---------- round 2 item 11: add to calendar (s8) ----------
   One event, two links: a Google Calendar TEMPLATE url opened in a new tab,
   and the same event as a VCALENDAR on a data: url for Apple Calendar.
   Times are local floating (no Z, no TZID), with ctz=Asia/Hong_Kong on the
   Google link, per the round 2 brief. Durations: a venue slot is one hour, a
   class is its own dur, PT is 60 minutes. The confirmation page is rendered
   by the Bliss backend, so both links are a change request for Edward; the
   .cr callout on s8 says so. */
  function dayDate(i) {
    // Venue dates are Hong Kong civil dates even for visitors overseas.
    const now = new Date();
    const d =
      MODE === "venue"
        ? new Date(
            (checkout.record ? new Date(Date.parse(checkout.record.startTime) + 3600000).toISOString().slice(0, 10) : new Intl.DateTimeFormat("en-CA", {
              timeZone: "Asia/Hong_Kong",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(now)) + "T12:00:00",
          )
        : now;
    d.setDate(d.getDate() + i);
    return d;
  }
  function stamp(d) {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
  }
  function calEvent() {
    let title = "",
      time = S.times[0],
      mins = 60,
      base = dayDate(S.day);
    if (MODE === "venue") {
      const c = COURTS.find((x) => x.id === S.court);
      title = c ? nm(c) : "";
      mins =
        60 * Math.max(1, S.times.length); /* round 6: two back-to-back hours */
      /* 2026-10-17: a night that starts after midnight starts on the next day */
      if (time && afterMidnight(time)) base = dayDate(S.day + 1);
    }
    if (MODE === "class") {
      const cl = CLASSES.find((x) => x.id === S.cls);
      title = cl?.api ? cl.name : cl ? nm(cl) : "";
      time = CLS_TIME[S.cls] || (cl && cl.start) || CLASS_TIMES[0];
      mins = cl ? cl.dur : 60;
      if (ONE_CLASS_PER_BOOKING && cl)
        base = sessionDate(cl); /* 2026-10-13: the card's own date */
    }
    if (MODE === "pt") {
      const co = COACHES.find((x) => x.id === S.coach);
      title = T("cal_pt") + (co ? " · " + coachName(co) : "");
    }
    if (onlineBooking && checkout.record) {
      const hkStamp = value => new Date(Date.parse(value) + 8 * 3600000).toISOString().slice(0, 19).replace(/[-:]/g, "");
      return { title, start: hkStamp(checkout.record.startTime), end: hkStamp(checkout.record.endTime), details: `${T("ref")} ${checkout.record.reference} · ${VENUE}` };
    }
    if (!time) return null;
    const hm = time.split(":").map(Number);
    const start = new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      hm[0],
      hm[1],
      0,
    );
    const end = new Date(start.getTime() + mins * 60000);
    return {
      title,
      start: stamp(start),
      end: stamp(end),
      details: `${T("ref")} ${onlineBooking ? checkout.record?.reference || "" : REF} · ${VENUE}`,
    };
  }
  function renderCal() {
    const g = document.getElementById("gcal"),
      i = document.getElementById("ics");
    if (!g || !i) return;
    const e = calEvent();
    if (!e) return;
    g.href =
      "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      "&text=" +
      encodeURIComponent(e.title) +
      "&dates=" +
      e.start +
      "/" +
      e.end +
      "&details=" +
      encodeURIComponent(e.details) +
      "&location=" +
      encodeURIComponent(VENUE) +
      "&ctz=" +
      encodeURIComponent("Asia/Hong_Kong");
    const fullCourse = MODE === "class" && checkout.record?.pricingMode === "course";
    g.textContent = T(fullCourse ? "course_google_first" : "s8_gcal");
    i.textContent = T(fullCourse ? "course_calendar_all" : "s8_ics");
    const hkStamp = value => new Date(Date.parse(value) + 8 * 3600000).toISOString().slice(0, 19).replace(/[-:]/g, "");
    const events = fullCourse ? checkout.record.lessons.map(session => ({ ...e, id: session.id, start: hkStamp(session.startTime), end: hkStamp(session.endTime), room: `${VENUE} · ${session.room.name}` })) : [{ ...e, id: "booking", room: VENUE }];
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Sporting Hub Hong Kong//Booking prototype//EN",
      "CALSCALE:GREGORIAN",
      ...events.flatMap(event => [
        "BEGIN:VEVENT",
        "UID:" + (onlineBooking ? checkout.record?.id || "" : REF) + "-" + event.id + "@sportinghub.hk",
        "DTSTAMP:" + e.start,
        "DTSTART:" + event.start,
        "DTEND:" + event.end,
        "SUMMARY:" + e.title.replace(/[\r\n]/g, " "),
        "DESCRIPTION:" + e.details.replace(/[\r\n]/g, " "),
        "LOCATION:" + event.room.replace(/[\r\n]/g, " "),
        "END:VEVENT",
      ]),
      "END:VCALENDAR",
    ].join("\r\n");
    i.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
  }

  /* ---------- boot ---------- */
  function bookingExtras() {
    restoreBookingRoute();
    on(window, "popstate", () => {
      const mode = new URLSearchParams(location.search).get("mode") || MODE;
      if (mode !== MODE) { location.reload(); return; }
      restoreBookingRoute();
    });
    if (onlineBooking) {
      onClick(document.getElementById("paymentRefresh"), refreshVenuePayment);
      every(() => {
        if (checkout.record?.status === "Pending" && checkout.id && FLOWS[MODE][S.i] === "s7" && document.visibilityState !== "hidden") refreshVenuePayment();
      }, 5000);
      on(window, "focus", () => { if (checkout.record?.status === "Pending") refreshVenuePayment(); });
      if (MODE === "class") {
        onClick(document.getElementById("classRetry"), loadClasses);
        onClick(document.getElementById("categoryRetry"), loadClasses);
        loadClasses();
      } else {
      onClick(document.getElementById("venueRetry"), loadVenues);
      onClick(document.getElementById("slotRetry"), () => {
        venue.key = null;
        S.times = [];
        renderSlots();
        sync();
      });
      loadVenues();
      }
    }
    waLink("waFloat", T("wa_prefill"));
  }
  /* Initialize the booking flow only after its React markup has mounted. */
  function initializeBooking() {
    if (document.getElementById("back")) {
      onClick(document.getElementById("back"), prev);
      onClick(document.getElementById("sumNext"), next);
      onClick(document.getElementById("barNext"), next);
      onClick(document.getElementById("paymentNext"), next);
      /* round 4 N7: the extra workshop and certificate fields validate too */
      [
        "fFirst",
        "fLast",
        "fHkid",
        "fEmail",
        "fPhone",
        "fDob",
        "fGender",
        "fHear",
        "fNotes",
        "cWaiver",
        "cMkt",
      ].forEach((i) => {
        const el = document.getElementById(i);
        const updateContact = () => {
          bookingCompleted = false;
          if (onlineBooking) checkout.error = "";
          sync();
        };
        if (el) {
          on(el, "input", updateContact);
          on(el, "change", updateContact);
        }
      });
      /* 2026-10-13: one class per booking, said on the class type step and the
     ratio step, where the round 4 subtitles would contradict it (they list
     certificate courses and price each ratio differently) */
      if (ONE_CLASS_PER_BOOKING) {
        document
          .querySelector("#s1c .sub")
          .setAttribute("data-str", "bk.one_class");
        document
          .querySelector("#s5b .sub")
          .setAttribute("data-str", "bk.one_pt");
      }
      boot(bookingExtras);
    }
  }

  function renderPrices() {
    document.querySelectorAll("[data-price-cat]").forEach((el) => {
      const cat = el.getAttribute("data-price-cat");
      el.innerHTML =
        FROM_PRICES[cat] == null
          ? t("price.soon")
          : t("price.fromTemplate", { p: money(FROM_PRICES[cat]) });
      el.classList.toggle("price-tbc", FROM_PRICES[cat] == null);
    });
  }

  /* Round 5: the court hire table, one row per court, in the rate card's order.
   Volleyball and floorball carry a Court A and a Court B row each. */
  function renderRateTable() {
    const body = document.getElementById("rateRows");
    if (!body) return;
    body.innerHTML = RATE_ORDER.map((id) =>
      RATES[id]
        .map(
          (r) => `
    <tr>
      <th scope="row"><span class="rate-sport">${t("sport." + id + ".name")}</span>${r.court ? `<span class="rate-court">${t("prices.court" + r.court)}</span>` : ""}</th>
      <td>${money(r.peak)}</td>
      <td>${money(r.off)}</td>
    </tr>`,
        )
        .join(""),
    ).join("");
    const fee = document.getElementById("memberFee");
    if (fee) fee.innerHTML = money(MEMBERSHIP_FEE);
  }

  /* Round 6 (N46): Suki's rate card images, one per language, so she can
   replace them herself. Held back until she confirms the court sizes: the
   card prints 9m x 9m and 8m x 8m, her message says 9m x 18m and 8m x 16m.
   Flip RATE_CARD_READY once a corrected card is in assets/price/. */
  const RATE_CARD = {
    en: withBasePath("/assets/price/rate-card-en.jpg"),
    zh: withBasePath("/assets/price/rate-card-zh.jpg"),
  };
  const RATE_CARD_READY = false;
  function wirePricePdf() {
    const a = document.getElementById("pricePdf");
    const tag = document.getElementById("pricePdfTbc");
    if (!a) return;
    const l = lang() === "zh" ? "zh" : "en";
    a.hidden = !RATE_CARD_READY;
    a.href = RATE_CARD[l];
    a.setAttribute("download", "sporting-hub-hk-rate-card-" + l + ".jpg");
    if (tag) tag.hidden = RATE_CARD_READY;
  }

  /* Round 6: the online store is not live yet (Suki: "coming soon"). With no
   URL the shop tile says so and the Shop links scroll to it; set SHOP_URL
   when the store is renamed and everything turns into an outbound link. */
  const SHOP_URL = null;
  function wireShop() {
    const out = !!SHOP_URL;
    const tile = document.getElementById("shop");
    if (tile) {
      if (out) {
        tile.href = SHOP_URL;
        tile.target = "_blank";
        tile.rel = "noopener";
      } else {
        tile.removeAttribute("href");
        tile.removeAttribute("target");
        tile.removeAttribute("rel");
      }
      tile.classList.toggle("is-soon", !out);
    }
    document.querySelectorAll("[data-shop-link]").forEach((a) => {
      if (out) {
        a.href = SHOP_URL;
        a.target = "_blank";
        a.rel = "noopener";
      } else {
        a.href = "#shop";
        a.removeAttribute("target");
        a.removeAttribute("rel");
      }
      a.classList.toggle("is-soon", !out);
    });
  }

  /* Round 6 (N49): Google map of the venue, no API key (the embed URL Google
   itself redirects maps?output=embed to). Map labels follow the page language. */
  const MAP_PB =
    "!1m3!2m1!1z6LGq5pmv6Iqx5ZyS5ZWG5aC0IOmdkum-jemgremdkuWxseWFrOi3rzEwMOiZnw!6i16";
  function wireMap() {
    const f = document.getElementById("mapFrame");
    if (!f) return;
    const hl = lang() === "zh" ? "zh-HK" : "en";
    const src =
      "https://www.google.com/maps/embed?origin=mfe&pb=" +
      MAP_PB +
      "!3m1!1s" +
      hl +
      "!5m1!1s" +
      hl;
    if (f.getAttribute("src") !== src) f.setAttribute("src", src);
  }

  /* ---------- dev/client tweaks panel ---------- */
  const VIEW_KEY = "shhk-mock-view";

  function applyView(view) {
    document.documentElement.setAttribute("data-view", view);
    document
      .querySelectorAll('.tweaks-btns[data-tweak="view"] button')
      .forEach((b) => {
        b.setAttribute(
          "aria-pressed",
          String(b.getAttribute("data-value") === view),
        );
      });
  }

  function initTweaksPanel() {
    const params = new URLSearchParams(location.search);
    if (params.get("clean") === "1")
      document.documentElement.classList.add("clean");

    /* Hosted-link switch (2026-09-09): ?view=client or ?view=dev sets the view
     for this browser, so a single URL can go to Suki and open clean on first
     visit. The choice persists via storage exactly as if the panel had
     been clicked, so booking.html and later visits keep it.

     Panel visibility is no longer decided here. Since round 2 made client the
     default, site.css hides the panel on html[data-view="client"], which
     covers the plain URL as well as ?view=client. The .clean class stays for
     ?clean=1, which hides the panel in dev view for screenshots. */
    const forced = params.get("view");
    if (forced === "client" || forced === "dev") {
      try {
        storage.setItem(VIEW_KEY, forced);
      } catch (e) {}
      if (forced === "client") document.documentElement.classList.add("clean");
    }

    /* Round 2 (client review 2026-09-19, item 8): default is CLIENT view, not
     dev. Same default as shared.js initView(), which runs a moment later in
     boot() and would otherwise disagree with the panel's pressed state. Dev
     view is opt-in via ?view=dev or the panel switch, and still persists. */
    applyView(storage.getItem(VIEW_KEY) || "client");

    document
      .querySelectorAll('.tweaks-btns[data-tweak="view"] button')
      .forEach((b) => {
        on(b, "click", () => {
          const v = b.getAttribute("data-value");
          storage.setItem(VIEW_KEY, v);
          applyView(v);
        });
      });
  }

  /* ---------- hero slideshow ----------
   Order: hero-1 (basketball skylight, widest quiet lower-left third) first,
   per BRIEF.md Step 0. Auto-advance 6s, pause on hover/focus, dots + arrows,
   stops entirely under prefers-reduced-motion. */
  function initSlideshow(root) {
    const slides = Array.from(root.querySelectorAll(".hero-slide"));
    const dots = Array.from(root.querySelectorAll(".hero-dot"));
    const prevBtn = root.querySelector(".hero-arrow.prev");
    const nextBtn = root.querySelector(".hero-arrow.next");
    if (!slides.length) return;
    let i = 0;
    let timer = null;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    function show(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, idx) => s.classList.toggle("is-active", idx === i));
      dots.forEach((d, idx) => d.classList.toggle("is-active", idx === i));
    }
    function next() {
      show(i + 1);
    }
    function prev() {
      show(i - 1);
    }
    function start() {
      if (reduceMotion) return;
      stop();
      timer = every(next, 6000);
    }
    function stop() {
      if (timer) cancelEvery(timer);
      timer = null;
    }

    dots.forEach((d, idx) =>
      on(d, "click", () => {
        show(idx);
        start();
      }),
    );
    if (nextBtn)
      on(nextBtn, "click", () => {
        next();
        start();
      });
    if (prevBtn)
      on(prevBtn, "click", () => {
        prev();
        start();
      });
    on(root, "mouseenter", stop);
    on(root, "mouseleave", start);
    on(root, "focusin", stop);
    on(root, "focusout", start);

    show(0);
    start();
  }

  /* ---------- nav scroll state ----------
   Round 2 (client review 2026-09-19, item 3): the nav lockup no longer
   hides over the hero, so there is nothing to toggle aria-hidden on. This
   function now only flips the .nav-scrolled class that swaps the nav
   between its transparent and solid states (site.css does the rest,
   including recolouring the lockup cream over the photo). */
  function initNavScroll() {
    function update() {
      const scrolled = window.scrollY > 80;
      document.documentElement.classList.toggle("nav-scrolled", scrolled);
    }
    on(window, "scroll", update, { passive: true });
    update();
  }

  /* ---------- boot ---------- */
  function homeExtras() {
    renderPrices();
    renderRateTable();
    wirePricePdf();
    wireShop();
    wireMap();
    wireBooking();
    const wa = t("wa.prefillGeneral");
    const waCorp = t("wa.prefillCorporate");
    waLink("waFloat", wa);
    waLink("waFind", wa);
    waLink("waFact", wa);
    waLink("waCorp", waCorp, WA_NUMBER_CORP);
  }

  function initializeHome() {
    initTweaksPanel();
    document.querySelectorAll(".hero-slideshow").forEach(initSlideshow);
    initNavScroll();
    const yearEl = document.getElementById("footer-year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
    boot(homeExtras);
  }
  const year = document.getElementById("footer-year");
  if (year) year.textContent = String(new Date().getFullYear());
  if (page === "booking") initializeBooking();
  else if (page === "terms")
    boot(() => waLink("waTerms", t("wa.prefillGeneral")));
  else initializeHome();

  return () => {
    venueAbort.abort();
    [...listeners].forEach((dispose) => dispose());
    intervals.forEach((timer) => window.clearInterval(timer));
    intervals.clear();
    document.body.style.overflow = "";
  };
}
