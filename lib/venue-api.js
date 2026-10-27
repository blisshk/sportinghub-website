import mapping from "./venue-mapping.js";

export const venueMapping = mapping;
const apiUrl = (process.env.NEXT_PUBLIC_BOOKING_API_URL ?? "").replace(
  /\/$/,
  "",
);

export async function readVenueData(resource, params, signal) {
  return requestVenueData(resource, { params, signal });
}

export async function requestVenueData(resource, { params = {}, signal, method = "GET", body, token, scope = "place" } = {}) {
  if (!apiUrl) throw new Error("Booking API URL is not configured");
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 15000);
  try {
    const query = new URLSearchParams({
      tenantId: String(mapping.tenantId),
      ...params,
    });
    const response = await fetch(
      `${apiUrl}/public/${scope}/${resource}?${query}`,
      {
        method,
        signal: controller.signal,
        cache: "no-store",
        credentials: "omit",
        headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
    if (!response.ok) {
      const error = new Error(`Booking API returned ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export function mappedVenueRows(court, services) {
  return Object.entries(mapping.courts[court] ?? {}).flatMap(
    ([variant, link]) => {
      if (
        !Number.isSafeInteger(link.serviceId) ||
        link.serviceId < 1
      )
        return [];
      const service = services.find((s) => s.id === link.serviceId);
      const rooms = service?.placeRooms || [];
      const settings = service?.placeSettings;
      if (
        !rooms.length ||
        !settings ||
        settings.enabled === false ||
        !Number.isSafeInteger(settings.nonPeakHourlyRateCents) ||
        !Number.isSafeInteger(settings.peakHourlyRateCents) ||
        settings.nonPeakHourlyRateCents < 0 ||
        settings.peakHourlyRateCents < 0
      )
        return [];
      return [
        {
          court: variant === "default" ? null : variant,
          serviceId: service.id,
          service,
          rooms,
          off: settings.nonPeakHourlyRateCents / 100,
          peak: settings.peakHourlyRateCents / 100,
        },
      ];
    },
  );
}
