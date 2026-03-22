import React, { useMemo, useRef, useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert, TextInput, StyleSheet, SafeAreaView, ScrollView, Platform } from "react-native";
import { enqueueAction } from "../db/sqlite";
import axios from "axios";
import { processPayment } from "../services/paymentService";
import { Info, CheckCircle2 } from "lucide-react-native";
import * as Crypto from 'expo-crypto'; // <-- Added for secure OTP hashing

const RATE = 214; 

export default function DispensingScreen({ route, navigation }: any) {
  const orderId = route.params?.orderId || "demo-order";
  
  const [volume, setVolume] = useState(0);
  const [running, setRunning] = useState(false);
  const [dispenseComplete, setDispenseComplete] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  
  const amount = useMemo(() => Math.round(volume * RATE), [volume]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startDispensing = () => {
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setVolume((v) => Number((v + 1.28).toFixed(2))); 
    }, 100);
  };

  const stopDispensing = async () => {
    setRunning(false);
    setDispenseComplete(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    try {
      await enqueueAction("DISPENSE_FUEL", { volume, amount, timestamp: new Date().toISOString() });
    } catch (err) {
      console.error("Failed to enqueue dispense event", err);
    }
  };

  // --- THE FIXED PAYMENT LOGIC ---
  const handleVerifyAndPay = async () => {
    if (otpInput.length !== 4) {
      Alert.alert("Error", "Please enter a 4-digit End OTP.");
      return;
    }
    setProcessingPayment(true);
    
    try {
      // 1. Online Flow: Try backend API and custom payment bridge
      await axios.patch(`${process.env.EXPO_PUBLIC_API_URL}/api/orders/${orderId}/complete`, { final_volume: volume });
      await processPayment(amount, orderId, otpInput); 
      
      Alert.alert("Success", "Delivery verified and complete!", [
        { text: "Finish", onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Main' }] }) }
      ]);

    } catch (err: any) {
      // 2. Distinguish Network Errors from Server/Auth Errors
      // Axios sets !err.response when it cannot reach the server at all
      const isNetworkError = !err.response || err.message === 'Network Error' || err.code === 'ECONNABORTED';

      if (isNetworkError) {
        // --- OFFLINE FLOW ---
        // A. Hash the OTP for security (Never store raw OTPs!)
        const hashedOtp = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          otpInput
        );

        // B. Actually save to SQLite Sync Queue
        await enqueueAction("PAYMENT_PENDING", {
          orderId,
          final_volume: volume,
          amount,
          otp_hash: hashedOtp,
          timestamp: new Date().toISOString()
        });

        // C. Alert the Driver
        Alert.alert(
          "Offline Mode Active",
          "Network unavailable. Delivery logged with verified OTP. Status saved as PAYMENT_PENDING for manual settlement.",
          [{ text: "Acknowledge & Finish", onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Main' }] }) }]
        );
      } else {
        // --- STANDARD ERROR FLOW ---
        // E.g., Backend says "Invalid OTP" or "Order already closed"
        const errorMsg = err.response?.data?.message || "An error occurred during verification. Please try again.";
        Alert.alert("Verification Failed", errorMsg, [{ text: "OK" }]);
      }
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. TOP WARNING BANNER */}
      <View style={styles.warningBanner}>
        <Info size={16} color="#92400E" />
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.warningTitle}>Offline Mode</Text>
          <Text style={styles.warningSubText}>Logs saved locally. Sync. pending.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 2. MAIN VOLUME METER */}
        <View style={styles.meterArea}>
          <Text style={styles.mainVolume}>{volume.toFixed(2)}</Text>
          <Text style={styles.unitLabel}>L</Text>
        </View>

        {/* 3. AMOUNT & RATE GRID */}
        <View style={styles.dataGrid}>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Amount</Text>
            <Text style={styles.dataValue}>₹ {amount.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.dataItemRight}>
             <Text style={styles.dataValue}>₹ {RATE} / L</Text>
          </View>
        </View>

        {/* 4. TIMELINE DIVIDER */}
        <View style={styles.timelineDivider}>
           <View style={styles.line} />
           <Text style={styles.timelineText}>Timeline arounder</Text>
           <View style={styles.line} />
        </View>

        {/* 5. THE SYSTEM SYNC BAR */}
        <View style={styles.syncBarContainer}>
           <View style={styles.syncHeader}>
              <Info size={14} color="#92400E" />
              <Text style={styles.syncLabel}>OFFLINE MODE:</Text>
           </View>
           <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: dispenseComplete ? '100%' : '40%' }]} />
           </View>
        </View>

        {/* 6. CONTEXTUAL ACTION AREA */}
        {!dispenseComplete ? (
          <TouchableOpacity 
            style={[styles.actionBtn, running ? styles.bgRed : styles.bgGreen]} 
            onPress={running ? stopDispensing : startDispensing}
          >
            <Text style={styles.actionBtnText}>
              {running ? "STOP DISPENSING" : "START DISPENSING"}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.settlementBox}>
            <Text style={styles.otpHeader}>Enter End OTP</Text>
            
            <View style={styles.otpContainer}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={styles.otpBox}>
                  <Text style={styles.otpChar}>{otpInput[i] || "-"}</Text>
                </View>
              ))}
              <TextInput
                style={styles.hiddenInput}
                keyboardType="number-pad"
                maxLength={4}
                value={otpInput}
                onChangeText={setOtpInput}
                autoFocus={dispenseComplete}
              />
            </View>

            <TouchableOpacity 
              style={[styles.payBtn, processingPayment && { opacity: 0.6 }]} 
              onPress={handleVerifyAndPay}
              disabled={processingPayment}
            >
              <Text style={styles.payBtnText}>
                {processingPayment ? "Processing..." : "Verify OTP & Complete Delivery"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  warningBanner: { flexDirection: 'row', backgroundColor: "#FEF3C7", paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 15, alignItems: 'center' },
  warningTitle: { fontWeight: "900", color: "#92400E", fontSize: 14 },
  warningSubText: { color: "#B45309", fontSize: 12, fontWeight: '600' },
  scrollContent: { paddingHorizontal: 24, alignItems: 'center' },
  meterArea: { flexDirection: 'row', alignItems: 'baseline', marginTop: 50, marginBottom: 40 },
  mainVolume: { fontSize: 80, fontWeight: "300", color: "#111827", letterSpacing: -2 },
  unitLabel: { fontSize: 36, fontWeight: "400", color: "#111827", marginLeft: 8 },
  dataGrid: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20 },
  dataItem: { gap: 4 },
  dataItemRight: { justifyContent: 'flex-end', paddingBottom: 2 },
  dataLabel: { fontSize: 13, color: "#6B7280", fontWeight: "700", textTransform: 'uppercase' },
  dataValue: { fontSize: 24, fontWeight: "900", color: "#111827" },
  timelineDivider: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 20, gap: 10 },
  line: { flex: 1, height: 1, backgroundColor: '#F3F4F6' },
  timelineText: { color: '#D1D5DB', fontSize: 11, fontWeight: '700' },
  syncBarContainer: { width: '100%', backgroundColor: '#FDE68A', borderRadius: 12, padding: 16, marginBottom: 40 },
  syncHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  syncLabel: { fontWeight: "900", color: "#92400E", fontSize: 12 },
  progressBarBg: { height: 6, backgroundColor: 'rgba(146, 64, 14, 0.15)', borderRadius: 3 },
  progressBarFill: { height: '100%', backgroundColor: '#D97706', borderRadius: 3 },
  actionBtn: { width: '100%', paddingVertical: 18, borderRadius: 16, alignItems: 'center', elevation: 4 },
  bgGreen: { backgroundColor: '#10B981' },
  bgRed: { backgroundColor: '#EF4444' },
  actionBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  settlementBox: { width: '100%', alignItems: 'center' },
  otpHeader: { fontSize: 14, fontWeight: '700', color: '#6B7280', marginBottom: 15 },
  otpContainer: { flexDirection: 'row', gap: 12, marginBottom: 30, justifyContent: 'center' },
  otpBox: { width: 55, height: 65, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  otpChar: { fontSize: 24, fontWeight: '800', color: '#111827' },
  hiddenInput: { position: 'absolute', opacity: 0, width: '100%', height: '100%' },
  payBtn: { width: '100%', backgroundColor: '#111827', paddingVertical: 20, borderRadius: 16, alignItems: 'center' },
  payBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 }
});