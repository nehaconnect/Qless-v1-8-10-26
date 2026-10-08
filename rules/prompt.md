You are acting as the senior full-stack engineer, product architect, database architect, security engineer, UI/UX designer, QA engineer, DevOps engineer and technical lead for QLess.

I am a non-technical founder. Do NOT make assumptions silently. Build the product according to the specification below.

IMPORTANT:
This is NOT a request for a visual prototype.
This must be a REAL, persistent, secure, functional web application that can be deployed through Vercel and accessed through a public URL from phones, tablets, laptops and desktops.

Do not create fake buttons, fake authentication, fake database state, fake realtime updates, fake payment success, fake notifications or mock-only workflows.

Every important button must perform a real operation.

Every important state change must persist in the database.

Every state that should be visible to another user must update in realtime.

Before considering the work complete, run tests, inspect the entire application, find bugs, fix them and repeat the tests.

==================================================
1. PRODUCT
==================================================

Product name:

QLess

Purpose:

QLess is a simple campus canteen ordering and queue-management platform.

The goal is NOT to build a large food-delivery application.

The goal is:

"Let students choose when they want to collect food, while allowing the canteen to prepare orders in manageable batches and reduce unnecessary waiting."

The system must remain extremely simple for both students and sellers.

Core principle:

STUDENT CHOOSES TIME
↓
QLess GROUPS ORDERS INTO PREPARATION BATCHES
↓
SELLER PREPARES BATCH
↓
STUDENT COLLECTS USING PICKUP CODE

==================================================
2. IMPORTANT PRODUCT PHILOSOPHY
==================================================

The application must feel:

CALM
FAST
SIMPLE
TRUSTED
LIVE
PREMIUM
HUMAN

Do not make it look like:

- generic SaaS dashboard
- college ERP
- complicated POS
- cryptocurrency dashboard
- generic AI-generated website
- overly decorative glassmorphism application

The interface must be understandable by a non-technical student or canteen worker without instructions.

The student should be able to understand:

1. Is the canteen open?
2. What food is available?
3. When can I collect it?
4. What is happening with my order?
5. What do I need to do next?

The seller should be able to understand:

1. What orders have arrived?
2. Which batch do they belong to?
3. What food quantities need to be prepared?
4. Which customer should receive food first?
5. Which orders are ready?
6. Which customer is collecting now?

==================================================
3. TECH STACK
==================================================

Use a modern production architecture.

Preferred stack:

Frontend:
- Next.js
- TypeScript
- React
- Tailwind CSS
- shadcn/ui where appropriate
- Lucide icons

Backend:
- Next.js server-side APIs/server actions where appropriate
- strict server-side authorization
- feature/service/repository architecture

Database:
- PostgreSQL
- Supabase-hosted PostgreSQL is preferred

ORM/database layer:
- Drizzle ORM or another strongly typed PostgreSQL ORM
- use whichever integrates most cleanly with the final architecture

Authentication:
- Better Auth
- username + password authentication
- phone number + password authentication
- secure HTTP-only sessions/cookies
- no plaintext passwords

Better Auth must support:
- username login
- phone-number login
- password login
- logout
- session expiration
- secure session handling
- password change
- password reset/recovery where realistically implementable

Use the username plugin and phone-number authentication capability rather than inventing a custom password system.

Realtime:
- Supabase Realtime or another production-ready managed realtime solution
- prefer secure private realtime channels / Broadcast where appropriate
- realtime must never bypass authorization

Payments:
- Razorpay for Indian payments unless an equally appropriate production gateway is already configured
- server-side payment order creation
- webhook/signature verification
- never trust client-side payment success

Deployment:
- Vercel

Storage:
- Supabase Storage or another secure object storage solution for food images

Validation:
- Zod

Testing:
- unit tests
- integration/API tests
- authorization/security tests
- end-to-end tests for the critical flows

==================================================
4. AUTHENTICATION
==================================================

Authentication is extremely important.

ONLY registered users may use the platform.

No guest ordering.

No anonymous ordering.

No fake demo login in production.

Registration must create a real database-backed account.

Login must verify credentials against the real authentication system.

Login options:

- Username + password
OR
- Mobile number + password

The login page should have ONE identifier field:

"Username or Mobile Number"

The system determines whether the user entered a username or mobile number.

Password field:

"Password"

Include:
- Remember me
- Login
- Forgot password
- Logout from Account

Do NOT add:
- Google login
- Discord login
- Facebook login
- social login
unless explicitly added later.

==================================================
5. USERNAME SYSTEM
==================================================

Username prefixes are part of the business logic.

Customer:

ctr/username

Example:

ctr/siya_sen

Seller:

slr/username

Example:

slr/soman_singh

Admin:

adm/username

Admin registration must NEVER be publicly available.

There must be no public way to create:

adm/...

Only the existing authorized administrator can create or modify admin access.

Customer registration:

Prefix:
ctr/

must be selected by default and should not be changeable to slr/ or adm/.

Seller registration:

Prefix:
slr/

must be selected by default for seller registration.

Seller accounts require administrator approval before they can access seller operations.

The backend must validate the prefix and role relationship.

Never rely only on hiding UI elements.

==================================================
6. REGISTRATION
==================================================

Customer registration fields:

Full Name
Mobile Number
Username
College
Canteen
Password
Confirm Password

