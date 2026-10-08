import { NextRequest, NextResponse } from 'next/server';
import { requireSeller } from '@/lib/auth/server';
import { sellerStartPreparingBatch, sellerMarkBatchReady } from '@/lib/services/order-service';

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireSeller();
    const body = await req.json();
    const { batchId, action = 'START' } = body;

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    const sellerCanteen = authUser.effectiveRole === 'ADMIN' ? undefined : authUser.canteenId;

    if (action === 'MARK_READY') {
      const result = await sellerMarkBatchReady(batchId, authUser.id, sellerCanteen);
      return NextResponse.json({ success: true, count: result.count, action: 'MARK_READY' });
    }

    const result = await sellerStartPreparingBatch(batchId, authUser.id, sellerCanteen);
    return NextResponse.json({ success: true, count: result.count, action: 'START' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
