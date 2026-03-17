import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  decimal,
} from "drizzle-orm/pg-core";

// ─── Users Table ─────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("driver"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Fuel Logs Table ─────────────────────────────────────────
// The mobileOfflineId is the critical field for offline-first sync.
// Each mobile device generates a UUID locally when a fuel log is created
// offline. This guarantees idempotent syncs — if the same log is
// pushed twice, the unique constraint on mobileOfflineId prevents duplicates.
export const fuelLogs = pgTable("fuel_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  mobileOfflineId: text("mobile_offline_id").notNull().unique(),
  volumeDispensed: decimal("volume_dispensed", {
    precision: 10,
    scale: 2,
  }).notNull(),
  locationLat: decimal("location_lat", { precision: 10, scale: 7 }),
  locationLng: decimal("location_lng", { precision: 10, scale: 7 }),
  syncStatus: text("sync_status").notNull().default("completed"),
  dispensedAt: timestamp("dispensed_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
