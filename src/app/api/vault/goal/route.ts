import { NextRequest } from "next/server";
import { setGoalChecked } from "@/lib/vault";

// POST { index, done } → toggle the Nth goal checkbox in today's note.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { index?: number; done?: boolean };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (typeof body.index !== "number" || typeof body.done !== "boolean") {
    return new Response("Expected { index:number, done:boolean }", { status: 400 });
  }

  const result = await setGoalChecked(body.index, body.done);
  return Response.json(result, {
    status: result.ok ? 200 : 422,
    headers: { "Cache-Control": "no-store" },
  });
}
