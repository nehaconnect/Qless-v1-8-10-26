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
    const body = await req.json();
    const { providerPaymentId, providerOrderId, signature } = body;

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
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
