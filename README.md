# MediBridge – Secure Doctor-Patient Communication Platform

MediBridge is a full-stack web application that connects **doctors** and **patients** for secure communication, appointment booking, and health-record management.

---

## Tech Stack

* **Backend**: Node.js, Express, TypeScript, Prisma ORM + PostgreSQL
* **Auth**: JWT with role-based middleware (Doctor / Patient)
* **Realtime Chat**: Socket.io (with optional AI moderation hooks)
* **Payments**: Stripe API (subscription plans for doctors)
* **Frontend**: Next.js (React) + Tailwind CSS

---

## Repository Structure

```text
.
├── backend/          # Express API + Prisma schema
└── frontend/         # Next.js web client
```

---

## Local Setup (Development)

### Prerequisites
1. **Node.js ≥ 18**
2. **PostgreSQL** running locally (or provide DATABASE_URL in `.env`)
3. **Stripe** account (for payments) – optional for initial setup

```bash
# 1. Clone repository
$ git clone <your-fork-url>
$ cd MediBridge

# 2. Install backend deps
$ cd backend
$ npm install

# 3. Configure environment
$ cp .env.example .env
#   ↳ update DATABASE_URL and JWT_SECRET

# 4. Generate Prisma client & run migrations
$ npx prisma migrate dev --name init

# 5. Start the API (with TS auto-reload)
$ npm run dev

# 6. In a new terminal, install & run frontend
$ cd ../frontend
$ npm install
$ npm run dev
```

Backend will run on **http://localhost:4000** and frontend on **http://localhost:3000**.

---

## High-Level Features

1. **Authentication / Roles**  
   • Doctor & Patient sign-up / login  
   • JWT tokens, role-based access middleware
2. **Doctor Profile**  
   • Specialty, availability schedule, subscription tier
3. **Patient Profile**  
   • DOB, contact info, health records (view-only)
4. **Appointments**  
   • Patients request, doctors accept / decline
5. **Secure Chat**  
   • Socket.io rooms per doctor-patient pair  
   • AI moderation hook (OpenAI / custom profanity filter)
6. **Subscriptions (Stripe)**  
   • Monthly / annual plans for doctors, feature gating

---

## Next Steps

* [ ] Implement remaining REST endpoints (appointments, profiles, records)
* [ ] Integrate Socket.io for realtime messaging
* [ ] Add OpenAI moderation middleware
* [ ] Build React UI in `frontend/`
* [ ] Stripe webhook handling for subscription events

---

Happy coding! :rocket: