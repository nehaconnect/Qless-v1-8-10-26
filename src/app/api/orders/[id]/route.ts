import { NextRequest, NextResponse } from 'next/server';
import { db, orders, orderItems, orderStatusHistory, pickupBatches, user, pickupCodes } from '@/lib/db';
import { eq, and, asc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/server';
import {
  sellerAcceptOrder,
  sellerRejectOrder,
  sellerSuggestTime,
  customerRespondTimeSuggestion,
  sellerMarkOrderReady,
  decryptPickupCode,
} from '@/lib/services/order-service';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await requireAuth();
    const orderId = params.id;

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Role-based authorization
    if (authUser.effectiveRole === 'CUSTOMER' && order.customerId !== authUser.id) {
      return NextResponse.json({ error: 'Forbidden: Cannot access another customer order' }, { status: 403 });
    }
    if (authUser.effectiveRole === 'SELLER' && authUser.canteenId !== order.canteenId) {
      return NextResponse.json({ error: 'Forbidden: Cannot access orders from another canteen' }, { status: 403 });
    }

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    const history = await db.select().from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, orderId))
      .orderBy(asc(orderStatusHistory.createdAt));
    const batch = await db.query.pickupBatches.findFirst({ where: eq(pickupBatches.id, order.batchId) });
    const customer = await db.query.user.findFirst({ where: eq(user.id, order.customerId) });

    const pcRecord = await db.query.pickupCodes.findFirst({ where: eq(pickupCodes.orderId, orderId) });
    let visiblePickupCode: string | null = null;
    if (
      pcRecord &&
      order.paymentStatus === 'PAID' &&
      !['REQUESTED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(order.status)
    ) {
      const isOwnerCustomer = authUser.role === 'CUSTOMER' && order.customerId === authUser.id;
      const isOwnerSeller =
        (authUser.role === 'SELLER' || authUser.effectiveRole === 'SELLER') &&
        order.canteenId === authUser.canteenId;
      if (isOwnerCustomer || isOwnerSeller) {
        visiblePickupCode = decryptPickupCode(pcRecord.encryptedCode);
      }
    }

    return NextResponse.json({
      order: {
        ...order,
        items,
        history,
        batch,
        customerName: customer?.name || 'Customer',
        customerPhone: customer?.phoneNumber || '',
        pickupCode: visiblePickupCode,
        isPickupVerified: pcRecord?.isVerified ?? false,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await requireAuth();
    const orderId = params.id;
    const body = await req.json();
    const { action, suggestedTime, note, accept } = body;

    let result: any;
    const sellerCanteen = authUser.effectiveRole === 'ADMIN' ? undefined : authUser.canteenId;

    switch (action) {
      case 'SELLER_ACCEPT':
        if (authUser.effectiveRole !== 'SELLER' && authUser.effectiveRole !== 'ADMIN') {
          return NextResponse.json({ error: 'Forbidden: Seller access required' }, { status: 403 });
        }
        result = await sellerAcceptOrder(orderId, authUser.id, sellerCanteen);
        break;

      case 'SELLER_REJECT':
        if (authUser.effectiveRole !== 'SELLER' && authUser.effectiveRole !== 'ADMIN') {
          return NextResponse.json({ error: 'Forbidden: Seller access required' }, { status: 403 });
        }
        result = await sellerRejectOrder(orderId, authUser.id, body.reason, sellerCanteen);
        break;

      case 'SELLER_SUGGEST_TIME':
        if (authUser.effectiveRole !== 'SELLER' && authUser.effectiveRole !== 'ADMIN') {
          return NextResponse.json({ error: 'Forbidden: Seller access required' }, { status: 403 });
        }
        if (!suggestedTime) {
          return NextResponse.json({ error: 'Suggested time is required' }, { status: 400 });
        }
        result = await sellerSuggestTime(orderId, authUser.id, new Date(suggestedTime), note, sellerCanteen);
        break;

      case 'CUSTOMER_RESPOND_TIME':
        result = await customerRespondTimeSuggestion(orderId, authUser.id, Boolean(accept));
        break;

      case 'SELLER_READY':
        if (authUser.effectiveRole !== 'SELLER' && authUser.effectiveRole !== 'ADMIN') {
          return NextResponse.json({ error: 'Forbidden: Seller access required' }, { status: 403 });
        }
        result = await sellerMarkOrderReady(orderId, authUser.id, sellerCanteen);
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    const isForbidden = err.message?.includes('Forbidden');
    return NextResponse.json({ error: err.message }, { status: isForbidden ? 403 : 400 });
  }
}
