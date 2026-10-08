# QLess Production Rules

## Core principle
QLess is a real production campus canteen ordering system.
Never implement fake/demo behavior where real persistent behavior is required.

## Architecture
- Use persistent PostgreSQL.
- Never use in-memory storage for business data.
- Never use process-local state as the source of truth.
- All sensitive business decisions happen server-side.
- Database is the source of truth.

## Security
- Never trust client-provided role.
- Never trust client-provided price.
- Never trust client-provided total.
- Never trust client-provided sellerId/canteenId.
- Never trust client-provided capacity.
- Never trust client-provided payment status.
- Never trust client-provided pickup authorization.
- Enforce authorization on the server.
- Prevent IDOR/BOLA.
- Never expose secrets to the browser.
- Never store authentication secrets in localStorage.
- Validate all API input.
- Rate-limit sensitive endpoints.

## Ordering
- Customer chooses an exact pickup time.
- Preserve the exact requested time.
- Automatically assign it to a 15-minute preparation batch.
- Batch capacity must be enforced transactionally.
- Never allow overbooking because of concurrent requests.

## Payment
- Customer does NOT pay before seller acceptance.
- Payment success must be verified server-side.
- Never trust frontend payment success.

## Pickup
- Pickup codes must be cryptographically secure.
- Code can only be used for the correct order.
- Code cannot be reused.
- Rate-limit verification attempts.

## Realtime
Realtime updates must work for:
- canteen status
- menu availability
- new orders
- order acceptance
- time changes
- payment
- preparation
- ready status
- pickup
- notifications
- batch capacity
- batch preparation quantities

If realtime disconnects:
- reconnect automatically
- show subtle reconnecting state
- refetch authoritative data

## UI
QLess should feel:
CALM + FAST + TRUSTED + LIVE + PREMIUM

Do not turn it into a generic SaaS/admin dashboard.

Keep:
- simple layouts
- limited colors
- large touch targets
- clear hierarchy
- minimal cognitive load
- mobile-first navigation
- responsive desktop layouts

## Before declaring completion (if your have permission then perform this and at the end tell what all were performed and outcome as well)
Always:
1. run lint
2. run typecheck
3. run unit tests
4. run integration tests
5. run production build
6. run browser tests
7. test mobile viewport
8. test desktop viewport
9. inspect console errors
10. inspect network errors
11. inspect authentication
12. inspect authorization
13. inspect database behavior
14. inspect realtime behavior
15. test failure cases
16. fix discovered problems
17. rerun the tests

Never say "complete" merely because the application builds.



Before changing or generating more code, inspect the entire existing QLess repository and produce an architecture report. Do not rewrite the application blindly.
Identify:
- framework
- database
- ORM
- authentication
- API structure
- realtime implementation
- payment implementation
- database schema
- role/permission system
- environment variables
- deployment configuration
- current tests
- current technical debt
- security weaknesses
- incomplete features
Then compare the existing implementation against the QLess production specification I provided.
Create a gap list:
WORKING
PARTIALLY WORKING
MISSING
SECURITY RISK
ARCHITECTURE PROBLEM
UI/UX PROBLEM
TESTING GAP
Do not rewrite working functionality unnecessarily.
Fix the highest-risk architectural and security problems first.
Then implement missing functionality.
Then run the complete browser and automated test suite.