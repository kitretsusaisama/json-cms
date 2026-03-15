import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse<ReadableStream<Uint8Array>>> {
  const { message } = await req.json();
  const text = typeof message === "string" ? message : "";

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const chunks = [
        "Hello! This is a local mock chat.",
        " ",
        "You said: ",
        text,
      ];
      let i = 0;
      const interval = setInterval(() => {
        if (i >= chunks.length) {
          controller.close();
          clearInterval(interval);
          return;
        }
        controller.enqueue(encoder.encode(chunks[i]));
        i++;
      }, 50);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}