# AutoHub - Used Car Marketplace (SPM Innovative Assignment)

Role-based MERN prototype inspired by Cars24. One web app, one shared MongoDB database, four roles:
**Seller -> Evaluator -> Final offer -> Admin inventory -> Buyer marketplace.**

## Features

### Seller Module
- Register and log in using role-based authentication.
- Submit vehicle details and receive an inspection-based final offer.
- Book an inspection and track the vehicle status.
- View inspection reports and accept or reject the final offer.

### Evaluator Module
- View pending inspection requests.
- Record vehicle condition ratings and inspection notes.
- Submit an inspection report and set the final offer price.

### Admin Module
- Monitor vehicle submissions and dashboard statistics.
- Manage purchase and refurbishment status.
- Approve eligible vehicles for the buyer marketplace.

### Buyer Module
- Browse available used cars.
- Search and filter vehicles by relevant criteria, including price.
- View vehicle details and inspection summaries.

### Shared Backend
- Centralized MongoDB database.
- JWT-based authentication and backend role authorization.
- Centralized vehicle status management.
- REST API endpoints for communication between the frontend and backend.

## Technology Stack

| Component | Technology | Purpose |
|---|---|---|
| Frontend | React + Vite | User interface and role-based dashboards |
| Styling | CSS / Tailwind CSS | Responsive user interface |
| Backend | Node.js + Express.js | REST APIs and business logic |
| Database | MongoDB | Persistent storage of users, vehicles and inspections |
| ODM | Mongoose | MongoDB schemas and database operations |
| Authentication | JSON Web Tokens (JWT) | Authentication and role-based access |
| Password Security | bcrypt or bcryptjs, if implemented | Password hashing |
| Testing | Node.js test framework used by the project | Backend functionality and validation tests |
| Version Control | Git and GitHub | Source code management and collaboration |

## Prerequisites
- Node.js 18+ and npm
- MongoDB running locally (`mongodb://127.0.0.1:27017`) **or** a free MongoDB Atlas connection string
- Git

## Setup and run
```bash
# 1. Backend
cd backend
cp .env.example .env        # Windows: copy .env.example .env
#   edit .env: set JWT_SECRET to any long random string; set MONGO_URI if you use Atlas
npm install
npm run seed                # creates demo users + 5 sample cars (safe to re-run; it RESETS the database)
npm run dev                 # API on http://localhost:5000

# 2. Frontend (second terminal)
cd frontend
npm install
npm run dev                 # App on http://localhost:5173  (proxies /api to the backend)
```
Run `npm run seed` again before every demo/recording to return to a clean starting state.

## Demo accounts (created by the seed script; demo values only)
| Role | Email | Password |
|---|---|---|
| Seller | seller@demo.com | Seller@123 |
| Evaluator | evaluator@demo.com | Evaluator@123 |
| Admin | admin@demo.com | Admin@123 |
| Buyer | buyer@demo.com | Buyer@123 |

The login page has one-click buttons that fill these in.

## Demonstration workflow (about 6-8 minutes)
1. **Seller**: *Sell your first car*, fill make/model/km, submit. Show that the price says **"Not available yet"** (price comes only after inspection).
2. Pick an inspection date, **Book inspection**. Status becomes *Inspection Pending*. Refresh to show persistence.
3. Log out, log in as **Evaluator**: open the car in the queue, enter ratings (1-10), notes and the **offer price**, then **Submit report and send offer**.
4. **Seller** again: the **offer price set by the evaluator** and the inspection report are now visible; click **Accept offer**.
5. **Admin**: Dashboard shows counts and the submission. *Inventory*: **Mark as purchased -> Start refurbishment**. Show that *List for sale* is disabled until refurbishment is **Completed**; set it, confirm the price, **List for sale**.
6. **Buyer**: the same car is now in the marketplace. Search it, try a price filter, open it and show the inspection summary.
7. Explain: shared database, backend-enforced roles (e.g. buyer token gets 403 on admin API), single status model, and the SPM concepts from Practicals 1-8.

## Vehicle status model (one field, enforced on the backend)
`Submitted -> Inspection Pending -> Inspection Completed -> Offer Generated -> Offer Accepted / Offer Rejected`
(no automatic valuation: the evaluator enters the offer price when submitting the inspection report),
then admin: `Offer Accepted -> Purchased -> Under Refurbishment -> Available for Sale -> Sold`.
Any other change is rejected with HTTP 400 (`backend/src/utils/statusRules.js`).
A car is in the marketplace exactly when its status is `Available for Sale`.

## Tests
```bash
cd backend && npm test
```
Needs MongoDB. Uses a separate `car_marketplace_test` database (override with `MONGO_URI_TEST`), so demo data is never touched.

## Troubleshooting
- *"Cannot reach the server"* on the login page: the backend is not running, or `.env` is missing.
- *Backend exits with a MongoDB error*: MongoDB is not running, or `MONGO_URI` is wrong.
- *"JWT_SECRET is not set"*: you have not created `backend/.env` from `.env.example`.
- Port in use: change `PORT` in `backend/.env` and the proxy target in `frontend/vite.config.js`.

## Video submission checklist (from the assignment guidelines)
- All major modules visible and explained; both group members visible throughout; clear audio.
- File name: `RollNo.-1_RollNo.-2_Project System Name`.
- Evaluation window: 19-23 Oct 2026; book the appointment with your tutorial faculty in advance.
- Reseed before recording; use the sequence above.

## Project structure
```
backend/src/  config/ models/ middleware/ utils/ controllers/ routes/ seed/ tests/
frontend/src/ api/ context/ components/ pages/{seller,evaluator,admin,buyer}/ utils/
```
