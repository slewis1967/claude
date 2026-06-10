import { NextRequest } from "next/server";
import { runAgent, type AgentEvent, type ChatTurn } from "@/lib/agent-bridge";

// Streams a connected agent's reply over Server-Sent Events. For HTTP (OpenAI)
// backends the optional `messages` history is forwarded for multi-turn context.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { id?: string; prompt?: string; messages?: ChatTurn[] };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const id = (body.id ?? "").toString();
  const prompt = (body.prompt ?? "").toString();
  if (!id || !prompt.trim()) return new Response("Missing id or prompt", { status: 400 });
  const history = Array.isArray(body.messages) ? body.messages : undefined;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: AgentEvent) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      try {
        for await (const e of runAgent(id, prompt, req.signal, history)) send(e);
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
