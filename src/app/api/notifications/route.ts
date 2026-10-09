import { NextRequest, NextResponse } from 'next/server';
import { db, notifications } from '@/lib/db';
import { eq, desc, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/server';

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req.headers);

    const userNotifs = await db.select().from(notifications)
      .where(eq(notifications.userId, authUser.id))
      .orderBy(desc(notifications.createdAt))
      .limit(30);

    const unreadCount = userNotifs.filter(n => !n.isRead).length;

    return NextResponse.json({ notifications: userNotifs, unreadCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = await requireAuth(req.headers);
    const body = await req.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      await db.update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(eq(notifications.userId, authUser.id));
      return NextResponse.json({ success: true });
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, authUser.id)));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
