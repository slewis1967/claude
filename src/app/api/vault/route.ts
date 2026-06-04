import { NextRequest } from "next/server";
import { appendEntry, readStatus, type VaultEntry } from "@/lib/vault";

// GET  → vault config + status + today's markdown (for the Journal page).
// POST → append a chat / goal / journal entry to today's daily note.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const status = await readStatus();
  return Response.json(status, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  let body: VaultEntry;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!body || !["chat", "goal", "journal"].includes(body.type)) {
    return new Response("Invalid entry type", { status: 400 });
  }
  if (body.type !== "chat" && !body.text?.trim()) {
    return new Response("Empty entry", { status: 400 });
  }

  const result = await appendEntry(body);
  return Response.json(result, {
    status: result.ok ? 200 : 422,
    headers: { "Cache-Control": "no-store" },
  });
}
