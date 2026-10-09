import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  varchar,
  integer,
  numeric,
  jsonb,
  time,
  date,
  uuid,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";

// ============================================================================
// 1-4. BETTER AUTH OFFICIAL TABLES (Tables 1 to 4)
// ============================================================================

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    username: text("username").unique(),
    displayUsername: text("display_username"),
    phoneNumber: text("phone_number").unique(),
    phoneNumberVerified: boolean("phone_number_verified"),
    role: text("role").default("CUSTOMER").notNull(), // 'CUSTOMER' | 'SELLER' | 'ADMIN'
    isActive: boolean("is_active").default(true).notNull(),
  },
  (table) => [
    check("chk_user_role", sql`${table.role} IN ('CUSTOMER', 'SELLER', 'ADMIN')`),
    check(
      "chk_user_username_prefix",
      sql`
        (${table.role} = 'CUSTOMER' AND ${table.username} ~ '^ctr/[a-z0-9_]{3,30}$') OR
        (${table.role} = 'SELLER'   AND ${table.username} ~ '^slr/[a-z0-9_]{3,30}$') OR
        (${table.role} = 'ADMIN'    AND ${table.username} ~ '^adm/[a-z0-9_]{3,30}$')
      `
    ),
    index("idx_user_role").on(table.role),
    index("idx_user_phone").on(table.phoneNumber),
  ]
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

// ============================================================================
// 5-8. CAMPUS & PROFILES (Tables 5 to 8)
// ============================================================================

export const colleges = pgTable("colleges", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 50 }).unique().notNull(), // 'IPCW'
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const canteens = pgTable(
  "canteens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    collegeId: uuid("college_id")
      .notNull()
      .references(() => colleges.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 255 }).notNull(), // 'IP Canteen'
    location: varchar("location", { length: 255 }).notNull(),
    operatingStatus: varchar("operating_status", { length: 20 }).default("OPEN").notNull(), // 'OPEN' | 'TOO_BUSY' | 'CLOSED'
    openingTime: time("opening_time").default("08:00:00").notNull(),
    closingTime: time("closing_time").default("17:00:00").notNull(),
    defaultBatchCapacity: integer("default_batch_capacity").default(10).notNull(),
    upiId: varchar("upi_id", { length: 100 }),
    phone: varchar("phone", { length: 20 }),
    manualOverrideStatus: varchar("manual_override_status", { length: 20 }), // 'OPEN' | 'TOO_BUSY' | 'CLOSED'
    manualOverrideDate: varchar("manual_override_date", { length: 20 }), // YYYY-MM-DD
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("chk_canteens_status", sql`${table.operatingStatus} IN ('OPEN', 'TOO_BUSY', 'CLOSED')`),
    check("chk_canteens_capacity", sql`${table.defaultBatchCapacity} >= 1`),
  ]
);

export const customerProfiles = pgTable("customer_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .unique()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  collegeId: uuid("college_id").notNull().references(() => colleges.id),
  defaultCanteenId: uuid("default_canteen_id").references(() => canteens.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sellerProfiles = pgTable(
  "seller_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .unique()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    canteenId: uuid("canteen_id").notNull().references(() => canteens.id),
    approvalStatus: varchar("approval_status", { length: 20 }).default("PENDING_APPROVAL").notNull(), // 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'
    approvedByAdminId: text("approved_by_admin_id").references(() => user.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      "chk_seller_approval_status",
      sql`${table.approvalStatus} IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED')`
    ),
    uniqueIndex("uidx_canteen_approved_seller")
      .on(table.canteenId)
      .where(sql`${table.approvalStatus} = 'APPROVED'`),
    index("idx_seller_profiles_canteen").on(table.canteenId, table.approvalStatus),
  ]
);

// ============================================================================
// 9-10. MENU CATEGORIES & ITEMS (Tables 9 to 10)
// ============================================================================

export const menuCategories = pgTable(
  "menu_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    canteenId: uuid("canteen_id")
      .notNull()
      .references(() => canteens.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("idx_categories_canteen").on(table.canteenId, table.sortOrder)]
);

export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    canteenId: uuid("canteen_id")
      .notNull()
      .references(() => canteens.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => menuCategories.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    price: numeric("price", { precision: 10, scale: 2 }), // Nullable for items with price not fixed
    isVegetarian: boolean("is_vegetarian").default(true).notNull(),
    imageUrl: text("image_url"),
    isAvailable: boolean("is_available").default(true).notNull(), // Instant Sold-Out Switch
    isTodaysMenu: boolean("is_todays_menu").default(true).notNull(), // Today's Menu vs Full Menu tab
    isArchived: boolean("is_archived").default(false).notNull(), // Soft delete preservation
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    dailyCapacity: integer("daily_capacity").default(50).notNull(),
    currentStock: integer("current_stock").default(50).notNull(),
    customizationOptions: jsonb("customization_options").default(sql`'[]'::jsonb`).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("chk_menu_items_price", sql`${table.price} IS NULL OR ${table.price} >= 0`),
    check("chk_menu_items_stock", sql`${table.currentStock} >= 0`),
    index("idx_menu_items_canteen_avail").on(
      table.canteenId,
      table.isAvailable,
      table.isTodaysMenu,
      table.isArchived
    ),
  ]
);

