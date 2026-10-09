import { db, orders, orderItems, orderStatusHistory, pickupBatches, pickupCodes, menuItems, canteens, notifications, auditLogs, payments } from '@/lib/db';
import { eq, and, sql, inArray } from 'drizzle-orm';
import crypto from 'crypto';

// 4-character uppercase alphanumeric character set (excluding confusing characters like 0, O, 1, I)
const PICKUP_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

const ENCRYPTION_KEY = crypto
  .createHash('sha256')
  .update(process.env.BETTER_AUTH_SECRET || 'qless-secure-production-secret-auth-key-2026')
  .digest(); // 32-byte key

export function generateSecurePickupCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    const idx = crypto.randomInt(0, PICKUP_CHARS.length);
    code += PICKUP_CHARS[idx];
  }
  return code;
}

export function hashPickupCode(code: string, salt: string): string {
  return crypto.createHash('sha256').update(`${salt}:${code.toUpperCase()}`).digest('hex');
}

export function encryptPickupCode(code: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(code.toUpperCase(), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

export function decryptPickupCode(encryptedStr?: string | null): string | null {
  if (!encryptedStr || !encryptedStr.includes(':')) return null;
  try {
    const [ivHex, tagHex, contentHex] = encryptedStr.split(':');
    if (!ivHex || !tagHex || !contentHex) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    let decrypted = decipher.update(contentHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted.toUpperCase();
  } catch {
    return null;
  }
}

/**
 * Reliable extraction of India Standard Time (IST, UTC+05:30) date parts
 * Guarantees correct campus local time regardless of server/cloud timezone
 */
export function getISTDateParts(d: Date): { hours: number; minutes: number; dateStr: string } {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(d);
  let hours = 0, minutes = 0, year = '', month = '', day = '';
  for (const p of parts) {
    if (p.type === 'hour') hours = parseInt(p.value, 10);
    if (p.type === 'minute') minutes = parseInt(p.value, 10);
    if (p.type === 'year') year = p.value;
    if (p.type === 'month') month = p.value;
    if (p.type === 'day') day = p.value;
  }
  return { hours, minutes, dateStr: `${year}-${month}-${day}` };
}

export function format12HourTime(hours: number, minutes: number): string {
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayH = hours % 12 === 0 ? 12 : hours % 12;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${displayH}:${pad(minutes)} ${ampm}`;
}

export function format12HourIST(d: Date | string | null | undefined): string {
  if (!d) return '--:--';
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return '--:--';
  return dateObj.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Validates whether an exact pickup time falls between 8:00 AM and 5:00 PM IST (inclusive)
 */
export function validatePickupTime(exactPickupTime: Date | string): {
  valid: boolean;
  error?: string;
  minutesSinceMidnight?: number;
  pickupDate?: Date;
  istTimeFormatted?: string;
} {
  const d = typeof exactPickupTime === 'string' ? new Date(exactPickupTime) : exactPickupTime;
  if (isNaN(d.getTime())) {
    return { valid: false, error: 'Invalid pickup time format' };
  }

  const { hours, minutes } = getISTDateParts(d);
  const minutesSinceMidnight = hours * 60 + minutes;

  // 8:00 AM (480) to 5:00 PM (1020), inclusive
  if (minutesSinceMidnight < 480 || minutesSinceMidnight > 1020) {
    return {
      valid: false,
      error: `Requested pickup time (${format12HourTime(hours, minutes)}) must fall between 8:00 AM and 5:00 PM IST.`,
      minutesSinceMidnight,
      pickupDate: d,
      istTimeFormatted: format12HourTime(hours, minutes),
    };
  }

  return {
    valid: true,
    minutesSinceMidnight,
    pickupDate: d,
    istTimeFormatted: format12HourTime(hours, minutes),
  };
}

/**
 * Authoritative effective canteen status calculation taking into account:
 * - Current Asia/Kolkata time
 * - Scheduled operating hours (8:00 AM to 5:00 PM IST)
 * - Seller's manual status & persisted manual override
 */
export function getEffectiveCanteenStatus(
  canteen: {
    operatingStatus: string;
    manualOverrideStatus?: string | null;
    manualOverrideDate?: string | null;
    openingTime?: string;
    closingTime?: string;
    isActive?: boolean;
  },
  now: Date = new Date()
): {
  effectiveStatus: 'OPEN' | 'TOO_BUSY' | 'CLOSED';
  isOperatingHours: boolean;
  isManualOverride: boolean;
  scheduledHours: string;
  currentTimeIST: string;
} {
  const { hours, minutes, dateStr } = getISTDateParts(now);
  const currentMinutes = hours * 60 + minutes;

  const openMinutes = 8 * 60;   // 480 (8:00 AM)
  const closeMinutes = 17 * 60; // 1020 (5:00 PM)

  const isOperatingHours = currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  const scheduledHours = '8:00 AM – 5:00 PM';
  const currentTimeIST = format12HourTime(hours, minutes);

  // 1. After 5:00 PM IST: Canteen MUST be closed for new orders.
  // "At 5:00 PM, the scheduled operating period ends. The canteen must automatically stop accepting new orders."
  // "After 5:00 PM, the canteen remains CLOSED for new orders even if the seller's previous status was OPEN."
  // "Manual opening must not override the 5:00 PM closing boundary."
  if (currentMinutes >= closeMinutes) {
    return {
      effectiveStatus: 'CLOSED',
      isOperatingHours: false,
      isManualOverride: false,
      scheduledHours,
      currentTimeIST,
    };
  }

  const isTodayOverride = canteen.manualOverrideDate === dateStr;
  const manualStatus = isTodayOverride ? canteen.manualOverrideStatus : null;

  // 2. Before 8:00 AM IST:
  // "Before 8:00 AM, the canteen is CLOSED unless the seller has explicitly opened it manually."
  if (currentMinutes < openMinutes) {
    if (manualStatus === 'OPEN') {
      return {
        effectiveStatus: 'OPEN',
        isOperatingHours: false,
        isManualOverride: true,
        scheduledHours,
        currentTimeIST,
      };
    }
    return {
      effectiveStatus: 'CLOSED',
      isOperatingHours: false,
      isManualOverride: false,
      scheduledHours,
      currentTimeIST,
    };
  }

  // 3. Between 8:00 AM and 5:00 PM IST:
  // "At 8:00 AM, the canteen automatically becomes OPEN unless the seller has explicitly selected CLOSED or TOO BUSY."
  // "Between 8:00 AM and 5:00 PM, the canteen remains OPEN by default unless the seller manually changes its status."
  if (manualStatus && ['OPEN', 'TOO_BUSY', 'CLOSED'].includes(manualStatus)) {
    return {
      effectiveStatus: manualStatus as 'OPEN' | 'TOO_BUSY' | 'CLOSED',
      isOperatingHours: true,
      isManualOverride: true,
      scheduledHours,
      currentTimeIST,
    };
  }

  // Default between 8:00 AM and 5:00 PM is OPEN
  return {
    effectiveStatus: 'OPEN',
    isOperatingHours: true,
    isManualOverride: false,
    scheduledHours,
    currentTimeIST,
  };
}

/**
 * Maps an arbitrary pickup time into its continuous 15-minute preparation batch
 * e.g. 11:07 AM -> 11:00:00 to 11:15:00 (Label: 11:00 AM–11:15 AM)
 */
export function getBatchWindow(pickupDate: Date): {
  startTime: string;
  endTime: string;
  displayLabel: string;
  batchDate: string;
} {
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  // Extract authoritative IST representation
  const { hours, minutes, dateStr } = getISTDateParts(pickupDate);
  
  let batchStartMin = Math.floor(minutes / 15) * 15;
  let batchEndMin = batchStartMin === 45 ? 0 : batchStartMin + 15;
  let batchEndHour = batchStartMin === 45 ? hours + 1 : hours;
  let effectiveHours = hours;

  if (hours === 17 && minutes === 0) {
    effectiveHours = 16;
    batchStartMin = 45;
    batchEndMin = 0;
    batchEndHour = 17;
  }

  const startTime = `${pad(effectiveHours)}:${pad(batchStartMin)}:00`;
  const endTime = `${pad(batchEndHour)}:${pad(batchEndMin)}:00`;
  const displayLabel = `${format12HourTime(effectiveHours, batchStartMin)}–${format12HourTime(batchEndHour, batchEndMin)}`;

  return { startTime, endTime, displayLabel, batchDate: dateStr };
}

export interface CreateOrderInput {
  customerId: string;
  canteenId: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
    customizations?: string[];
  }>;
  exactPickupTime: string; // ISO string e.g. 2026-10-08T11:07:00.000Z
  idempotencyKey: string;
  simulatedNow?: Date;
}

export async function createOrder(input: CreateOrderInput) {
  const { customerId, canteenId, items, exactPickupTime, idempotencyKey, simulatedNow } = input;

  if (!items || items.length === 0) {
    throw new Error('Order must contain at least one item');
  }

  // Check idempotency first
  const existingOrder = await db.query.orders.findFirst({
    where: eq(orders.idempotencyKey, idempotencyKey),
  });

  if (existingOrder) {
    return { order: existingOrder, alreadyCreated: true };
  }

  const pickupDate = new Date(exactPickupTime);
  if (isNaN(pickupDate.getTime())) {
    throw new Error('Invalid requested pickup time');
  }

  // 1. Validate pickup time against official hours (8:00 AM to 5:00 PM IST)
  const timeValidation = validatePickupTime(pickupDate);
  if (!timeValidation.valid) {
    throw new Error(timeValidation.error || 'Requested pickup time must be within canteen operating hours (8:00 AM to 5:00 PM)');
  }

  // 2. Validate Canteen & Operating Hours
  const canteen = await db.query.canteens.findFirst({
    where: eq(canteens.id, canteenId)
  });

  if (!canteen || !canteen.isActive) {
    throw new Error('Canteen is not available');
  }

  const { effectiveStatus } = getEffectiveCanteenStatus(canteen, simulatedNow || new Date());

  if (effectiveStatus === 'CLOSED') {
    throw new Error('Canteen is closed. Orders are currently disabled.');
  }

  if (effectiveStatus === 'TOO_BUSY') {
    throw new Error('Canteen is currently busy. New orders are temporarily unavailable.');
  }

  // 3. Fetch Authoritative Menu Prices Server-Side
  let calculatedTotal = 0;
  const verifiedItems: Array<{
    menuItemId: string;
    name: string;
    unitPrice: string;
    quantity: number;
    subtotal: string;
    customizations: any;
  }> = [];

  for (const it of items) {
    const menuItem = await db.query.menuItems.findFirst({
      where: and(
        eq(menuItems.id, it.menuItemId),
        eq(menuItems.canteenId, canteenId),
        eq(menuItems.isArchived, false)
      )
    });

    if (!menuItem) {
      throw new Error(`Menu item not found or unavailable`);
    }

    if (menuItem.price === null || menuItem.price === undefined) {
      throw new Error(`Item "${menuItem.name}" has no fixed price and cannot be ordered yet.`);
    }

    if (!menuItem.isAvailable) {
      throw new Error(`Item "${menuItem.name}" is currently SOLD OUT`);
    }

    if (!Number.isInteger(it.quantity) || it.quantity <= 0 || it.quantity > 50) {
      throw new Error(`Invalid quantity for "${menuItem.name}". Quantity must be an integer between 1 and 50.`);
    }

    const priceNum = parseFloat(menuItem.price);
    const itemSubtotal = priceNum * it.quantity;
    calculatedTotal += itemSubtotal;

    verifiedItems.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      unitPrice: menuItem.price,
      quantity: it.quantity,
      subtotal: itemSubtotal.toFixed(2),
      customizations: it.customizations || []
    });
  }

  // 4. Find or Create the 15-Minute Preparation Batch
  const { startTime, endTime, displayLabel, batchDate } = getBatchWindow(pickupDate);

  let [batch] = await db.select().from(pickupBatches)
    .where(and(
      eq(pickupBatches.canteenId, canteenId),
      eq(pickupBatches.batchDate, batchDate),
      eq(pickupBatches.startTime, startTime)
    )).limit(1);

  if (!batch) {
    [batch] = await db.insert(pickupBatches).values({
      canteenId,
      batchDate,
      startTime,
      endTime,
      displayLabel,
      capacity: canteen.defaultBatchCapacity,
      reservedCount: 0,
      status: 'UPCOMING'
    }).returning();
  }

  // 5. Atomic Transaction: Capacity Reservation + Order Creation
  const orderNumber = `QL-${Date.now().toString(36).toUpperCase()}-${crypto.randomInt(100, 999)}`;

  const result = await db.transaction(async (tx) => {
    // Atomically increment reserved_count only if strictly below capacity
    const reserveResult = await tx.execute(sql`
      UPDATE pickup_batches 
      SET reserved_count = reserved_count + 1 
      WHERE id = ${batch.id} AND reserved_count < capacity
      RETURNING id, reserved_count, capacity;
    `);

    if (reserveResult.rows.length === 0) {
      throw new Error('This 15-minute preparation batch is at full capacity. Please select a different pickup time.');
    }

    // Insert order
    const [newOrder] = await tx.insert(orders).values({
      orderNumber,
      customerId,
      canteenId,
      batchId: batch.id,
      exactPickupTime: pickupDate,
      status: 'REQUESTED',
      totalAmount: calculatedTotal.toFixed(2),
      idempotencyKey,
      paymentStatus: 'UNPAID',
    }).returning();

    // Insert order items
    for (const item of verifiedItems) {
      await tx.insert(orderItems).values({
        orderId: newOrder.id,
        menuItemId: item.menuItemId,
        itemName: item.name,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.subtotal,
        customizations: item.customizations,
      });
    }

    // Insert initial status history
    await tx.insert(orderStatusHistory).values({
      orderId: newOrder.id,
      toStatus: 'REQUESTED',
      changedByUserId: customerId,
      actorRole: 'CUSTOMER',
      reason: 'Order submitted by customer',
    });

    // Notify customer
    await tx.insert(notifications).values({
      userId: customerId,
      orderId: newOrder.id,
      title: 'Order Requested',
      message: `Your order for ${displayLabel} has been submitted. Awaiting seller confirmation.`,
      type: 'ORDER_REQUESTED',
    });

    // Immutable audit record
    await tx.insert(auditLogs).values({
      canteenId,
      actorId: customerId,
      actorRole: 'CUSTOMER',
      action: 'ORDER_CREATED',
      entityType: 'ORDER',
      entityId: newOrder.id,
      afterState: { total: newOrder.totalAmount, batch: displayLabel },
    });

    return newOrder;
  });

  return {
    order: result,
    alreadyCreated: false
  };
}

/**
 * Seller accepts the requested pickup time
 */
export async function sellerAcceptOrder(orderId: string, sellerUserId: string, sellerCanteenId?: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId)
  });

  if (!order) throw new Error('Order not found');
  if (sellerCanteenId && order.canteenId !== sellerCanteenId) {
    throw new Error('Forbidden: Cannot accept orders for another canteen');
  }
  if (order.status !== 'REQUESTED') {
    throw new Error(`Cannot accept order in status ${order.status}`);
  }

  // 15-minute payment window before auto-expiry
  const paymentExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

  const [updated] = await db.update(orders)
    .set({
      status: 'ACCEPTED',
      paymentStatus: 'PENDING',
      paymentExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId))
    .returning();

  await db.insert(orderStatusHistory).values({
    orderId,
    fromStatus: 'REQUESTED',
    toStatus: 'ACCEPTED',
    changedByUserId: sellerUserId,
    actorRole: 'SELLER',
    reason: 'Seller accepted customer requested time',
  });

  await db.insert(notifications).values({
    userId: order.customerId,
    orderId,
    title: 'Order Accepted',
    message: 'Seller accepted your order time! Please complete payment to confirm your booking.',
    type: 'SELLER_ACCEPTED',
  });

  return updated;
}

/**
 * Seller rejects incoming customer order request
 */
export async function sellerRejectOrder(orderId: string, sellerUserId: string, reason?: string, sellerCanteenId?: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId)
  });

  if (!order) throw new Error('Order not found');
  if (sellerCanteenId && order.canteenId !== sellerCanteenId) {
    throw new Error('Forbidden: Cannot reject order for another canteen');
  }

  if (order.status !== 'REQUESTED' && order.status !== 'ACCEPTED') {
    throw new Error(`Cannot reject order in ${order.status} state`);
  }

  return await db.transaction(async (tx) => {
    // Release batch capacity reservation if assigned
    if (order.batchId) {
      await tx.execute(sql`
        UPDATE pickup_batches SET reserved_count = GREATEST(0, reserved_count - 1) WHERE id = ${order.batchId}
      `);
    }

    const [updated] = await tx.update(orders)
      .set({
        status: 'REJECTED',
        rejectionReason: reason || 'SELLER_DECLINED',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    await tx.insert(orderStatusHistory).values({
      orderId,
      fromStatus: order.status,
      toStatus: 'REJECTED',
      changedByUserId: sellerUserId,
      actorRole: 'SELLER',
      reason: reason || 'Seller rejected the order request',
    });

    await tx.insert(notifications).values({
      userId: order.customerId,
      orderId,
      title: 'Order Declined',
      message: `Your order #${order.orderNumber} was declined by the canteen.`,
      type: 'ORDER_REJECTED',
    });

    return updated;
  });
}

