function readId(value, name, fallback = null) {
  if (!value?.trim()) return fallback;
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error(`${name} must be a positive safe integer or empty`);
  }
  return id;
}

// Keep direct process.env references so Next.js can inline them in the browser.
const mapping = {
  tenantId: readId(process.env.NEXT_PUBLIC_BOOKING_TENANT_ID, "NEXT_PUBLIC_BOOKING_TENANT_ID", 3),
  courts: {
    vb: {
      A: { serviceId: readId(process.env.NEXT_PUBLIC_VENUE_VB_A_SERVICE_ID, "NEXT_PUBLIC_VENUE_VB_A_SERVICE_ID") },
      B: { serviceId: readId(process.env.NEXT_PUBLIC_VENUE_VB_B_SERVICE_ID, "NEXT_PUBLIC_VENUE_VB_B_SERVICE_ID") },
    },
    bb: { default: { serviceId: readId(process.env.NEXT_PUBLIC_VENUE_BB_SERVICE_ID, "NEXT_PUBLIC_VENUE_BB_SERVICE_ID") } },
    pb: { default: { serviceId: readId(process.env.NEXT_PUBLIC_VENUE_PB_SERVICE_ID, "NEXT_PUBLIC_VENUE_PB_SERVICE_ID") } },
    bd: { default: { serviceId: readId(process.env.NEXT_PUBLIC_VENUE_BD_SERVICE_ID, "NEXT_PUBLIC_VENUE_BD_SERVICE_ID") } },
    fb: {
      A: { serviceId: readId(process.env.NEXT_PUBLIC_VENUE_FB_A_SERVICE_ID, "NEXT_PUBLIC_VENUE_FB_A_SERVICE_ID") },
      B: { serviceId: readId(process.env.NEXT_PUBLIC_VENUE_FB_B_SERVICE_ID, "NEXT_PUBLIC_VENUE_FB_B_SERVICE_ID") },
    },
    db: { default: { serviceId: readId(process.env.NEXT_PUBLIC_VENUE_DB_SERVICE_ID, "NEXT_PUBLIC_VENUE_DB_SERVICE_ID") } },
    tq: { default: { serviceId: readId(process.env.NEXT_PUBLIC_VENUE_TQ_SERVICE_ID, "NEXT_PUBLIC_VENUE_TQ_SERVICE_ID") } },
  },
};

export default mapping;
