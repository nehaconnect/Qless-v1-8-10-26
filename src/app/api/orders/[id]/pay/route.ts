import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { confirmOrderPayment } from '@/lib/services/order-service';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await requireAuth();
    const orderId = params.id;
    let body: any = {};
    try {
      const text = await req.text();
      if (text && text.trim().length > 0) {
        body = JSON.parse(text);
      }
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const { providerPaymentId, providerOrderId, signature } = body || {};

    const paymentId = providerPaymentId || `pay_rzp_${Date.now()}`;
    const orderRzpId = providerOrderId || `order_rzp_${Date.now()}`;

    const updated = await confirmOrderPayment({
      orderId,
      customerId: authUser.id,
      providerPaymentId: paymentId,
      providerOrderId: orderRzpId,
      signature,
    });

    return NextResponse.json({
      success: true,
      order: updated,
      pickupCode: updated.plaintextPickupCode,
    });
  } catch (err: any) {
    const message = err?.message || 'Payment processing failed';
    const status = message.includes('UNAUTHORIZED') ? 401
      : message.includes('not found') ? 404
      : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
