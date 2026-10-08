import { NextRequest, NextResponse } from 'next/server';
import { db, user, orders, orderItems, canteens, pickupBatches, auditLogs } from '@/lib/db';
import { eq, sql, desc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth/server';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const todayStr = new Date().toISOString().split('T')[0];

    // Total Customers
    const [custCount] = await db.select({ count: sql<number>`count(*)::int` })
      .from(user).where(eq(user.role, 'CUSTOMER'));

    // Total Sellers
    const [sellerCount] = await db.select({ count: sql<number>`count(*)::int` })
      .from(user).where(eq(user.role, 'SELLER'));

    // Orders Today
    const [ordersToday] = await db.select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(sql`DATE(orders.created_at) = ${todayStr}`);

    // Active Orders (REQUESTED, ACCEPTED, PAYMENT_PENDING, CONFIRMED, PREPARING, READY)
    const [activeOrders] = await db.select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(sql`orders.status IN ('REQUESTED', 'ACCEPTED', 'PAYMENT_PENDING', 'CONFIRMED', 'PREPARING', 'READY')`);

    // Completed Orders
    const [completedOrders] = await db.select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(eq(orders.status, 'COLLECTED'));

    // Cancelled / Rejected Orders
    const [cancelledOrders] = await db.select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(sql`orders.status IN ('CANCELLED', 'REJECTED', 'PAYMENT_FAILED', 'EXPIRED')`);

    // Most Ordered Items (Aggregated from order_items)
    const mostOrdered = await db.select({
      itemName: orderItems.itemName,
      totalQuantity: sql<number>`sum(order_items.quantity)::int`,
    })
      .from(orderItems)
      .groupBy(orderItems.itemName)
      .orderBy(desc(sql`sum(order_items.quantity)`))
      .limit(5);

    // Canteen Status
    const canteen = await db.query.canteens.findFirst({
      where: eq(canteens.name, 'IP Canteen')
    });

    // Recent Audit Logs
    const recentLogs = await db.select().from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(15);

    // Active Batches for Today
    const activeBatches = await db.select().from(pickupBatches)
      .where(eq(pickupBatches.batchDate, todayStr))
      .orderBy(pickupBatches.startTime)
      .limit(20);

    return NextResponse.json({
      metrics: {
        customers: custCount?.count || 0,
        sellers: sellerCount?.count || 0,
        ordersToday: ordersToday?.count || 0,
        activeOrders: activeOrders?.count || 0,
        completedOrders: completedOrders?.count || 0,
        cancelledOrders: cancelledOrders?.count || 0,
      },
      mostOrdered,
      canteen,
      recentLogs,
      activeBatches,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