Defaults:

Username prefix:
ctr/

College:
IPCW

Canteen:
IP Canteen

Username must be unique.

Mobile number must be unique.

Password must meet a reasonable secure password policy.

Do not store plaintext passwords.

Normalize mobile numbers consistently.

Normalize usernames consistently.

Use unique database constraints.

Seller registration uses:

Full Name
Mobile Number
Username
College
Canteen
Password
Confirm Password

Seller registration creates:

PENDING_APPROVAL

until administrator approval.

Currently there is:

1 college:
IPCW

1 canteen:
IP Canteen

and the current seller is already approved.

Seed this correctly through a secure seed/bootstrap mechanism rather than hardcoding credentials into frontend code.

==================================================
7. ROLE BASED ACCESS CONTROL
==================================================

Roles:

CUSTOMER
SELLER
ADMIN

Backend/database must enforce permissions.

Never trust:

role
userId
sellerId
adminId
canteenId

sent from the browser.

Determine identity from the authenticated session.

Create server-side authorization helpers such as:

requireAuth()
requireCustomer()
requireSeller()
requireAdmin()

and resource ownership checks.

CUSTOMER:
- can access own profile
- own cart
- own orders
- own payments
- own notifications
- own pickup information

SELLER:
- can access only assigned canteen
- can manage assigned menu
- can manage assigned orders
- can manage assigned batches
- can verify pickups

ADMIN:
- can access authorized administrative functions
- can view customer interface
- can view seller interface
- can inspect system operations
- can edit/manage appropriate records
- can view analytics
- can manage sellers/users/canteen settings

A customer must never be able to access seller APIs by manually entering a URL.

A seller must never be able to access admin APIs.

Frontend hiding is NOT security.

==================================================
8. ADMIN SUPPORT / IMPERSONATION MODEL
==================================================

ADMIN must be able to switch between:

VIEW AS CUSTOMER
VIEW AS SELLER
ADMIN CONTROL CENTER

without logging out.

However, do NOT implement this by changing a client-side role variable.

Implement a secure server-authorized "support/view mode".

Example:

Admin clicks:

View Customer Interface

The server knows:

real authenticated actor = ADMIN

effective interface = CUSTOMER VIEW

The admin must still be identifiable as the real admin in audit logs.

Similarly:

View Seller Interface

must show the seller interface while retaining the real admin identity.

Do not allow this capability for customers or sellers.

==================================================
9. ADMIN CONTROL CENTER
==================================================

Admin is the super-admin of the current QLess deployment.

Current setup:

College:
IPCW

Canteen:
IP Canteen

Approved seller:
existing approved seller account

Admin should be able to see:

Registered customers
Registered sellers
Orders today
Active orders
Completed orders
Cancelled orders
No-shows
Most ordered items
Total quantity sold by item
Basic order trends
Canteen status
Current capacity
Active batches
Operational alerts

Example:

CUSTOMERS
127

ORDERS TODAY
86

ACTIVE
12

COMPLETED
74

MOST ORDERED
Masala Dosa
42 orders

Admin should be able to tell this information to the seller.

Admin should have appropriate edit controls for exceptional situations.

Examples:

- correct an order state
- resolve stuck order
- modify menu
- change canteen status
- manage seller
- resolve incorrect data
- inspect customer order
- inspect seller order state

BUT:

Every admin override must create an immutable audit log.

Never silently modify production data.

==================================================
10. ADMIN LIVE VIEW
==================================================

Admin must be able to see customer and seller interfaces in realtime.

If seller changes:

Canteen status

Admin sees it.

If seller changes:

Menu

Admin sees it.

If customer creates:

Order

Admin sees it.

If seller accepts:

Order

Admin sees it.

If customer pays:

Admin sees it.

If seller starts preparing:

Admin sees it.

If order is collected:

Admin sees it.

Use realtime database-driven state.

Do not simulate realtime using local React state.

==================================================
11. CANTEEN STATUS
==================================================

Seller has three primary canteen status controls:

OPEN
TOO BUSY
CLOSED

Operating hours:

8:00 AM
to
5:00 PM

Orders can only be placed for valid pickup times within operating hours.

OPEN:

Customers can browse and place orders.

TOO BUSY:

Existing orders continue.

New orders are temporarily paused.

Customer sees:

"Canteen is currently busy. New orders are temporarily unavailable."

CLOSED:

New orders are disabled.

Existing accepted/confirmed orders may still be completed according to business rules.

Customer sees:

"Canteen Closed"

At 5:00 PM the system must automatically prevent new orders beyond the configured operating window.

Seller can close earlier manually.

Admin can override status when authorized.

Current status must be visible near the top of the customer interface.

Status updates must be realtime.

==================================================
12. CUSTOMER MENU
==================================================

Customer interface must be extremely simple.

Main screen:

Canteen status
Today's Menu
Full Menu
Food categories
Food cards
Cart

Each food item:

Image
Name
Price
Category
Availability
Optional vegetarian indicator
Quantity controls:

-
1
+

Add to cart

Do not create unnecessary complexity.

Today's Menu and Full Menu are separate views/tabs.

Seller changes to the menu must update customer interfaces in realtime.

If seller marks an item SOLD OUT:

customers immediately see it unavailable.

