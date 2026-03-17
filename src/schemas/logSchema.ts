import { z } from "zod";

// UUID v4 regex — matches the standard 8-4-4-4-12 format
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates a single incoming fuel log from the mobile device.
 */
export const FuelLogSchema = z.object({
  mobileOfflineId: z
    .string()
    .regex(UUID_REGEX, "mobileOfflineId must be a valid UUID v4 string."),

  userId: z.number().int().positive("userId must be a positive integer."),

  volume: z
    .number()
    .positive("volume must be a positive number greater than 0."),

  lat: z.number().nullable().optional(),

  lng: z.number().nullable().optional(),

  timestamp: z
    .string()
    .datetime({ message: "timestamp must be a valid ISO 8601 date string." }),
});

/**
 * Validates the full sync request body — an array of fuel logs.
 */
export const SyncRequestSchema = z.object({
  logs: z
    .array(FuelLogSchema)
    .min(1, "The 'logs' array must contain at least one entry."),
});

// Derive TypeScript types from the schemas so they stay in sync
export type ValidatedFuelLog = z.infer<typeof FuelLogSchema>;
export type ValidatedSyncRequest = z.infer<typeof SyncRequestSchema>;
