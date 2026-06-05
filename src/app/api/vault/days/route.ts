import { listDays } from "@/lib/vault";

// GET → all days that have notes (with per-section counts) + current streak.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await listDays();
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}
