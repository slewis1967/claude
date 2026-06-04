import { NextRequest } from "next/server";
import { setVaultPath, readStatus } from "@/lib/vault";

// POST { path } → persist the vault path chosen in the UI, then report status.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { path?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const p = (body.path ?? "").toString().trim();
  if (!p) return new Response("Empty path", { status: 400 });

  setVaultPath(p);
  const status = await readStatus();
  return Response.json(status, { headers: { "Cache-Control": "no-store" } });
}
