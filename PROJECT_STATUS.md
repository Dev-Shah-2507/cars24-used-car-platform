# Project Status

## Final state: all five mandatory modules implemented and tested. Optional test-drive booking NOT implemented (out of scope).

| Module | Status |
|---|---|
| 1. Authentication and role-based access | Done (JWT + bcrypt, backend role middleware) |
| 2. Seller submission, inspection booking, offer decision | Done |
| 3. Evaluator queue, inspection report, evaluator-set offer price | Done |
| 4. Admin dashboard, inventory, refurbishment, listing | Done |
| 5. Buyer marketplace, search/filters, details + inspection summary | Done |

## Design decisions
- No separate Listing model. `Vehicle` holds `status`, `refurbishmentStatus`, `sellingPrice`; listed == `status 'Available for Sale'`.
- All status changes go through `backend/src/utils/statusRules.js`; status-changing updates are atomic (conditional on the current status).
- "Inspection Scheduled" is the Inspection record's status; the Vehicle stays `Inspection Pending`.
- **Pricing change:** there is no estimated quote and no valuation formula. The evaluator enters the offer price (required, positive, validated on the backend) when submitting the inspection report; that value becomes `Vehicle.finalOffer`. The seller sees "Not available yet" until then.
- Evaluator queue is shared (any evaluator sees all; the submitting evaluator is recorded).
- Buyers never receive seller identity or the final offer.
- Admin's suggested selling price (offer x 1.2) is pre-filled but editable.
- Seeded sample stock is owned by an internal `stock@demo.com` account (not for login) so the demo seller starts empty.

## Verification performed (honest summary)
Environment note: the build sandbox had no MongoDB, so verification used **FerretDB 1.24 (MongoDB-compatible, SQLite backend)** - not MongoDB itself.
- `npm test`: 3 suites, 32 tests, all passed (auth/roles, seller, evaluator incl. offer-price validation, offer decision, admin transitions, buyer visibility, filters, sold removal).
- Seed script ran successfully (4 users + stock owner, 5 vehicles with inspections).
- HTTP end-to-end script through the Vite proxy: 31/31 checks passed (full workflow, 401/403/400/404 cases, persistence across a new login).
- Real browser (headless Chromium) UI run through the full demo as all four roles: 16/16 steps passed, status persists after refresh,
  buyer redirected from /admin, buyer token receives 403 from the admin API, no horizontal overflow at 390px width. No unexpected console errors.
- `vite build` succeeds.

## NOT verified
- Against a genuine MongoDB server or Atlas (expected to work; same driver/queries, but not run). Please run `npm run seed` and `npm test` once on your machine.
- Browsers other than Chromium; a real phone.

## Known limitations (by design / scope)
- No self-registration (demo accounts only); no image upload (static sample image); JWT in localStorage.
- Top navigation links are hidden on phone-width screens (pages are still reachable via on-page buttons).
- Seeding wipes all data; do not run it against a database you want to keep.
- Test-drive booking (optional feature) not built.
