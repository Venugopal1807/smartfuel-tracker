import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  boolean,
  integer,
  jsonb,
  serial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const kycStatusEnum = ["pending", "verified", "rejected"] as const;
export const orderStatusEnum = ["pending", "confirmed", "in_transit", "delivered"] as const;

// Organizations
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessName: text("business_name").notNull(),
  kycStatus: text("kyc_status", { enum: kycStatusEnum }).notNull().default("pending"),
});

// Pumps
export const pumps = pgTable("pumps", {
  id: text("id").primaryKey(),
  location: text("location"),
  status: text("status").notNull().default("ACTIVE"),
});

// Drivers
export const drivers = pgTable("drivers", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").notNull().unique(),
  name: text("name").notNull(),
  pinHash: text("pin_hash").notNull(),
  vehicleNumber: text("vehicle_number"),
  pumpId: text("pump_id").references(() => pumps.id),
});

// Vehicles
export const vehicles = pgTable("vehicles", {
  id: uuid("id").primaryKey().defaultRandom(),
  registrationNumber: text("registration_number").notNull(),
  capacity: numeric("capacity"),
  currentFuelLevel: numeric("current_fuel_level"),
  pumpId: text("pump_id").references(() => pumps.id),
  status: text("status").notNull().default("AVAILABLE"),
});

// Organization Addresses (support org_address_id FK)
export const orgAddresses = pgTable("org_addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id),
  address: text("address"),
  area: text("area"),
  city: text("city"),
  state: text("state"),
  lat: numeric("lat", { precision: 10, scale: 7 }),
  lng: numeric("lng", { precision: 10, scale: 7 }),
});

// Orders
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: serial("order_number"),
  orgId: uuid("org_id").references(() => organizations.id),
  orgAddressId: uuid("org_address_id").references(() => orgAddresses.id),
  driverId: uuid("driver_id").references(() => drivers.id),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id),
  pumpId: text("pump_id").references(() => pumps.id),
  status: text("status", { enum: orderStatusEnum }).notNull().default("pending"),
  expectedVolume: numeric("expected_volume", { precision: 10, scale: 2 }),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerAddress: text("customer_address"),
  customerArea: text("customer_area"),
  securityOrderOtp: text("order_otp"),
  securityCloseOtp: text("close_otp"),
  securityBypassOtp: text("bypass_otp"),
  measurementPresetType: text("preset_type"),
  measurementQuantity: numeric("quantity", { precision: 10, scale: 2 }),
  measurementFinalVolume: numeric("final_volume_dispersed", { precision: 10, scale: 2 }),
  scheduledDate: timestamp("scheduled_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Transactions
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id),
  pumpId: text("pump_id").references(() => pumps.id),
  volumeDispensed: numeric("volume_dispensed", { precision: 10, scale: 2 }),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  razorpayOrderId: text("razorpay_order_id"),
  status: text("status").notNull().default("PENDING"),
});

// MDU Controllers
export const mduControllers = pgTable("mdu_controllers", {
  mduCode: text("mdu_code").primaryKey(),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id),
  isActive: boolean("is_active").notNull().default(true),
});

// Bank Documents
export const bankDocuments = pgTable("bank_documents", {
  driverId: uuid("driver_id").primaryKey().references(() => drivers.id),
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  ifscCode: text("ifsc_code"),
});

// Sync Events
export const syncEvents = pgTable("sync_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  idempotencyKey: uuid("idempotency_key").notNull().unique(),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
});

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  orders: many(orders),
  addresses: many(orgAddresses),
}));

export const driversRelations = relations(drivers, ({ one }) => ({
  pump: one(pumps, { fields: [drivers.pumpId], references: [pumps.id] }),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  pump: one(pumps, { fields: [vehicles.pumpId], references: [pumps.id] }),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  org: one(organizations, { fields: [orders.orgId], references: [organizations.id] }),
  orgAddress: one(orgAddresses, { fields: [orders.orgAddressId], references: [orgAddresses.id] }),
  driver: one(drivers, { fields: [orders.driverId], references: [drivers.id] }),
  vehicle: one(vehicles, { fields: [orders.vehicleId], references: [vehicles.id] }),
  pump: one(pumps, { fields: [orders.pumpId], references: [pumps.id] }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  order: one(orders, { fields: [transactions.orderId], references: [orders.id] }),
  pump: one(pumps, { fields: [transactions.pumpId], references: [pumps.id] }),
}));

export const mduControllersRelations = relations(mduControllers, ({ one }) => ({
  vehicle: one(vehicles, { fields: [mduControllers.vehicleId], references: [vehicles.id] }),
}));

export const bankDocumentsRelations = relations(bankDocuments, ({ one }) => ({
  driver: one(drivers, { fields: [bankDocuments.driverId], references: [drivers.id] }),
}));