==================================================
13. CART
==================================================

Cart shows:

Food item
Quantity
Price
Subtotal
Total

Customer can modify quantity.

Then:

Choose Pickup Time

IMPORTANT:

Customers are allowed to select ANY valid time within the available operating window.

Do NOT force customers to choose predefined 5-minute slots.

Example:

Customer may request:

11:07 AM

11:13 AM

11:22 AM

etc.

Use a clean time picker.

However, the system automatically groups the requested time into a 15-minute preparation batch.

==================================================
14. PREPARATION BATCH LOGIC
==================================================

This is one of the most important parts of QLess.

Customer chooses an exact requested pickup time.

Example:

11:07 AM

QLess determines:

Preparation batch:
11:00–11:15

Another customer:

11:13 AM

same batch:

11:00–11:15

Another:

11:18 AM

batch:

11:15–11:30

Use continuous 15-minute batches:

11:00–11:15
11:15–11:30
11:30–11:45
11:45–12:00

Do NOT create one-minute gaps such as:

11:00–11:15
11:16–11:30

The customer's exact requested time must remain stored separately.

Example:

requested_time:
11:07

batch:
11:00–11:15

The batch is for seller preparation.

The exact requested time is for customer pickup priority.

==================================================
15. BATCH CAPACITY
==================================================

The seller must be able to control capacity.

Example:

11:00–11:15
capacity: 10

11:15–11:30
capacity: 10

11:30–11:45
capacity: 15

Capacity applies to the appropriate order/request unit defined by the business logic.

When capacity is full:

the customer cannot select that time.

Do not allow new orders to bypass capacity.

Seller may increase future capacity.

Seller may decrease future capacity only when it does not invalidate already accepted/confirmed orders.

Never allow capacity to be reduced below already committed orders.

All capacity changes must be transactional.

==================================================
16. ORDER REQUEST FLOW
==================================================

Customer:

MENU
↓
CART
↓
SELECT EXACT PICKUP TIME
↓
ORDER REQUEST

At this point:

Order status:

REQUESTED

Seller receives the request.

Seller may:

ACCEPT REQUESTED TIME

OR

SUGGEST/CHANGE PICKUP TIME

Do not implement an artificial "5 rejection limit".

If seller cannot accommodate the time:

Seller suggests another available time.

Customer sees:

"Seller suggested 11:20 AM"

Buttons:

ACCEPT
CHOOSE ANOTHER TIME

If customer chooses another time, they can submit another valid request.

==================================================
17. PAYMENT FLOW
==================================================

Do NOT charge the customer before seller acceptance.

Flow:

REQUESTED
↓
SELLER ACCEPTS TIME
↓
PAYMENT PENDING
↓
CUSTOMER PAYS
↓
PAYMENT VERIFIED
↓
CONFIRMED
↓
PREPARING
↓
READY
↓
COLLECTED

Payment must be handled securely.

Use Razorpay or another configured Indian payment gateway.

Create payment order server-side.

Never trust:

"payment successful"

sent from browser.

Verify payment on server.

Verify gateway signature/webhook.

Verify:
- amount
- currency
- order ID
- gateway payment ID
- payment status
- signature

Secrets must remain server-side.

Payment secrets must NEVER be sent to browser.

Payment secrets must NEVER be committed to Git.

==================================================
18. PAYMENT TIMEOUT
==================================================

If seller accepts an order but customer does not pay within a configured reasonable time:

Payment expires.

Order becomes:

PAYMENT_EXPIRED

Reserved capacity is released according to transaction rules.

Customer is notified.

Do not leave unpaid orders occupying capacity forever.

==================================================
19. ORDER STATE MACHINE
==================================================

Implement explicit server-side order states.

REQUESTED
ACCEPTED
PAYMENT_PENDING
CONFIRMED
PREPARING
READY
COLLECTED

Terminal/exception states:

REJECTED
CANCELLED
EXPIRED
NO_SHOW
PAYMENT_FAILED

Only valid transitions are allowed.

No client may directly set an arbitrary state.

Every transition:

- validates authenticated actor
- validates role
- validates ownership
- validates current state
- performs database transaction
- records timestamp
- creates audit event
- generates notification where appropriate
- broadcasts realtime update

==================================================
20. SELLER INTERFACE
==================================================

Seller interface must be optimized for one-handed, fast operation.

Do NOT build a complicated POS.

Seller navigation:

ORDERS
PREPARATION
PICKUP
MENU
SUMMARY
ACCOUNT

Mobile bottom navigation.

Desktop sidebar.

==================================================
21. SELLER ORDER REQUEST SCREEN
==================================================

Seller sees only batches that currently contain relevant requests.

Example:

11:00–11:15
8 requests

11:15–11:30
5 requests

11:30–11:45
2 requests

Each batch can expand/collapse.

When expanded:

show preparation summary.

Example:

Masala Dosa × 5
Sandwich × 4
Tea × 6

Then individual requests:

11:02
Siya
Masala Dosa × 1

11:06
Riya
Tea × 1

11:11
Ananya
Sandwich × 2

Seller can review individual orders.

Seller can accept requested time.

Seller can suggest a different time.

Seller can confirm the order.

==================================================
22. BATCH PREPARATION SUMMARY
==================================================

When more orders are added to a batch, the summary updates automatically.

