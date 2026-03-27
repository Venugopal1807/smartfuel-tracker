import { useState, useMemo, useRef, useCallback } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { BleManager, Device, BleError } from "react-native-ble-plx";
import { Buffer } from "buffer"; 
import { useFuelStore } from "../store/useFuelStore";

const SMARTFUEL_SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
const SMARTFUEL_RW_CHARACTERISTIC = "12345678-1234-5678-1234-56789abcdef1";

export type BleConnectionState = "DISCONNECTED" | "SCANNING" | "CONNECTING" | "READY";

export default function useBLE() {
  const manager = useMemo(() => new BleManager(), []);
  
  const [bleState, setBleState] = useState<BleConnectionState>("DISCONNECTED");
  const [scannedDevices, setScannedDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // CLAUDE'S FIX: Use a Ref to avoid the Stale Closure bug in setTimeout
  const bleStateRef = useRef<BleConnectionState>("DISCONNECTED");
  const lastRawResponse = useRef<string | null>(null);

  // Helper to update both state and ref simultaneously
  const updateBleState = useCallback((newState: BleConnectionState) => {
    bleStateRef.current = newState;
    setBleState(newState);
  }, []);

  // --- 1. PERMISSIONS ---
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const apiLevel = parseInt(Platform.Version.toString(), 10);

      if (apiLevel < 31) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        const isGranted =
          result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
          result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED &&
          result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;

        // ✅ Trigger the System Popup using your existing 'manager' instance
        if (isGranted) {
          try {
            await manager.enable();
          } catch (e) {
            console.log("User declined to turn on Bluetooth");
          }
        }

        return isGranted;
      }
    }
    return true;
  };

  // --- 2. START MANUAL SCAN ---
  const startScan = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      setErrorMessage("Bluetooth Permissions Denied.");
      return;
    }

    setScannedDevices([]); 
    updateBleState("SCANNING");
    setErrorMessage("");

    manager.startDeviceScan(null, { allowDuplicates: false }, (error: BleError | null, device: Device | null) => {
      if (error) {
        setErrorMessage(`Scan Error: ${error.message}`);
        updateBleState("DISCONNECTED");
        return;
      }

      if (device && device.name) {
        setScannedDevices((prevDevices) => {
          if (!prevDevices.find(d => d.id === device.id)) {
            return [...prevDevices, device];
          }
          return prevDevices;
        });
      }
    });
  };

  // --- 3. STOP SCAN ---
  const stopScan = () => {
    manager.stopDeviceScan();
    // Use the Ref here to guarantee we are checking the absolute latest state
    if (bleStateRef.current === "SCANNING") {
      updateBleState("DISCONNECTED");
    }
  };

  // --- 4. CONNECT TO SELECTED PUMP ---
  const connectToPump = async (device: Device) => {
    try {
      stopScan(); 
      updateBleState("CONNECTING");

      const connected = await device.connect();
      
      if (Platform.OS === 'android') {
        await connected.requestMTU(512); 
      }

      await connected.discoverAllServicesAndCharacteristics();
      setConnectedDevice(connected);
      setupDataListener(connected);
      updateBleState("READY");

    } catch (error: any) {
      console.log("Connection Failed", error);
      updateBleState("DISCONNECTED");
      setErrorMessage(error.message);
    }
  };

  // --- 5. DATA LISTENER & PARSER ---
  const setupDataListener = (device: Device) => {
    device.monitorCharacteristicForService(
      SMARTFUEL_SERVICE_UUID,
      SMARTFUEL_RW_CHARACTERISTIC,
      (error: BleError | null, characteristic: any) => {
        if (error) {
          if (error.reason === "Peer disconnected") handleDisconnect();
          return;
        }
        
        if (characteristic?.value) {
          lastRawResponse.current = characteristic.value;
          const buffer = Buffer.from(characteristic.value, 'base64');

          // Ensure it's a LiveStatus packet
          if (buffer.length >= 21 && buffer[2] === 0x01 && buffer[3] === 0x01) {
            const pumpStatus = buffer[6];
            
            // Extract Big Endian unsigned integers
            const rawVolume = (buffer[9] << 24 | buffer[10] << 16 | buffer[11] << 8 | buffer[12]) >>> 0;
            const rawAmount = (buffer[13] << 24 | buffer[14] << 16 | buffer[15] << 8 | buffer[16]) >>> 0;
            const rawPrice  = (buffer[17] << 24 | buffer[18] << 16 | buffer[19] << 8 | buffer[20]) >>> 0;

            const volumeStr = (rawVolume / 100).toFixed(2);
            const amountStr = (rawAmount / 100).toFixed(2);
            const priceStr = (rawPrice / 100).toFixed(2);

            useFuelStore.getState().setTelemetry(volumeStr, amountStr, priceStr);

            if (pumpStatus === 0 || pumpStatus === 4) {
              useFuelStore.getState().setIsDispensing(false);
            } else {
              useFuelStore.getState().setIsDispensing(true);
            }
          }
        }
      }
    );
  };

  // --- 6. SEND COMMAND ---
  const sendCommand = async (commandBytes: number[]) => {
    if (!connectedDevice || bleStateRef.current !== "READY") return false;

    try {
      const base64Command = Buffer.from(commandBytes).toString('base64');
      await connectedDevice.writeCharacteristicWithResponseForService(
        SMARTFUEL_SERVICE_UUID,
        SMARTFUEL_RW_CHARACTERISTIC,
        base64Command
      );
      return true;
    } catch (error) {
      console.error("Write command failed:", error);
      return false;
    }
  };

  // --- 7. DISCONNECT ---
  const handleDisconnect = async () => {
    if (connectedDevice) {
      try {
        await connectedDevice.cancelConnection();
      } catch (e) {
        console.error("Disconnect error", e);
      }
      setConnectedDevice(null);
    }
    updateBleState("DISCONNECTED");
  };

  return {
    startScan,
    stopScan,
    connectToPump,
    disconnect: handleDisconnect,
    sendCommand,
    scannedDevices,    
    bleState,
    connectedDevice,
    errorMessage
  };
}