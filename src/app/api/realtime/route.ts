import { NextRequest } from 'next/server';
import { db, canteens, orders, notifications } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const user = await getSessionUser();

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

      // Initial state handshake
      const canteen = await db.query.canteens.findFirst({
        where: eq(canteens.name, 'IP Canteen')
      });
      sendEvent('canteen_status', { canteen });

      // Polling loop for state sync (SSE event stream)
      let lastCheck = new Date();
      const interval = setInterval(async () => {
        if (isClosed) {
          clearInterval(interval);
          return;
        }

        try {
          // Send periodic heartbeat
          sendEvent('heartbeat', { time: new Date().toISOString() });

          // Check if canteen status changed
          const freshCanteen = await db.query.canteens.findFirst({
            where: eq(canteens.name, 'IP Canteen')
          });
          if (freshCanteen && freshCanteen.updatedAt > lastCheck) {
            sendEvent('canteen_status', { canteen: freshCanteen });
          }

          // If authenticated user, check fresh notifications
          if (user) {
            const freshNotifs = await db.select().from(notifications)
              .where(eq(notifications.userId, user.id))
              .orderBy(desc(notifications.createdAt))
              .limit(5);

            sendEvent('notifications', { notifications: freshNotifs });
          }

          lastCheck = new Date();
        } catch {
          // ignore transient poll error
        }
      }, 3000);

      req.signal.addEventListener('abort', () => {
        isClosed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {}
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
