import { getAIConciergeReply } from '../../simulatorData';

export async function POST(req: Request) {
  try {
    const { message, scenario } = await req.json();
    const reply = getAIConciergeReply(message, scenario || 'normal');

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Stream text word by word
        const words = reply.split(" ");
        for (let i = 0; i < words.length; i++) {
          controller.enqueue(encoder.encode(words[i] + (i === words.length - 1 ? "" : " ")));
          await new Promise((resolve) => setTimeout(resolve, 50)); // Simulates a 50ms word delay
        }
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Error processing your message.", { status: 500 });
  }
}
