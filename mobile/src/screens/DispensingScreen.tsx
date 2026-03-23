import React, { useState, useEffect, useRef } from "react";
import { 
  View, Text, TouchableOpacity, Alert, TextInput, 
  StyleSheet, ScrollView, Platform, ActivityIndicator, SafeAreaView 
} from "react-native";
import { Info, Truck } from "lucide-react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location'; 

// Internal Logic & Services
import { useFuelStore } from "../store/useFuelStore";
import useBLE from "../hooks/useBLE";
import { buildCompleteOrderCmd, buildStatusCmd } from "../services/bleCommands";
import { saveFuelLog, enqueueAction } from "../db/sqlite";
import { processPayment } from "../services/paymentService";
import { useKeepAwake, activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';

const RATE = 108; // Fuel Rate per Liter

export default function DispensingScreen({ route, navigation }: any) {
  // 1. Extract Order Data
  const order = route.params?.order || null;
  const orderId = order?.id || "demo-order";
  
  // 2. BLE & Hardware State
  const { volume, amount, isDispensing, reset } = useFuelStore();
  const { sendCommand, bleState, disconnect, connectedDevice } = useBLE();

  // 3. Local Component State
  const [dispenseComplete, setDispenseComplete] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [userId, setUserId] = useState<string>("");
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // --- INITIALIZATION (Auth & GPS) ---
  useEffect(() => {
    (async () => {
      // Fetch the Driver ID for logging
      const storedUser = await AsyncStorage.getItem("user_profile");
      if (storedUser) {
        const userObj = JSON.parse(storedUser);
        setUserId(String(userObj.id)); // Ensures it's a string for ts(2345)
      }

      // Get GPS for the audit trail
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation(loc);
      }
    })();
  }, []);

  // --- HARDWARE POLLING ---
  useEffect(() => {
    // If Bluetooth is connected, poll the pump for volume/status every second
    if (bleState === "READY") {
      pollingInterval.current = setInterval(() => {
        sendCommand(buildStatusCmd());
      }, 1000);
    }

    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, [bleState]);

  // If the pump hardware stops, transition to the payment UI
  useEffect(() => {
    if (parseFloat(volume) > 0 && !isDispensing) {
      setDispenseComplete(true);
    }
  }, [isDispensing]);

  // --- ACTION HANDLERS ---

  const handleStopDispensing = async () => {
    // Manually stopping the flow
    if (pollingInterval.current) clearInterval(pollingInterval.current);
    setDispenseComplete(true);

    try {
      const lat = location?.coords.latitude || 0;
      const lng = location?.coords.longitude || 0;

      // Save the final volume to local SQLite
      saveFuelLog(
        parseFloat(volume), 
        lat, 
        lng, 
        userId, 
        orderId
      );
    } catch (error) {
      console.error("Local Log Error:", error);
    }
  };

  const handleVerifyAndPay = async () => {
    if (otpInput.length !== 4) {
      Alert.alert("Error", "Please enter the 4-digit End OTP.");
      return;
    }
    
    setProcessingPayment(true);
    
    try {
      // A. Close the transaction on the Pump Hardware via BLE
      const cmdBytes = buildCompleteOrderCmd(orderId, otpInput);
      const pumpAccepted = await sendCommand(cmdBytes);
      
      if (!pumpAccepted) {
        Alert.alert("Hardware Error", "Pump nozzle was not locked. Please retry OTP.");
        setProcessingPayment(false);
        return;
      }

      // B. Settlement (Online Flow)
      await processPayment(
        parseFloat(amount), 
        orderId, 
        otpInput, 
        parseFloat(volume), 
        connectedDevice?.name || "MDU-001"
      );

      // C. Cleanup
      await AsyncStorage.removeItem("active_order");
      disconnect();
      reset();

      Alert.alert("Success", "Delivery complete and verified!", [
        { 
          text: "View Receipt", 
          onPress: () => navigation.replace("ReceiptScreen", { order, volume, rate: RATE }) 
        }
      ]);

    } catch (err: any) {
      // D. Offline Fallback for Poor Network
      const isNetworkError = !err.response || err.message === 'Network Error';
      
      if (isNetworkError) {
        const hashedOtp = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, otpInput);
        
        await enqueueAction("PAYMENT_PENDING", {
          orderId, 
          final_volume: volume, 
          amount, 
          otp_hash: hashedOtp, 
          timestamp: new Date().toISOString()
        });
        
        await AsyncStorage.removeItem("active_order");
        disconnect();
        reset();
        
        Alert.alert("Saved Offline", "Network error. Transaction queued for sync.", [
          { text: "View Receipt", onPress: () => navigation.replace("ReceiptScreen", { order, volume, rate: RATE }) }
        ]);
      } else {
        Alert.alert("Verification Failed", err.response?.data?.error || "Invalid OTP entered.");
      }
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.banner}>
        <Info size={18} color="#92400E" />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.bannerTitle}>
            {dispenseComplete ? "Dispensing Complete" : "Dispensing In Progress"}
          </Text>
          <Text style={styles.bannerSubtitle}>
            {dispenseComplete ? "Enter End OTP to finalize." : "Safety: Keep away from nozzle."}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.meterArea}>
          <Text style={styles.mainVolume}>{volume || "0.00"}</Text>
          <Text style={styles.unit}>L</Text>
        </View>

        <View style={styles.statsRow}>
          <View>
            <Text style={styles.statLabel}>Total Amount</Text>
            <Text style={styles.statValue}>₹ {amount || "0.00"}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.statLabel}>Rate</Text>
            <Text style={styles.statValue}>₹ {RATE}/L</Text>
          </View>
        </View>

        {!dispenseComplete ? (
          <TouchableOpacity style={styles.stopButton} onPress={handleStopDispensing}>
            <Text style={styles.stopButtonText}>STOP PUMP</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.otpSection}>
            <Text style={styles.otpLabel}>Customer 4-Digit OTP</Text>
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
              style={[styles.payButton, processingPayment && { opacity: 0.6 }]} 
              onPress={handleVerifyAndPay}
              disabled={processingPayment}
            >
              {processingPayment ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.payButtonText}>Verify & Settle Payment</Text>
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
  banner: { flexDirection: 'row', backgroundColor: "#FEF3C7", padding: 20, alignItems: 'center' },
  bannerTitle: { fontWeight: "900", color: "#92400E", fontSize: 14 },
  bannerSubtitle: { color: "#B45309", fontSize: 12, fontWeight: '600' },
  scroll: { paddingHorizontal: 24, paddingVertical: 40, alignItems: 'center' },
  meterArea: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 40 },
  mainVolume: { fontSize: 84, fontWeight: "300", color: "#111827", letterSpacing: -2 },
  unit: { fontSize: 32, fontWeight: "400", color: "#6B7280", marginLeft: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 50 },
  statLabel: { fontSize: 12, color: "#9CA3AF", fontWeight: "700", textTransform: 'uppercase' },
  statValue: { fontSize: 24, fontWeight: "900", color: "#111827" },
  stopButton: { width: '100%', backgroundColor: '#EF4444', padding: 20, borderRadius: 16, alignItems: 'center' },
  stopButtonText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  otpSection: { width: '100%', alignItems: 'center' },
  otpLabel: { fontSize: 14, fontWeight: '700', color: '#6B7280', marginBottom: 20 },
  otpRow: { flexDirection: 'row', gap: 12, marginBottom: 30 },
  otpBox: { width: 60, height: 70, borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  otpText: { fontSize: 28, fontWeight: '800', color: '#111827' },
  hiddenInput: { position: 'absolute', opacity: 0, width: '100%', height: '100%' },
  payButton: { width: '100%', backgroundColor: '#4F46E5', padding: 20, borderRadius: 16, alignItems: 'center' },
  payButtonText: { color: '#fff', fontWeight: '800', fontSize: 16 }
});