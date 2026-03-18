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

// ─── Vehicles Table ──────────────────────────────────────────
export const vehicles = pgTable("vehicles", {
  id: uuid("id").primaryKey().defaultRandom(),
  registrationNumber: text("registration_number").notNull(),
  model: text("model"),
  petrolPumpId: text("petrol_pump_id").references(() => pumps.id),
  status: text("status").notNull().default("AVAILABLE"),
});

// ─── Orders Table ─────────────────────────────────────────────
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  status: text("status").notNull().default("PENDING"), // PENDING | ACCEPTED | EN_ROUTE | DELIVERED
  expectedVolume: decimal("expected_volume", { precision: 10, scale: 2 }),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerAddress: text("customer_address"),
  customerArea: text("customer_area"),
  customerLat: decimal("customer_lat", { precision: 10, scale: 7 }),
  customerLng: decimal("customer_lng", { precision: 10, scale: 7 }),
  driverId: uuid("driver_id").references(() => users.id),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id),
  pumpId: text("pump_id").references(() => pumps.id),
  scheduledDate: timestamp("scheduled_date"),
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
  vehicle: one(vehicles, { fields: [orders.vehicleId], references: [vehicles.id] }),
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

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  pump: one(pumps, { fields: [vehicles.petrolPumpId], references: [pumps.id] }),
  orders: many(orders),
}));
