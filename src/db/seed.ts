import * as dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { db } from "./index";
import {
  organizations,
  pumps,
  vehicles,
  drivers,
  orders,
  orderStatusEnum,
} from "./schema";

dotenv.config();

const seed = async () => {
  try {
    const [org] = await db
      .insert(organizations)
      .values({ businessName: "Apollo Logistics", kycStatus: "verified" })
      .returning();

    await db.insert(pumps).values({ id: "PUMP_01", location: "Hyderabad" }).onConflictDoNothing();

    const [vehicle] = await db
      .insert(vehicles)
      .values({
        registrationNumber: "TS-09-EA-1234",
        status: "AVAILABLE",
        pumpId: "PUMP_01",
      })
      .returning();

    const pinHash = await bcrypt.hash("1234", 10);
    const [driver] = await db
      .insert(drivers)
      .values({
        name: "Test Driver",
        phone: "9999999999",
        pinHash,
        vehicleNumber: "TS-09-EA-1234",
        pumpId: "PUMP_01",
      })
      .returning();

    const baseOrder = {
      orgId: org.id,
      customerName: "Apollo Hospital",
      customerPhone: "8888888888",
      customerAddress: "Gachibowli",
      customerArea: "Hyderabad",
      expectedVolume: "500",
      amount: "45000",
      vehicleId: vehicle.id,
      driverId: driver.id,
      pumpId: "PUMP_01",
    };

    await db.insert(orders).values([
      { ...baseOrder, status: "pending" as (typeof orderStatusEnum)[number] },
      { ...baseOrder, status: "accepted" as (typeof orderStatusEnum)[number] },
      { ...baseOrder, status: "delivered" as (typeof orderStatusEnum)[number] },
    ]);

    console.log("Seed complete.");
    process.exit(0);
  } catch (err) {
    console.error("Seed failed", err);
    process.exit(1);
  }
};

void seed();
