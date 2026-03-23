import React, { useState, useEffect, useRef } from "react";
import { 
  View, Text, TouchableOpacity, Alert, TextInput, 
  StyleSheet, ScrollView, Platform, ActivityIndicator, SafeAreaView 
} from "react-native";
import { Info, Truck, CheckCircle2, AlertTriangle, ChevronLeft } from "lucide-react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location'; 

// Internal Logic & Services
import { useFuelStore } from "../store/useFuelStore";
import { useFuelSensor } from "../hooks/useFuelSensor"; 
import useBLE from "../hooks/useBLE";
import { buildCompleteOrderCmd, buildStatusCmd } from "../services/bleCommands";
import { saveFuelLog, enqueueAction } from "../db/sqlite";
import { processPayment } from "../services/paymentService";
import { useKeepAwake } from 'expo-keep-awake';

const RATE = 108; // Fuel Rate per Liter

export default function DispensingScreen({ route, navigation }: any) {
  // Keeps the phone screen on while fueling is active
  useKeepAwake(); 

  // 1. Extract Order Data
  const order = route.params?.order || null;
  const orderId = order?.id || "demo-order";
  
  // 2. Global Store & Hardware Hooks
  const { setTelemetry, isDispensing, setIsDispensing, reset } = useFuelStore();
  const { volume: storeVol, amount: storeAmt } = useFuelStore();
  const { sendCommand, bleState, disconnect, connectedDevice } = useBLE();

  // 3. Virtual Sensor (Bypass for Emulator/Testing)
  const { 
    currentVolume: simVol, 
    startDispensing: startSim, 
    stopDispensing: stopSim,
    dispensing: isSimulating 
  } = useFuelSensor();

  // 4. Local UI State
  const [dispenseComplete, setDispenseComplete] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [userId, setUserId] = useState<string>("");
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // --- INITIALIZATION (Auth & GPS) ---
  useEffect(() => {
    (async () => {
      // 1. Fetch the Driver ID for logging
      const storedUser = await AsyncStorage.getItem("user_profile");
      if (storedUser) {
        const userObj = JSON.parse(storedUser);
        setUserId(String(userObj.id));
      }

      // 2. Get GPS for the audit trail
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation(loc);
      }

      // 3. AUTO-START SIMULATION: If we are in Dev mode and no hardware is found
      if (__DEV__ && bleState !== "READY") {
        console.log("[Dispensing] Hardware not found. Starting simulated flow...");
        setIsDispensing(true);
        startSim();
      }
    })();
  }, [bleState]);

  // --- SYNC SIMULATION DATA TO GLOBAL STORE ---
  // This makes the numbers move on the screen automatically
  useEffect(() => {
    if (__DEV__ && isSimulating) {
      const calculatedAmt = (simVol * RATE).toFixed(2);
      setTelemetry(simVol.toString(), calculatedAmt, RATE.toString());
    }
  }, [simVol, isSimulating]);

  // --- HARDWARE POLLING (Production / Real BLE) ---
  useEffect(() => {
    if (bleState === "READY") {
      pollingInterval.current = setInterval(() => {
        sendCommand(buildStatusCmd());
      }, 1000);
    }
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, [bleState]);

  // --- ACTION HANDLERS ---

  const handleStopDispensing = async () => {
    // Stop polling/simulating
    if (pollingInterval.current) clearInterval(pollingInterval.current);
    if (__DEV__) stopSim();
    
    setIsDispensing(false);
    setDispenseComplete(true);

    try {
      const lat = location?.coords.latitude || 0;
      const lng = location?.coords.longitude || 0;

      // Save the final volume to local SQLite for audit
      saveFuelLog(parseFloat(storeVol), lat, lng, userId, orderId);
    } catch (error) {
      console.error("Local Log Error:", error);
    }
  };

  const handleVerifyAndPay = async () => {
    if (otpInput.length !== 4) {
      Alert.alert("Input Required", "Please enter the 4-digit End OTP.");
      return;
    }
    
    setProcessingPayment(true);
    
    try {
      // ✅ BYPASS LOGIC: We skip the hardware "Nozzle Lock" check in Dev Mode
      let hardwareCheckPassed = false;
      
      if (__DEV__ && bleState !== "READY") {
        hardwareCheckPassed = true; // Simulating hardware success
      } else {
        const cmdBytes = buildCompleteOrderCmd(orderId, otpInput);
        hardwareCheckPassed = await sendCommand(cmdBytes);
      }
      
      if (!hardwareCheckPassed) {
        Alert.alert("Hardware Error", "Pump nozzle was not locked. Safety trigger failed.");
        setProcessingPayment(false);
        return;
      }

      // Online Settlement
      await processPayment(
        parseFloat(storeAmt), 
        orderId, 
        otpInput, 
        parseFloat(storeVol), 
        connectedDevice?.name || "MDU-SIMULATED"
      );

      // Cleanup
      await AsyncStorage.removeItem("active_order");
      if (bleState === "READY") disconnect();
      reset();

      Alert.alert("Success", "Delivery complete and verified!", [
        { 
          text: "View Receipt", 
          onPress: () => navigation.replace("ReceiptScreen", { order, volume: storeVol, rate: RATE }) 
        }
      ]);

    } catch (err: any) {
      // Offline Fallback for Poor Network
      const isNetworkError = !err.response || err.message === 'Network Error';
      const isInvalidOtp = err.response?.data?.error === "invalid otp entered";

      if (isInvalidOtp) {
          Alert.alert("Verification Failed", "The OTP entered is incorrect. Please ask the customer.");
          setProcessingPayment(false);
          return;
      }
      
      if (isNetworkError) {
        const hashedOtp = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, otpInput);
        
        await enqueueAction("PAYMENT_PENDING", {
          orderId, 
          final_volume: storeVol, 
          amount: storeAmt, 
          otp_hash: hashedOtp, 
          timestamp: new Date().toISOString()
        });
        
        await AsyncStorage.removeItem("active_order");
        if (bleState === "READY") disconnect();
        reset();
        
        Alert.alert("Saved Offline", "Transaction queued for sync.", [
          { text: "View Receipt", onPress: () => navigation.replace("ReceiptScreen", { order, volume: storeVol, rate: RATE }) }
        ]);
      } else {
        Alert.alert("Error", err.response?.data?.message || "Payment verification failed.");
      }
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Dynamic Status Header */}
      <View style={[styles.banner, dispenseComplete ? styles.bannerComplete : styles.bannerActive]}>
        {dispenseComplete ? <CheckCircle2 size={18} color="#065F46" /> : <ActivityIndicator size="small" color="#92400E" />}
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.bannerTitle}>
            {dispenseComplete ? "Fueling Successful" : "Fueling In Progress..."}
          </Text>
          <Text style={styles.bannerSubtitle}>
            {dispenseComplete ? "Verify OTP to generate receipt" : "Bypass Mode: Simulating telemetry"}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.meterArea}>
          <Text style={styles.mainVolume}>{storeVol || "0.00"}</Text>
          <Text style={styles.unit}>L</Text>
        </View>

        <View style={styles.statsRow}>
          <View>
            <Text style={styles.statLabel}>Total Amount</Text>
            <Text style={styles.statValue}>₹ {storeAmt || "0.00"}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.statLabel}>Rate</Text>
            <Text style={styles.statValue}>₹ {RATE}/L</Text>
          </View>
        </View>

        {!dispenseComplete ? (
          <TouchableOpacity style={styles.stopButton} onPress={handleStopDispensing}>
            <Text style={styles.stopButtonText}>STOP PUMP & FINALIZE</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.otpSection}>
            <Text style={styles.otpLabel}>Customer 4-Digit End OTP</Text>
            <View style={styles.otpRow}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={styles.otpBox}>
                  <Text style={styles.otpText}>{otpInput[i] || "-"}</Text>
                </View>
              ))}
              <TextInput
                style={styles.hiddenInput}
                keyboardType="number-pad"
                maxLength={4}
                value={otpInput}
                onChangeText={setOtpInput}
                autoFocus={true}
              />
            </View>

            <TouchableOpacity 
              style={[styles.payButton, (otpInput.length < 4 || processingPayment) && { opacity: 0.6 }]} 
              onPress={handleVerifyAndPay}
              disabled={otpInput.length < 4 || processingPayment}
            >
              {processingPayment ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.payButtonText}>VERIFY & GENERATE RECEIPT</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  banner: { flexDirection: 'row', padding: 20, alignItems: 'center' },
  bannerActive: { backgroundColor: "#FEF3C7" },
  bannerComplete: { backgroundColor: "#D1FAE5" },
  bannerTitle: { fontWeight: "900", color: "#92400E", fontSize: 14 },
  bannerSubtitle: { color: "#B45309", fontSize: 12, fontWeight: '600' },
  scroll: { paddingHorizontal: 24, paddingVertical: 40, alignItems: 'center' },
  meterArea: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 40 },
  mainVolume: { fontSize: 90, fontWeight: "200", color: "#111827", letterSpacing: -3 },
  unit: { fontSize: 32, fontWeight: "600", color: "#9CA3AF", marginLeft: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 50, backgroundColor: '#F9FAFB', padding: 20, borderRadius: 24 },
  statLabel: { fontSize: 12, color: "#9CA3AF", fontWeight: "700", textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: "900", color: "#111827" },
  stopButton: { width: '100%', backgroundColor: '#111827', padding: 22, borderRadius: 20, alignItems: 'center' },
  stopButtonText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  otpSection: { width: '100%', alignItems: 'center' },
  otpLabel: { fontSize: 13, fontWeight: '800', color: '#6B7280', marginBottom: 20, textTransform: 'uppercase' },
  otpRow: { flexDirection: 'row', gap: 12, marginBottom: 30 },
  otpBox: { width: 60, height: 75, borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  otpText: { fontSize: 32, fontWeight: '900', color: '#111827' },
  hiddenInput: { position: 'absolute', opacity: 0, width: '100%', height: '100%' },
  payButton: { width: '100%', backgroundColor: '#4F46E5', padding: 22, borderRadius: 20, alignItems: 'center' },
  payButtonText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 }
});