import { NextRequest, NextResponse } from 'next/server';
import { db, orders, orderItems, pickupBatches, canteens, user } from '@/lib/db';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/server';
import { createOrder } from '@/lib/services/order-service';

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth();
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date');
    const batchId = searchParams.get('batchId');

    let orderList: any[] = [];

    if (authUser.effectiveRole === 'CUSTOMER') {
      // Customer sees only own orders
      orderList = await db.query.orders.findMany({
        where: eq(orders.customerId, authUser.id),
        orderBy: [desc(orders.createdAt)],
      });
    } else if (authUser.effectiveRole === 'SELLER') {
      // Seller sees orders belonging to their canteen
      const canteenId = authUser.canteenId;
      if (!canteenId) {
        return NextResponse.json({ orders: [] });
      }

      orderList = await db.query.orders.findMany({
        where: batchId
          ? and(eq(orders.canteenId, canteenId), eq(orders.batchId, batchId))
          : eq(orders.canteenId, canteenId),
        orderBy: [desc(orders.createdAt)],
      });
    } else {
      // Admin sees all
      orderList = await db.query.orders.findMany({
        orderBy: [desc(orders.createdAt)],
        limit: 100,
      });
    }

    if (orderList.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    // Attach order items, customer name, and batch info via bulk inArray queries (prevents N+1 pool exhaustion)
    const orderIds = orderList.map((o) => o.id);
    const batchIds = [...new Set(orderList.map((o) => o.batchId).filter(Boolean))] as string[];
    const customerIds = [...new Set(orderList.map((o) => o.customerId).filter(Boolean))] as string[];

    const [allItems, allBatches, allCustomers] = await Promise.all([
      db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)),
      batchIds.length > 0
        ? db.select().from(pickupBatches).where(inArray(pickupBatches.id, batchIds))
        : Promise.resolve([]),
      customerIds.length > 0
        ? db.select({ id: user.id, name: user.name, phoneNumber: user.phoneNumber }).from(user).where(inArray(user.id, customerIds))
        : Promise.resolve([]),
    ]);

    const itemsByOrder = new Map<string, any[]>();
    for (const it of allItems) {
      const arr = itemsByOrder.get(it.orderId) || [];
      arr.push(it);
      itemsByOrder.set(it.orderId, arr);
    }

    const batchById = new Map<string, any>();
    for (const b of allBatches) {
      batchById.set(b.id, b);
    }

    const customerById = new Map<string, any>();
    for (const c of allCustomers) {
      customerById.set(c.id, c);
    }

    const enrichedOrders = orderList.map((ord) => ({
      ...ord,
      items: itemsByOrder.get(ord.id) || [],
      batch: batchById.get(ord.batchId) || null,
      customerName: customerById.get(ord.customerId)?.name || 'Customer',
      customerPhone: customerById.get(ord.customerId)?.phoneNumber || '',
    }));

    return NextResponse.json({ orders: enrichedOrders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth();
    const body = await req.json();
    const { canteenId, items, exactPickupTime, idempotencyKey } = body;

    let targetCanteenId = canteenId;
    if (!targetCanteenId) {
      const defaultCanteen = await db.query.canteens.findFirst({
        where: eq(canteens.name, 'IP Canteen')
      });
      targetCanteenId = defaultCanteen?.id;
    }

    if (!targetCanteenId || !items || !exactPickupTime) {
      return NextResponse.json({ error: 'Missing required order fields' }, { status: 400 });
    }

    const key = idempotencyKey || `idemp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const result = await createOrder({
      customerId: authUser.id,
      canteenId: targetCanteenId,
      items,
      exactPickupTime,
      idempotencyKey: key,
    });

    return NextResponse.json({
      success: true,
      order: result.order,
      pickupCode: result.plaintextPickupCode, // Returned only during creation to customer
      alreadyCreated: result.alreadyCreated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
