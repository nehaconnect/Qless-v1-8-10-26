# QLess — Real-Time Campus Canteen Ordering & Operations Platform

**QLess** is a high-performance, real-time campus canteen ordering, batch preparation, and queue-elimination platform built for educational institutions with multi-seller isolation, 15-minute preparation batches, and exact pickup time management.

---

## 🚀 Key Architectural Highlights

### 1. Multi-Seller Workspace & Server-Side Data Isolation (Critical)
- **Multi-Canteen Architecture**: Every seller operates within their own isolated canteen workspace.
- **Seeded Testing Seller vs. Fresh Workspaces**:
  - `slr/soman_singh`: The primary test seller account seeded with IP Canteen's operational workspace (8 menu items, batch history, order queue).
  - `slr/zumi_nil` (and any newly registered/approved seller): Receives a **100% fresh, pristine, empty workspace** with 0 menu items, 0 categories, 0 orders, 0 batches, and 0 operational history.
- **Strict Server-Side BOLA / IDOR Protection**:
  - Every API mutation and query validates `session → seller profile → canteen ownership → requested resource`.
  - Seller A cannot view, edit, accept, or verify Seller B's menu, orders, batches, pickup codes, or settings (enforced with HTTP 403 Forbidden).
  - Validated by the automated test suite (`npm run test:isolation`).

### 2. Exact Requested Pickup Times & 15-Minute Continuous Preparation Batches
- **Strict 24-Hour Operating Format**: **08:00 to 17:00** everywhere (NO AM/PM format anywhere in the UI or backend).
- **Exact Customer Time**: Stored separately from the preparation batch (e.g., requested `13:37` remains `13:37`).
- **Continuous 15-Minute Batches**: Batches group prep load (`08:00–08:15`, `08:15–08:30`, ..., `16:45–17:00`).
- **Batch Container UI**: Sellers see clear visual hierarchy—container boxes displaying aggregate item preparation counts (`3 × Masala Dosa`, `4 × Tea`) with individual order tickets nested inside.
- **Atomic Concurrency Locks**: Batch reservation uses PostgreSQL conditional atomic updates to prevent overbooking under high traffic.

### 3. Cryptographically Secure Pickup Verification Codes
- **Generated ONLY After Verified Payment**: Plaintext pickup codes are never issued before payment confirmation.
- **Zero Plaintext Storage**: The database persists only salted SHA-256 hashes (`pickup_codes` table).
- **Format**: 4 uppercase alphanumeric characters generated via `crypto.randomBytes(4)`.
- **Brute-Force Shield**: 5 consecutive failed attempts trigger a 3-minute lockout with audit logging and seller/admin recovery paths.

