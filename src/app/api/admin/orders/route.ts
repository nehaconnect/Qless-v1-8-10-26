import { NextRequest, NextResponse } from 'next/server';
import { db, orders, orderItems, pickupBatches, canteens, user } from '@/lib/db';
import { desc, eq, and, sql, inArray } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth/server';
import { format12HourIST } from '@/lib/services/order-service';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase().trim();
    const canteenId = searchParams.get('canteenId');
    const dateStr = searchParams.get('date');
    const status = searchParams.get('status');

    // Fetch orders with filters
    let baseOrders = await db.query.orders.findMany({
      where: (table, { and, eq, sql }) => {
        const conditions = [];
        if (canteenId) conditions.push(eq(table.canteenId, canteenId));
        if (status && status !== 'ALL') conditions.push(eq(table.status, status));
        if (dateStr) {
          conditions.push(sql`date(${table.createdAt}) = ${dateStr}::date`);
        }
        return conditions.length > 0 ? and(...conditions) : undefined;
      },
      orderBy: [desc(orders.createdAt)],
      limit: 150,
    });

    if (baseOrders.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    const orderIds = baseOrders.map((o) => o.id);
    const batchIds = [...new Set(baseOrders.map((o) => o.batchId).filter(Boolean))] as string[];
    const customerIds = [...new Set(baseOrders.map((o) => o.customerId).filter(Boolean))] as string[];
    const canteenIds = [...new Set(baseOrders.map((o) => o.canteenId).filter(Boolean))] as string[];

    const [allItems, allBatches, allCustomers, allCanteens] = await Promise.all([
      db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)),
      batchIds.length > 0
        ? db.select().from(pickupBatches).where(inArray(pickupBatches.id, batchIds))
        : Promise.resolve([]),
      customerIds.length > 0
        ? db.select({ id: user.id, name: user.name, username: user.username, phoneNumber: user.phoneNumber })
            .from(user)
            .where(inArray(user.id, customerIds))
        : Promise.resolve([]),
      canteenIds.length > 0
        ? db.select({ id: canteens.id, name: canteens.name }).from(canteens).where(inArray(canteens.id, canteenIds))
        : Promise.resolve([]),
    ]);

    const itemsMap = new Map<string, any[]>();
    for (const it of allItems) {
      const arr = itemsMap.get(it.orderId) || [];
      arr.push(it);
      itemsMap.set(it.orderId, arr);
    }

    const batchMap = new Map<string, any>(allBatches.map((b) => [b.id, b]));
    const customerMap = new Map<string, any>(allCustomers.map((c) => [c.id, c]));
    const canteenMap = new Map<string, any>(allCanteens.map((c) => [c.id, c]));

    let enriched = baseOrders.map((o) => {
      const cust = customerMap.get(o.customerId);
      const b = batchMap.get(o.batchId);
      const c = canteenMap.get(o.canteenId);
      const items = itemsMap.get(o.id) || [];

      return {
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: cust?.name || 'Customer',
        username: cust?.username || '--',
        phoneNumber: cust?.phoneNumber || '--',
        canteenName: c?.name || 'IP Canteen',
        canteenId: o.canteenId,
        items: items.map((i) => ({
          name: i.itemName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          subtotal: i.subtotal,
        })),
        itemsSummary: items.map((i) => `${i.quantity}x ${i.itemName}`).join(', '),
        totalAmount: o.totalAmount,
        createdAt: o.createdAt,
        createdAtFormatted: format12HourIST(o.createdAt),
        exactPickupTime: o.exactPickupTime,
        exactPickupTimeFormatted: format12HourIST(o.exactPickupTime),
        batchLabel: b?.displayLabel || '15-min Batch',
        status: o.status,
        paymentStatus: o.paymentStatus,
        collectedAt: o.collectedAt,
        collectedAtFormatted: o.collectedAt ? format12HourIST(o.collectedAt) : null,
      };
    });

    if (search) {
      enriched = enriched.filter(
        (o) =>
          o.customerName.toLowerCase().includes(search) ||
          o.username.toLowerCase().includes(search) ||
          o.phoneNumber.toLowerCase().includes(search) ||
          o.orderNumber.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ orders: enriched });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