Example:

Initially:

Masala Dosa × 5
Sandwich × 4

New order:

Masala Dosa × 2

Updated:

Masala Dosa × 7
Sandwich × 4

Seller should not need to manually calculate totals.

The system calculates them.

==================================================
23. SELLER PENDING/PAYMENT SCREEN
==================================================

Orders accepted by seller but waiting for customer payment are shown separately.

Group by preparation batch.

Example:

11:00–11:15
5 payment pending

11:15–11:30
3 payment pending

When payment succeeds, the order automatically moves to CONFIRMED.

Seller interface updates realtime.

==================================================
24. SELLER CONFIRMED/PREPARATION SCREEN
==================================================

Confirmed orders are grouped by 15-minute batch.

Example:

11:00–11:15
12 confirmed

Preparation summary:

Masala Dosa × 7
Sandwich × 5
Tea × 8

Individual customer orders remain visible underneath.

Sort customers by exact requested pickup time.

Seller should be able to see:

Customer
Pickup time
Items
Quantity
Order ID
Status

==================================================
25. START PREPARING
==================================================

Seller can click:

START PREPARING

for a batch.

This changes the appropriate order statuses.

Customers receive realtime notification:

"Your order is being prepared."

Customer order timeline changes:

ORDERED
✓

CONFIRMED
✓

PREPARING
●

READY
○

COLLECTED
○

Do not pretend preparation started before seller performs the action.

==================================================
26. PICKUP
==================================================

Every confirmed order receives a unique 4-character pickup code.

Example:

A7K2

Use cryptographically secure randomness.

Do not use Math.random().

Pickup code must not be predictable.

Prefer storing a secure hash of the pickup secret where practical.

Customer sees:

YOUR PICKUP CODE

A7K2

"Show this code at pickup."

Seller opens PICKUP.

Seller can select the relevant batch.

Seller enters the code.

Server verifies:

- seller authenticated
- seller belongs to correct canteen
- order belongs to seller canteen
- order is READY or valid pickup state
- code matches
- order is not already collected
- attempt limit not exceeded

If valid:

✓ VERIFIED

Seller can:

COMPLETE PICKUP

Order becomes:

COLLECTED

Pickup code can never be reused.

Rate-limit failed attempts.

==================================================
27. CUSTOMER ORDER PAGE
==================================================

Customer should have:

ACTIVE ORDERS
PREVIOUS ORDERS

These can be one screen with tabs.

Active order should clearly show:

Order ID
Items
Total
Requested pickup time
Batch
Current status
Payment status
Order timeline
Pickup code when available
Canteen status
Important notifications

The interface should always answer:

What is happening?
What time?
What should I do next?

==================================================
28. CUSTOMER ACCOUNT
==================================================

Account screen:

Profile name
Username
Mobile number
College
Canteen

Actions:

My Orders
Change Password
Logout

Logout must be real and invalidate the session appropriately.

Do not merely clear React state.

==================================================
29. NOTIFICATIONS
==================================================

Create a notification button visible to users.

Notification center must be realtime.

Important notifications include:

Order requested
Seller accepted
Seller changed pickup time
Payment required
Payment successful
Order confirmed
Order preparation started
Order ready
Pickup reminder
Order completed
Order cancelled
Canteen opened
Canteen became busy
Canteen closed
Important admin/system message

Users may only see their own notifications.

Never trust userId from query parameters.

Use authenticated session identity.

Support unread count.

Clicking a notification should navigate to the relevant page/order.

Where technically appropriate, support browser notifications with permission.

Do not require browser notifications for the core application to work.

==================================================
30. MENU MANAGEMENT
==================================================

Seller can:

Add item
Edit item
Change price
Change image
Change category
Add to Today's Menu
Remove from Today's Menu
Mark available
Mark SOLD OUT

Changes are persisted in database.

Changes appear realtime for customers.

Do not let client submit an authoritative price.

Server reads current database price.

==================================================
31. MENU DATA SAFETY
==================================================

When customer creates an order:

client sends:

menuItemId
quantity
customization if supported

Server fetches current menu item.

Server verifies:

- correct canteen
- active item
- available item
- valid quantity
- valid customization
- current price
- current stock if stock is enabled
- current canteen status
- valid pickup batch
- available capacity

Server calculates final total.

Never trust browser price or total.

==================================================
32. STOCK
==================================================

Keep stock simple.

Seller can mark an item:

AVAILABLE
SOLD OUT

Do not create complicated inventory management unless required.

If quantity-based stock is implemented, all stock reservations must be atomic database operations.

Never allow two simultaneous orders to oversell stock.

==================================================
33. REALTIME
==================================================

Realtime is mandatory for important state changes.

Realtime updates include:

Canteen status
Menu changes
Sold-out changes
New orders
Seller acceptance
Seller time changes
Payment status
Order status
Preparation status
Ready status
Pickup completion
Notifications
Batch counts
Batch preparation totals
Admin live view

Do not rely on process-local event emitters.

Do not use in-memory realtime state.

Use a production managed realtime service.

Prefer Supabase Realtime with secure private channels/Broadcast where appropriate.

Apply authorization/RLS correctly.

If realtime disconnects:

show subtle:

"Reconnecting..."

and recover automatically.

If realtime remains unavailable:

