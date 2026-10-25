import { requestVenueData } from "./venue-api";

export const escapeBookingText = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function checkoutToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) => n.toString(16).padStart(2, "0")).join("");
}

export function hongKongDate(value) {
  return new Date(new Date(new Date(value).getTime() + 8 * 3600000).toISOString().slice(0, -1));
}

export function checkoutTimes(record) {
  const start = new Date(record.startTime).getTime();
  return Array.from({ length: (new Date(record.endTime).getTime() - start) / 3600000 }, (_, i) => {
    const hour = new Date(start + (8 + i) * 3600000).getUTCHours();
    return `${String(hour).padStart(2, "0")}:00`;
  });
}

export function validateCheckout(record) {
  if (record?.pricingMode === "course" && (!Array.isArray(record.lessons) || !record.lessons.length || record.lessonCount !== record.lessons.length ||
    record.lessons.some(lesson => !Number.isSafeInteger(lesson.id) || lesson.course?.id !== record.course?.id || !Number.isFinite(Date.parse(lesson.startTime)) || !(Date.parse(lesson.endTime) > Date.parse(lesson.startTime)))))
    throw new Error("Invalid course booking response");
  if (!record || typeof record.id !== "string" || !/^[^\u0000-\u001f\u007f]{1,191}$/.test(record.id) ||
    !["Pending", "Confirmed", "Paid", "Expired", "Cancelled"].includes(record.status) || record.currency !== "HKD" ||
    !Number.isSafeInteger(record.totalCents) || record.totalCents < 0 || typeof record.reference !== "string" ||
    !(record.lesson ? Number.isSafeInteger(record.lesson.id) && Number.isSafeInteger(record.course?.id) : Number.isSafeInteger(record.service?.id)) || !Number.isSafeInteger(record.room?.id) ||
    !Number.isFinite(Date.parse(record.startTime)) || !Number.isFinite(Date.parse(record.endTime)) ||
    !(record.lesson ? Date.parse(record.endTime) > Date.parse(record.startTime) : [3600000, 7200000].includes(Date.parse(record.endTime) - Date.parse(record.startTime))))
    throw new Error("Invalid booking response");
  return record;
}

export async function loadCheckout(id, token, signal, scope = "place") {
  try {
    return validateCheckout(await requestVenueData(id ? `checkouts/${encodeURIComponent(id)}` : "checkout-session", { token, signal, scope }));
  } catch (error) {
    // Restore an older checkout URL through its private session when its
    // canonical identifier has changed to the existing invoice reference.
    if (!id || error?.status !== 404) throw error;
    return validateCheckout(await requestVenueData("checkout-session", { token, signal, scope }));
  }
}

export async function createCheckout(body, signal, scope = "place") {
  return validateCheckout(await requestVenueData("checkouts", { method: "POST", body, signal, scope }));
}

export async function cancelCheckout(id, token, signal, scope = "place") {
  return validateCheckout(await requestVenueData(`checkouts/${encodeURIComponent(id)}/cancel`, { method: "POST", token, signal, scope }));
}

export async function payCheckout(id, token, signal, scope = "place") {
  const response = await requestVenueData(`checkouts/${encodeURIComponent(id)}/payment`, { method: "POST", token, signal, scope });
  validateCheckout(response.checkout);
  if (response.checkoutUrl && new URL(response.checkoutUrl).protocol !== "https:") throw new Error("Invalid payment redirect");
  return response;
}
