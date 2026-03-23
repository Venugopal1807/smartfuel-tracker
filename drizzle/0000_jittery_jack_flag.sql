CREATE TABLE "bank_documents" (
	"driver_id" uuid PRIMARY KEY NOT NULL,
	"bank_name" text,
	"account_number" text,
	"ifsc_code" text
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"name" text NOT NULL,
	"pin_hash" text NOT NULL,
	"vehicle_number" text,
	"pump_id" text,
	CONSTRAINT "drivers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "fuel_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mobile_offline_id" text NOT NULL,
	"user_id" uuid,
	"volume_dispensed" numeric(10, 2),
	"location_lat" numeric(10, 7),
	"location_lng" numeric(10, 7),
	"sync_status" text DEFAULT 'completed',
	"dispensed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "fuel_logs_mobile_offline_id_unique" UNIQUE("mobile_offline_id")
);
--> statement-breakpoint
CREATE TABLE "mdu_controllers" (
	"mdu_code" text PRIMARY KEY NOT NULL,
	"vehicle_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" serial NOT NULL,
	"org_id" uuid,
	"org_address_id" uuid,
	"driver_id" uuid,
	"vehicle_id" uuid,
	"pump_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expected_volume" numeric(10, 2),
	"amount" numeric(12, 2),
	"customer_name" text,
	"customer_phone" text,
	"customer_address" text,
	"customer_area" text,
	"order_otp" text,
	"close_otp" text,
	"bypass_otp" text,
	"preset_type" text,
	"quantity" numeric(10, 2),
	"final_volume_dispersed" numeric(10, 2),
	"scheduled_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "org_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"address" text,
	"area" text,
	"city" text,
	"state" text,
	"lat" numeric(10, 7),
	"lng" numeric(10, 7)
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_name" text NOT NULL,
	"kyc_status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pumps" (
	"id" text PRIMARY KEY NOT NULL,
	"location" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	CONSTRAINT "sync_events_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid,
	"pump_id" text,
	"volume_dispensed" numeric(10, 2),
	"amount" numeric(12, 2),
	"razorpay_order_id" text,
	"status" text DEFAULT 'PENDING' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_number" text NOT NULL,
	"capacity" numeric,
	"current_fuel_level" numeric,
	"pump_id" text,
	"status" text DEFAULT 'AVAILABLE' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bank_documents" ADD CONSTRAINT "bank_documents_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_pump_id_pumps_id_fk" FOREIGN KEY ("pump_id") REFERENCES "public"."pumps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_user_id_drivers_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mdu_controllers" ADD CONSTRAINT "mdu_controllers_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_org_address_id_org_addresses_id_fk" FOREIGN KEY ("org_address_id") REFERENCES "public"."org_addresses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_pump_id_pumps_id_fk" FOREIGN KEY ("pump_id") REFERENCES "public"."pumps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_addresses" ADD CONSTRAINT "org_addresses_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_pump_id_pumps_id_fk" FOREIGN KEY ("pump_id") REFERENCES "public"."pumps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_pump_id_pumps_id_fk" FOREIGN KEY ("pump_id") REFERENCES "public"."pumps"("id") ON DELETE no action ON UPDATE no action;