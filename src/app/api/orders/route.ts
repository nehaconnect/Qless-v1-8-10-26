import { NextRequest, NextResponse } from 'next/server';
import { db, orders, orderItems, pickupBatches, canteens, user } from '@/lib/db';
import { eq, desc, and } from 'drizzle-orm';
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
        with: {
          // Relational query helper if configured, or manual joins
        }
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

    // Attach order items, customer name, and batch info
    const enrichedOrders = await Promise.all(
      orderList.map(async (ord) => {
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, ord.id));
        const batch = await db.query.pickupBatches.findFirst({ where: eq(pickupBatches.id, ord.batchId) });
        const customer = await db.query.user.findFirst({ where: eq(user.id, ord.customerId) });
        return {
          ...ord,
          items,
          batch,
          customerName: customer?.name || 'Customer',
          customerPhone: customer?.phoneNumber || '',
        };
      })
    );

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
