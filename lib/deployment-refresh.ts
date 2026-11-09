type SiteVersion = { id: string; builtAt: number };

const reloadKey = "sportinghub:last-deployment-refresh";
const reloadCooldown = 5 * 60_000;

export function startDeploymentRefresh(
  current: SiteVersion,
  reload = () => window.location.reload(),
) {
  let disposed = false;
  let checking = false;
  let reloading = false;
  let request: AbortController | undefined;

  function canRefresh() {
    // Booking selections, contact details and payment requests must survive.
    // Check again once the visitor leaves the booking flow.
    return !disposed && !reloading &&
      document.visibilityState === "visible" &&
      !/\/booking(?:\/|\.html|$)/.test(window.location.pathname) &&
      !document.activeElement?.matches("input, textarea, select, [contenteditable]");
  }

  async function check() {
    if (checking || !canRefresh() || !current.id || !Number.isFinite(current.builtAt)) return;

    checking = true;
    request = new AbortController();
    const timeout = window.setTimeout(() => request?.abort(), 10_000);
    try {
      const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
      const response = await fetch(`${basePath}/version.json?t=${Date.now()}`, {
        cache: "no-store",
        signal: request.signal,
      });
      if (!response.ok) return;
      const latest: unknown = await response.json();
      if (
        !canRefresh() || typeof latest !== "object" || latest === null ||
        !("id" in latest) || typeof latest.id !== "string" || !latest.id ||
        !("builtAt" in latest) || typeof latest.builtAt !== "number" ||
        !Number.isFinite(latest.builtAt) || latest.builtAt <= current.builtAt ||
        latest.id === current.id
      ) return;

      // Persist the guard across reloads in case a CDN serves an old page or
      // a rolling deployment temporarily routes to multiple builds.
      try {
        const lastReload = Number(window.sessionStorage.getItem(reloadKey));
        if (lastReload && Date.now() - lastReload < reloadCooldown) return;
        window.sessionStorage.setItem(reloadKey, String(Date.now()));
      } catch {
        // Without persistent storage we cannot safely prevent reload loops.
        return;
      }
      reloading = true;
      reload(); // Retains the current path, query parameters and fragment.
    } catch {
      // Offline, timed out, or deploying: retry on the next check.
    } finally {
      window.clearTimeout(timeout);
      checking = false;
    }
  }

  const onCheck = () => { void check(); };
  onCheck();
  const interval = window.setInterval(onCheck, 60_000);
  window.addEventListener("focus", onCheck);
  window.addEventListener("online", onCheck);
  document.addEventListener("visibilitychange", onCheck);

  return () => {
    disposed = true;
    request?.abort();
    window.clearInterval(interval);
    window.removeEventListener("focus", onCheck);
    window.removeEventListener("online", onCheck);
    document.removeEventListener("visibilitychange", onCheck);
  };
}
