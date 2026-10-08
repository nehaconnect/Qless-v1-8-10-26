# QLess — Real Campus Canteen Ordering Platform

**QLess** is a high-performance, real-time campus canteen ordering and queue-elimination platform built specifically for **Indraprastha College for Women (IPCW)** — **IP Canteen**.

---

## 🚀 Key Architectural Highlights

1. **Exact Requested Pickup Times & Continuous 15-Minute Preparation Batches**
   - Customers specify their exact requested pickup time to the minute (e.g. `11:07 AM`).
   - The platform automatically aligns the order with the correct continuous 15-minute batch window (`11:00 AM - 11:15 AM`).
   - Batches run continuously from canteen opening to closing (`08:00 AM` to `05:00 PM` IST).

2. **Atomic Batch Capacity & Concurrency Protection**
   - Each 15-minute batch has an enforceable maximum preparation capacity (`capacity = 30` default).
   - Capacity reservations use strict PostgreSQL row-level locks:
     ```sql
     UPDATE pickup_batches
     SET reserved_count = reserved_count + 1
     WHERE id = $id AND reserved_count < capacity
     RETURNING *;
     ```
   - Eliminates race conditions, ensuring zero batch overbooking under high traffic.

3. **Zero Plaintext Pickup Code Storage & Brute-Force Shield**
   - Plaintext 4-character alphanumeric pickup codes are **never** stored in the database.
   - Only cryptographically salted SHA-256 hashes are persisted in `pickup_codes`.
   - Built-in rate limiting: 5 failed verification attempts trigger a 3-minute lockout with audit log capture and seller/admin recovery path.

4. **Server-Side Price Authority**
   - Client prices are never trusted. All line item amounts, sub-totals, and grand totals are strictly calculated from active menu records within a database transaction.

5. **Integrated Better Auth (Unified DB Tables)**
   - Official Better Auth integration with `username` and `phoneNumber` plugins.
   - Role enforcement via username prefixes:
     - `ctr/` → Customer
     - `slr/` → Canteen Seller
     - `adm/` → Platform Administrator
   - Unified single-schema database design (18 PostgreSQL tables).

6. **Real-time SSE (Server-Sent Events)**
   - Live queue updates, order status changes, and canteen operation status (`OPEN`, `TOO_BUSY`, `CLOSED`) stream directly to active clients without client-side polling.

7. **Admin "View-As" Support Mode**
   - Administrators can inspect the live customer or seller portals in real time.
   - All actions retain the admin's underlying identity and are recorded in immutable audit logs (`audit_logs`).

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Database**: Neon Serverless PostgreSQL
- **ORM & Migrations**: Drizzle ORM (`drizzle-kit`)
- **Authentication**: Better Auth (with username & phone number plugins)
- **Real-time**: Server-Sent Events (SSE)
- **Styling**: Tailwind CSS + Vanilla CSS tokens
- **Icons**: Lucide React
- **Payment Architecture**: Razorpay (Server-verified)

---

## 📋 Default Seed Credentials (IPCW Canteen)

The database seed script sets up a ready-to-test environment for IPCW:

| Role | Username | Password | Details |
|---|---|---|---|
| **Admin** | `adm/admin_qless` | `password123` | Platform Administrator |
| **Seller** | `slr/soman_singh` | `password123` | IP Canteen (Approved) |
| **Customer** | `ctr/siya_sen` | `password123` | IPCW Student |

---

## 🏃 Quick Start

### 1. Configure Environment
Ensure `.env.local` contains your Neon PostgreSQL connection:
```env
DATABASE_URL=postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require
BETTER_AUTH_SECRET=your_32_char_secret_here
BETTER_AUTH_URL=http://localhost:3000
```

### 2. Run Database Seeding
To seed IPCW college, IP Canteen, menu categories, items, and today's continuous batches:
```bash
npm run seed
```

### 3. Run Automated Verification Test Suite
QLess includes a 14-point automated test suite validating batch mapping, price authority, pickup hash security, concurrency, and order lifecycles:
```bash
npm run test:suite
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access QLess.

### 5. Production Build
```bash
npm run build
```

---

## 📊 Database Schema (18 Production Tables)

- `colleges`: Multi-college platform support (default: IPCW).
- `canteens`: Canteen operating status (`OPEN`, `TOO_BUSY`, `CLOSED`).
- `user`: Better Auth users table with role & phone metadata.
- `session`: Better Auth user sessions.
- `account`: Better Auth credential accounts.
- `verification`: Better Auth tokens and verification codes.
- `customer_profiles`: Customer dietary preferences & college metadata.
- `seller_profiles`: Canteen seller approval workflow & verification.
- `menu_categories`: Menu organization (Snacks, Beverages, Meals).
- `menu_items`: Menu catalog with pricing and soft-delete (`is_archived`).
- `menu_item_availability`: Real-time sold-out toggles per canteen.
- `pickup_batches`: 15-minute continuous preparation batch windows.
- `orders`: Core order lifecycle records and requested pickup times.
- `order_items`: Line items with server-snapshotted pricing.
- `order_status_history`: Granular chronological order event log.
- `pickup_codes`: Salted SHA-256 pickup verification codes.
- `payments`: Razorpay transaction logs and status tracking.
- `audit_logs`: Immutable security and administrative audit trail.

---

## 🛡️ Security Guarantees

- **Zero Plaintext Secrets**: Secrets and database connection strings are never exposed client-side.
- **Zero Plaintext Pickup Codes**: Stored strictly as salted SHA-256 hashes.
- **Role Validation**: All mutations verify active session role and canteen affiliation.
- **Zero In-Memory Fallbacks**: Neon PostgreSQL is the single source of truth.