fall back to safe polling/refetch.

The application must never permanently lose the true database state because realtime disconnected.

==================================================
34. REALTIME SECURITY
==================================================

Never broadcast sensitive data to everyone.

Examples:

A customer must not receive another customer's:

- mobile number
- order
- payment details
- pickup code

A seller should only receive data belonging to their canteen.

Admin may receive authorized operational data.

Use private channels and appropriate authorization.

Realtime authorization must respect role and canteen ownership.

==================================================
35. DATABASE
==================================================

Use PostgreSQL as the source of truth.

Create proper normalized schema.

At minimum consider:

users
profiles
roles
colleges
canteens
seller_profiles
menu_items
menu_categories
daily_menu_items
operating_hours
canteen_status
pickup_batches
orders
order_items
payments
pickup_codes
notifications
audit_logs
admin_actions
sessions/auth tables
possibly stock records

Use:

primary keys
foreign keys
unique constraints
indexes
check constraints
timestamps
status enums where appropriate

Use database migrations.

Do not rely on manual database editing.

==================================================
36. CONCURRENCY
==================================================

This is critical.

Two students may place orders simultaneously.

Two customers may attempt to take the final available capacity simultaneously.

Two customers may order the final available item simultaneously.

Use PostgreSQL transactions and appropriate row locking/atomic updates.

Conceptually:

BEGIN
↓
validate canteen
↓
validate menu
↓
validate price
↓
validate stock
↓
validate pickup batch
↓
validate capacity
↓
reserve capacity
↓
reserve stock if applicable
↓
create order
↓
create order items
↓
create audit event
↓
COMMIT

On failure:

ROLLBACK

Never depend on JavaScript locks or in-memory locks.

==================================================
37. IDEMPOTENCY
==================================================

Prevent duplicate orders caused by:

- double clicks
- slow network
- browser retries
- mobile reconnection
- API retry

Use an idempotency key for order creation.

Same request repeated should not create two orders.

Apply similar protection to payment creation where appropriate.

==================================================
38. ADMIN ANALYTICS
==================================================

Admin should see useful operational information.

Minimum:

Registered customers
Orders today
Completed orders
Active orders
Cancelled orders
No-shows
Total items ordered
Most ordered items
Orders by hour
Basic canteen activity

Example:

Most ordered:

Masala Dosa
42

Samosa
31

Tea
27

The analytics should come from real database data.

Do not hardcode statistics.

Do not build an enormous analytics dashboard.

Keep it useful.

==================================================
39. AUDIT LOGS
==================================================

Create immutable server-side audit logs.

Record:

actor
actor role
action
entity
entity ID
canteen
timestamp
relevant metadata

Examples:

Admin changed order status.

Seller changed canteen status.

Seller changed menu item.

Admin approved seller.

Do NOT log:

passwords
session tokens
API secrets
payment secrets
pickup secrets

==================================================
40. SECURITY
==================================================

Treat browser/client as completely untrusted.

Never trust client-provided:

user ID
role
seller ID
admin ID
canteen ID
price
total
payment status
pickup status
authorization
permissions

Validate everything server-side.

Use secure authentication.

Use HTTP-only cookies.

Use Secure cookies in production.

Use SameSite protection.

Use session expiration.

Use CSRF protection where applicable.

Use rate limiting for:

login
registration
password reset
order creation
payment endpoints
pickup verification
admin mutations
seller mutations

Use Zod input validation.

Reject unexpected input where appropriate.

Limit request sizes.

Add security headers.

Use Content Security Policy carefully.

Use HSTS in production.

Use X-Content-Type-Options.

Use Referrer-Policy.

Use frame protection.

Do not expose stack traces to users.

Do not expose secrets in errors.

Do not expose sensitive information in logs.

==================================================
41. SECURITY OF PERSONAL DATA
==================================================

Customer data must be treated as sensitive.

Do not expose mobile numbers publicly.

Do not expose customer data to other customers.

Seller should only receive customer information necessary to fulfil the order.

Admin can access broader information because admin is authorized.

Minimize data sent to the browser.

Do not put secrets in:

localStorage
sessionStorage
URL query parameters
client JavaScript
public environment variables

Never expose:

DATABASE_URL
payment secret
service-role database key
authentication secret
private API keys

to the browser.

==================================================
42. DESIGN SYSTEM
==================================================

The provided visual references are the design direction.

The interface should use a soft premium light aesthetic:

- soft blue
- lavender
- indigo
- white
- very light cool-gray
- subtle gradients
- soft shadows
- subtle glass surfaces

Do NOT use many colors.

Do NOT create rainbow gradients.

Do NOT make the entire interface purple.

The login reference has:

soft blue background
raised glass-like input fields
large rounded button
blue primary CTA
soft shadows
premium tactile feel

Use this visual language.

The food application reference demonstrates:

clean cards
simple categories
clear navigation
large touch targets
simple hierarchy
minimal clutter

Combine these qualities into an ORIGINAL QLess design.

==================================================
43. COLOR SYSTEM
==================================================

Create centralized design tokens.

Suggested palette:

Background:
#F6F8FC

Surface:
#FFFFFF

Soft blue:
#EAF2FF

Primary blue:
#3B82F6

Deep blue:
#2563EB

Soft lavender:
#EEF0FF

