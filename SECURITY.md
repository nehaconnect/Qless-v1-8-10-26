# QLess Security Architecture & Policies

This document outlines the security controls implemented in **QLess**.

## 1. Zero Plaintext Pickup Code Storage
Pickup codes are 4-character uppercase alphanumeric strings generated via `crypto.randomBytes(4)`:
- **Hashing**: Codes are salted with a 16-byte cryptographically secure random salt and hashed using SHA-256 (`crypto.createHash('sha256')`).
- **Storage**: Only the `salt`, `code_hash`, `attempt_count`, and `locked_until` timestamps are persisted in the `pickup_codes` table.
- **Client Delivery**: The plaintext code is returned solely to the authenticated customer who placed the order through authenticated HTTPS responses and is never logged server-side.
- **Generation Timing**: The pickup code is **generated only after verified payment confirmation**. Unpaid or pending orders never expose a pickup code.
- **Verification**: Sellers submit the customer's presented 4-character code. The server hashes the candidate with the stored salt and performs a timing-safe buffer comparison.

## 2. Brute-Force & Rate-Limiting Protection
- If verification fails 5 times sequentially, verification is locked for 3 minutes (`locked_until`).
- While locked, all verification attempts are rejected immediately with HTTP 429.
- A security audit event (`PICKUP_VERIFICATION_LOCKED`) is recorded in `audit_logs`.
- An authorized seller or administrator can reset the attempt counter through an authenticated recovery endpoint if necessary.

## 3. Multi-Seller Workspace Isolation & BOLA/IDOR Defense
- **Server-Side Enforcement**: All queries and mutations validate:
  `seller session → seller profile → canteen ownership → requested resource canteen ID`.
- **Zero Frontend-Only Filtering**: Cross-canteen access is blocked on every endpoint:
  - Menu Items & Categories (`/api/menu`, `/api/menu/categories`)
  - Orders Queue & Lifecycle (`/api/orders`, `/api/orders/[id]`)
  - Pickup Code Verification (`/api/orders/[id]/verify-pickup`)
  - Batch Preparation & Capacity Management (`/api/batches`)
- **HTTP 403 Forbidden Response**: Any attempt by Seller A to mutate or read Seller B's resources returns HTTP 403.
- **Fresh Seller Workspace Guarantee**: Every newly registered seller starts with an isolated, empty workspace (0 items, 0 orders, 0 batches, 0 history). Only `slr/soman_singh` retains seeded IP Canteen test data.

## 4. Server-Side Price & Quantity Authority
- Order creation requests receive item IDs and quantities only.
- Prices submitted by the client (if any) are discarded.
- Item existence, archival status, and prices are fetched directly from PostgreSQL within a database transaction.
- If an item is archived or marked sold out in `menu_item_availability`, the transaction rolls back with a 400 error.
- Quantity bounds (1 to 50 integers) are enforced server-side.

## 5. Atomic Concurrency & Capacity Locks
- Batch reservation is performed with conditional atomic updates:
  ```sql
  UPDATE pickup_batches
  SET reserved_count = reserved_count + 1
  WHERE id = $id AND reserved_count < capacity
  RETURNING *;
  ```
- No two concurrent transactions can increment beyond the batch capacity limit.

## 6. Role-Based Access Control (RBAC) & View-As Security
- User identity is verified via Better Auth session tokens.
- Role prefixes (`ctr/`, `slr/`, `adm/`) prevent unauthorized role assumption during registration:
  - Customers (`ctr/`) can only view and mutate their own orders.
  - Sellers (`slr/`) can only access data for their assigned canteen after administrator approval.
  - Administrators (`adm/`) cannot be created through public self-registration.
- In Admin "View-As" mode, the session retains the actual administrator's user ID. All actions are logged to `audit_logs` attributing the administrative actor.
