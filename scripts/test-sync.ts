/**
 * test-sync.ts — Idempotency Proof Script
 * * UPDATED: 
 * 1. Added Authorization header (JWT)
 * 2. Changed userId to UUID string
 * 3. Aligned with backend endpoint structure
 */

const BASE_URL = "http://localhost:3000";

// ⚠️ UPDATE THIS: Paste a valid JWT token from your login/signup response
const DEV_TOKEN = "YOUR_JWT_TOKEN_HERE"; 

const testBatch = {
  logs: [
    {
      mobileOfflineId: "test-uuid-aaa-111",
      userId: "00000000-0000-0000-0000-000000000001", // Must be a UUID string
      volume: 45.5,
      lat: 28.6139,
      lng: 77.209,
      timestamp: new Date().toISOString(),
    },
    {
      mobileOfflineId: "test-uuid-bbb-222",
      userId: "00000000-0000-0000-0000-000000000001", // Must be a UUID string
      volume: 120.75,
      lat: 28.7041,
      lng: 77.1025,
      timestamp: new Date().toISOString(),
    },
  ],
};

async function sendSync(attemptNumber: number) {
  console.log(`\n── Attempt ${attemptNumber} ──────────────────────────`);
  try {
    const response = await fetch(`${BASE_URL}/api/logs/sync`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEV_TOKEN}` // ✅ Added Auth
      },
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
  
  if (DEV_TOKEN === "YOUR_JWT_TOKEN_HERE") {
    console.log("❌ ERROR: Please update 'DEV_TOKEN' with a real JWT from your /login endpoint first.");
    return;
  }

  console.log("Sending the same batch twice to prove duplicates are ignored.\n");

  // First request — should insert 2 logs
  const first = await sendSync(1);

  // Second request — should insert 0 (idempotent skip)
  const second = await sendSync(2);

  console.log("\n── Results ─────────────────────────────────");
  if (first?.processedCount === 2 && second?.processedCount === 0) {
    console.log("✅ PASS: Idempotency confirmed! Second batch was correctly skipped.");
  } else if (first?.processedCount === 0 && second?.processedCount === 0) {
    console.log("ℹ️  Both returned 0. The test data is already in the DB.");
    console.log("   TIP: Change the mobileOfflineIds or delete those rows from 'fuel_logs'.");
  } else {
    console.log("❌ FAIL: Unexpected counts.", {
      first: first?.processedCount,
      second: second?.processedCount,
    });
  }
}

main();