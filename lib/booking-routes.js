import { localizedPath } from "./paths";

export const BOOKING_STEPS = [
  "group",
  "classes",
  "time",
  "details",
  "payment",
  "confirmation",
];
const screenSteps = {
  s5b: "group",
  s3: "classes",
  s2: "time",
  s6: "details",
  s7: "payment",
  s8: "confirmation",
};

export function bookingPath(screen, locale) {
  const step = screenSteps[screen];
  return localizedPath(step ? `/booking/${step}/` : "/booking/", locale);
}

export function bookingScreen(pathname, flow) {
  const step = pathname.replace(/\/$/, "").split("/").at(-1);
  return flow.find((screen) => screenSteps[screen] === step) || flow[0];
}

export function bookingDateIndex(date, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return null;
  const value = new Date(`${date}T00:00:00Z`);
  if (
    !Number.isFinite(value.getTime()) ||
    value.toISOString().slice(0, 10) !== date
  )
    return null;
  const day = (value.getTime() - Date.parse(`${today}T00:00:00Z`)) / 86400000;
  return Number.isInteger(day) && day >= 0 && day < 10 ? day : null;
}
