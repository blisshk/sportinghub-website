import { requestVenueData, venueMapping } from "./venue-api";

const value = process.env.NEXT_PUBLIC_PT_CATEGORY_ID;
const categoryId = value?.trim() ? Number(value) : null;
if (categoryId !== null && (!Number.isSafeInteger(categoryId) || categoryId < 1))
  throw new Error("NEXT_PUBLIC_PT_CATEGORY_ID must be a positive safe integer or empty");

const branchValue = process.env.NEXT_PUBLIC_PT_BRANCH_ID;
const branchId = branchValue?.trim() ? Number(branchValue) : null;
if (branchId !== null && (!Number.isSafeInteger(branchId) || branchId < 1))
  throw new Error("NEXT_PUBLIC_PT_BRANCH_ID must be a positive safe integer or empty");

export const personalTrainingMapping = { categoryId, branchId };
const apiUrl = (process.env.NEXT_PUBLIC_BOOKING_API_URL || "").replace(/\/$/, "");
const redirectTemplate = process.env.NEXT_PUBLIC_KPAY_REDIRECT_URL || "";

export function personalTrainingRedirectUrl(locale, defaultUrl) {
  const value = redirectTemplate.trim() ? redirectTemplate.replace(/\{locale\}/g, locale === 'zh-HK' ? 'zh-HK' : 'en') : defaultUrl;
  const url = new URL(validateReservationCheckoutUrl(value));
  if (url.hash) throw new Error('Invalid reservation return URL');
  return url.href;
}

export function validateReservationCheckoutUrl(value) {
  if (typeof value !== "string") throw new Error("Invalid reservation checkout URL");
  const url = new URL(value);
  const apiOrigin = apiUrl ? new URL(apiUrl).origin : "";
  if (url.username || url.password || !(url.protocol === "https:" || (url.protocol === "http:" && (url.origin === apiOrigin || ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))))
    throw new Error("Invalid reservation checkout URL");
  return url.href;
}

export async function submitPersonalTrainingReservation(tenantCode, locale, body, signal) {
  if (!apiUrl || typeof tenantCode !== "string" || !tenantCode.trim()) throw new Error("Reservation API is not configured");
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 30000);
  try {
    const query = new URLSearchParams({ tenant: tenantCode, locale });
    const response = await fetch(`${apiUrl}/reservation/v4?${query}`, { method: "POST", credentials: "omit", signal: controller.signal,
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = new Error(`Reservation API returned ${response.status}`);
      error.status = response.status;
      try { error.code = (await response.json()).code; } catch {}
      throw error;
    }
    const text = await response.text();
    let checkoutUrl = text;
    try { checkoutUrl = JSON.parse(text); } catch {}
    return validateReservationCheckoutUrl(checkoutUrl);
  } finally {
    clearTimeout(timeout); signal?.removeEventListener("abort", abort);
  }
}

export async function readPersonalTrainingReservation(code, token, signal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 15000);
  try {
    const query = new URLSearchParams({ tenantId: String(venueMapping.tenantId), code });
    const response = await fetch(`${apiUrl}/reservation/v4/checkout-status?${query}`, {
      credentials: 'omit', cache: 'no-store', signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Reservation status returned ${response.status}`);
    const record = await response.json();
    if (record?.reference !== code || record.currency !== 'HKD' || !['Paid', 'Pending', 'Expired', 'Cancelled'].includes(record.status) ||
      ![record.totalCents, record.receivedCents, record.dueCents].every(value => Number.isSafeInteger(value) && value >= 0) ||
      record.totalCents !== record.receivedCents + record.dueCents || (record.status === 'Paid' && record.dueCents !== 0) ||
      !Number.isFinite(Date.parse(record.startTime)) || !(Date.parse(record.endTime) > Date.parse(record.startTime)) ||
      typeof record.service?.name !== 'string' || typeof record.branch?.name !== 'string') throw new Error('Invalid reservation status');
    return record;
  } finally {
    clearTimeout(timeout); signal?.removeEventListener('abort', abort);
  }
}

export function parsePersonalTrainingName(value) {
  const match = String(value || "").trim().match(
    /^(?:個人訓練|Personal\s+Training)\s*[:：]\s*(.+?)(?:\s+([1-9]\d*)\s+on\s+([1-9]\d*))?$/i,
  );
  return match ? { name: match[1].trim(), ratio: match[2] ? `${match[2]} on ${match[3]}` : null } : null;
}

export function groupPersonalTrainingServices(services, locale) {
  const groups = new Map();
  for (const service of services) {
    const parsed = parsePersonalTrainingName(service.name) || parsePersonalTrainingName(service.nameZh);
    if (!parsed) continue;
    const translated = locale === "zh-HK" ? parsePersonalTrainingName(service.nameZh) : null;
    if (!groups.has(parsed.name)) groups.set(parsed.name, {
      id: parsed.name,
      name: translated?.name || parsed.name,
      serviceMinutes: service.serviceMinutes,
      api: true,
      services: [],
    });
    groups.get(parsed.name).services.push({
      id: String(service.id),
      ratio: parsed.ratio,
      serviceMinutes: service.serviceMinutes,
      priceCents: service.priceCents,
    });
  }
  return [...groups.values()];
}

export async function readPersonalTrainingServices(signal) {
  if (!categoryId) return [];
  const services = await requestVenueData("services", {
    scope: "catalog",
    params: { categoryId: String(categoryId) },
    signal,
  });
  if (!Array.isArray(services) || services.some((service) =>
    !Number.isSafeInteger(service?.id) || service.id < 1 ||
    service.categoryId !== categoryId || typeof service.name !== "string" ||
    !(service.priceCents === null || (Number.isSafeInteger(service.priceCents) && service.priceCents >= 0)) ||
    !Number.isSafeInteger(service.serviceMinutes) || service.serviceMinutes < 1,
  )) throw new Error("Invalid personal training service catalog");
  return services;
}

export async function readPersonalTrainingBranches(serviceId, signal) {
  const branches = await requestVenueData("branches", { scope: "catalog", params: { categoryId: String(categoryId), serviceId: String(serviceId) }, signal });
  if (!Array.isArray(branches) || branches.some((branch) => !Number.isSafeInteger(branch?.id) || branch.id < 1 || typeof branch.name !== "string"))
    throw new Error("Invalid reservation branches");
  return branches;
}

export async function readPersonalTrainingAvailability(serviceId, branchId, date, signal, time) {
  const result = await requestVenueData("availability", { scope: "catalog", params: { categoryId: String(categoryId), serviceId: String(serviceId), branchId: String(branchId), date, ...(time ? { time } : {}) }, signal });
  if (result?.serviceId !== Number(serviceId) || result.branchId !== branchId || result.date !== date ||
    !Number.isSafeInteger(result.serviceMinutes) || result.serviceMinutes < 1 ||
    !(result.priceCents === null || (Number.isSafeInteger(result.priceCents) && result.priceCents >= 0)) ||
    !Array.isArray(result.slots) || new Set(result.slots.map((slot) => slot.time)).size !== result.slots.length ||
    result.slots.some((slot) => !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(slot.time) || typeof slot.available !== "boolean" ||
      Date.parse(slot.startTime) !== Date.parse(`${date}T${slot.time}:00+08:00`) ||
      Date.parse(slot.endTime) - Date.parse(slot.startTime) !== result.serviceMinutes * 60000))
    throw new Error("Invalid reservation availability");
  return result;
}
