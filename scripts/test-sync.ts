/**
 * test-sync.ts — Idempotency Proof Script
 *
 * This script sends the SAME batch of fuel logs to POST /api/logs/sync twice.
 * Expected behavior:
 *   - First request:  processedCount = 2 (both logs are new)
 *   - Second request: processedCount = 0 (duplicates silently skipped)
 *
 * Usage: npx tsx scripts/test-sync.ts
 */

const BASE_URL = "http://localhost:3000";

const testBatch = {
  logs: [
    {
      mobileOfflineId: "test-uuid-aaa-111",
      userId: 1,
      volume: 45.5,
      lat: 28.6139,
      lng: 77.209,
      timestamp: "2026-03-17T12:00:00.000Z",
    },
    {
      mobileOfflineId: "test-uuid-bbb-222",
      userId: 1,
      volume: 120.75,
      lat: 28.7041,
      lng: 77.1025,
      timestamp: "2026-03-17T12:30:00.000Z",
    },
  ],
};

async function sendSync(attemptNumber: number) {
  console.log(`\n── Attempt ${attemptNumber} ──────────────────────────`);
  try {
    const response = await fetch(`${BASE_URL}/api/logs/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testBatch),
    });
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log("Response:", JSON.stringify(data, null, 2));
    return data;
  } catch (error: any) {
    console.error("Request failed:", error.message);
    return null;
  }
}

async function main() {
  console.log("🧪 SmartFuel Idempotency Test");
  console.log("Sending the same batch twice to prove duplicates are ignored.\n");

  // First request — should insert 2 logs
  const first = await sendSync(1);

  // Second request — should insert 0 (idempotent skip)
  const second = await sendSync(2);

  console.log("\n── Results ─────────────────────────────────");
  if (first?.processedCount === 2 && second?.processedCount === 0) {
    console.log("✅ PASS: Idempotency confirmed! Second batch was correctly skipped.");
  } else if (first?.processedCount === 0 && second?.processedCount === 0) {
    console.log("ℹ️  Both returned 0. The test data was already in the DB from a previous run.");
    console.log("   Delete the test rows or use new UUIDs and re-run.");
  } else {
    console.log("❌ FAIL: Unexpected counts.", {
      first: first?.processedCount,
      second: second?.processedCount,
    });
  }
}

main();
