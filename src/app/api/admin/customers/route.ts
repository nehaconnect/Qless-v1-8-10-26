import { NextRequest, NextResponse } from 'next/server';
import { db, user, session, orders, auditLogs } from '@/lib/db';
import { eq, desc, sql, and, gt } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth/server';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const now = new Date();

    // Query all registered customers with active session check and order count
    const customerRecords = await db
      .select({
        id: user.id,
        name: user.name,
        username: user.username,
        phoneNumber: user.phoneNumber,
        email: user.email,
        isActive: user.isActive,
        createdAt: user.createdAt,
        activeSessionsCount: sql<number>`count(distinct case when ${session.expiresAt} > ${now} then ${session.id} else null end)::int`,
        orderCount: sql<number>`count(distinct ${orders.id})::int`,
      })
      .from(user)
      .leftJoin(session, eq(user.id, session.userId))
      .leftJoin(orders, eq(user.id, orders.customerId))
      .where(eq(user.role, 'CUSTOMER'))
      .groupBy(user.id)
      .orderBy(desc(user.createdAt));

    const customers = customerRecords.map((c) => ({
      id: c.id,
      name: c.name,
      username: c.username || '--',
      phoneNumber: c.phoneNumber || '--',
      email: c.email,
      registrationDate: c.createdAt,
      isSessionActive: c.isActive && c.activeSessionsCount > 0,
      sessionStatus: !c.isActive ? 'DELETED' : c.activeSessionsCount > 0 ? 'ACTIVE' : 'OFFLINE',
      accountStatus: c.isActive ? 'ACTIVE' : 'DELETED',
      orderCount: c.orderCount,
    }));

    return NextResponse.json({ customers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('id');

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    const targetUser = await db.query.user.findFirst({
      where: and(eq(user.id, customerId), eq(user.role, 'CUSTOMER')),
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    await db.transaction(async (tx) => {
      // 1. Revoke all active sessions
      await tx.delete(session).where(eq(session.userId, customerId));

      // 2. Mark account as inactive / deleted
      await tx
        .update(user)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(user.id, customerId));

      // 3. Immutable audit log
      await tx.insert(auditLogs).values({
        actorId: admin.id,
        actorRole: 'ADMIN',
        action: 'CUSTOMER_ACCOUNT_DELETED',
        entityType: 'USER',
        entityId: customerId,
        metadata: {
          username: targetUser.username,
          deletedByAdmin: admin.name,
        },
      });
    });

    return NextResponse.json({ success: true, message: 'Customer account deleted and sessions revoked.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
