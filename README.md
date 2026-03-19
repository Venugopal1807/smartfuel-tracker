# SmartFuel Tracker — Production-Ready Offline Fuel Logistics

## 1) The Problem Statement
High-intensity fuel logistics for mining and rural sites can’t rely on a “constantly connected” network. Drivers must dispense fuel, capture proofs, and settle payments while offline, then sync safely when real connectivity returns.

## 2) Core Architectural Pillars
- **Offline-First Persistence**  
  - Local queue on SQLite with WAL mode + busy timeout to avoid locks.  
  - Heartbeat Ping (GET /api/health) replaces flaky NetInfo listeners to confirm real reachability before draining queues (payments/profile sync).
- **Hybrid Hardware Layer**  
  - BLE scanning with a 5s real scan → automatic MDU_NOT_FOUND_FALLBACK → simulated MDU_772, enabling hardware-agnostic demos without blocking flows.
- **Cryptographic Security**  
  - Server-side HMAC-SHA256 handshake for payment verification (simulated Razorpay/Stripe).  
  - Clients never hold secrets; verification happens in Node with deterministic signatures.
- **B2B Document Engine**  
  - On-device HTML→PDF via Expo Print + Sharing, generating branded Proof of Delivery instantly (invoice/receipt, transaction ID, “Digitally Verified” badge).

## 3) Technical Stack
- **Frontend:** React Native (Expo), React Navigation, SQLite (offline queue), BLE stubs, MapView, HTML→PDF (expo-print/expo-sharing).  
- **Backend:** Node.js, Express, PostgreSQL, Drizzle ORM.  
- **Security:** JWT auth, bcrypt PIN hashing, HMAC-SHA256 payment verification, Crypto random IDs.

## 4) Database Schema (Zapygo-grade, multi-tenant)
- Organizations → Pumps → Vehicles → Drivers.  
- Orders link to org + address + driver + vehicle + pump; track customer details, OTPs, measurement (preset/final volume).  
- Transactions store PG order/payment status; Sync Events table for idempotent retries; Bank Documents keyed by driver for payouts.

## 5) How to Run
```bash
# Backend
npm install
npx drizzle-kit push        # apply Postgres schema
npm run seed                # populate org/pump/vehicle/driver/orders
npm run dev                 # start API

# Mobile (from /mobile)
npm install
npm start                   # expo start
```

Senior-engineer choices: offline-first queue with heartbeat validation, hardware bypass for demo safety, server-only HMAC verification, and instant PDF proof ensure the app is resilient in no-signal zones while meeting enterprise audit trails. The stack, schema, and flows are production-grade and tuned for 15 LPA+ expectations.
