import { NextRequest, NextResponse } from 'next/server';
import { requireSeller } from '@/lib/auth/server';
import { sellerVerifyPickup } from '@/lib/services/order-service';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await requireSeller();
    const orderId = params.id;
    const body = await req.json();
    const { pickupCode } = body;

    if (!pickupCode || typeof pickupCode !== 'string') {
      return NextResponse.json({ error: '4-character pickup code is required' }, { status: 400 });
    }

    const sellerCanteen = authUser.effectiveRole === 'ADMIN' ? undefined : authUser.canteenId;
    const result = await sellerVerifyPickup(orderId, authUser.id, pickupCode, sellerCanteen);

    return NextResponse.json({ success: true, order: result.order });
  } catch (err: any) {
    const isForbidden = err.message?.includes('Forbidden');
    return NextResponse.json({ error: err.message }, { status: isForbidden ? 403 : 400 });
  }
}
