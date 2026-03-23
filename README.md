# SmartFuel Tracker

Offline-First BLE Fuel Delivery Platform — built on real
production patterns

![Status](https://img.shields.io/badge/Status-Active%20Development-brightgreen)
![Backend](https://img.shields.io/badge/API-Live%20on%20Railway-blue)
![Stack](https://img.shields.io/badge/Stack-React%20Native%20%7C%20Node.js%20%7C%20PostgreSQL-orange)

---

## Live

- API: https://smartfuel-tracker-production.up.railway.app
- Health Check: https://smartfuel-tracker-production.up.railway.app/api/health
- GitHub: https://github.com/Venugopal1807/smartfuel-tracker
- Demo Video: *(Recording in progress)*
- APK: *(EAS build in progress)*

---

## The Problem

Fuel delivery drivers in India operate in remote mining
sites and rural areas where network coverage drops for
hours at a time. Existing solutions stop working offline -
drivers cannot log deliveries, capture proof, or
process payments.

SmartFuel Tracker treats offline as the default state,
not an edge case.

---

## System Architecture

The complete driver workflow moves through six stages,
each designed to work with or without network connectivity:
```
Driver App (React Native)
    │
    ├── Auth (JWT + bcrypt PIN)
    ├── Orders (accept/reject lifecycle)
    ├── BLE (5s real scan → MDU fallback)
    ├── Dispense (live meter, OTP verification)
    ├── Payment (HMAC handshake → offline queue)
    └── Invoice (on-device PDF → share sheet)
           │
           │ Online: direct API calls
           │ Offline: SQLite WAL queue
           ▼
    Node.js + Express (Railway)
    /api/auth  /api/orders  /api/payments  /api/health
           │
           ▼
    PostgreSQL (Railway Managed)
    Organizations → Pumps → Vehicles
    → Drivers → Orders → Transactions → Sync Events
```

---

## Core Technical Decisions

- WAL-mode SQLite - standard SQLite locks during writes.
  WAL allows concurrent reads and writes without blocking,
  critical for high-frequency BLE data logging every 100ms

- Idempotent sync with UUID deduplication — every offline
  event gets a UUID generated on-device before any network
  call; PostgreSQL uses onConflictDoNothing to guarantee
  zero double-billing regardless of retry count

- Server-side HMAC-SHA256 payment verification — secret
  never leaves the server; client sends payment ID,
  backend generates and verifies signature internally;
  architecturally identical to Razorpay webhook verification

- BLE hybrid scan with intelligent fallback — 5-second
  real scan for MDU controllers; automatic fallback to
  simulated device ensures the complete driver workflow
  is always demo-able without physical hardware

- Heartbeat ping instead of NetInfo — NetInfo reports
  "connected" even when the router has no internet;
  the sync worker pings GET /api/health and only drains
  the queue on a genuine 200 response

---

## Known Limitations

- BLE uses simulated MDU hardware for demo — real
  Relcon MDU testing requires physical device with
  Modbus protocol support
- Payment uses internal HMAC verification — production
  deployment replaces mock payment ID with Razorpay SDK;
  backend architecture is identical
- History UI display is in progress — data layer
  complete, presentation layer pending
- Offline sync stress testing in progress — happy path
  works, edge case handling under refinement

---

## How to Run Locally
```bash
# Backend
cd server
npm install
cp .env.example .env     # add DATABASE_URL and JWT_SECRET
npx drizzle-kit push     # apply PostgreSQL schema
npm run seed             # creates org, pump, vehicle,
                         # driver, and 3 test orders
npm run dev              # starts on port 3000

# Mobile
cd mobile
npm install
# set EXPO_PUBLIC_API_URL in .env to your backend URL
npx expo start           # scan QR with Expo Go
                         # BLE requires development build:
                         # eas build --platform android
                         #           --profile development
```

---

## Test Credentials (Post-Seed)

- Driver login — Phone: `9999999999` | PIN: `1234`
- Organisation — Apollo Logistics
- Orders — 1 pending, 1 accepted, 1 delivered

---

## Technical Stack

- Mobile — React Native, Expo, TypeScript, SQLite,
  react-native-ble-plx, react-native-maps,
  expo-print, expo-sharing, Zustand
- Backend — Node.js, Express, TypeScript,
  Drizzle ORM, PostgreSQL
- Security — JWT, bcrypt PIN hashing,
  HMAC-SHA256, crypto random IDs
- Deployment — Railway (backend + database),
  Expo EAS (mobile builds)

---

## About

Venu Gopal Kunchepu — Full Stack and Mobile Developer,
Hyderabad

- Portfolio: https://venugopalk.netlify.app
- LinkedIn: https://linkedin.com/in/venugopal-kunchepu
- Email: kunchepu.venugopal@gmail.com