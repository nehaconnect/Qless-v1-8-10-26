# QLess Project-Wide Task Tracker & Audit Log

This document is the official tracking log for the QLess campus canteen ordering platform. It records the status of existing platform features, tracks new task prompts in an ordered sequence, logs test results with real evidence, and tracks GitHub/Vercel deployment status.

---

## Overall Classification Key
- `[x]` Completed and verified with evidence
- `[/]` Currently in progress
- `[ ]` Not started or not implemented
- `[!]` Failed, blocked, or requiring attention
- `[?]` Status unknown or not yet verified

---

## 1. Existing QLess Project Status (Pre-Task Audit)

This audit was conducted before starting Prompt 1 to protect existing work and prevent re-implementing working features.

### Core Architecture & Platform Modules
- `[x]` **Authentication & Role-Based Access Control**: Secure Better Auth implementation supporting username and mobile phone login with `ctr/`, `slr/`, `adm/` role prefixes. Server-side session verification via `requireAuth()`, `requireCustomer()`, `requireSeller()`, and `requireAdmin()`.
- `[x]` **Database & Schema**: Persistent PostgreSQL database managed via Drizzle ORM. 14+ tables including `colleges`, `canteens`, `seller_profiles`, `menu_categories`, `menu_items`, `pickup_batches`, `orders`, `order_items`, `order_status_history`, `pickup_codes`, `payments`, `notifications`, `audit_logs`.
- `[x]` **15-Minute Preparation Batching Engine**: Continuous 15-minute batches (8:00 AM–5:00 PM IST) without gaps. Arbitrary customer requested pickup times (e.g. 11:07 AM -> 11:00–11:15 AM) mapped with exact time preserved for customer pickup priority. Verified by 28/28 automated tests in `test-canteen-hours.ts`.
- `[x]` **Operating Hours & Canteen Status**: Authoritative operating window (8:00 AM to 5:00 PM IST). Supports OPEN, TOO_BUSY, and CLOSED statuses with seller and admin override capabilities. Automated closing after 5:00 PM IST verified.
- `[x]` **Cryptographic Pickup Code Verification**: 4-character alphanumeric uppercase pickup codes (excluding ambiguous 0/O/1/I). Plaintext code never stored in database; AES-256-GCM encryption + SHA-256 salt hashing. Rate-limited lockout against brute-force attacks verified in `test-suite.ts`.
- `[x]` **Server-Side Price Authority**: Orders calculate subtotals and grand totals strictly from database prices; client-provided prices are ignored. Verified in `test-suite.ts`.
- `[x]` **Batch Capacity & Concurrency Control**: Transactional reservation enforcement preventing overbooking when batch capacity is reached. Verified in `test-suite.ts`.
- `[x]` **Seller Portal & Kitchen UI**: 4 preparation views (All, In Progress, Ready, History), 4-digit pickup code verification, manual status toggle, menu item management.
- `[x]` **Admin Control Center**: View-as support for customer and seller interfaces, system metrics, and audit logging.
- `[x]` **Customer Receipt & Order History View**: Detailed receipt format for active and past orders, showing itemized pricing, order number, canteen location, and payment status.
- `[x]` **Past Pickup Time Rejection**: API and UI rejection of requested pickup times that have already elapsed in Indian Standard Time (IST). Verified in `validateFuturePickupTimeCanonical()`.
- `[x]` **Customer Quantity Stepper (+/−) Controls**: Fixed counter state update logic. State updates now apply atomic `+1` or `-1` transitions directly, resolving the previous compound exponential jumps (1, 3, 7, 15).
- `[x]` **Customer Menu UI Visual Alignment**: Layout overhauled to strictly match reference designs: 6-column desktop layout (`xl:grid-cols-6`), 2-column mobile layout (`grid-cols-2`), compact Grid/List toggle immediately beside search, clean category chips with scroll navigation, and prominent dish name & price hierarchy.
- `[x]` **Active & Previous Orders Lifecycle**: Implemented server-side idempotent sweep (`autoExpireUncollectedOrders`) transitioning orders uncollected 2 hours after pickup time to `EXPIRED` ("Not Collected").
- `[x]` **Customer Pre-Payment Cancellation**: Implemented `CUSTOMER_CANCEL` in `order-service.ts` and `PATCH /api/orders/[id]` allowing customer cancellation strictly before payment confirmation.

---

## 2. Tools & Services Status

