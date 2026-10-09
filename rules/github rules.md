
# QLess GitHub Development & Version Control Rules

## GitHub Repository

Use this repository for all QLess platform code:

https://github.com/nehaconnect/QLess-v1-8-10-26

GitHub must remain synchronized with the latest completed QLess development work.

---

## Git Branch Structure

Use this branch structure:

main
↓
development
↓
feature branches

Examples:

feature/auth
feature/order-flow
feature/seller-dashboard
feature/realtime
feature/payment
feature/admin
feature/menu

Bug fixes:

fix/username-validation
fix/realtime-error
fix/pickup-code
fix/admin-login

---

## Main Branch

`main` represents the latest stable version of QLess.

Do not push experimental or knowingly broken code directly to `main`.

---

## Development Branch

`development` is used to integrate completed features before they become part of the stable `main` branch.

---

## Feature and Fix Branches

Every substantial feature, bug fix, redesign, or system improvement should have its own branch.

Do not mix unrelated changes into the same branch.

Examples:

feature/customer-order-flow

fix/username-validation

feature/admin-view-as

feature/seller-menu-management

---

## Development Workflow

Whenever the user requests any QLess change:

1. Inspect the current Git status.
2. Inspect the current branch.
3. Check whether there are existing uncommitted changes.
4. Create or use an appropriate feature/fix branch.
5. Implement the requested change.
6. Test the change.
7. Fix any errors discovered during testing.
8. Review the Git diff.
9. Verify that no secrets are included.
10. Commit the completed change.
11. Push the branch to GitHub.
12. Verify that the push succeeded.

Do not leave completed work only on the local computer.

---

## Keep Changes Separate

Do not combine unrelated changes into one commit.

For example:

fix: username validation

and

feat: seller dashboard

must remain separately identifiable.

Use clear commit messages such as:

fix: correct username validation

feat: add seller order dashboard

feat: add realtime order updates

fix: prevent batch overbooking

ui: improve customer menu

---

## Preserve Working Versions

Before making a substantial change, ensure the current working version is committed.

Never overwrite working functionality without preserving a Git version that can be restored.

If an experiment fails, keep the previous working version available through Git history.

---

## GitHub Must Stay Up To Date

After completing a requested change, GitHub should contain the corresponding code.

Do not accumulate many unrelated local changes before pushing.

The expected workflow is:

User requests change
↓
Implement
↓
Test
↓
Review
↓
Commit
↓
Push to GitHub
↓
Verify

---

## Secrets

NEVER commit:

.env
.env.local
.env.*.local
database credentials
API keys
authentication secrets
Razorpay secrets
storage credentials
private tokens
passwords

Before every push, verify that sensitive files are ignored by `.gitignore`.

Use `.env.example` with placeholder values when environment variables need to be documented.

---

## Do Not Push Unrelated Work

If unrelated uncommitted changes already exist:

- do not overwrite them;
- do not include them in the current commit;
- keep the requested change isolated.

---

## Before Every Push

Verify:

- correct repository
- correct branch
- intended files only
- no secrets
- no `.env.local`
- no `node_modules`
- no `.next`
- no unnecessary generated files
- tests/checks relevant to the change pass

---

## User Requests

For requests such as:

"fix this"

"add this"

"change this"

"improve this"

"redesign this"

"make this work"

follow:

INSPECT → IMPLEMENT → TEST → REVIEW → COMMIT → PUSH → VERIFY

Do not merely modify the local application and leave GitHub outdated.

---

## Important

Do not create a new GitHub repository for every feature.

Use one QLess repository with:

main
development
feature/fix branches
clear commits

This keeps the project organized while allowing mistakes to be identified, reviewed, reverted, and fixed later.