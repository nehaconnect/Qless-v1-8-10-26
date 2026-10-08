import { NextRequest } from 'next/server';
import { db, canteens, orders, notifications } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      const sendEvent = (event: string, data: any) => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          isClosed = true;
        }
      };

      try {
        // Initial state handshake
        const canteen = await db.query.canteens.findFirst({
          where: eq(canteens.name, 'IP Canteen'),
        });
        sendEvent('canteen_status', { canteen });
      } catch {
        // Non-blocking fallback
      }

      // Lightweight keep-alive heartbeat for Vercel serverless streaming
      // Avoids repeated continuous database polling that exhausts serverless connection pools
      const heartbeatInterval = setInterval(() => {
        if (isClosed) {
          clearInterval(heartbeatInterval);
          return;
        }
        sendEvent('heartbeat', { time: new Date().toISOString() });
      }, 15000);

      req.signal.addEventListener('abort', () => {
        isClosed = true;
        clearInterval(heartbeatInterval);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