| Tool / Service | Classification | Usage Details & Verification Evidence |
| :--- | :--- | :--- |
| **Git** | Used | Local repository branch `main`. Changes committed atomically and synced with GitHub. |
| **GitHub** | Configured & Used | Remote `origin` at `https://github.com/nehaconnect/Qless-v1-8-10-26.git`. Used for version control and automated Vercel CI/CD triggers. |
| **Vercel** | Configured & Used | Production deployment target at `https://qless-v1-8-10-26.vercel.app`. Automatically builds and deploys upon pushes to `main`. |
| **PostgreSQL Database** | Configured & Used | Hosted PostgreSQL on Neon/Supabase with SSL `verify-full`. Tested and verified active via `test-suite.ts` and `db.execute()`. |
| **Next.js & React** | Used | Next.js 14.2.35 App Router with React 18.3.1. Successfully passed Next.js production build (`npm run build`). |
| **Tailwind CSS** | Used | Tailwind CSS 3.4.13 with customized QLess mint/teal/navy/cream palette. |
| **Better Auth** | Configured & Used | Better Auth 1.7.7 handling credential normalization and session validation. |
| **Drizzle ORM** | Configured & Used | Drizzle ORM 0.45.4 with typed relational queries and migrations. |
| **Antigravity** | Used | Agentic development environment pairing on code audit, testing, UI alignment, and verification. |
| **Razorpay** | Configured but not live | Simulated UPI/online payment active for testing; Razorpay provider keys configured in schema. |

---

## Prompt 1: Customer Menu UI Alignment, Quantity Bug Fix & Task Tracker Setup
**Date**: October 20, 2026  
**Scope**: Root-level `TASK_TRACKER.md` documentation, customer-facing menu cards and toolbar matching references, quantity +/- bug fix, pre-payment cancellation, 2-hour uncollected order lifecycle, and verification.

### Checklist of Requirements

#### A. Task Tracker & Audit
- `[x]` 1. Inspect repository, Git history, existing code, and available test suites before making changes.
- `[x]` 2. Create `TASK_TRACKER.md` at repository root with dated sections, status classifications, and non-technical explanations.
- `[x]` 3. Document existing features, tools, test results, and limitations without altering unrelated code.

#### B. Quantity +/− Bug Fix (Priority 1)
- `[x]` 4. Trace and confirm exact root cause of quantity jumps: `updateCartQuantity(item.id, inCart.quantity +/- 1)` was passing an absolute quantity to a function treating it as a delta, causing `1 + (1+1) = 3`, `3 + (3+1) = 7`.
- `[x]` 5. One click on `+` increases quantity by exactly 1 via `handleIncrement(item)`.
- `[x]` 6. One click on `−` decreases quantity by exactly 1 via `handleDecrement(itemId)`.
- `[x]` 7. Quantity never drops below zero; reaching 0 cleanly removes item from cart.
- `[x]` 8. Quantity state unified across menu cards, cart preview, checkout page, subtotal, and grand total.
- `[x]` 9. Tested rapid successive clicks, alternating clicks, and multiple item additions.

#### C. Grid / List Toggle & Header Toolbar (Matching Reference Images)
- `[x]` 10. Position compact Grid and List toggle icons immediately to the right of the search box on mobile; matching clean layout on desktop.
- `[x]` 11. Place search magnifying glass icon cleanly inside search field.
- `[x]` 12. Unify theme using mint `#DFF3E8`, dark teal `#0B725C`, bright teal `#00B894`, navy `#073653`, and blue `#0284C7`. Removed contrasting inactive colors.
- `[x]` 13. Ensure Grid and List views preserve selected category filter, search query, and synchronized cart quantities.
- `[x]` 14. Responsive mobile layout without horizontal overflow.

#### D. Customer Menu Cards (Matching Reference Images)
- `[x]` 15. Prioritize seller-uploaded image from database; fallback to curated dish photograph.
- `[x]` 16. Standardize image container with soft rounded corners and clean aspect ratio.
- `[x]` 17. Prominent food name in bold navy (`#073653`) and price in vibrant blue (`#0284C7`).
- `[x]` 18. Hide internal availability labels ("Daily Order Limit", "In Stock", "AVAILABLE/OFF") from student view.
- `[x]` 19. Implement compact `[ - ]  0  [ + ]` stepper on cards (0 indicates not in cart, `+` adds 1, `-` decreases).
- `[x]` 20. Enforce 6-column grid on desktop screens (`xl:grid-cols-6`) matching reference image 2; 2 columns on mobile matching reference image 1.

#### E. Reorder & Pickup Slot Selection
- `[x]` 21. Preserve existing reorder flow: eligible items added to cart at today's active prices.
- `[x]` 22. Clearly inform customer if any previously ordered item is unavailable or sold out today.
- `[x]` 23. Do not silently preselect past pickup slots; force customer selection of a valid future slot.
- `[x]` 24. Validate future pickup slot in both frontend and order submission API.

#### F. Active & Previous Orders Lifecycle & 2-Hour Auto-Transition
- `[x]` 25. Active Orders tab: displays orders in progress (REQUESTED, ACCEPTED, CONFIRMED, PREPARING, READY).
- `[x]` 26. Previous Orders tab: displays final orders (COLLECTED, CANCELLED, REJECTED, EXPIRED).
- `[x]` 27. Implement server-side idempotent sweep (`autoExpireUncollectedOrders`) transitioning orders uncollected 2 hours past scheduled pickup time to `EXPIRED` (Not Collected).
- `[x]` 28. Ensure both seller and customer interfaces reflect identical authoritative status.

