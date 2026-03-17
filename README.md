# SmartFuel Tracker ⛽🚀

An enterprise-grade, offline-first fleet fuel logistics solution. Designed for remote environments with zero network connectivity.

## 🌟 Core Features

- **Offline-First Resilience**: Log fuel dispenses in remote mines or highways with local SQLite persistence.
- **Idempotent Sync Engine**: Client-side UUID generation prevents duplicate logs on the backend during synchronization retries.
- **Hardware Simulation**: Built-in BLE sensor mock for real-time dispensing visualization.
- **Enterprise UI**: "Rugged" dark-mode interface with network strength indicators and 24-hour analytics.
- **Atomic Transactions**: Backend processing ensures data integrity via PostgreSQL transactions and Drizzle ORM.

## 🏗️ Architecture

- **Backend**: Node.js, Express, TypeScript, PostgreSQL, Drizzle ORM.
- **Mobile**: React Native (Expo), SQLite, NativeWind (Tailwind CSS), Lucide Icons.

## 🚀 Getting Started

### Backend
```bash
# Install dependencies
npm install

# Push schema to PostgreSQL
npm run db:push

# Start dev server
npm run dev
```

### Mobile
```bash
cd mobile
npm install
npx expo start
```

## 🛠️ Scripts

- `npm run dev`: Start backend API.
- `npm run db:push`: Update DB schema.
- `npx tsx scripts/test-sync.ts`: Verify API idempotency.

---
Built with ❤️ for High-Performance Fleet Logistics.