/**
 * Seller suggests another pickup time
 */
export async function sellerSuggestTime(orderId: string, sellerUserId: string, suggestedTime: Date, note?: string, sellerCanteenId?: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId)
  });

  if (!order) throw new Error('Order not found');
  if (sellerCanteenId && order.canteenId !== sellerCanteenId) {
    throw new Error('Forbidden: Cannot suggest time for another canteen');
  }

  const validation = validatePickupTime(suggestedTime);
  if (!validation.valid) {
    throw new Error(validation.error || 'Suggested pickup time must be within canteen operating hours (8:00 AM to 5:00 PM)');
  }

  const [updated] = await db.update(orders)
    .set({
      sellerSuggestedTime: suggestedTime,
      timeNegotiationStatus: 'SUGGESTED_BY_SELLER',
      rejectionNote: note || null,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId))
    .returning();

  await db.insert(notifications).values({
    userId: order.customerId,
    orderId,
    title: 'New Time Suggested',
    message: `Seller suggested a new pickup time: ${format12HourIST(suggestedTime)}. Please review.`,
    type: 'TIME_CHANGED',
  });

  return updated;
}

/**
 * Customer accepts or declines seller time suggestion
 */
export async function customerRespondTimeSuggestion(orderId: string, customerId: string, accept: boolean) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.customerId, customerId))
  });

  if (!order || !order.sellerSuggestedTime) throw new Error('No pending time suggestion');

  if (accept) {
    const { startTime, endTime, displayLabel, batchDate } = getBatchWindow(order.sellerSuggestedTime);

    // Reassign batch if different
    let [newBatch] = await db.select().from(pickupBatches)
      .where(and(
        eq(pickupBatches.canteenId, order.canteenId),
        eq(pickupBatches.batchDate, batchDate),
        eq(pickupBatches.startTime, startTime)
      )).limit(1);

    if (!newBatch) {
      [newBatch] = await db.insert(pickupBatches).values({
        canteenId: order.canteenId,
        batchDate,
        startTime,
        endTime,
        displayLabel,
        capacity: 15,
        reservedCount: 0,
        status: 'UPCOMING'
      }).returning();
    }

    // Transactionally transfer reservation between batches
    await db.transaction(async (tx) => {
      // Decrement old batch
      await tx.execute(sql`
        UPDATE pickup_batches SET reserved_count = GREATEST(0, reserved_count - 1) WHERE id = ${order.batchId}
      `);
      // Increment new batch
      const res = await tx.execute(sql`
        UPDATE pickup_batches SET reserved_count = reserved_count + 1 WHERE id = ${newBatch.id} AND reserved_count < capacity RETURNING id
      `);
      if (res.rows.length === 0) {
        throw new Error('The suggested batch has reached capacity in the interim.');
      }

      await tx.update(orders).set({
        batchId: newBatch.id,
        exactPickupTime: order.sellerSuggestedTime!,
        timeNegotiationStatus: 'ACCEPTED_BY_CUSTOMER',
        status: 'ACCEPTED',
        paymentStatus: 'PENDING',
        paymentExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
        updatedAt: new Date(),
      }).where(eq(orders.id, orderId));
    });

    return { success: true, accepted: true };
  } else {
    // Declined: Cancel order and release capacity
    await db.transaction(async (tx) => {
      await tx.execute(sql`
        UPDATE pickup_batches SET reserved_count = GREATEST(0, reserved_count - 1) WHERE id = ${order.batchId}
      `);
      await tx.update(orders).set({
        timeNegotiationStatus: 'DECLINED_BY_CUSTOMER',
        status: 'CANCELLED',
        cancelledAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(orders.id, orderId));
    });

    return { success: true, accepted: false };
  }
}

