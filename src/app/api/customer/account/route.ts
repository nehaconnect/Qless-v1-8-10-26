import { NextRequest, NextResponse } from 'next/server';
import { db, user, session, auditLogs } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/server';

export async function DELETE(req: NextRequest) {
  try {
    const authUser = await requireAuth();

    if (authUser.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Only customers can self-delete their account' }, { status: 403 });
    }

    await db.transaction(async (tx) => {
      // 1. Delete all active sessions
      await tx.delete(session).where(eq(session.userId, authUser.id));

      // 2. Mark account inactive (soft delete to preserve order and financial audit history)
      await tx
        .update(user)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(user.id, authUser.id));

      // 3. Log audit event
      await tx.insert(auditLogs).values({
        actorId: authUser.id,
        actorRole: 'CUSTOMER',
        action: 'CUSTOMER_SELF_DELETE',
        entityType: 'USER',
        entityId: authUser.id,
        metadata: {
          username: authUser.username,
        },
      });
    });

    return NextResponse.json({ success: true, message: 'Your account has been deleted.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
