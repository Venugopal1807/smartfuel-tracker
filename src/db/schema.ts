import {
  pgTable,
  text,
  timestamp,
  integer,
  decimal,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Users Table ─────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").notNull().unique(),
  name: text("name").notNull(),
  pinHash: text("pin_hash").notNull(),
  role: text("role").notNull().default("DRIVER"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Pumps Table ─────────────────────────────────────────────
export const pumps = pgTable("pumps", {
  id: text("id").primaryKey(),
  location: text("location"),
  status: text("status").notNull().default("ACTIVE"),
});

// ─── Orders Table ─────────────────────────────────────────────
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id")
    .notNull()
    .references(() => users.id),
  clientName: text("client_name").notNull(),
  status: text("status").notNull().default("PENDING"), // PENDING | ACCEPTED | EN_ROUTE | DELIVERED
  expectedVolume: decimal("expected_volume", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Fuel Logs Table ─────────────────────────────────────────
// The mobileOfflineId is the critical field for offline-first sync.
// Each mobile device generates a UUID locally when a fuel log is created
// offline. This guarantees idempotent syncs — if the same log is
// pushed twice, the unique constraint on mobileOfflineId prevents duplicates.
export const fuelLogs = pgTable("fuel_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid("user_id")
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

// ─── Transactions Table ──────────────────────────────────────
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  pumpId: text("pump_id")
    .notNull()
    .references(() => pumps.id),
  volumeDispensed: decimal("volume_dispensed", { precision: 10, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  razorpayOrderId: text("razorpay_order_id"),
  status: text("status").notNull().default("PENDING"),
});

// ─── Sync Events Table ───────────────────────────────────────
export const syncEvents = pgTable("sync_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  idempotencyKey: uuid("idempotency_key").notNull().unique(),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
});

// ─── Relations ───────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  fuelLogs: many(fuelLogs),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  driver: one(users, { fields: [orders.driverId], references: [users.id] }),
  logs: many(fuelLogs),
  transactions: many(transactions),
}));

export const fuelLogsRelations = relations(fuelLogs, ({ one }) => ({
  user: one(users, { fields: [fuelLogs.userId], references: [users.id] }),
  order: one(orders, { fields: [fuelLogs.orderId], references: [orders.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  order: one(orders, { fields: [transactions.orderId], references: [orders.id] }),
  pump: one(pumps, { fields: [transactions.pumpId], references: [pumps.id] }),
}));
