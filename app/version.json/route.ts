// Also emitted as a file by the static export, so both hosting modes work.
export const dynamic = "force-static";

export function GET() {
  return Response.json({
    id: process.env.NEXT_PUBLIC_SITE_BUILD_ID,
    builtAt: Number(process.env.NEXT_PUBLIC_SITE_BUILD_TIME),
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
