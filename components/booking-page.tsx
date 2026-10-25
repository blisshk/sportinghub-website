import type { CSSProperties } from "react";
import type { Locale } from "@/i18n/config";
import { createSiteTranslator } from "@/i18n/translate";
import { LanguageSwitcher } from "@/components/language-switcher";
import { localizedPath } from "@/lib/paths";
import { SiteRuntime } from "@/components/site-runtime";
import { BrandLogo } from "@/components/illustrations";

export function BookingPage({ locale }: { locale: Locale }) {
  const t = createSiteTranslator(locale);
  return (
    <div className="bk-body has-bar">
      <SiteRuntime page="booking" locale={locale} />

      <header className="bk-head">
        <div className="wrap in">
          <button className="backbtn" id="back" type="button">
            {"← "}
            <span data-str="bk.back">{t("bk.back")}</span>
          </button>
          <a
            className="nav-lockup"
            href={localizedPath("/", locale)}
            aria-label={t("nav.home_aria")}
          >
            <BrandLogo />
          </a>
          <div className="right">
            <LanguageSwitcher
              locale={locale}
              pathname="/booking/"
              label={t("nav.lang_aria")}
            />
          </div>
        </div>
      </header>
      <div className="rail">
        <ol id="rail"></ol>
      </div>
      <div className="bk">
        <div className="wrap in">
          <div>
            <section className="screen" id="s1">
              <h1 data-str="bk.s1_h">{t("bk.s1_h")}</h1>
              <p className="sub" data-str="bk.s1_sub">
                {t("bk.s1_sub")}
              </p>
              <div className="cr">
                <b data-str="bk.cr_l">{t("bk.cr_l")}</b>
                <span data-str="bk.cr_qty">{t("bk.cr_qty")}</span>
              </div>
              <div className="opts" id="courtList"></div>
              <p
                className="meta"
                id="venueStatus"
                role="status"
                aria-live="polite"
              ></p>
              <button type="button" id="venueRetry" hidden>
                {t("bk.venue_retry")}
              </button>
            </section>
            <section className="screen" id="s1c">
              <h1 data-str="bk.s1c_h">{t("bk.s1c_h")}</h1>
              <p className="sub" data-str="bk.s1c_sub">
                {t("bk.s1c_sub")}
              </p>
              <div className="cr">
                <b data-str="bk.cr_l">{t("bk.cr_l")}</b>
                <span data-str="bk.cr_cat">{t("bk.cr_cat")}</span>
              </div>
              <div className="opts" id="catList"></div>
              <p className="meta" id="categoryStatus" role="status" aria-live="polite"></p>
              <button type="button" id="categoryRetry" hidden>{t("bk.venue_retry")}</button>
            </section>
            <section className="screen" id="s5">
              <h1 data-str="bk.s5_h">{t("bk.s5_h")}</h1>
              <p className="sub" data-str="bk.s5_sub">
                {t("bk.s5_sub")}
              </p>
              <div className="cr">
                <b data-str="bk.cr_l">{t("bk.cr_l")}</b>
                <span data-str="bk.cr_coach">{t("bk.cr_coach")}</span>
              </div>
              <div
                className="chips"
                id="coachFilters"
                role="group"
                data-str-aria="bk.filter_aria"
                aria-label={t("bk.filter_aria")}
              ></div>
              <div className="opts" id="coachList"></div>
            </section>
            <section className="screen" id="s5b">
              <h1 data-str="bk.s5b_h">{t("bk.s5b_h")}</h1>
              <p className="sub" data-str="bk.s5b_sub">
                {t("bk.s5b_sub")}
              </p>
              <div className="opts two" id="sizeList"></div>
            </section>
            <section className="screen" id="s3">
              <h1 data-str="bk.s3_h">{t("bk.s3_h")}</h1>
              <p className="sub" id="s3sub"></p>
              <div className="chips" id="classChips"></div>
              <div className="chips chips-sport" id="sportChips"></div>
              <div id="dowWrap" hidden={true}>
                <p className="pick-h" data-str="bk.s3_day_h">
                  {t("bk.s3_day_h")}
                </p>
                <div className="chips" id="dow"></div>
              </div>
              <div id="dates3wrap">
                <div className="dates" id="dates3"></div>
              </div>
              <div className="opts" id="classList"></div>
              <section className="course-schedule" id="courseSchedule" hidden aria-live="polite"></section>
              <p className="meta" id="classStatus" role="status" aria-live="polite"></p>
              <button type="button" id="classRetry" hidden>{t("bk.venue_retry")}</button>
            </section>
            <section className="screen" id="s2">
              <h1 data-str="bk.s2_h">{t("bk.s2_h")}</h1>
              <p className="sub" id="s2sub"></p>
              <div className="dates" id="dates2"></div>
              <div className="slotgrid" id="slots"></div>
              <p
                className="meta"
                id="slotStatus"
                role="status"
                aria-live="polite"
              ></p>
              <button type="button" id="slotRetry" hidden>
                {t("bk.venue_retry")}
              </button>
              <p className="meta" id="quoteStatus" role="status" aria-live="polite"></p>
              <p
                className="meta"
                style={{ marginTop: "14px" } as CSSProperties}
                id="s2note"
                data-str="bk.s2_note"
              >
                {t("bk.s2_note")}
              </p>
              <p
                className="meta"
                style={{ marginTop: "6px" } as CSSProperties}
                id="s2rates"
                hidden={true}
              ></p>
            </section>
            <section className="screen" id="s6">
              <h1 data-str="bk.s6_h">{t("bk.s6_h")}</h1>
              <p className="sub" data-str="bk.s6_sub">
                {t("bk.s6_sub")}
              </p>
              <div className="cr" id="crEva" hidden={true}>
                <b data-str="bk.cr_l">{t("bk.cr_l")}</b>
                <span data-str="bk.cr_eva">{t("bk.cr_eva")}</span>
              </div>
              <div className="form">
                <div className="row2">
                  <div>
                    <label
                      className="fl"
                      htmlFor="fFirst"
                      data-str="bk.f_first"
                    >
                      {t("bk.f_first")}
                    </label>
                    <input type="text" id="fFirst" autoComplete="given-name" />
                  </div>
                  <div>
                    <label className="fl" htmlFor="fLast" data-str="bk.f_last">
                      {t("bk.f_last")}
                    </label>
                    <input type="text" id="fLast" autoComplete="family-name" />
                  </div>
                </div>
                <div>
                  <label className="fl" htmlFor="fHkid" data-str="bk.f_hkid">
                    {t("bk.f_hkid")}
                  </label>
                  <input
                    type="text"
                    id="fHkid"
                    maxLength={4}
                    data-str-ph="bk.f_hkid_ph"
                    placeholder={t("bk.f_hkid_ph")}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="fl" htmlFor="fEmail" data-str="bk.f_email">
                    {t("bk.f_email")}
                  </label>
                  <input
                    type="email"
                    id="fEmail"
                    placeholder="you@email.com"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="fl" htmlFor="fPhone" data-str="bk.f_phone">
                    {t("bk.f_phone")}
                  </label>
                  <input
                    type="tel"
                    id="fPhone"
                    placeholder="(852) 0000 0000"
                    autoComplete="tel"
                  />
                </div>
                <div id="s6extra" hidden={true}>
                  <div className="row2">
                    <div>
                      <label className="fl" htmlFor="fDob" data-str="bk.f_dob">
                        {t("bk.f_dob")}
                      </label>
                      <input type="date" id="fDob" autoComplete="bday" />
                    </div>
                    <div>
                      <label
                        className="fl"
                        htmlFor="fGender"
                        data-str="bk.f_gender"
                      >
                        {t("bk.f_gender")}
                      </label>
                      <select id="fGender">
                        <option value="" data-str="bk.f_select">
                          {t("bk.f_select")}
                        </option>
                        <option value="f" data-str="bk.g_female">
                          {t("bk.g_female")}
                        </option>
                        <option value="m" data-str="bk.g_male">
                          {t("bk.g_male")}
                        </option>
                        <option value="x" data-str="bk.g_other">
                          {t("bk.g_other")}
                        </option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="fl" htmlFor="fHear" data-str="bk.f_hear">
                      {t("bk.f_hear")}
                    </label>
                    <select id="fHear">
                      <option value="" data-str="bk.f_select">
                        {t("bk.f_select")}
                      </option>
                      <option value="friend" data-str="bk.h_friend">
                        {t("bk.h_friend")}
                      </option>
                      <option value="social" data-str="bk.h_social">
                        {t("bk.h_social")}
                      </option>
                      <option value="search" data-str="bk.h_search">
                        {t("bk.h_search")}
                      </option>
                      <option value="walk" data-str="bk.h_walk">
                        {t("bk.h_walk")}
                      </option>
                      <option value="other" data-str="bk.h_other">
                        {t("bk.h_other")}
                      </option>
                    </select>
                  </div>
                </div>
                <div id="fNotesRow" hidden={true}>
                  <label className="fl" htmlFor="fNotes" data-str="bk.f_notes">
                    {t("bk.f_notes")}
                  </label>
                  <textarea
                    id="fNotes"
                    data-str-ph="bk.f_notes_ph"
                    placeholder={t("bk.f_notes_ph")}
                  ></textarea>
                </div>
                <label className="check">
                  <input type="checkbox" id="cWaiver" />
                  <span id="waiverText"></span>
                </label>
                <label className="check">
                  <input type="checkbox" id="cMkt" />
                  <span data-str="bk.c_mkt">{t("bk.c_mkt")}</span>
                </label>
                <p className="warn" id="fWarn" data-str="bk.s6_warn">
                  {t("bk.s6_warn")}
                </p>
                <p className="meta" id="detailsStatus" role="status" aria-live="polite"></p>
              </div>
            </section>
            <section className="screen" id="s7">
              <h1 data-str="bk.s7_h">{t("bk.s7_h")}</h1>
              <p className="sub" data-str="bk.s7_sub">
                {t("bk.s7_sub")}
              </p>
              <div id="s7lines"></div>
              <p className="meta" id="paymentStatus" role="status" aria-live="polite"></p>
              <button type="button" id="paymentRefresh" hidden>{t("bk.payment_check")}</button>
              <button type="button" id="paymentNext" className="btn btn-primary payment-action">
                {t("bk.booking_confirm_button")}
              </button>
              <div
                className="cr"
                style={{ marginTop: "18px" } as CSSProperties}
              >
                <b data-str="bk.cr_l">{t("bk.cr_l")}</b>
                <span data-str="bk.cr_pay">{t("bk.cr_pay")}</span>
              </div>
              <div className="cr">
                <b data-str="bk.cr_l">{t("bk.cr_l")}</b>
                <span data-str="bk.cr_split">{t("bk.cr_split")}</span>
              </div>
            </section>
            <section className="screen" id="s8">
              <div className="done-mark">
                <svg viewBox="0 0 24 24">
                  <path
                    d="M4 12.5 L9.5 18 L20 6.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></path>
                </svg>
              </div>
              <h1 data-str="bk.s8_h">{t("bk.s8_h")}</h1>
              <p className="sub" data-str="bk.s8_sub">
                {t("bk.s8_sub")}
              </p>
              <div className="recap" id="recap"></div>
              <div className="cr" id="crQr" hidden={true}>
                <b data-str="bk.cr_l">{t("bk.cr_l")}</b>
                <span data-str="bk.cr_qr">{t("bk.cr_qr")}</span>
              </div>
              <div className="cal-row flex flex-wrap items-center">
                <a
                  className="btn btn-ghost"
                  id="gcal"
                  href="#"
                  target="_blank"
                  rel="noopener"
                  data-str="bk.s8_gcal"
                >
                  {t("bk.s8_gcal")}
                </a>
                <a
                  className="callink"
                  id="ics"
                  href="#"
                  download="sporting-hub-booking.ics"
                  data-str="bk.s8_ics"
                >
                  {t("bk.s8_ics")}
                </a>
              </div>
              <div className="cr">
                <b data-str="bk.cr_l">{t("bk.cr_l")}</b>
                <span data-str="bk.cr_cal">{t("bk.cr_cal")}</span>
              </div>
              <div
                style={
                  {
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                  } as CSSProperties
                }
              >
                <a
                  className="btn btn-primary"
                  href={localizedPath("/", locale)}
                  data-str="bk.s8_home"
                >
                  {t("bk.s8_home")}
                </a>
                <a
                  className="btn btn-ghost"
                  href={localizedPath("/booking/", locale)}
                  data-str="bk.s8_again"
                >
                  {t("bk.s8_again")}
                </a>
              </div>
            </section>
          </div>
          <aside className="summary" id="summary" hidden={true}>
            <h3 data-str="bk.sum_h">{t("bk.sum_h")}</h3>
            <p className="venue">{t("brand.name")}</p>
            <div id="sumLines"></div>
            <div className="total">
              <span data-str="bk.sum_total">{t("bk.sum_total")}</span>
              <span id="sumTotal" className="price-tbc">
                {t("price.pending")}
              </span>
            </div>
            <button
              className="btn btn-primary"
              id="sumNext"
              data-str="bk.next"
              type="button"
            >
              {t("bk.next")}
            </button>
            <p className="policy">
              <span data-str="bk.policy">{t("bk.policy")}</span>
              <a
                href={localizedPath("/terms/#refund", locale)}
                target="_blank"
                rel="noopener"
                data-str="bk.policy_link"
              >
                {t("bk.policy_link")}
              </a>
            </p>
          </aside>
        </div>
      </div>
      <div className="bar" id="bar">
        <div className="amt">
          <div className="l" data-str="bk.sum_total">
            {t("bk.sum_total")}
          </div>
          <div className="v price-tbc" id="barTotal">
            {t("price.pending")}
            <span id="barQty"></span>
          </div>
        </div>
        <button
          className="btn btn-primary"
          id="barNext"
          data-str="bk.next"
          type="button"
        >
          {t("bk.next")}
        </button>
      </div>
      <a
        className="wa-float"
        id="waFloat"
        href="#"
        target="_blank"
        rel="noopener"
        data-str-aria="bk.wa_aria"
        aria-label={t("bk.wa_aria")}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 004.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm0 18.15h-.01a8.2 8.2 0 01-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 01-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 015.83 2.42 8.19 8.19 0 012.41 5.83c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.49-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07s.89 2.4 1.02 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z"></path>
        </svg>
      </a>
    </div>
  );
}