### 4. 5-Section Seller Operations Interface
1. **Orders**: Incoming order requests with button-level loading states, Accept, Reject, and Suggest Time actions.
2. **Preparation**: Active preparation batches with Start Preparing, Pause, and Resume controls.
3. **Pickup**: Paid/confirmed orders ready for collection with prominent pickup code verification counter.
4. **Menu**: Full item & category management (add, edit, archive, price, daily order limit, sold-out switch, today's menu toggle).
5. **Account**: Seller username, assigned canteen, optional college email, and real server-side logout.
- Responsive layout: Desktop fixed sidebar + Mobile bottom navigation bar.

### 5. Preserved Customer Experience & Canteen Switcher
- Customers browse **Today's Menu** and **Full Menu** across available campus canteens using a multi-canteen switcher.
- Customer order flow: `REQUESTED` → `ACCEPTED` → `PAYMENT PENDING` → `CONFIRMED` → `PREPARING` → `READY` → `COLLECTED`.
- Real-time updates via Server-Sent Events (SSE) + manual refresh fallback on all views.

---

## 🛠️ Tech Stack & Production Compatibility

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Database**: Neon Serverless PostgreSQL with optimized connection pooling
- **ORM & Migrations**: Drizzle ORM (`drizzle-kit`)
- **Authentication**: Better Auth (with `username` and `phoneNumber` plugins)
- **Real-Time**: Server-Sent Events (SSE) with heartbeat streaming
- **Styling**: Tailwind CSS + Vanilla CSS tokens
- **Icons**: Lucide React
- **Payment Architecture**: Razorpay (Server-verified webhook/signature model)
- **Deployment Target**: Vercel Serverless (Zero local disk reliance, stateless architecture)

---

## 📋 Test & Demo Accounts

| Role | Username | Password | Workspace Details |
|---|---|---|---|
| **Admin** | `adm/admin_qless` | `password123` | Platform Administrator (Global oversight, View-As) |
| **Test Seller (Seeded)** | `slr/soman_singh` | `password123` | IP Canteen (8 items, existing orders & batches) |
| **New Seller (Empty)** | `slr/zumi_nil` | `password123` | Zumi Canteen (100% fresh, 0 items, 0 orders) |
| **Customer** | `ctr/siya_sen` | `password123` | IPCW Student Account |

---

## 🧪 Comprehensive Automated Test Suites

QLess includes automated verification suites covering all security, isolation, and lifecycle requirements:

```bash
# 1. Multi-Seller Isolation & BOLA/IDOR Security Tests (20 tests)
npm run test:isolation

# 2. Better Auth Registration, Username Validation & RBAC
npm run test:auth

# 3. Input Validation, Quantity Limits & BOLA Scoping (5 tests)
npm run test:security

# 4. Batch Mapping, Price Authority, Concurrency & Full Lifecycle (14 tests)
npm run test:suite

# 5. Live End-to-End Server Smoke Test (15 tests)
npm run test:smoke
```

---

## 🏃 Quick Start (Local Development)

### 1. Environment Setup
Create `.env.local` based on `.env.example`:
```env
DATABASE_URL=postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
BETTER_AUTH_SECRET=your_32_character_secret_key_here
BETTER_AUTH_URL=http://localhost:3000
RAZORPAY_KEY_ID=rzp_test_sample_key_id
RAZORPAY_KEY_SECRET=sample_razorpay_secret_key
```

### 2. Seed Database (Optional)
To re-seed test accounts and IP Canteen:
```bash
npm run seed
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

### 4. Build for Production (Vercel)
```bash
npm run build
```

---

## 📊 Database Schema (18 Production Tables)

- `colleges`: Multi-institution support (Indraprastha College for Women).
- `canteens`: Canteen profiles with operating status (`OPEN`, `TOO_BUSY`, `CLOSED`) and operating hours (`08:00:00` to `17:00:00`).
- `user`: Better Auth credentials and role categorization (`CUSTOMER`, `SELLER`, `ADMIN`).
- `session`: User sessions.
- `account`: Better Auth password and auth accounts.
- `verification`: Tokens and codes.
- `customer_profiles`: Dietary preferences and student metadata.
- `seller_profiles`: Canteen affiliation, approval status, and timestamps.
- `menu_categories`: Canteen-scoped menu categories.
- `menu_items`: Items with price, order limits, vegetarian flags, and soft-delete archive.
- `menu_item_availability`: Real-time sold-out states.
- `pickup_batches`: 15-minute continuous preparation batch windows.
- `orders`: Orders with exact requested pickup time, assigned batch, and lifecycle status.
- `order_items`: Line items with server-verified prices.
- `order_status_history`: Granular chronological order event log.
- `pickup_codes`: Salted SHA-256 pickup verification codes (zero plaintext).
- `payments`: Server-verified payment transactions.
- `audit_logs`: Immutable security and administrative audit trail.

---

## 🛡️ Security & Privacy Guarantees

- **Server-Side Authorization**: Every endpoint verifies session role and canteen ownership.
- **Zero Plaintext Secrets / Codes**: Codes are hashed with unique 16-byte cryptographically secure salts.
- **Server Price Authority**: Client-sent prices are discarded; totals are calculated from active DB records.
- **Customer Privacy**: Customer A cannot see Customer B's orders or account details.
- **Seller Privacy**: Seller A cannot view Seller B's menu, orders, batches, or revenue.
- **Admin View-As**: Allows inspection without role impersonation; underlying admin actor is recorded in `audit_logs`.
