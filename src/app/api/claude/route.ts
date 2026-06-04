import { NextRequest } from "next/server";
import { runClaude, type BridgeEvent } from "@/lib/claude-bridge";

// Streams Claude's response over Server-Sent Events. The browser opens this
// with fetch + a ReadableStream reader and renders deltas as they land.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { prompt?: string; sessionId?: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const prompt = (body.prompt ?? "").toString().trim();
  if (!prompt) {
    return new Response("Missing prompt", { status: 400 });
  }

  const encoder = new TextEncoder();
  const send = (
    controller: ReadableStreamDefaultController,
    event: BridgeEvent,
  ) => {
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
    );
  };

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of runClaude({
          prompt,
          sessionId: body.sessionId,
          model: body.model,
          signal: req.signal,
        })) {
          send(controller, event);
        }
      } catch (err: any) {
        send(controller, {
          type: "error",
          message: err?.message ?? "Bridge failure",
        });
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
