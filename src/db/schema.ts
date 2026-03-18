import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  decimal,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Users Table ─────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("driver"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Pumps Table ─────────────────────────────────────────────
export const pumps = pgTable("pumps", {
  id: text("id").primaryKey(),
  locationName: text("location_name"),
  status: text("status").notNull().default("ACTIVE"),
});

// ─── Orders Table ─────────────────────────────────────────────
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: integer("driver_id")
    .notNull()
    .references(() => users.id),
  clientName: text("client_name").notNull(),
  expectedVolume: decimal("expected_volume", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("PENDING"), // PENDING | ACCEPTED | DELIVERED
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
  orderId: uuid("order_id").references(() => orders.id),
  mobileOfflineId: text("mobile_offline_id").notNull().unique(),
  volumeDispensed: decimal("volume_dispensed", {
    precision: 10,
    scale: 2,
  }).notNull(),
  locationLat: decimal("location_lat", { precision: 10, scale: 7 }),
  locationLng: decimal("location_lng", { precision: 10, scale: 7 }),
  syncStatus: text("sync_status").notNull().default("completed"),
  razorpayOrderId: text("razorpay_order_id"),
  paymentStatus: text("payment_status").notNull().default("PENDING"),
  dispensedAt: timestamp("dispensed_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Relations ───────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  fuelLogs: many(fuelLogs),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  driver: one(users, { fields: [orders.driverId], references: [users.id] }),
  logs: many(fuelLogs),
}));

export const fuelLogsRelations = relations(fuelLogs, ({ one }) => ({
  user: one(users, { fields: [fuelLogs.userId], references: [users.id] }),
  order: one(orders, { fields: [fuelLogs.orderId], references: [orders.id] }),
}));