/**
 * Server-Side Razorpay Payment Verification & Order Confirmation
 * Secure pickup code generation occurs ONLY AFTER payment is successfully verified.
 */
export async function confirmOrderPayment(params: {
  orderId: string;
  customerId: string;
  providerPaymentId: string;
  providerOrderId: string;
  signature?: string;
}) {
  const { orderId, customerId, providerPaymentId, providerOrderId, signature } = params;

  if (process.env.RAZORPAY_KEY_SECRET && signature) {
    const expectedSig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${providerOrderId}|${providerPaymentId}`)
      .digest('hex');
    if (expectedSig !== signature) {
      throw new Error('Invalid payment signature');
    }
  }

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.customerId, customerId))
  });

  if (!order) throw new Error('Order not found');
  if (order.status === 'REJECTED' || order.status === 'CANCELLED') {
    throw new Error(`Cannot pay for order in ${order.status} status.`);
  }

  return await db.transaction(async (tx) => {
    // Record payment
    await tx.insert(payments).values({
      orderId,
      customerId,
      canteenId: order.canteenId,
      amount: order.totalAmount,
      currency: 'INR',
      provider: 'RAZORPAY',
      providerOrderId,
      providerPaymentId,
      status: 'SUCCESS',
      verifiedAt: new Date(),
    });

    // Transition to CONFIRMED
    const [confirmed] = await tx.update(orders)
      .set({
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    await tx.insert(orderStatusHistory).values({
      orderId,
      fromStatus: order.status,
      toStatus: 'CONFIRMED',
      changedByUserId: customerId,
      actorRole: 'CUSTOMER',
      reason: 'Payment verified successfully via Razorpay',
    });

    // Generate secure pickup code upon verified payment
    const plaintextCode = generateSecurePickupCode();
    const codeHash = hashPickupCode(plaintextCode, orderId);
    const encryptedCode = encryptPickupCode(plaintextCode);

    const existingCode = await tx.query.pickupCodes.findFirst({ where: eq(pickupCodes.orderId, orderId) });
    if (existingCode) {
      await tx.update(pickupCodes).set({
        codeHash,
        encryptedCode,
        isVerified: false,
        failedAttempts: 0,
      }).where(eq(pickupCodes.id, existingCode.id));
    } else {
      await tx.insert(pickupCodes).values({
        orderId,
        codeHash,
        encryptedCode,
        isVerified: false,
        failedAttempts: 0,
        maxAttempts: 5,
      });
    }

    await tx.insert(notifications).values({
      userId: customerId,
      orderId,
      title: 'Payment Successful',
      message: 'Your order is confirmed! The kitchen will prepare it for your batch.',
      type: 'ORDER_CONFIRMED',
    });

    return {
      ...confirmed,
      plaintextPickupCode: plaintextCode,
    };
  });
}

/**
 * Seller begins preparation for a batch
 */
export async function sellerStartPreparingBatch(batchId: string, sellerUserId: string, sellerCanteenId?: string) {
  const batch = await db.query.pickupBatches.findFirst({
    where: eq(pickupBatches.id, batchId)
  });
  if (!batch) throw new Error('Batch not found');
  if (sellerCanteenId && batch.canteenId !== sellerCanteenId) {
    throw new Error('Forbidden: Cannot start preparation for another canteen');
  }

  return await db.transaction(async (tx) => {
    await tx.update(pickupBatches)
      .set({ status: 'PREPARING', prepStartedAt: new Date() })
      .where(eq(pickupBatches.id, batchId));

    // Update all confirmed orders in this batch
    const batchOrders = await tx.select().from(orders)
      .where(and(eq(orders.batchId, batchId), eq(orders.status, 'CONFIRMED')));

    for (const ord of batchOrders) {
      await tx.update(orders)
        .set({ status: 'PREPARING', prepStartedAt: new Date(), updatedAt: new Date() })
        .where(eq(orders.id, ord.id));

      await tx.insert(orderStatusHistory).values({
        orderId: ord.id,
        fromStatus: 'CONFIRMED',
        toStatus: 'PREPARING',
        changedByUserId: sellerUserId,
        actorRole: 'SELLER',
        reason: 'Kitchen started preparation for batch',
      });

      await tx.insert(notifications).values({
        userId: ord.customerId,
        orderId: ord.id,
        title: 'Preparation Started',
        message: 'The kitchen has started cooking your order!',
        type: 'PREPARING',
      });
    }

    return { count: batchOrders.length };
  });
}

/**
 * Seller marks an entire batch READY
 */
export async function sellerMarkBatchReady(batchId: string, sellerUserId: string, sellerCanteenId?: string) {
  const batch = await db.query.pickupBatches.findFirst({
    where: eq(pickupBatches.id, batchId)
  });
  if (!batch) throw new Error('Batch not found');
  if (sellerCanteenId && batch.canteenId !== sellerCanteenId) {
    throw new Error('Forbidden: Cannot update batch for another canteen');
  }

  return await db.transaction(async (tx) => {
    await tx.update(pickupBatches)
      .set({ status: 'READY', readyAt: new Date() })
      .where(eq(pickupBatches.id, batchId));

    const batchOrders = await tx.select().from(orders)
      .where(and(eq(orders.batchId, batchId), inArray(orders.status, ['CONFIRMED', 'PREPARING'])));

    for (const ord of batchOrders) {
      await tx.update(orders)
        .set({ status: 'READY', readyAt: new Date(), updatedAt: new Date() })
        .where(eq(orders.id, ord.id));

      await tx.insert(orderStatusHistory).values({
        orderId: ord.id,
        fromStatus: ord.status,
        toStatus: 'READY',
        changedByUserId: sellerUserId,
        actorRole: 'SELLER',
        reason: 'Entire batch marked READY for pickup',
      });

      await tx.insert(notifications).values({
        userId: ord.customerId,
        orderId: ord.id,
        title: 'Order Ready for Pickup!',
        message: `Order #${ord.orderNumber} is ready at the counter!`,
        type: 'ORDER_READY',
      });
    }

    return { count: batchOrders.length };
  });
}