// ============================================================================
// 11. 15-MINUTE PREPARATION BATCHES (Table 11)
// ============================================================================

export const pickupBatches = pgTable(
  "pickup_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    canteenId: uuid("canteen_id")
      .notNull()
      .references(() => canteens.id, { onDelete: "cascade" }),
    batchDate: date("batch_date").notNull(), // Local IST calendar date (e.g. 2026-10-08)
    startTime: time("start_time").notNull(), // Continuous 15-min start (e.g. 11:00:00)
    endTime: time("end_time").notNull(), // Continuous 15-min end (e.g. 11:15:00)
    displayLabel: varchar("display_label", { length: 50 }).notNull(), // '11:00–11:15'
    capacity: integer("capacity").notNull(), // Configured preparation batch capacity
    reservedCount: integer("reserved_count").default(0).notNull(), // Active reservations
    status: varchar("status", { length: 20 }).default("UPCOMING").notNull(), // 'UPCOMING' | 'PREPARING' | 'READY' | 'COMPLETED'
    prepStartedAt: timestamp("prep_started_at", { withTimezone: true }),
    readyAt: timestamp("ready_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uidx_batches_canteen_date_time").on(table.canteenId, table.batchDate, table.startTime),
    uniqueIndex("uidx_batches_id_canteen").on(table.id, table.canteenId), // Allows composite FK from orders
    check("chk_batches_capacity_bounds", sql`${table.reservedCount} >= 0 AND ${table.reservedCount} <= ${table.capacity}`),
    check("chk_batches_status", sql`${table.status} IN ('UPCOMING', 'PREPARING', 'READY', 'COMPLETED')`),
    index("idx_batches_lookup").on(table.canteenId, table.batchDate, table.startTime),
  ]
);

// ============================================================================
// 12-14. ORDERS, ORDER ITEMS & STATUS HISTORY (Tables 12 to 14)
// ============================================================================

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderNumber: varchar("order_number", { length: 50 }).unique().notNull(), // e.g. QL-20261008-001
    customerId: text("customer_id")
      .notNull()
      .references(() => user.id),
    canteenId: uuid("canteen_id")
      .notNull()
      .references(() => canteens.id),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => pickupBatches.id, { onDelete: "restrict" }),
    
    // Customer exact requested pickup time (stored separately from batch)
    exactPickupTime: timestamp("exact_pickup_time", { withTimezone: true }).notNull(),
    sellerSuggestedTime: timestamp("seller_suggested_time", { withTimezone: true }),
    timeNegotiationStatus: varchar("time_negotiation_status", { length: 30 }).default("NONE").notNull(),
    
    status: varchar("status", { length: 30 }).default("REQUESTED").notNull(),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(), // Strictly server-calculated
    idempotencyKey: varchar("idempotency_key", { length: 128 }).unique().notNull(),
    
    paymentStatus: varchar("payment_status", { length: 20 }).default("UNPAID").notNull(),
    paymentExpiresAt: timestamp("payment_expires_at", { withTimezone: true }),
    
    rejectionReason: varchar("rejection_reason", { length: 100 }), // Verified format
    rejectionNote: text("rejection_note"),
    
    prepStartedAt: timestamp("prep_started_at", { withTimezone: true }),
    readyAt: timestamp("ready_at", { withTimezone: true }),
    collectedAt: timestamp("collected_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      "chk_orders_status",
      sql`${table.status} IN ('REQUESTED', 'ACCEPTED', 'PAYMENT_PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COLLECTED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'NO_SHOW', 'PAYMENT_FAILED')`
    ),
    check(
      "chk_orders_payment_status",
      sql`${table.paymentStatus} IN ('UNPAID', 'PENDING', 'PAID', 'REFUNDED', 'FAILED', 'EXPIRED')`
    ),
    check("chk_orders_total", sql`${table.totalAmount} >= 0`),
    index("idx_orders_canteen_status").on(table.canteenId, table.status, table.createdAt),
    index("idx_orders_customer").on(table.customerId, table.createdAt),
    index("idx_orders_batch").on(table.batchId, table.exactPickupTime),
  ]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    menuItemId: uuid("menu_item_id").references(() => menuItems.id, { onDelete: "set null" }), // Preserves history if menu item is archived
    itemName: varchar("item_name", { length: 255 }).notNull(), // Point-in-time snapshot
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(), // Server-verified price snapshot
    quantity: integer("quantity").notNull(),
    customizations: jsonb("customizations").default(sql`'[]'::jsonb`).notNull(),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  },
  (table) => [
    check("chk_order_items_qty", sql`${table.quantity} > 0`),
    check("chk_order_items_subtotal", sql`${table.subtotal} >= 0`),
    index("idx_order_items_order_id").on(table.orderId),
  ]
);

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: varchar("from_status", { length: 30 }),
    toStatus: varchar("to_status", { length: 30 }).notNull(),
    changedByUserId: text("changed_by_user_id")
      .notNull()
      .references(() => user.id),
    actorRole: varchar("actor_role", { length: 20 }).notNull(), // 'CUSTOMER' | 'SELLER' | 'ADMIN' | 'SYSTEM'
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("idx_order_status_history_order").on(table.orderId, table.createdAt)]
);