Indigo accent:
#6366F1

Text:
#0F172A

Secondary text:
#64748B

Success:
#10B981

Warning:
#F59E0B

Danger:
#EF4444

Do not hardcode random colors throughout the project.

Create semantic tokens.

==================================================
44. UI STYLE
==================================================

Use:

- soft rounded cards
- subtle borders
- subtle shadows
- restrained glass
- clean typography
- generous whitespace
- clear hierarchy
- tactile buttons
- subtle hover effects
- subtle press effects

Buttons must feel physically raised.

Primary button:

slight gradient/solid blue
soft shadow
hover elevation
pressed state moves slightly down
disabled state
loading state

Do not create exaggerated 3D effects.

Do not use excessive animations.

==================================================
45. LOGIN PAGE
==================================================

Create a premium login page inspired by the provided blue reference.

Include:

QLess logo/brand mark
Welcome back
Username or Mobile Number
Password
Show/hide password
Remember me
Forgot password
Login

No social login.

Primary Login button should have a tactile raised effect.

When clicked:

pressed animation

Then:

loading state

Preserve button width.

Error should appear clearly but calmly.

Example:

"Incorrect username/mobile number or password."

Do not reveal which field is wrong.

==================================================
46. REGISTRATION PAGE
==================================================

Simple, clean registration form.

Customer:

Full Name
Mobile
Username prefix ctr/
Username
College = IPCW
Canteen = IP Canteen
Password
Confirm Password
Register

Seller registration:

same structure with slr/

Seller account becomes pending approval.

Use real validation.

Show clear errors.

Prevent duplicate username/mobile.

==================================================
47. MOBILE UX
==================================================

The platform must work extremely well on mobile browsers.

Do not make the desktop UI merely shrink.

Mobile:

bottom navigation

Customer:

Menu
Cart
Orders
Notifications
Account

Seller:

Orders
Preparation
Pickup
Menu
Account

Admin:

Overview
Operations
Analytics
Management
Account

Keep primary actions reachable with one hand.

Minimum touch target:

44x44px

Prefer 48x48px.

Respect safe areas.

Avoid horizontal scrolling.

==================================================
48. DESKTOP UX
==================================================

Desktop:

left sidebar navigation.

Top-right:

circular user/profile control

notification bell

Customer:
Menu
Cart
Orders
Notifications
Account

Seller:
Orders
Preparation
Pickup
Menu
Summary
Account

Admin:
Overview
Operations
Analytics
Management
Audit
View Customer
View Seller

Do not put every possible function in the primary navigation.

==================================================
49. NOTIFICATION BUTTON
==================================================

Top-right notification button.

Show unread badge.

Click opens notification panel.

Notifications update realtime.

Mobile can use notification icon in bottom navigation or top area depending on screen.

Browser notification permission is optional.

Core in-app notification must always work.

==================================================
50. RESPONSIVE SUPPORT
==================================================

Test:

320px
360px
375px
390px
412px
480px
768px
820px
1024px
1280px
1440px
1920px

Must have:

no horizontal overflow
no clipped text
no inaccessible buttons
no broken modal
no overlapping navigation
no broken bottom sheets
no keyboard overlap
no unusable seller controls

==================================================
51. ACCESSIBILITY
==================================================

Use:

semantic HTML
keyboard navigation
visible focus
accessible labels
proper heading hierarchy
ARIA only when required
adequate contrast
reduced motion
accessible status indicators

Never communicate status by color alone.

Use:

icon
label
color
optional progress indicator

==================================================
52. PERFORMANCE
==================================================

Optimize:

database queries
API payloads
images
client rendering
bundle size
realtime subscriptions

Use:

Next/Image
lazy loading
pagination
database indexes
server components where appropriate
dynamic imports for heavy components

Do not fetch every order for every user.

Do not load unnecessary admin data for customers.

==================================================
53. ARCHITECTURE
==================================================

Do NOT build one giant page/component.

Use clear feature boundaries.

Suggested structure:

src/
  app/
  components/
  features/
    auth/
    customer/
    seller/
    admin/
    orders/
    menu/
    notifications/
    payments/
    pickup/
  lib/
    auth/
    db/
    security/
    validation/
    realtime/
  server/
    services/
    repositories/
  types/

Business logic should NOT be scattered across UI components.

Preferred request flow:

UI
↓
API/server action
↓
authentication
↓
authorization
↓
Zod validation
↓
service layer
↓
repository
↓
database transaction
↓
audit
↓
notification/realtime event
↓
safe response

==================================================
54. TESTING
==================================================

Create automated tests.

Authentication:

- valid login
- wrong password
- wrong username
- wrong mobile
- logout
- expired session
- unauthorized access
- role escalation attempt

Authorization:

customer accessing seller route
customer accessing admin route
seller accessing admin route
seller accessing another canteen
customer accessing another customer's order
customer accessing another user's notification

Orders:

valid order
duplicate order
capacity exhaustion
simultaneous order creation
sold-out item
invalid menu item
invalid quantity
invalid time
canteen closed
canteen busy
seller acceptance
seller time change
customer acceptance
payment timeout
preparation
ready
pickup
collection
cancellation
no-show

Pickup:

correct code
wrong code
repeated code
already collected
wrong seller
wrong canteen
brute-force attempts

Menu:

