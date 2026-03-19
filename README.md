# 🚀 SmartFuel Tracker: Offline-First B2B Logistics Platform

SmartFuel Tracker is a production-grade, distributed logistics system built to manage B2B fuel deliveries in remote areas with highly volatile network connectivity. 

Instead of a standard CRUD app, this platform utilizes an **Event-Driven, Offline-First Architecture**. It allows drivers to securely connect to physical fuel pumps via BLE, dispense fuel, and generate invoicing PDFs completely offline, while a background worker safely queues and syncs the data idempotently once the network is restored.

## 🏆 Core System Architecture

* **The Edge Client (React Native / Expo):** A highly responsive mobile app built with NativeWind.
* **The Offline Engine (SQLite DB):** A local event queue utilizing `WAL` (Write-Ahead Logging) mode to prevent database locks during rapid fuel-meter polling.
* **The Sync Worker:** A background service that drains the local SQLite queue, simulating exponential backoff and handling 10% mock network failures.
* **The Backend API (Node.js / Express):** A secure microservice protected by JWT authentication.
* **The Database (PostgreSQL / Drizzle ORM):** Utilizes `onConflictDoNothing` with UUIDs to guarantee exactly-once processing (Idempotency), preventing duplicate client billing during network retries.

## 🔥 Key Technical Features

1.  **Hardware Sync Simulation (BLE):** Secure OTP handshake required before unlocking the simulated fuel flow. Includes a memory-safe, live-ticking volume meter.
2.  **Geospatial Routing:** Integrated `react-native-maps` for driver routing and a "Zoning Engine" using Haversine math to restrict order acceptance to a 30km radius.
3.  **Edge PDF Generation:** Uses `expo-print` to instantly generate and share B2B invoices natively on the device, eliminating back-office delays.
4.  **AppSec & Reliability:** * Patched Express middleware for IDOR (Insecure Direct Object Reference) vulnerabilities.
    * Strict Zod validation across all API boundaries.
    * React `useRef` strict cleanup to prevent interval memory leaks during rapid screen unmounting.

## 🛠️ Tech Stack

* **Frontend:** React Native, Expo, NativeWind (Tailwind), React Navigation, React Native Maps
* **Local Storage:** Expo SQLite (Event Queue)
* **Backend:** Node.js, Express, TypeScript
* **Database:** PostgreSQL, Drizzle ORM
* **Tools:** Zod, JSON Web Tokens (JWT)

## 🚀 How to Run Locally

**1. Start the Backend API:**
\`\`\`bash
npm install
npm run dev
# Server runs on http://localhost:3000
\`\`\`

**2. Start the Mobile Client:**
\`\`\`bash
cd mobile
npm install
npx expo start --host lan
# Scan the QR code with Expo Go on your physical device
\`\`\`

*Note: To test the offline queue, connect the app, turn on Airplane Mode, accept an order, and dispense fuel. Turn Airplane Mode off and click "Sync Now" on the dashboard.*
