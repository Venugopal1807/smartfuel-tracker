// Hybrid MDU scanning with 5s timeout and simulated bypass
// In production, integrate react-native-ble-plx. Here we stub the scan.

export const MDU_NOT_FOUND_FALLBACK = "MDU_NOT_FOUND_FALLBACK";

type MDUInfo = {
  code: string;
  pumpId?: string;
  firmware?: string;
};

export const getSimulatedMDU = (): MDUInfo => ({
  code: "MDU_772",
  pumpId: "MDU_772",
  firmware: "1.0.0-sim",
});

export const scanForMDU = async (timeoutMs = 5000): Promise<{ event: string; mdu?: MDUInfo }> => {
  // Placeholder BLE scan
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ event: MDU_NOT_FOUND_FALLBACK, mdu: getSimulatedMDU() });
    }, timeoutMs);

    // If in future a real BLE hit occurs, clear timeout and resolve with device
    // For now, no real scan -> fallback only
    void timeout;
  });
};
