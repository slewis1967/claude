import { NextRequest } from "next/server";
import { readDay } from "@/lib/vault";

// GET ?date=YYYY-MM-DD → that day's markdown (for the calendar viewer).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? "";
  const markdown = await readDay(date);
  return Response.json({ date, markdown }, { headers: { "Cache-Control": "no-store" } });
}