add
edit
delete/deactivate
sold out
today's menu
full menu
realtime propagation

Realtime:

customer sees seller status update
customer sees order update
seller sees new order
seller sees payment update
admin sees live changes
notification appears realtime
reconnect after disconnect

Admin:

view customer
view seller
edit authorized data
audit log generated

==================================================
55. END-TO-END TEST
==================================================

Before declaring the application complete, execute the following full scenario.

SCENARIO:

1. Register customer:
ctr/siya_sen

2. Login as Siya.

3. Verify customer sees IP Canteen.

4. Verify canteen status.

5. Browse Today's Menu.

6. Add:
Masala Dosa x2
Tea x1

7. Open cart.

8. Select:
11:07 AM

9. Verify batch:
11:00–11:15

10. Submit order.

11. Login as seller.

12. Verify order appears under:
11:00–11:15

13. Seller accepts.

14. Customer sees:
Payment Required

15. Complete payment in sandbox/test mode.

16. Verify payment is confirmed server-side.

17. Verify customer sees:
Confirmed

18. Seller sees:
Confirmed

19. Seller clicks:
Start Preparing

20. Customer immediately sees:
Preparing

21. Seller marks:
Ready

22. Customer receives:
Ready notification

23. Customer sees pickup code.

24. Seller enters pickup code.

25. Verify pickup.

26. Order becomes:
Collected

27. Verify customer sees order in Previous Orders.

28. Verify seller sees order completed.

29. Verify admin sees updated statistics.

30. Verify audit log contains the important state changes.

==================================================
56. FAILURE TESTS
==================================================

Test:

double click order button

refresh during payment

network disconnect during order

network disconnect during seller acceptance

two users taking final capacity simultaneously

two users ordering final stock simultaneously

customer tries to manipulate price

customer tries to manipulate role

customer tries to access another order

seller tries to access another canteen

seller tries to access admin endpoint

wrong pickup code repeatedly

reused pickup code

expired payment

canteen closes while orders are active

seller becomes too busy

item becomes sold out after being viewed by customer

menu changes while cart is open

==================================================
57. ERROR UX
==================================================

Never show:

Internal Server Error
SQL errors
stack traces
database details
authentication internals

Instead:

"Something went wrong. Your order was not changed."

"Your session has expired. Please sign in again."

"That pickup code is incorrect."

"This time is no longer available."

"That item has just sold out."

Use retry actions where appropriate.

==================================================
58. SECURITY AUDIT
==================================================

Before completion, inspect the complete codebase for:

hardcoded passwords
hardcoded secrets
API keys
database credentials
payment credentials
session secrets
client-exposed secrets
role switching
IDOR
BOLA
mass assignment
unsafe redirects
XSS
CSRF
SQL injection
insecure file uploads
unsafe URLs
weak random number generation
pickup-code prediction
payment forgery
duplicate order creation
race conditions
unsafe admin operations
sensitive logging

Fix every issue found.

==================================================
59. ENVIRONMENT VARIABLES
==================================================

Create:

.env.example

Never include real secrets.

Document variables such as:

DATABASE_URL
BETTER_AUTH_SECRET
BETTER_AUTH_URL
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
PAYMENT_KEY_ID
PAYMENT_KEY_SECRET
PAYMENT_WEBHOOK_SECRET
NEXT_PUBLIC_APP_URL
STORAGE credentials where required
REALTIME configuration where required

Only public variables may use NEXT_PUBLIC_.

Never expose service-role keys or secrets to browser code.

==================================================
60. SEED DATA
==================================================

Create a development seed script.

Development seed should create:

IPCW
IP Canteen
one approved seller
one admin
sample menu items

BUT:

Never expose real production credentials.

Never hardcode production passwords in frontend.

Production admin should be initialized through a secure bootstrap process.

==================================================
61. README
==================================================

Create/update README.md.

Document:

What QLess is
Architecture
Tech stack
Authentication
Roles
Database
Realtime
Payment architecture
Environment variables
Local development
Database migrations
Seed
Testing
Security
Vercel deployment

Do not document secrets.

==================================================
62. SECURITY DOCUMENTATION
==================================================

Create:

SECURITY.md

Explain:

authentication
authorization
RBAC
database security
RLS/tenant isolation where used
session security
payment security
pickup security
rate limiting
audit logs
secret management
reporting vulnerabilities

==================================================
63. VERCEL
==================================================

Application must work on Vercel.

Do not depend on:

persistent Node processes
local filesystem
in-memory database
process-local locks
process-local event buses
long-lived server memory

All persistent state must live in external services/database.

Verify:

npm install
npm run lint
npm run typecheck
npm test
npm run build

Fix all errors.

Do not suppress errors simply to make build pass.

Do not use @ts-ignore unless absolutely unavoidable and documented.

==================================================
64. PRODUCTION ACCEPTANCE CHECKLIST
==================================================

Do NOT say "complete" until these are true:

AUTH:
[ ] registration works
[ ] login works
[ ] username login works
[ ] mobile login works
[ ] logout works
[ ] password is securely hashed
[ ] sessions are secure
[ ] role escalation is blocked

DATABASE:
[ ] PostgreSQL works
[ ] migrations exist
[ ] real persistent data
[ ] transactions exist
[ ] concurrency is handled
[ ] indexes exist
[ ] constraints exist

