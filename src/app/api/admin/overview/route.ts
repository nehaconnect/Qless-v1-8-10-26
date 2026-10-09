import { NextRequest, NextResponse } from 'next/server';
import { db, user, orders, orderItems, canteens, pickupBatches, auditLogs } from '@/lib/db';
import { eq, sql, desc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth/server';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers);

    const todayStr = new Date().toISOString().split('T')[0];

    // Parallel aggregate queries: collapses 10 sequential roundtrips into 1 parallel batch
    const [
      [userCounts],
      [orderCounts],
      mostOrdered,
      canteen,
      recentLogs,
      activeBatches,
    ] = await Promise.all([
      // Combined user counts
      db.select({
        customers: sql<number>`count(*) filter (where ${user.role} = 'CUSTOMER')::int`,
        sellers: sql<number>`count(*) filter (where ${user.role} = 'SELLER')::int`,
      }).from(user),

      // Combined order lifecycle metrics
      db.select({
        ordersToday: sql<number>`count(*) filter (where date(${orders.createdAt}) = ${todayStr}::date)::int`,
        activeOrders: sql<number>`count(*) filter (where ${orders.status} in ('REQUESTED', 'ACCEPTED', 'PAYMENT_PENDING', 'CONFIRMED', 'PREPARING', 'READY'))::int`,
        completedOrders: sql<number>`count(*) filter (where ${orders.status} = 'COLLECTED')::int`,
        cancelledOrders: sql<number>`count(*) filter (where ${orders.status} in ('CANCELLED', 'REJECTED', 'PAYMENT_FAILED', 'EXPIRED'))::int`,
      }).from(orders),

      // Most Ordered Items
      db.select({
        itemName: orderItems.itemName,
        totalQuantity: sql<number>`sum(${orderItems.quantity})::int`,
      })
        .from(orderItems)
        .groupBy(orderItems.itemName)
        .orderBy(desc(sql`sum(${orderItems.quantity})`))
        .limit(5),

      // Canteen Status
      db.query.canteens.findFirst({
        where: eq(canteens.name, 'IP Canteen')
      }),

      // Recent Audit Logs
      db.select().from(auditLogs)
        .orderBy(desc(auditLogs.createdAt))
        .limit(15),

      // Active Batches for Today
      db.select().from(pickupBatches)
        .where(eq(pickupBatches.batchDate, todayStr))
        .orderBy(pickupBatches.startTime)
        .limit(20),
    ]);

    return NextResponse.json({
      metrics: {
        customers: userCounts?.customers || 0,
        sellers: userCounts?.sellers || 0,
        ordersToday: orderCounts?.ordersToday || 0,
        activeOrders: orderCounts?.activeOrders || 0,
        completedOrders: orderCounts?.completedOrders || 0,
        cancelledOrders: orderCounts?.cancelledOrders || 0,
      },
      mostOrdered,
      canteen,
      recentLogs,
      activeBatches,
    });
  } catch (err: any) {
    const isAuth = err.message?.includes('UNAUTHORIZED') || err.message?.includes('Sign in');
    const isForbidden = err.message?.includes('FORBIDDEN');
    return NextResponse.json({ error: err.message }, { status: isAuth ? 401 : isForbidden ? 403 : 400 });
  }
}