/**
 * Seller marks an order READY
 */
export async function sellerMarkOrderReady(orderId: string, sellerUserId: string, sellerCanteenId?: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId)
  });

  if (!order) throw new Error('Order not found');
  if (sellerCanteenId && order.canteenId !== sellerCanteenId) {
    throw new Error('Forbidden: Cannot mark ready for another canteen');
  }

  const [ready] = await db.update(orders)
    .set({ status: 'READY', readyAt: new Date(), updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning();

  await db.insert(orderStatusHistory).values({
    orderId,
    fromStatus: order.status,
    toStatus: 'READY',
    changedByUserId: sellerUserId,
    actorRole: 'SELLER',
    reason: 'Food is ready for collection',
  });

  await db.insert(notifications).values({
    userId: order.customerId,
    orderId,
    title: 'Order is READY!',
    message: 'Your food is ready at the pickup counter! Please present your 4-character pickup code.',
    type: 'READY',
  });

  return ready;
}

/**
 * Seller verifies customer 4-character pickup code
 * Rate-limited with temporary lockout to prevent brute-force attacks
 */
export async function sellerVerifyPickup(orderId: string, sellerUserId: string, enteredCode: string, sellerCanteenId?: string) {
  return await db.transaction(async (tx) => {
    const order = await tx.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });
    if (!order) throw new Error('Order not found');
    if (sellerCanteenId && order.canteenId !== sellerCanteenId) {
      throw new Error('Forbidden: Cannot verify pickup for another canteen');
    }

    const pc = await tx.query.pickupCodes.findFirst({
      where: eq(pickupCodes.orderId, orderId)
    });

    if (!pc) throw new Error('No pickup code found for order');
    if (pc.isVerified) throw new Error('This order has already been collected!');

    // Check temporary lockout window
    if (pc.lockedUntil && new Date() < pc.lockedUntil) {
      const waitSeconds = Math.ceil((pc.lockedUntil.getTime() - Date.now()) / 1000);
      throw new Error(`Pickup verification is temporarily locked due to repeated incorrect attempts. Please wait ${waitSeconds}s or consult the administrator.`);
    }

    const calculatedHash = hashPickupCode(enteredCode.trim(), orderId);
    const bufCalc = Buffer.from(calculatedHash, 'utf-8');
    const bufExpected = Buffer.from(pc.codeHash, 'utf-8');
    const isMatch = bufCalc.length === bufExpected.length && crypto.timingSafeEqual(bufCalc, bufExpected);

    if (!isMatch) {
      const newAttempts = pc.failedAttempts + 1;
      let lockedUntil: Date | null = null;

      if (newAttempts >= pc.maxAttempts) {
        // Lock for 3 minutes
        lockedUntil = new Date(Date.now() + 3 * 60 * 1000);
      }

      await tx.update(pickupCodes).set({
        failedAttempts: newAttempts,
        lockedUntil,
      }).where(eq(pickupCodes.id, pc.id));

      await tx.insert(auditLogs).values({
        actorId: sellerUserId,
        actorRole: 'SELLER',
        action: 'PICKUP_CODE_FAILED',
        entityType: 'ORDER',
        entityId: orderId,
        metadata: { attempts: newAttempts, isLocked: Boolean(lockedUntil) },
      });

      if (lockedUntil) {
        throw new Error('Maximum code attempts reached. Pickup verification temporarily locked for 3 minutes.');
      }

      const remaining = pc.maxAttempts - newAttempts;
      throw new Error(`Incorrect pickup code. ${remaining} attempt(s) remaining.`);
    }

    // Code matches! Complete pickup
    await tx.update(pickupCodes).set({
      isVerified: true,
      verifiedBySellerId: sellerUserId,
      verifiedAt: new Date(),
    }).where(eq(pickupCodes.id, pc.id));

    const [collectedOrder] = await tx.update(orders).set({
      status: 'COLLECTED',
      collectedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(orders.id, orderId)).returning();

    await tx.insert(orderStatusHistory).values({
      orderId,
      fromStatus: 'READY',
      toStatus: 'COLLECTED',
      changedByUserId: sellerUserId,
      actorRole: 'SELLER',
      reason: 'Pickup code verified successfully by seller',
    });

    await tx.insert(notifications).values({
      userId: collectedOrder.customerId,
      orderId,
      title: 'Order Collected',
      message: 'Your order was successfully collected. Enjoy your meal!',
      type: 'ORDER_COMPLETED',
    });

    await tx.insert(auditLogs).values({
      canteenId: order.canteenId,
      actorId: sellerUserId,
      actorRole: 'SELLER',
      action: 'ORDER_COLLECTED',
      entityType: 'ORDER',
      entityId: orderId,
    });

    return { success: true, order: collectedOrder };
  });
}