CUSTOMER:
[ ] menu works
[ ] cart works
[ ] arbitrary pickup time works
[ ] batch calculation works
[ ] order request works
[ ] payment works
[ ] order tracking works
[ ] notifications work
[ ] pickup code works
[ ] history works
[ ] account works
[ ] logout works

SELLER:
[ ] open works
[ ] too busy works
[ ] closed works
[ ] orders appear
[ ] batches work
[ ] preparation summary works
[ ] time changes work
[ ] menu management works
[ ] sold out works
[ ] preparation works
[ ] pickup works
[ ] capacity works

ADMIN:
[ ] admin login works
[ ] customer view works
[ ] seller view works
[ ] live data works
[ ] analytics use real data
[ ] edit controls work
[ ] seller management works
[ ] audit logs work

REALTIME:
[ ] customer updates
[ ] seller updates
[ ] admin updates
[ ] notifications
[ ] reconnect
[ ] fallback

SECURITY:
[ ] no plaintext passwords
[ ] no client-trusted roles
[ ] no sensitive secrets in frontend
[ ] no payment secret exposure
[ ] no pickup secret logging
[ ] authorization tested
[ ] rate limiting implemented
[ ] input validation implemented
[ ] secure headers
[ ] safe errors
[ ] audit logging

RESPONSIVE:
[ ] phone
[ ] tablet
[ ] laptop
[ ] desktop

DEPLOYMENT:
[ ] production build
[ ] Vercel compatible
[ ] environment variables documented
[ ] database migrations documented
[ ] deployment instructions documented

==================================================
65. VERY IMPORTANT DEVELOPMENT BEHAVIOR
==================================================

Do not blindly rewrite existing work.

First inspect the repository.

If the repository is empty or only contains a README, create the architecture from scratch.

If useful existing code exists, preserve good work and improve it.

Do not introduce unnecessary technologies.

Do not create fake abstractions just to make the code look sophisticated.

Prefer simple, understandable architecture.

Remember:

I am a non-technical founder.

The code must be maintainable by another developer.

Avoid unnecessary complexity.

==================================================
66. DO NOT OVERBUILD
==================================================

Do NOT add:

social login
delivery
loyalty points
referral commissions
complex recommendations
AI chatbot
subscriptions
multi-campus complexity
advanced inventory forecasting
unnecessary analytics
unnecessary animations
cryptocurrency
unnecessary microservices

unless explicitly required later.

Build QLess v1 properly first.

==================================================
67. FINAL UI PRINCIPLE
==================================================

The visual hierarchy should be:

STATUS
↓
TIME
↓
NEXT ACTION
↓
DETAILS

The student should never wonder:

"Where is my order?"

The system should communicate:

"QLess knows where my order is."

The seller should never wonder:

"What should I prepare?"

The system should communicate:

"Prepare this batch."

The seller should never wonder:

"Who gets served first?"

The system should show:

"Exact requested pickup time."

==================================================
68. FINAL INSTRUCTION
==================================================

Build the complete QLess v1 now.

Do not stop after creating a visual mockup.

Implement:

DATABASE
AUTHENTICATION
AUTHORIZATION
RBAC
API/SERVER LOGIC
TRANSACTIONS
CONCURRENCY
PAYMENTS
REALTIME
NOTIFICATIONS
ORDER STATE MACHINE
BATCH LOGIC
CAPACITY
MENU MANAGEMENT
PICKUP VERIFICATION
ADMIN CONTROL
AUDIT LOGGING
RESPONSIVE UI
SECURITY
TESTS
ERROR HANDLING
PERFORMANCE
VERCEL DEPLOYMENT PREPARATION

After implementation:

1. Run the application.
2. Run lint.
3. Run typecheck.
4. Run tests.
5. Run build.
6. Inspect all routes.
7. Inspect all protected APIs.
8. Test the complete student flow.
9. Test the complete seller flow.
10. Test the admin flow.
11. Test realtime.
12. Test authorization bypass attempts.
13. Test concurrency.
14. Test responsive layouts.
15. Fix all discovered problems.
16. Repeat validation.

Do not claim production-ready merely because the build succeeds.

Production-ready means:

REAL DATA
REAL AUTH
REAL AUTHORIZATION
REAL TRANSACTIONS
REAL PAYMENT VERIFICATION
REAL REALTIME
REAL TESTS
REAL ERROR HANDLING
REAL SECURITY
REAL RESPONSIVE UI

At the end, provide a concise implementation report containing:

- final architecture
- database tables
- authentication approach
- RBAC approach
- realtime approach
- payment approach
- security measures
- tests performed
- remaining configuration required from me
- exact commands to run locally
- exact Vercel deployment steps
- any issue that cannot be solved without external credentials

Do not hide unresolved issues.
Do not claim something works if it has not been tested.


The things I will want to inspect are:
1. Can a student manipulate the price?
2. Can a student change their role to seller/admin?
3. Can two students take the same last capacity?
4. Can someone see another person's order?
5. Can a fake payment mark an order paid?
6. Can a pickup code be guessed/reused?
7. Does a seller only see their canteen?
8. Does a menu change actually propagate to every connected customer?
9. Does the system remain correct if the internet drops during an order?
10. Does the database, rather than the browser, decide what is true?
