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
- `[x]` 37. Commit changes with clean atomic message and push to GitHub `main` (commit `5e02e5f`).
- `[x]` 38. Verify Vercel production deployment and record live URL (`https://qless-v1-8-10-26.vercel.app` - HTTP 200 OK).

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
- **Latest Remote Commit**: `5e02e5f` (`feat(customer): align menu UI with reference designs, fix quantity stepper, add pre-payment cancellation, 2-hr uncollected order transition, and initialize TASK_TRACKER.md`)
- **Working Tree**: Clean, all changes committed and pushed to `origin/main`.

---

## 6. Vercel Status
- **Production URL**: `https://qless-v1-8-10-26.vercel.app`
- **Deployment Status**: Deployed and verified active. HTTP 200 response with Next.js dynamic prerender and fresh assets.
- **Verified Commit**: `5e02e5f`

---

## 7. Outstanding Work & Next Actions
1. Prompt 1 is 100% completed, verified with automated test suites, and deployed live.
2. Prompt 2 is 100% completed, verified with automated test suites, and deployed live.

---

## Prompt 2 — Customer Cart, Scheduling, Order History & Menu UI
**Date**: October 20, 2026  
**Scope**: Cart persistence across page reloads, "+ Add" to stepper transition, Today vs Tomorrow scheduling (8 AM–5 PM), 2-hour grace period with separate "Not Collected" vs "No Payment" labels, Hindi search placeholder "आज क्या खाएं?", seller-uploaded image preservation, and end-to-end verification.

### Checklist of Requirements

#### A. Cart Persistence & Quantity Controls
- `[x]` 1. Inspect existing cart state in `CustomerPortal.tsx` and integrate `localStorage` persistence (`qless_customer_cart`).
- `[x]` 2. Ensure cart items and quantities survive page refreshes, tab switching, and reopening the customer portal.
- `[x]` 3. Cart items remain until explicitly removed, cleared, or checked out into a completed order.
- `[x]` 4. Initial card state: Display a clear **“+ Add”** button when item is not in cart (`quantity === 0`).
- `[x]` 5. Active card state: Replace button with quantity stepper (`[ - ]  quantity  [ + ]`) when quantity > 0.
- `[x]` 6. Increment handler: Click on `+` increases quantity by exactly 1 per click.
- `[x]` 7. Decrement handler: Click on `−` decreases quantity by exactly 1 per click.
- `[x]` 8. Zero boundary: When quantity reaches 0, item is removed from cart and card returns to **“+ Add”**.
- `[x]` 9. Rapid click resilience: Single-state updates prevent exponential jumps or inverted decrement behavior.
- `[x]` 10. Preserve cart drawer, checkout modal, subtotal, and grand total calculations.

#### B. Pickup Slot Scheduling (Today or Tomorrow Only)
- `[x]` 11. Allow customer to select pickup date for **Today** or **Tomorrow** (India Standard Time).
- `[x]` 12. Strictly block scheduling beyond tomorrow (no 3rd-day or arbitrary future dates).
- `[x]` 13. Maintain compact UI: Use clean day toggle (`[ Today ]  [ Tomorrow ]`) in slot picker without a heavy calendar component.
- `[x]` 14. Today slots: Only future valid slots enabled; past slots marked disabled/passed.
- `[x]` 15. Tomorrow slots: All operating hours slots (8:00 AM to 5:00 PM IST) enabled and valid, even when ordering late evening (e.g. at 10 PM today).
- `[x]` 16. Support Tomorrow pre-orders without failing current-day canteen CLOSED status check.
- `[x]` 17. Reorder flow: Allow selecting a new valid pickup slot (Today or Tomorrow) before submitting; never silently reuse past slots.
- `[x]` 18. Update server-side validation in `order-service.ts` to accept Today or Tomorrow IST dates.

