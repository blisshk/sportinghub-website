"use client";

import { useEffect } from "react";
import { initializeSite } from "../lib/site-runtime";
import type { Locale } from "../i18n/config";

export type SitePage = "home" | "coming-soon" | "booking" | "terms";

/** Own the document-level state that cannot live on the page's content wrapper. */
export function SiteRuntime({
  page,
  locale,
}: {
  page: SitePage;
  locale: Locale;
}) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousBodyClass = body.className;
    const previousOverflow = body.style.overflow;
    const attributes = ["lang", "data-booking", "data-view"] as const;
    const previousAttributes = attributes.map(
      (name) => [name, html.getAttribute(name)] as const,
    );
    const previousClean = html.classList.contains("clean");
    const previousNavScrolled = html.classList.contains("nav-scrolled");

    body.classList.remove(
      "page-home",
      "page-terms",
      "bk-body",
      "has-bar",
      "qr-on",
      "in-checkout",
    );
    if (page === "booking") body.classList.add("bk-body", "has-bar");
    else body.classList.add(page === "terms" ? "page-terms" : "page-home");
    body.style.overflow = "";
    html.setAttribute("data-booking", page === "coming-soon" ? "soon" : "open");
    html.classList.remove("clean", "nav-scrolled");

    const dispose = initializeSite(page, locale);

    return () => {
      dispose();
      body.className = previousBodyClass;
      body.style.overflow = previousOverflow;
      previousAttributes.forEach(([name, value]) => {
        if (value === null) html.removeAttribute(name);
        else html.setAttribute(name, value);
      });
      html.classList.toggle("clean", previousClean);
      html.classList.toggle("nav-scrolled", previousNavScrolled);
    };
  }, [page, locale]);

  return null;
}
