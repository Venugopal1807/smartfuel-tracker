import React, { useState, useEffect, useRef } from "react";
import { 
  View, Text, TouchableOpacity, Alert, TextInput, 
  StyleSheet, ScrollView, Platform, ActivityIndicator, 
  StatusBar 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Info, Truck, CheckCircle2, AlertTriangle, ChevronLeft, Gauge } from "lucide-react-native";
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
  useKeepAwake(); 

  const order = route.params?.order || null;
  const orderId = order?.id || "demo-order";
  
  const { setTelemetry, isDispensing, setIsDispensing, reset } = useFuelStore();
  const { volume: storeVol, amount: storeAmt } = useFuelStore();
  const { sendCommand, bleState, disconnect, connectedDevice } = useBLE();

  const { 
    currentVolume: simVol, 
    startDispensing: startSim, 
    stopDispensing: stopSim,
    dispensing: isSimulating 
  } = useFuelSensor();

  const [dispenseComplete, setDispenseComplete] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [userId, setUserId] = useState<string>("");
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    (async () => {
      const storedUser = await AsyncStorage.getItem("user_profile");
      if (storedUser) {
        const userObj = JSON.parse(storedUser);
        setUserId(String(userObj.id));
      }

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation(loc);
      }

      if (__DEV__ && bleState !== "READY") {
        setIsDispensing(true);
        startSim();
      }
    })();
  }, [bleState]);

  useEffect(() => {
    if (__DEV__ && isSimulating) {
      const calculatedAmt = (simVol * RATE).toFixed(2);
      setTelemetry(simVol.toString(), calculatedAmt, RATE.toString());
    }
  }, [simVol, isSimulating]);

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

  const handleStopDispensing = async () => {
    if (pollingInterval.current) clearInterval(pollingInterval.current);
    if (__DEV__) stopSim();
    
    setIsDispensing(false);
    setDispenseComplete(true);

    try {
      const lat = location?.coords.latitude || 0;
      const lng = location?.coords.longitude || 0;
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
      let hardwareCheckPassed = false;
      
      if (__DEV__ && bleState !== "READY") {
        hardwareCheckPassed = true; 
      } else {
        const cmdBytes = buildCompleteOrderCmd(orderId, otpInput);
        hardwareCheckPassed = await sendCommand(cmdBytes);
      }
      
      if (!hardwareCheckPassed) {
        Alert.alert("Hardware Error", "Pump nozzle was not locked. Safety trigger failed.");
        setProcessingPayment(false);
        return;
      }

      await processPayment(
        parseFloat(storeAmt), 
        orderId, 
        otpInput, 
        parseFloat(storeVol), 
        connectedDevice?.name || "MDU-SIMULATED"
      );

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Dynamic Status Header */}
      <View style={styles.header}>
        <View style={[styles.banner, dispenseComplete ? styles.bannerComplete : styles.bannerActive]}>
          {dispenseComplete ? (
            <CheckCircle2 size={18} color="#FFFFFF" />
          ) : (
            <ActivityIndicator size="small" color="#FFFFFF" />
          )}
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.bannerTitle}>
              {dispenseComplete ? "Fueling Successful" : "Dispensing In Progress"}
            </Text>
            <Text style={styles.bannerSubtitle}>
              {dispenseComplete ? "Verify End-OTP with client" : "Hardware Bypass: Simulating Flow"}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* THE METER CARD (Industrial Dark Theme) */}
        <View style={styles.meterCard}>
          <View style={styles.meterHeader}>
            <Gauge size={16} color="#94A3B8" />
            <Text style={styles.meterLabel}>LIVE TELEMETRY</Text>
          </View>
          <View style={styles.meterValueContainer}>
            <Text style={styles.mainVolume}>{storeVol || "0.00"}</Text>
            <Text style={styles.unit}>LTR</Text>
          </View>
          <View style={styles.meterFooter}>
            <View style={styles.pulseDot} />
            <Text style={styles.meterStatus}>SYNCING VIA BLE 5.0</Text>
          </View>
        </View>

        {/* STATS CARD (Floating Design) */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Cost</Text>
            <Text style={styles.statValue}>₹ {storeAmt || "0.00"}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Unit Rate</Text>
            <Text style={styles.statValue}>₹ {RATE}/L</Text>
          </View>
        </View>

        {!dispenseComplete ? (
          <TouchableOpacity 
            style={styles.stopButton} 
            onPress={handleStopDispensing}
            activeOpacity={0.8}
          >
            <Text style={styles.stopButtonText}>STOP PUMP & FINALIZE</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.otpSection}>
            <Text style={styles.otpSectionLabel}>Customer Security OTP</Text>
            <View style={styles.otpRow}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={[styles.otpBox, otpInput.length === i && styles.otpBoxActive]}>
                  <Text style={styles.otpText}>{otpInput[i] || ""}</Text>
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
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 24, paddingVertical: 12 },
  
  // Floating Status Pill
  banner: { 
    flexDirection: 'row', 
    padding: 16, 
    alignItems: 'center', 
    borderRadius: 16,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 }
    })
  },
  bannerActive: { backgroundColor: "#F59E0B" }, // Kung Fu Panda Orange
  bannerComplete: { backgroundColor: "#0284C7" }, // Tech Blue
  bannerTitle: { fontWeight: "800", color: "#FFFFFF", fontSize: 14 },
  bannerSubtitle: { color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: '600' },

  scroll: { paddingHorizontal: 24, paddingVertical: 20, alignItems: 'center' },

  // Dark Industrial Meter Card
  meterCard: { 
    width: '100%',
    backgroundColor: "#0F172A", 
    borderRadius: 32, 
    padding: 30, 
    marginBottom: 24,
    ...Platform.select({
      ios: { shadowColor: "#0284C7", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 20 },
      android: { elevation: 10 }
    })
  },
  meterHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  meterLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '800', marginLeft: 8, letterSpacing: 1 },
  meterValueContainer: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },
  mainVolume: { fontSize: 84, fontWeight: "900", color: "#FFFFFF", letterSpacing: -2 },
  unit: { fontSize: 24, fontWeight: "700", color: "#334155", marginLeft: 10 },
  meterFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 8, borderRadius: 12 },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 8 },
  meterStatus: { color: '#64748B', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  // Floating Stats Card
  statsCard: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    width: '100%', 
    marginBottom: 32, 
    backgroundColor: '#FFFFFF', 
    padding: 24, 
    borderRadius: 24,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 2 }
    })
  },
  statItem: { flex: 1 },
  statDivider: { width: 1, height: '100%', backgroundColor: '#F1F5F9', marginHorizontal: 20 },
  statLabel: { fontSize: 11, color: "#94A3B8", fontWeight: "800", textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
  statValue: { fontSize: 22, fontWeight: "800", color: "#0F172A" },

  stopButton: { 
    width: '100%', 
    backgroundColor: '#0F172A', 
    padding: 22, 
    borderRadius: 20, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155'
  },
  stopButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16, letterSpacing: 1 },

  // OTP Section
  otpSection: { width: '100%', alignItems: 'center' },
  otpSectionLabel: { fontSize: 12, fontWeight: '800', color: '#94A3B8', marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1 },
  otpRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  otpBox: { 
    width: 65, 
    height: 80, 
    backgroundColor: '#F1F5F9', 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  otpBoxActive: { borderColor: '#0284C7', backgroundColor: '#FFFFFF' },
  otpText: { fontSize: 32, fontWeight: '900', color: '#0F172A' },
  hiddenInput: { position: 'absolute', opacity: 0, width: '100%', height: '100%' },

  payButton: { 
    width: '100%', 
    backgroundColor: '#0284C7', 
    padding: 22, 
    borderRadius: 20, 
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: "#0284C7", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 6 }
    })
  },
  payButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 }
});