import type { CSSProperties } from "react";
import type { Locale } from "@/i18n/config";
import { createSiteTranslator } from "@/i18n/translate";
import { LanguageSwitcher } from "@/components/language-switcher";
import { localizedPath, withBasePath } from "@/lib/paths";
import { SiteRuntime } from "@/components/site-runtime";
import {
  BrandLogo,
  HeroLogo,
  VolleyballCourt,
  BasketballCourt,
  PickleballCourt,
  BadmintonCourt,
} from "@/components/illustrations";

export function HomePage({
  comingSoon = false,
  locale,
}: {
  comingSoon?: boolean;
  locale: Locale;
}) {
  const t = createSiteTranslator(locale);
  const homeHref = localizedPath(comingSoon ? "/coming-soon/" : "/", locale);
  return (
    <div
      className="site-body page-home"
      data-booking={comingSoon ? "soon" : "open"}
    >
      <SiteRuntime page={comingSoon ? "coming-soon" : "home"} locale={locale} />

      <header className="nav" id="siteNav">
        <div className="wrap">
          <a
            className="nav-lockup"
            href={homeHref}
            aria-label={t("nav.home_aria")}
          >
            <BrandLogo />
          </a>
          <nav className="nav-items">
            <a href="#pillars" data-str="nav.service">
              {t("nav.service")}
            </a>
            <span className="nav-item-wrap">
              <a href="#shop" data-shop-link="" data-str="nav.shop">
                {t("nav.shop")}
              </a>
              <span className="tbc" data-str="nav.shopTbc">
                {t("nav.shopTbc")}
              </span>
            </span>
            <a href="#jp" data-str="nav.team">
              {t("nav.team")}
            </a>
            <a href="#corporate" data-str="nav.corporate">
              {t("nav.corporate")}
            </a>
            <a href="#find" data-str="nav.contact">
              {t("nav.contact")}
            </a>
          </nav>
          <div className="nav-right">
            <LanguageSwitcher
              locale={locale}
              pathname={comingSoon ? "/coming-soon/" : "/"}
              label={t("nav.lang_aria")}
            />
            <a
              className="btn book-pill"
              href={localizedPath("/booking/", locale)}
              data-book="venue"
              data-wa="wa.prefillGeneral"
              data-str="cta.book"
              data-str-soon="find.waBtn"
            >
              {t(comingSoon ? "find.waBtn" : "cta.book")}
            </a>
            <button
              type="button"
              className="nav-burger"
              id="burger"
              data-str-aria="nav.menu_aria"
              aria-label={t("nav.menu_aria")}
              aria-expanded="false"
            >
              <i></i>
              <i></i>
              <i></i>
            </button>
          </div>
        </div>
      </header>
      <div className="drawer-scrim" id="drawerScrim"></div>
      <nav
        className="drawer"
        id="drawer"
        data-str-aria="nav.menu_aria"
        aria-label={t("nav.menu_aria")}
      >
        <button
          type="button"
          className="drawer-x"
          id="drawerX"
          data-str-aria="nav.closeAria"
          aria-label={t("nav.closeAria")}
        >
          {"×"}
        </button>
        <a href="#pillars" data-str="nav.service">
          {t("nav.service")}
        </a>
        <span className="drawer-item-wrap">
          <a href="#shop" data-shop-link="" data-str="nav.shop">
            {t("nav.shop")}
          </a>
          <span className="tbc" data-str="nav.shopTbc">
            {t("nav.shopTbc")}
          </span>
        </span>
        <a href="#jp" data-str="nav.team">
          {t("nav.team")}
        </a>
        <a href="#corporate" data-str="nav.corporate">
          {t("nav.corporate")}
        </a>
        <a href="#find" data-str="nav.contact">
          {t("nav.contact")}
        </a>
        <a
          className="btn btn-on-navy drawer-book"
          href={localizedPath("/booking/", locale)}
          data-book="venue"
          data-wa="wa.prefillGeneral"
          data-str="cta.book"
          data-str-soon="find.waBtn"
        >
          {t(comingSoon ? "find.waBtn" : "cta.book")}
        </a>
      </nav>
      <section className="hero hero-a" id="hero-a">
        <div
          className="hero-slideshow"
          aria-roledescription={t("hero.carousel_role")}
          aria-label={t("hero.photos_aria")}
        >
          <div className="hero-slide is-active">
            <img
              src={withBasePath("/assets/venue/hall-volleyball.jpg")}
              alt=""
              loading="eager"
              style={
                {
                  "--hx": "30%",
                  "--hy": "100%",
                  "--hx-m": "22%",
                  "--hz-m": "130%",
                } as CSSProperties
              }
            />
          </div>
          <div className="hero-slide">
            <img
              src={withBasePath("/assets/venue/hall-corridor.jpg")}
              alt=""
              loading="lazy"
              style={
                {
                  "--hx": "38%",
                  "--hy": "100%",
                  "--hz-m": "120%",
                } as CSSProperties
              }
            />
          </div>
          <div className="hero-slide">
            <img
              src={withBasePath("/assets/venue/hall-basketball.jpg")}
              alt=""
              loading="lazy"
              style={
                {
                  "--hx": "70%",
                  "--hy": "100%",
                  "--hx-m": "85%",
                  "--hz-m": "130%",
                } as CSSProperties
              }
            />
          </div>
          <div className="hero-slide">
            <img
              src={withBasePath("/assets/venue/hall-low-net.jpg")}
              alt=""
              loading="lazy"
              style={
                {
                  "--hx": "65%",
                  "--hy": "100%",
                  "--hx-m": "78%",
                  "--hz-m": "120%",
                } as CSSProperties
              }
            />
          </div>
          <button
            type="button"
            className="hero-arrow prev"
            aria-label={t("hero.previous_aria")}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15 6l-6 6 6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
            </svg>
          </button>
          <button
            type="button"
            className="hero-arrow next"
            aria-label={t("hero.next_aria")}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M9 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
            </svg>
          </button>
          <div className="hero-dots">
            <button
              type="button"
              className="hero-dot is-active"
              aria-label={t("hero.slide_aria", { n: 1 })}
            ></button>
            <button
              type="button"
              className="hero-dot"
              aria-label={t("hero.slide_aria", { n: 2 })}
            ></button>
            <button
              type="button"
              className="hero-dot"
              aria-label={t("hero.slide_aria", { n: 3 })}
            ></button>
            <button
              type="button"
              className="hero-dot"
              aria-label={t("hero.slide_aria", { n: 4 })}
            ></button>
          </div>
          <div className="scrim-top" aria-hidden="true"></div>
          <div className="scrim">
            <div className="wrap hero-text-block">
              <p className="eyebrow on-photo" data-str="hero.eyebrow">
                {t("hero.eyebrow")}
              </p>
              <h1 className="hero-lockup" aria-label={t("brand.name")}>
                <HeroLogo />
              </h1>
              <p
                className="lead on-photo"
                style={{ marginBottom: "22px" } as CSSProperties}
                data-str="hero.lead"
              >
                {t("hero.lead")}
              </p>
              <div className="hero-actions flex flex-wrap gap-3">
                <a
                  className="btn btn-primary btn-on-dark"
                  href={localizedPath("/booking/", locale)}
                  data-book="venue"
                  data-wa="wa.prefillGeneral"
                  data-str="cta.book"
                  data-str-soon="find.waBtn"
                >
                  {t(comingSoon ? "find.waBtn" : "cta.book")}
                </a>
                <a
                  className="btn btn-secondary btn-on-dark open-only"
                  href="#pillars"
                  data-str="cta.classes"
                >
                  {t("cta.classes")}
                </a>
              </div>
              <p className="soon-note on-photo soon-only">
                <span data-str="soon.note1">{t("soon.note1")}</span>
                <span data-str="soon.note2">{t("soon.note2")}</span>
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="section" id="pillars">
        <div className="bleed">
          <p className="eyebrow" data-str="pillar.eyebrow">
            {t("pillar.eyebrow")}
          </p>
          <h2
            className="h-section"
            style={{ marginBottom: "24px" } as CSSProperties}
            data-str="pillar.title"
          >
            {t("pillar.title")}
          </h2>
          <div className="pillars-grid">
            <a
              className="pillar-tile photo-frame"
              href={localizedPath("/booking/?mode=venue", locale)}
              data-book="venue"
              data-book-soon="#prices"
            >
              <span className="photo-slot">
                {
                  "pillar-venue · venue-wide render: courts, S&C, shop and lounge in one view"
                }
              </span>
              <img
                src={withBasePath("/assets/venue/venue-wide-800.jpg")}
                alt=""
                loading="lazy"
                style={{ objectPosition: "60% 50%" } as CSSProperties}
              />
              <span className="scrim scrim-tile" aria-hidden="true"></span>
              <span className="tile-arrow flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></path>
                </svg>
              </span>
              <span className="tile-text scrim">
                <span className="h-tile on-photo" data-str="pillar.venue">
                  {t("pillar.venue")}
                </span>
                <span
                  className="body-text on-photo"
                  style={
                    {
                      fontSize: "14px",
                      marginBottom: "6px",
                      display: "block",
                    } as CSSProperties
                  }
                  data-str="pillar.venue.desc"
                >
                  {t("pillar.venue.desc")}
                </span>
                <span
                  className="tile-price price-tbc on-photo"
                  data-price-cat="court"
                ></span>
              </span>
            </a>
            <a
              className="pillar-tile is-mid photo-frame"
              href={localizedPath("/booking/?mode=class", locale)}
              data-book="class"
              data-book-soon="#prices"
            >
              <span className="photo-slot">
                {
                  "pillar-class · stand-in, lounge render with people; a class photo is still needed"
                }
              </span>
              <img
                src={withBasePath("/assets/venue/lounge-people-800.jpg")}
                alt=""
                loading="lazy"
                style={{ objectPosition: "62% 50%" } as CSSProperties}
              />
              <span className="scrim scrim-tile" aria-hidden="true"></span>
              <span className="tile-arrow flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></path>
                </svg>
              </span>
              <span className="tile-text scrim">
                <span className="h-tile on-photo" data-str="pillar.class">
                  {t("pillar.class")}
                </span>
                <span
                  className="body-text on-photo"
                  style={
                    {
                      fontSize: "14px",
                      marginBottom: "6px",
                      display: "block",
                    } as CSSProperties
                  }
                  data-str="pillar.class.desc"
                >
                  {t("pillar.class.desc")}
                </span>
                <span
                  className="tile-price price-tbc on-photo"
                  data-price-cat="class"
                ></span>
              </span>
            </a>
            <a
              className="pillar-tile photo-frame"
              href={localizedPath("/booking/?mode=pt", locale)}
              data-book="pt"
              data-book-soon="#jp"
            >
              <span className="photo-slot">
                {"pillar-pt · S&C floor render"}
              </span>
              <img
                src={withBasePath("/assets/venue/sc-floor-800.jpg")}
                alt=""
                loading="lazy"
                style={{ objectPosition: "15% 50%" } as CSSProperties}
              />
              <span className="scrim scrim-tile" aria-hidden="true"></span>
              <span className="tile-arrow flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></path>
                </svg>
              </span>
              <span className="tile-text scrim">
                <span className="h-tile on-photo" data-str="pillar.pt">
                  {t("pillar.pt")}
                </span>
                <span
                  className="body-text on-photo"
                  style={
                    {
                      fontSize: "14px",
                      marginBottom: "6px",
                      display: "block",
                    } as CSSProperties
                  }
                  data-str="pillar.pt.desc"
                >
                  {t("pillar.pt.desc")}
                </span>
                <span
                  className="tile-price price-tbc on-photo"
                  data-price-cat="pt"
                ></span>
              </span>
            </a>
          </div>
        </div>
      </section>
      <section className="section" id="prices">
        <div className="wrap">
          <p className="eyebrow" data-str="prices.eyebrow">
            {t("prices.eyebrow")}
          </p>
          <h2
            className="h-section"
            style={{ marginBottom: "12px" } as CSSProperties}
            data-str="prices.title"
          >
            {t("prices.title")}
          </h2>
          <p className="body-text prices-lead" data-str="prices.lead">
            {t("prices.lead")}
          </p>
          <div className="price-grid">
            <div className="price-card">
              <table className="price-table">
                <thead>
                  <tr>
                    <th scope="col" data-str="prices.colSport">
                      {t("prices.colSport")}
                    </th>
                    <th scope="col" data-str="prices.colPeak">
                      {t("prices.colPeak")}
                    </th>
                    <th scope="col" data-str="prices.colOffpeak">
                      {t("prices.colOffpeak")}
                    </th>
                  </tr>
                </thead>
                <tbody id="rateRows"></tbody>
              </table>
              <p className="price-hours" data-str="prices.courtsNote">
                {t("prices.courtsNote")}
              </p>
              <p className="price-hours" data-str="prices.hours">
                {t("prices.hours")}
              </p>
            </div>
            <div className="price-notes">
              <div className="price-note">
                <h3 className="h-note" data-str="prices.memberTitle">
                  {t("prices.memberTitle")}
                </h3>
                <p className="price-figure" id="memberFee"></p>
                <p className="body-text" data-str="prices.memberBody">
                  {t("prices.memberBody")}
                </p>
              </div>
              <div className="price-note">
                <h3 className="h-note" data-str="prices.classTitle">
                  {t("prices.classTitle")}
                </h3>
                <p className="body-text" data-str="prices.classBody">
                  {t("prices.classBody")}
                </p>
                <span className="tbc" data-str="prices.classTbc">
                  {t("prices.classTbc")}
                </span>
              </div>
              <div className="price-note">
                <h3 className="h-note" data-str="prices.corpTitle">
                  {t("prices.corpTitle")}
                </h3>
                <p className="body-text" data-str="prices.corpBody">
                  {t("prices.corpBody")}
                </p>
              </div>
              <div className="price-actions">
                <a
                  className="btn btn-primary"
                  href={localizedPath("/booking/?mode=venue", locale)}
                  data-book="venue"
                  data-str="cta.book"
                  data-str-soon="find.waBtn"
                >
                  {t(comingSoon ? "find.waBtn" : "cta.book")}
                </a>
                <a
                  className="btn btn-secondary"
                  id="pricePdf"
                  href="#"
                  target="_blank"
                  rel="noopener"
                  hidden={true}
                  data-str="prices.pdf"
                >
                  {t("prices.pdf")}
                </a>
                <span className="tbc" id="pricePdfTbc" data-str="prices.pdfTbc">
                  {t("prices.pdfTbc")}
                </span>
              </div>
              <p className="soon-note soon-only">
                <span data-str="soon.note1">{t("soon.note1")}</span>
                <span data-str="soon.note2">{t("soon.note2")}</span>
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="wrap intro-grid">
          <div className="intro-text">
            <p className="eyebrow" data-str="intro.eyebrow">
              {t("intro.eyebrow")}
            </p>
            <h2 className="h-section" data-str="intro.title">
              {t("intro.title")}
            </h2>
            <p
              className="body-text"
              style={{ marginBottom: "14px" } as CSSProperties}
              data-str="intro.body1"
            >
              {t("intro.body1")}
            </p>
            <p
              className="body-text"
              style={{ marginBottom: "22px" } as CSSProperties}
              data-str="intro.body2"
            >
              {t("intro.body2")}
            </p>
            <a className="text-link" href="#spaces">
              <span data-str="intro.link">{t("intro.link")}</span>
              <svg
                className="arrow"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
              </svg>
            </a>
          </div>
          <div className="intro-photo">
            <div className="photo-rect photo-frame">
              <span className="photo-slot">{"intro · entrance render"}</span>
              <img
                src={withBasePath("/assets/venue/entrance.jpg")}
                alt=""
                loading="lazy"
                className="crop-entrance"
              />
            </div>
          </div>
        </div>
      </section>
      <section className="section" id="spaces">
        <div className="bleed">
          <p className="eyebrow" data-str="spaces.eyebrow">
            {t("spaces.eyebrow")}
          </p>
          <h2
            className="h-section"
            style={{ marginBottom: "24px" } as CSSProperties}
            data-str="spaces.title"
          >
            {t("spaces.title")}
          </h2>
          <div className="spaces-grid">
            <div className="space-tile photo-frame is-wide">
              <span className="photo-slot">
                {"space-volleyball · volleyball set-up render"}
              </span>
              <img
                src={withBasePath("/assets/venue/hall-volleyball-800.jpg")}
                alt=""
                loading="lazy"
                style={{ objectPosition: "50% 40%" } as CSSProperties}
              />
              <span className="scrim scrim-tile" aria-hidden="true"></span>
              <span className="court-dia">
                <VolleyballCourt />
              </span>
              <span className="tile-text scrim">
                <span className="h-tile on-photo" data-str="spaces.volleyball">
                  {t("spaces.volleyball")}
                </span>
              </span>
            </div>
            <div className="space-tile photo-frame">
              <span className="photo-slot">
                {"space-basketball · basketball hoop render"}
              </span>
              <img
                src={withBasePath("/assets/venue/hall-basketball.jpg")}
                alt=""
                loading="lazy"
                className="crop-hoop"
              />
              <span className="scrim scrim-tile" aria-hidden="true"></span>
              <span className="court-dia">
                <BasketballCourt />
              </span>
              <span className="tile-text scrim">
                <span className="h-tile on-photo" data-str="spaces.basketball">
                  {t("spaces.basketball")}
                </span>
              </span>
            </div>
            <div className="space-tile photo-frame">
              <span className="photo-slot">
                {"space-pickleball · low-net render"}
              </span>
              <img
                src={withBasePath("/assets/venue/hall-low-net.jpg")}
                alt=""
                loading="lazy"
                className="crop-net"
              />
              <span className="scrim scrim-tile" aria-hidden="true"></span>
              <span className="court-dia">
                <PickleballCourt />
              </span>
              <span className="tile-text scrim">
                <span className="h-tile on-photo" data-str="spaces.pickleball">
                  {t("spaces.pickleball")}
                </span>
              </span>
            </div>
            <div className="space-tile photo-frame">
              <span className="photo-slot">
                {"space-badminton · court corridor render"}
              </span>
              <img
                src={withBasePath("/assets/venue/hall-corridor-800.jpg")}
                alt=""
                loading="lazy"
                style={{ objectPosition: "30% 50%" } as CSSProperties}
              />
              <span className="scrim scrim-tile" aria-hidden="true"></span>
              <span className="court-dia">
                <BadmintonCourt />
              </span>
              <span className="tile-text scrim">
                <span className="h-tile on-photo" data-str="spaces.badminton">
                  {t("spaces.badminton")}
                </span>
              </span>
            </div>
            <div className="space-tile photo-frame">
              <span className="photo-slot">
                {"space-sc · S&C floor render, sled lane in frame"}
              </span>
              <img
                src={withBasePath("/assets/venue/sc-floor-800.jpg")}
                alt=""
                loading="lazy"
                style={{ objectPosition: "45% 50%" } as CSSProperties}
              />
              <span className="scrim scrim-tile" aria-hidden="true"></span>
              <span className="tile-text scrim">
                <span className="h-tile on-photo" data-str="spaces.sc">
                  {t("spaces.sc")}
                </span>
              </span>
            </div>
            <div className="space-tile photo-frame is-wide">
              <span className="photo-slot">
                {"space-lounge · lounge render, no people"}
              </span>
              <img
                src={withBasePath("/assets/venue/lounge-800.jpg")}
                alt=""
                loading="lazy"
                style={{ objectPosition: "50% 100%" } as CSSProperties}
              />
              <span className="scrim scrim-tile" aria-hidden="true"></span>
              <span className="tile-text scrim">
                <span className="h-tile on-photo" data-str="spaces.lounge">
                  {t("spaces.lounge")}
                </span>
              </span>
            </div>
            <div className="space-tile photo-frame">
              <span className="photo-slot">
                {"space-retail · merch wall and vending render"}
              </span>
              <img
                src={withBasePath("/assets/venue/merch-wall-800.jpg")}
                alt=""
                loading="lazy"
                style={{ objectPosition: "50% 50%" } as CSSProperties}
              />
              <span className="scrim scrim-tile" aria-hidden="true"></span>
              <span className="tile-text scrim">
                <span className="h-tile on-photo" data-str="spaces.retail">
                  {t("spaces.retail")}
                </span>
              </span>
            </div>
            <div className="space-tile is-panel">
              <span className="photo-slot">
                {"space-recovery · no render yet, navy panel tile"}
              </span>
              <span className="tile-text">
                <span className="h-tile" data-str="spaces.recovery">
                  {t("spaces.recovery")}
                </span>
              </span>
            </div>
          </div>
        </div>
      </section>
      <section className="section" id="jp">
        <div className="wrap">
          <div className="jp-panel">
            <div className="jp-grid">
              <div className="jp-text">
                <p className="eyebrow" data-str="jp.eyebrow">
                  {t("jp.eyebrow")}
                </p>
                <h2
                  className="h-section"
                  style={{ fontSize: "34px" } as CSSProperties}
                  data-str="jp.title"
                >
                  {t("jp.title")}
                </h2>
                <p
                  className="body-text"
                  style={{ marginBottom: "20px" } as CSSProperties}
                  data-str="jp.body"
                >
                  {t("jp.body")}
                </p>
                <a
                  className="btn btn-primary"
                  href={localizedPath("/booking/?mode=pt", locale)}
                  data-book="pt"
                  data-str="jp.cta"
                  data-str-soon="find.waBtn"
                >
                  {t(comingSoon ? "find.waBtn" : "jp.cta")}
                </a>
              </div>
              <div className="jp-coaches overflow-x-auto">
                <div className="coach-card">
                  <div className="coach-avatar">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle
                        cx="12"
                        cy="8"
                        r="3.4"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      ></circle>
                      <path
                        d="M5 19c1.2-3.6 4-5.4 7-5.4s5.8 1.8 7 5.4"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      ></path>
                    </svg>
                  </div>
                  <div className="h-coach" data-str="jp.coach1.name">
                    {t("jp.coach1.name")}
                  </div>
                  <span
                    className="tbc"
                    style={
                      {
                        marginBottom: "10px",
                        display: "inline-flex",
                      } as CSSProperties
                    }
                    data-str="jp.tbcBio"
                  >
                    {t("jp.tbcBio")}
                  </span>
                  <div className="chips">
                    <span className="chip" data-str="jp.coach1.chip1">
                      {t("jp.coach1.chip1")}
                    </span>
                    <span className="chip" data-str="jp.coach1.chip2">
                      {t("jp.coach1.chip2")}
                    </span>
                  </div>
                  <div className="coach-size" data-str="jp.groupSize">
                    {t("jp.groupSize")}
                  </div>
                  <div
                    className="coach-price price-tbc"
                    data-price-cat="pt"
                  ></div>
                  <a
                    className="btn btn-primary"
                    href={localizedPath("/booking/?mode=pt", locale)}
                    data-book="pt"
                    data-str="jp.book"
                  >
                    {t("jp.book")}
                  </a>
                </div>
                <div className="coach-card">
                  <div className="coach-avatar">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle
                        cx="12"
                        cy="8"
                        r="3.4"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      ></circle>
                      <path
                        d="M5 19c1.2-3.6 4-5.4 7-5.4s5.8 1.8 7 5.4"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      ></path>
                    </svg>
                  </div>
                  <div className="h-coach" data-str="jp.coach2.name">
                    {t("jp.coach2.name")}
                  </div>
                  <span
                    className="tbc"
                    style={
                      {
                        marginBottom: "10px",
                        display: "inline-flex",
                      } as CSSProperties
                    }
                    data-str="jp.tbcBio"
                  >
                    {t("jp.tbcBio")}
                  </span>
                  <div className="chips">
                    <span className="chip" data-str="jp.coach2.chip1">
                      {t("jp.coach2.chip1")}
                    </span>
                    <span className="chip" data-str="jp.coach2.chip2">
                      {t("jp.coach2.chip2")}
                    </span>
                  </div>
                  <div className="coach-size" data-str="jp.groupSize">
                    {t("jp.groupSize")}
                  </div>
                  <div
                    className="coach-price price-tbc"
                    data-price-cat="pt"
                  ></div>
                  <a
                    className="btn btn-primary"
                    href={localizedPath("/booking/?mode=pt", locale)}
                    data-book="pt"
                    data-str="jp.book"
                  >
                    {t("jp.book")}
                  </a>
                </div>
                <div className="coach-card">
                  <div className="coach-avatar">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle
                        cx="12"
                        cy="8"
                        r="3.4"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      ></circle>
                      <path
                        d="M5 19c1.2-3.6 4-5.4 7-5.4s5.8 1.8 7 5.4"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      ></path>
                    </svg>
                  </div>
                  <div className="h-coach" data-str="jp.coach3.name">
                    {t("jp.coach3.name")}
                  </div>
                  <span
                    className="tbc"
                    style={
                      {
                        marginBottom: "10px",
                        display: "inline-flex",
                      } as CSSProperties
                    }
                    data-str="jp.tbcBio"
                  >
                    {t("jp.tbcBio")}
                  </span>
                  <div className="chips">
                    <span className="chip" data-str="jp.coach3.chip1">
                      {t("jp.coach3.chip1")}
                    </span>
                    <span className="chip" data-str="jp.coach3.chip2">
                      {t("jp.coach3.chip2")}
                    </span>
                  </div>
                  <div className="coach-size" data-str="jp.groupSize">
                    {t("jp.groupSize")}
                  </div>
                  <div
                    className="coach-price price-tbc"
                    data-price-cat="pt"
                  ></div>
                  <a
                    className="btn btn-primary"
                    href={localizedPath("/booking/?mode=pt", locale)}
                    data-book="pt"
                    data-str="jp.book"
                  >
                    {t("jp.book")}
                  </a>
                </div>
              </div>
              <div className="jp-photo photo-rect photo-frame soon-only">
                <span className="photo-slot">
                  {"jp-wide · coming-soon page only, S&C floor render"}
                </span>
                <img
                  src={withBasePath("/assets/venue/sc-floor-800.jpg")}
                  alt=""
                  loading="lazy"
                  style={{ objectPosition: "40% 50%" } as CSSProperties}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="section" id="corporate">
        <div className="wrap">
          <div className="corp-shop-grid">
            <div className="corp-block">
              <div className="photo-rect photo-frame">
                <span className="photo-slot">
                  {
                    "corporate · stand-in, merch wall render with people; an event photo is still needed"
                  }
                </span>
                <img
                  src={withBasePath("/assets/venue/merch-people.jpg")}
                  alt=""
                  loading="lazy"
                  style={{ objectPosition: "44% 50%" } as CSSProperties}
                />
              </div>
              <div>
                <p className="eyebrow" data-str="corp.eyebrow">
                  {t("corp.eyebrow")}
                </p>
                <h2
                  className="h-section"
                  style={
                    { fontSize: "30px", marginBottom: "12px" } as CSSProperties
                  }
                  data-str="corp.title"
                >
                  {t("corp.title")}
                </h2>
                <p
                  className="body-text"
                  style={{ marginBottom: "18px" } as CSSProperties}
                  data-str="corp.body"
                >
                  {t("corp.body")}
                </p>
                <div className="corp-actions flex flex-wrap gap-[10px]">
                  <a
                    className="btn btn-primary"
                    href="#find"
                    data-str="corp.ctaPrimary"
                  >
                    {t("corp.ctaPrimary")}
                  </a>
                  <a
                    className="btn btn-secondary"
                    href="#"
                    id="waCorp"
                    target="_blank"
                    rel="noopener"
                  >
                    <svg
                      className="wa-glyph"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 004.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm0 18.15h-.01a8.2 8.2 0 01-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 01-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 015.83 2.42 8.19 8.19 0 012.41 5.83c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.49-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07s.89 2.4 1.02 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z"
                        fill="#25D366"
                      ></path>
                    </svg>
                    <span data-str="corp.wa">{t("corp.wa")}</span>
                  </a>
                </div>
              </div>
            </div>
            <a className="shop-tile photo-frame" id="shop">
              <span className="photo-slot">
                {"shop-tile · shop kiosk render, lower scrim"}
              </span>
              <img
                src={withBasePath("/assets/venue/shop-kiosk-800.jpg")}
                alt=""
                loading="lazy"
                style={{ objectPosition: "100% 50%" } as CSSProperties}
              />
              <span className="scrim scrim-tile" aria-hidden="true"></span>
              <span className="tile-text scrim">
                <span
                  className="eyebrow on-photo"
                  style={{ marginBottom: "6px" } as CSSProperties}
                  data-str="shop.eyebrow"
                >
                  {t("shop.eyebrow")}
                </span>
                <span
                  className="h-tile on-photo"
                  style={
                    { display: "block", marginBottom: "8px" } as CSSProperties
                  }
                  data-str="shop.title"
                >
                  {t("shop.title")}
                </span>
                <span
                  style={
                    {
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "10px",
                    } as CSSProperties
                  }
                >
                  <span className="text-link on-photo shop-go">
                    <span data-str="shop.link">{t("shop.link")}</span>
                    <svg
                      className="out"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M7 17L17 7M9 7h8v8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      ></path>
                    </svg>
                  </span>
                  <span className="shop-soon on-photo" data-str="shop.soon">
                    {t("shop.soon")}
                  </span>
                  <span className="tbc" data-str="shop.tbcName">
                    {t("shop.tbcName")}
                  </span>
                </span>
              </span>
            </a>
          </div>
        </div>
      </section>
      <section className="section open-only">
        <div className="wrap">
          <div className="book-band">
            <span className="watermark">
              <VolleyballCourt />
            </span>
            <div className="book-band-inner">
              <h2
                className="h-section on-dark"
                style={
                  { fontSize: "34px", marginBottom: "10px" } as CSSProperties
                }
                data-str="band.title"
              >
                {t("band.title")}
              </h2>
              <p className="book-band-sub open-only" data-str="band.sub">
                {t("band.sub")}
              </p>
              <p className="book-band-sub soon-only" data-str="soon.band">
                {t("soon.band")}
              </p>
              <div className="book-band-sports">
                <a
                  className="btn btn-secondary btn-on-dark"
                  href={localizedPath("/booking/?mode=venue&court=vb", locale)}
                  data-book="venue"
                  data-sport="vb"
                  data-str="sport.vb.name"
                >
                  {t("sport.vb.name")}
                </a>
                <a
                  className="btn btn-secondary btn-on-dark"
                  href={localizedPath("/booking/?mode=venue&court=bb", locale)}
                  data-book="venue"
                  data-sport="bb"
                  data-str="sport.bb.name"
                >
                  {t("sport.bb.name")}
                </a>
                <a
                  className="btn btn-secondary btn-on-dark"
                  href={localizedPath("/booking/?mode=venue&court=pb", locale)}
                  data-book="venue"
                  data-sport="pb"
                  data-str="sport.pb.name"
                >
                  {t("sport.pb.name")}
                </a>
                <a
                  className="btn btn-secondary btn-on-dark"
                  href={localizedPath("/booking/?mode=venue&court=fb", locale)}
                  data-book="venue"
                  data-sport="fb"
                  data-str="sport.fb.name"
                >
                  {t("sport.fb.name")}
                </a>
                <a
                  className="btn btn-secondary btn-on-dark"
                  href={localizedPath("/booking/?mode=venue&court=tq", locale)}
                  data-book="venue"
                  data-sport="tq"
                  data-str="sport.tq.name"
                >
                  {t("sport.tq.name")}
                </a>
                <a
                  className="btn btn-secondary btn-on-dark"
                  href={localizedPath("/booking/?mode=venue&court=db", locale)}
                  data-book="venue"
                  data-sport="db"
                  data-str="sport.db.name"
                >
                  {t("sport.db.name")}
                </a>
                <a
                  className="btn btn-secondary btn-on-dark"
                  href={localizedPath("/booking/?mode=venue&court=bd", locale)}
                  data-book="venue"
                  data-sport="bd"
                  data-str="sport.bd.name"
                >
                  {t("sport.bd.name")}
                </a>
              </div>
              <div className="book-band-links">
                <a
                  className="text-link on-dark"
                  href={localizedPath("/booking/?mode=class", locale)}
                  data-book="class"
                >
                  <span data-str="band.classes">{t("band.classes")}</span>
                  <svg
                    className="arrow"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 12h14M13 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></path>
                  </svg>
                </a>
                <a
                  className="text-link on-dark"
                  href={localizedPath("/booking/?mode=pt", locale)}
                  data-book="pt"
                >
                  <span data-str="band.pt">{t("band.pt")}</span>
                  <svg
                    className="arrow"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 12h14M13 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></path>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="section" id="find">
        <div className="wrap">
          <p className="eyebrow" data-str="find.eyebrow">
            {t("find.eyebrow")}
          </p>
          <h2
            className="h-section"
            style={{ marginBottom: "28px" } as CSSProperties}
            data-str="find.title"
          >
            {t("find.title")}
          </h2>
          <div className="find-grid">
            <div className="badge-card">
              <img
                src={withBasePath("/assets/illustration/hk-scene-badge.png")}
                alt={t("find.illustration_alt")}
                loading="lazy"
                width="340"
                height="506"
              />
            </div>
            <div>
              <dl>
                <div className="facts-row">
                  <dt data-str="find.addressLabel">{t("find.addressLabel")}</dt>
                  <dd data-str="find.addressValue">{t("find.addressValue")}</dd>
                </div>
                <div className="facts-row is-tbc">
                  <dt data-str="find.hoursLabel">{t("find.hoursLabel")}</dt>
                  <dd>
                    <span className="tbc" data-str="find.hoursValue">
                      {t("find.hoursValue")}
                    </span>
                  </dd>
                </div>
                <div className="facts-row">
                  <dt data-str="find.transportLabel">
                    {t("find.transportLabel")}
                  </dt>
                  <dd data-str="find.transportValue">
                    {t("find.transportValue")}
                  </dd>
                </div>
                <div className="facts-row">
                  <dt data-str="find.parkingLabel">{t("find.parkingLabel")}</dt>
                  <dd data-str="find.parkingValue">{t("find.parkingValue")}</dd>
                </div>
                <div className="facts-row">
                  <dt data-str="find.waLabel">{t("find.waLabel")}</dt>
                  <dd>
                    <a
                      href="#"
                      id="waFact"
                      target="_blank"
                      rel="noopener"
                      data-str="find.waValue"
                    >
                      {t("find.waValue")}
                    </a>
                  </dd>
                </div>
                <div className="facts-row">
                  <dt data-str="find.emailLabel">{t("find.emailLabel")}</dt>
                  <dd>
                    <a
                      href="mailto:info@asportinghub.com"
                      data-str="find.emailValue"
                    >
                      {t("find.emailValue")}
                    </a>
                  </dd>
                </div>
              </dl>
              <div className="find-actions">
                <a
                  className="btn btn-secondary"
                  href="#"
                  id="waFind"
                  target="_blank"
                  rel="noopener"
                >
                  <svg
                    className="wa-glyph"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 004.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm0 18.15h-.01a8.2 8.2 0 01-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 01-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 015.83 2.42 8.19 8.19 0 012.41 5.83c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.49-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07s.89 2.4 1.02 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z"
                      fill="#25D366"
                    ></path>
                  </svg>
                  <span data-str="find.waBtn">{t("find.waBtn")}</span>
                </a>
                <a
                  className="btn btn-secondary"
                  href="https://maps.app.goo.gl/s2hB7EJsx2cGzE119"
                  target="_blank"
                  rel="noopener"
                >
                  <span data-str="find.directionsBtn">
                    {t("find.directionsBtn")}
                  </span>
                </a>
              </div>
            </div>
          </div>
          <div className="map-tile">
            <iframe
              id="mapFrame"
              data-str-title="find.mapTitle"
              title={t("find.mapTitle")}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen={true}
            ></iframe>
          </div>
        </div>
      </section>
      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-grid">
            <div>
              <a
                className="footer-lockup"
                href={homeHref}
                aria-label={t("nav.home_aria")}
              >
                <BrandLogo />
              </a>
              <p className="footer-blurb" data-str="footer.blurb">
                {t("footer.blurb")}
              </p>
              <div className="footer-lang">
                <LanguageSwitcher
                  locale={locale}
                  pathname={comingSoon ? "/coming-soon/" : "/"}
                  label={t("nav.lang_aria")}
                />
              </div>
            </div>
            <div className="footer-col">
              <h4 data-str="footer.bookCol">{t("footer.bookCol")}</h4>
              <ul>
                <li>
                  <a
                    href={localizedPath("/booking/?mode=venue", locale)}
                    data-book="venue"
                    data-book-soon="#prices"
                    data-str="footer.linkVenue"
                  >
                    {t("footer.linkVenue")}
                  </a>
                </li>
                <li>
                  <a
                    href={localizedPath("/booking/?mode=class", locale)}
                    data-book="class"
                    data-book-soon="#prices"
                    data-str="footer.linkClass"
                  >
                    {t("footer.linkClass")}
                  </a>
                </li>
                <li>
                  <a
                    href={localizedPath("/booking/?mode=pt", locale)}
                    data-book="pt"
                    data-book-soon="#jp"
                    data-str="footer.linkPt"
                  >
                    {t("footer.linkPt")}
                  </a>
                </li>
              </ul>
            </div>
            <div className="footer-col">
              <h4 data-str="footer.venueCol">{t("footer.venueCol")}</h4>
              <ul>
                <li>
                  <a href="#pillars" data-str="footer.linkService">
                    {t("footer.linkService")}
                  </a>
                </li>
                <li>
                  <a href="#jp" data-str="footer.linkTeam">
                    {t("footer.linkTeam")}
                  </a>
                </li>
                <li>
                  <a href="#corporate" data-str="footer.linkCorporate">
                    {t("footer.linkCorporate")}
                  </a>
                </li>
              </ul>
            </div>
            <div className="footer-col">
              <h4 data-str="footer.companyCol">{t("footer.companyCol")}</h4>
              <ul>
                <li>
                  <a href="#shop" data-str="footer.linkShop">
                    {t("footer.linkShop")}
                  </a>
                </li>
                <li>
                  <a href="#find" data-str="footer.linkContact">
                    {t("footer.linkContact")}
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="footer-legal">
            <a
              href={localizedPath("/terms/#terms", locale)}
              data-str="footer.linkTerms"
            >
              {t("footer.linkTerms")}
            </a>
            <a
              href={localizedPath("/terms/#privacy", locale)}
              data-str="footer.linkPrivacy"
            >
              {t("footer.linkPrivacy")}
            </a>
            <a
              href={localizedPath("/terms/#refund", locale)}
              data-str="footer.linkRefund"
            >
              {t("footer.linkRefund")}
            </a>
          </div>
          <div className="footer-bottom">
            <span data-str="footer.bottomName">{t("footer.bottomName")}</span>
            <span id="footer-year">{"2026"}</span>
          </div>
        </div>
      </footer>
      <a
        className="wa-float"
        href="#"
        id="waFloat"
        target="_blank"
        rel="noopener"
        data-str-aria="wa.ariaLabel"
        aria-label={t("wa.ariaLabel")}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 004.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm0 18.15h-.01a8.2 8.2 0 01-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 01-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 015.83 2.42 8.19 8.19 0 012.41 5.83c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.49-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07s.89 2.4 1.02 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z"></path>
        </svg>
      </a>
      <div className="tweaks-panel">
        <div className="tweaks-title" data-str="tweaks.title">
          {t("tweaks.title")}
        </div>
        <div className="tweaks-row">
          <div className="tweaks-label" data-str="tweaks.viewLabel">
            {t("tweaks.viewLabel")}
          </div>
          <div className="tweaks-btns" data-tweak="view">
            <button
              type="button"
              data-value="dev"
              aria-pressed="true"
              data-str="tweaks.viewDev"
            >
              {t("tweaks.viewDev")}
            </button>
            <button
              type="button"
              data-value="client"
              aria-pressed="false"
              data-str="tweaks.viewClient"
            >
              {t("tweaks.viewClient")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