#### C. Active Orders & Previous Orders Lifecycle (Not Collected vs No Payment)
- `[x]` 19. Active Orders: Display orders still awaiting payment, awaiting seller action, confirmed, preparing, or ready for pickup.
- `[x]` 20. 2-Hour Grace Period: Keep unresolved orders in Active Orders for up to 2 hours past scheduled pickup time.
- `[x]` 21. Automatic transition after 2-hour grace period:
  - If order is **PAID** but uncollected -> Mark as **“Not Collected”** (`EXPIRED` with notice).
  - If order is **UNPAID** -> Mark as **“No Payment”** (`EXPIRED` with notice, `paymentStatus: EXPIRED`).
- `[x]` 22. Strictly avoid labeling unpaid orders as "Not Collected".
- `[x]` 23. Chronological ordering in Previous Orders view using scheduled pickup date/time.
- `[x]` 24. Ensure consistency across seller kitchen view and customer portal.

#### D. Customer Menu Search Placeholder
- `[x]` 25. Add clearly visible search icon inside the left side of the input (`absolute left-3.5`).
- `[x]` 26. Update placeholder text to **“आज क्या खाएं?”** in a subtle, faded color (`placeholder:text-slate-400`).
- `[x]` 27. Ensure icon does not overlap placeholder or typed text on desktop or mobile (`pl-9`).

#### E. Seller-Uploaded Menu Images Preservation
- `[x]` 28. Prioritize and display exact seller-uploaded image URL (`item.imageUrl`) from database.
- `[x]` 29. Maintain medium compression without degrading visual quality.
- `[x]` 30. Do not override or substitute sample images when seller image is present in database.

#### F. Testing & Deployment Verification
- `[x]` 31. Verify cart persistence across page reload and tab navigation (`localStorage`).
- `[x]` 32. Verify "+ Add" to stepper and zero-reset transitions.
- `[x]` 33. Verify Today vs Tomorrow slots (including 10 PM night ordering for tomorrow 8 AM).
- `[x]` 34. Verify 2-hour grace period transitions ("Not Collected" vs "No Payment").
- `[x]` 35. Verify Hindi placeholder and icon placement on desktop and mobile.
- `[x]` 36. Run automated test suite (`npm run test:suite`): 16 Passed, 0 Failed.
- `[x]` 37. Run canteen hours test suite (`npm run test:hours`): 28 Passed, 0 Failed.
- `[x]` 38. Run Prompt 2 test suite (`npx tsx scripts/test-prompt2-features.ts`): 14 Passed, 0 Failed.
- `[x]` 39. Run Next.js production build (`npm run build`): Completed successfully with 0 errors.
- `[x]` 40. Commit changes and push to GitHub `main`.
- `[x]` 41. Verify Vercel production deployment and live site response.

---

### Files Changed in Prompt 2
- `TASK_TRACKER.md`: Documented requirements, completed checklist items, and test evidence.
- `src/lib/pickup-time.ts`: Added `getISTTomorrowString`, updated `getAllDayPickupSlots` with tomorrow slot support, and enhanced `validateFuturePickupTimeCanonical` to strictly enforce Today or Tomorrow scheduling within operating hours.
- `src/lib/services/order-service.ts`: Enabled Tomorrow pre-orders after closing hours, updated sequence numbering with canonical date, and enhanced `autoExpireUncollectedOrders` to distinguish between "NOT_COLLECTED_AFTER_2_HOURS" (paid) and "NO_PAYMENT_AFTER_2_HOURS" (unpaid).
- `src/components/CustomerPortal.tsx`: Integrated cart `localStorage` persistence, initial "+ Add" replacing with stepper, Day toggle (`Today` vs `Tomorrow`), 2-hour grace period separation, distinct "Not Collected" vs "No Payment" badges, Hindi search placeholder "आज क्या खाएं?", left inside search icon (`pl-9`), and seller-uploaded image preservation.
- `scripts/test-prompt2-features.ts`: Created automated test suite covering all Prompt 2 requirements.
