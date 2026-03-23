/**
 * BLE Command Library for SmartFuel MDU
 */

// ─── 1. CORE MATH & FORMATTING ─────────────────────────────────────────

/**
 * Calculates the exact Modbus CRC-16 required by the Relcon MDU.
 * Includes the specific Java signed-byte simulation `(val > 127)`
 * to ensure the checksum matches the hardware's expectations.
 */
export const calculateModbusCRC = (data: number[]): [number, number] => {
    let crc = 0xFFFF;
  
    for (let i = 0; i < data.length; i++) {
      const val = data[i] & 0xFF; // Ensure it's treated as an unsigned 0-255 byte
      crc ^= val;
  
      // Simulate Java's negative byte check (bytes > 127 are negative in Java)
      const isneg = val > 127;
  
      for (let j = 0; j < 8; j++) {
        const lsb = crc & 0x0001;
        crc = (crc >>> 1) & 0x7FFF;
        if (lsb === 1) {
          crc ^= 0xA001;
        }
      }
  
      if (isneg) {
        crc ^= 0x00FF;
      }
    }
  
    // Returns [High Byte, Low Byte]
    return [(crc >> 8) & 0xFF, crc & 0xFF];
  };
  
  /**
   * Validates incoming data from the pump.
   * The last two bytes of the array are the CRC. We calculate the CRC of 
   * the data and ensure it matches the attached CRC.
   */
  export const validateResponseCRC = (responseBytes: number[]): boolean => {
    if (responseBytes.length < 3) return false;
    
    const dataLen = responseBytes.length;
    const dataToVerify = responseBytes.slice(0, dataLen - 2);
    const [expectedHigh, expectedLow] = calculateModbusCRC(dataToVerify);
    
    return responseBytes[dataLen - 1] === expectedHigh && responseBytes[dataLen - 2] === expectedLow;
  };
  
  /**
   * Helper: Converts a string to a byte array and pads it with spaces
   * to reach the exact length the hardware requires (e.g., 20 for OrderID).
   */
  const stringToPaddedBytes = (str: string, targetLength: number): number[] => {
    let paddedStr = str.padEnd(targetLength, ' ');
    // Truncate if somehow longer
    if (paddedStr.length > targetLength) paddedStr = paddedStr.substring(0, targetLength);
    
    const bytes: number[] = [];
    for (let i = 0; i < targetLength; i++) {
      bytes.push(paddedStr.charCodeAt(i));
    }
    return bytes;
  };
  
  // ─── 2. THE HARDWARE COMMANDS ─────────────────────────────────────────
  
  /**
   * 1. Health Check (StatusCmd / LiveStatus)
   * Both commands use the exact same outgoing byte sequence: [0x00, 0x02, 0x01, 0x01]
   */
  export const buildStatusCmd = (): number[] => {
    const payload = [0x00, 0x02, 0x01, 0x01];
    const [crcHigh, crcLow] = calculateModbusCRC(payload);
    return [...payload, crcHigh, crcLow];
  };
  
  /**
   * 2. Start Order (Authorize with OTP)
   * Command: 0x05
   */
  export const buildStartOrderCmd = (orderId: string, otp: string): number[] => {
    const payload = [0x00, 0x1A, 0x05, 0x01];
    
    const orderBytes = stringToPaddedBytes(orderId, 20);
    const otpBytes = stringToPaddedBytes(otp, 4);
    
    payload.push(...orderBytes, ...otpBytes);
    
    const [crcHigh, crcLow] = calculateModbusCRC(payload);
    return [...payload, crcHigh, crcLow];
  };
  
  /**
   * 3. Preset Vehicle (Send Asset Data to Dispenser)
   * Command: 0x07
   */
  export const buildPresetVehicleCmd = (orderId: string, assetId: string, overrideTrx: number = 0): number[] => {
    const payload = [0x00, 0x2D, 0x07, 0x01];
    
    const orderBytes = stringToPaddedBytes(orderId, 20);
    const assetBytes = stringToPaddedBytes(assetId, 20);
    
    // PumpNo (0x01), NozzleNo (0x01), OverrideTrx (0 or 1)
    payload.push(...orderBytes, ...assetBytes, 0x01, 0x01, overrideTrx);
    
    const [crcHigh, crcLow] = calculateModbusCRC(payload);
    return [...payload, crcHigh, crcLow];
  };
  
  /**
   * 4. Complete Order (End Fueling with OTP)
   * Command: 0x0B
   */
  export const buildCompleteOrderCmd = (orderId: string, otp: string): number[] => {
    const payload = [0x00, 0x1A, 0x0B, 0x01];
    
    const orderBytes = stringToPaddedBytes(orderId, 20);
    const otpBytes = stringToPaddedBytes(otp, 4);
    
    payload.push(...orderBytes, ...otpBytes);
    
    const [crcHigh, crcLow] = calculateModbusCRC(payload);
    return [...payload, crcHigh, crcLow];
  };