// ============================================================================
// 15. SECURE PICKUP VERIFICATION (Table 15)
// ============================================================================

export const pickupCodes = pgTable(
  "pickup_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .unique()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(), // Cryptographic hash ONLY. Zero plaintext storage.
    encryptedCode: text("encrypted_code"), // AES-256-GCM encrypted ciphertext (never plaintext)
    isVerified: boolean("is_verified").default(false).notNull(),
    failedAttempts: integer("failed_attempts").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(5).notNull(), // Configurable security limit
    lockedUntil: timestamp("locked_until", { withTimezone: true }), // Temporary lockout window, unlocks after duration or seller reset
    verifiedBySellerId: text("verified_by_seller_id").references(() => user.id),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("chk_pickup_attempts", sql`${table.failedAttempts} >= 0`),
    index("idx_pickup_codes_order").on(table.orderId),
  ]
);

// ============================================================================
// 16. PAYMENTS - V1 RAZORPAY (Table 16)
// ============================================================================

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    customerId: text("customer_id")
      .notNull()
      .references(() => user.id),
    canteenId: uuid("canteen_id")
      .notNull()
      .references(() => canteens.id),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(), // Authoritative server-calculated amount
    currency: varchar("currency", { length: 10 }).default("INR").notNull(),
    provider: varchar("provider", { length: 30 }).default("RAZORPAY").notNull(), // V1 Active Provider: RAZORPAY only
    providerOrderId: varchar("provider_order_id", { length: 100 }), // Razorpay order_id
    providerPaymentId: varchar("provider_payment_id", { length: 100 }), // Razorpay payment_id
    providerSignature: text("provider_signature"),
    status: varchar("status", { length: 20 }).default("PENDING").notNull(), // 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'EXPIRED'
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("chk_payments_v1_provider", sql`${table.provider} = 'RAZORPAY'`),
    check("chk_payments_status", sql`${table.status} IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'EXPIRED')`),
    index("idx_payments_order").on(table.orderId),
    index("idx_payments_provider_order").on(table.providerOrderId),
  ]
);

// ============================================================================
// 17. NOTIFICATIONS (Table 17)
// ============================================================================

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    actionUrl: text("action_url"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("idx_notifications_user_unread").on(table.userId, table.isRead, table.createdAt)]
);

// ============================================================================
// 18. IMMUTABLE AUDIT LOGS (Table 18)
// ============================================================================

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    canteenId: uuid("canteen_id").references(() => canteens.id),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id), // Authenticated actor
    actorRole: varchar("actor_role", { length: 20 }).notNull(), // Authenticated role (e.g. 'ADMIN')
    effectiveRole: varchar("effective_role", { length: 20 }), // Preserves View-As context ('CUSTOMER' | 'SELLER')
    action: varchar("action", { length: 100 }).notNull(), // e.g. 'ORDER_STATUS_OVERRIDE', 'PICKUP_ATTEMPT_LOCKED'
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: varchar("entity_id", { length: 100 }).notNull(),
    beforeState: jsonb("before_state"),
    afterState: jsonb("after_state"),
    metadata: jsonb("metadata"), // IP, user agent, reason notes
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_audit_logs_actor").on(table.actorId, table.createdAt),
    index("idx_audit_logs_entity").on(table.entityType, table.entityId),
  ]
);
