# QLess Security Architecture & Policies

This document outlines the security controls implemented in **QLess**.

## 1. Zero Plaintext Pickup Code Storage
Pickup codes are 4-character uppercase alphanumeric strings generated via `crypto.randomBytes(4)`:
- **Hashing**: Codes are salted with a 16-byte cryptographically secure random salt and hashed using SHA-256 (`crypto.createHash('sha256')`).
- **Storage**: Only the `salt`, `code_hash`, `attempt_count`, and `locked_until` timestamps are persisted in the `pickup_codes` table.
- **Client Delivery**: The plaintext code is returned solely to the authenticated customer who placed the order through authenticated HTTPS responses and is never logged server-side.
- **Verification**: Sellers submit the customer's presented 4-character code. The server hashes the candidate with the stored salt and performs a timing-safe buffer comparison.

## 2. Brute-Force & Rate-Limiting Protection
- If verification fails 5 times sequentially, verification is locked for 3 minutes (`locked_until`).
- While locked, all verification attempts are rejected immediately with HTTP 429.
- A security audit event (`PICKUP_VERIFICATION_LOCKED`) is recorded in `audit_logs`.
- An authorized seller or administrator can reset the attempt counter through an authenticated recovery endpoint if necessary.

## 3. Server-Side Price & Quantity Authority
- Order creation requests receive item IDs and quantities only.
- Prices submitted by the client (if any) are discarded.
- Item existence, archival status, and prices are fetched directly from PostgreSQL within a database transaction.
- If an item is archived or marked sold out in `menu_item_availability`, the transaction rolls back with a 400 error.

## 4. Atomic Concurrency & Capacity Locks
- Batch reservation is performed with conditional atomic updates:
  ```sql
  UPDATE pickup_batches
  SET reserved_count = reserved_count + 1
  WHERE id = $id AND reserved_count < capacity
  RETURNING *;
  ```
- No two concurrent transactions can increment beyond the batch capacity limit.

## 5. Role-Based Access Control (RBAC) & View-As Security
- User identity is verified via Better Auth session tokens.
- Role prefixes (`ctr/`, `slr/`, `adm/`) prevent unauthorized role assumption during registration:
  - Customers (`ctr/`) can only view and mutate their own orders.
  - Sellers (`slr/`) can only access data for their assigned canteen after administrator approval.
  - Administrators (`adm/`) cannot be created through public self-registration.
- In Admin "View-As" mode, the session retains the actual administrator's user ID. All actions are logged to `audit_logs` attributing the administrative actor.