#### G. Pre-Payment Order Cancellation
- `[x]` 29. Implement `CUSTOMER_CANCEL` action in server order API with strict payment status verification.
- `[x]` 30. Allow customer to cancel unpaid order in `REQUESTED` or `ACCEPTED` status.
- `[x]` 31. Reject cancellation at API level if payment has already been verified or kitchen preparation has started.
- `[x]` 32. Provide clear "Cancel Order" action in customer order card with confirmation and reason tracking.

#### H. Testing, Verification & Deployment
- `[x]` 33. Run automated test suite (`npm run test:suite`): 16 Passed, 0 Failed.
- `[x]` 34. Run operating hours and pickup time validation suite (`npm run test:hours`): 28 Passed, 0 Failed.
- `[x]` 35. Execute typecheck and Next.js production build (`npm run build`): Completed with 0 errors.
- `[x]` 36. Run security validation suite (`npm run test:security`): 5 Passed, 0 Failed.
- `[/]` 37. Commit changes with clean atomic message and push to GitHub `main`.
- `[/]` 38. Verify Vercel production deployment and record live URL.

---

## 3. Files Changed & Purpose

| File Path | Description of Change |
| :--- | :--- |
| `TASK_TRACKER.md` | Project-wide tracking file auditing current platform state, tracking prompts sequentially, and logging verification evidence. |
| `src/components/CustomerPortal.tsx` | Fixed quantity counter +/− jumps with atomic increment/decrement handlers; overhauled customer menu UI to match reference designs (6 columns on desktop, 2 columns on mobile, heart favorite button, navy titles, blue price, bottom stepper, hidden internal tags, mobile search row with adjacent Grid/List icons); added pre-payment Cancel Order button in Active Orders; added "Not Collected" badge and notice in Previous Orders. |
| `src/lib/services/order-service.ts` | Added `customerCancelOrder` to enforce cancellation only before payment confirmation; added `autoExpireUncollectedOrders` to transition uncollected orders 2 hours past pickup time to `EXPIRED` with audit log and notification. |
| `src/app/api/orders/[id]/route.ts` | Added `CUSTOMER_CANCEL` action handler in PATCH endpoint with session-based customer authorization. |
| `src/app/api/orders/route.ts` | Added automatic sweep call to `autoExpireUncollectedOrders` on order retrieval, ensuring uncollected orders cleanly transition without requiring external cron schedulers. |

---

## 4. Testing & Verification Log

### Automated Tests Run
- **Test Suite (`npm run test:suite`)**:
  - Continuous 15-minute batch mapping (11:07 AM -> 11:00-11:15, 11:18 AM -> 11:15-11:30): **PASSED**
  - Server-side price authority (₹90.00 computed on server): **PASSED**
  - Pickup code zero-plaintext storage & AES-256-GCM verification: **PASSED**
  - Rate-limited pickup code lockout on repeated failed attempts: **PASSED**
  - Transactional batch capacity enforcement (reserved count bounded at 1): **PASSED**
  - End-to-end order lifecycle (REQUESTED -> ACCEPTED -> CONFIRMED -> PREPARING -> READY -> COLLECTED): **PASSED**
  - Overall: **16 Passed, 0 Failed**.
- **Canteen Hours Suite (`npm run test:hours`)**:
  - Boundary hours validation (8:00 AM - 5:00 PM IST): **PASSED**
  - 15-minute batch mappings: **PASSED**
  - Effective canteen status transitions (auto-open at 8 AM, hard-close at 5 PM): **PASSED**
  - Overall: **28 Passed, 0 Failed**.
- **Security Suite (`npm run test:security`)**:
  - Input validation & quantity limits (<= 0 rejected, non-integer rejected, > 50 rejected): **PASSED**
  - Cross-canteen seller scoping & BOLA/IDOR protection (foreign sellers blocked from accept & pickup verification): **PASSED**
  - Overall: **5 Passed, 0 Failed**.
- **Production Build (`npm run build`)**:
  - Next.js 14.2.35 compilation, type check, static page generation (19/19 routes): **PASSED (Exit Code 0)**.

---

## 5. GitHub Status
- **Current Branch**: `main`
- **Latest Remote Commit**: `645f5cb`
- **Pending Commit**: Includes `TASK_TRACKER.md`, `CustomerPortal.tsx`, `order-service.ts`, `orders/route.ts`, and `orders/[id]/route.ts`.

---

## 6. Vercel Status
- **Production URL**: `https://qless-v1-8-10-26.vercel.app`
- **Deployment Status**: Configured for continuous deployment from `main`. Will verify deployment immediately after push.

---

## 7. Outstanding Work & Next Actions
1. Commit and push verified changes to `origin/main`.
2. Monitor Vercel build and live deployment.
3. Verify live URL and finalize task tracker.
