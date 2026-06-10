import { NextRequest } from "next/server";
import { runAgent, type AgentEvent } from "@/lib/agent-bridge";

// Streams a connected agent's stdout over Server-Sent Events.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { id?: string; prompt?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const id = (body.id ?? "").toString();
  const prompt = (body.prompt ?? "").toString();
  if (!id || !prompt.trim()) return new Response("Missing id or prompt", { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: AgentEvent) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      try {
        for await (const e of runAgent(id, prompt, req.signal)) send(e);
      } catch (err: any) {
        send({ type: "error", message: err?.message ?? "bridge failure" });
      } finally {
        controller.enqueue(encoder.encode("event: end\ndata: {}\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
