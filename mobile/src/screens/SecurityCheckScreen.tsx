import React, { useState, useEffect } from "react";
import { 
  View, Text, TouchableOpacity, StyleSheet, TextInput, Dimensions, 
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, FlatList 
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Scan, CheckCircle, Bluetooth, ChevronLeft, ShieldAlert } from "lucide-react-native";
import useBLE from "../hooks/useBLE";
import { buildStartOrderCmd } from "../services/bleCommands";
import { useFuelStore } from "../store/useFuelStore";

const { height, width } = Dimensions.get("window");

export default function SecurityCheckScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const activeOrder = route.params?.order || { id: "TEST-ORDER-123", customer_name: "Test Client" };

  const [otp, setOtp] = useState(["", "", "", ""]);
  const [isUnlocking, setIsUnlocking] = useState(false);
  
  // ✅ FIX: Show Bypass button immediately if we are in Development Mode
  const [showBypass, setShowBypass] = useState(__DEV__);

  const { 
    startScan, stopScan, connectToPump, disconnect, sendCommand, 
    scannedDevices, bleState, connectedDevice, errorMessage 
  } = useBLE();

  // Alert on BLE errors, but don't block the UI in Dev mode
  useEffect(() => {
    if (errorMessage && !__DEV__) {
        Alert.alert("Bluetooth Error", errorMessage);
    } else if (errorMessage) {
        console.log("BLE Error (Suppressed in Dev):", errorMessage);
    }
  }, [errorMessage]);

  useEffect(() => {
    return () => { if (bleState === "READY") disconnect(); };
  }, []);

  const handleStartScan = () => {
    if (__DEV__) {
      console.log("[Sim] Starting mock scan...");
      // In dev mode, we pretend to find something after a short delay
      setTimeout(() => setShowBypass(true), 1000);
    }
    
    startScan();

    // Standard production timeout logic
    setTimeout(() => {
      stopScan();
      setTimeout(() => {
        setShowBypass(true); 
      }, 5000);
    }, 5000);
  };

  const handleDeviceSelection = (device: any) => {
    // Hardware validation
    if (!device.name || (!device.name.toUpperCase().includes("SMARTFUEL") && !device.name.toUpperCase().includes("MDU"))) {
      Alert.alert(
        "Invalid Device", 
        `"${device.name || 'Unknown'}" is not a recognized SmartFuel pump.`
      );
      return;
    }
    connectToPump(device);
  };

  const handleUnlockPump = async () => {
    const finalOtp = otp.join("");
    if (finalOtp.length !== 4) return;
    setIsUnlocking(true);

    // ✅ DEV BYPASS: Skip real hardware commands if testing on emulator
    if (__DEV__ && bleState !== "READY") {
      console.log("[Sim] Bypassing hardware command for OTP:", finalOtp);
      setTimeout(() => {
        setIsUnlocking(false);
        navigation.navigate("DispensingScreen", { order: activeOrder });
      }, 1200);
      return;
    }

    // Real Hardware Logic
    try {
      const commandBytes = buildStartOrderCmd(activeOrder.id, finalOtp);
      const success = await sendCommand(commandBytes);

      if (success) {
        setIsUnlocking(false);
        navigation.navigate("DispensingScreen", { order: activeOrder });
      } else {
        setIsUnlocking(false);
        Alert.alert("Command Failed", "The pump did not respond to the unlock command.");
      }
    } catch (e) { 
      setIsUnlocking(false); 
      Alert.alert("Error", "An unexpected error occurred during hardware unlock.");
    }
  };

  const renderOtpBox = (digit: string, index: number) => (
    <View key={index} style={[styles.otpBox, digit ? styles.otpBoxActive : null]}>
      <Text style={styles.otpDigit}>{digit || "-"}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <View style={styles.header}>
         <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#fff" />
         </TouchableOpacity>
         <Text style={styles.headerTitle}>Security Verification</Text>
         <View style={{ width: 40 }} />
      </View>

      <View style={styles.card}>
        <View style={styles.iconCircle}>
           <Bluetooth size={32} color={bleState === "READY" ? "#10B981" : "#4F46E5"} />
        </View>
        
        <Text style={styles.title}>Connect to Pump</Text>
        <Text style={styles.subtitle}>Please pair with the MDU unit to begin</Text>

        {/* STATUS BAR */}
        <View style={[styles.statusBox, bleState === "READY" ? styles.bgGreen : styles.bgBlue]}>
          <Text style={styles.statusText}>
            {bleState === "SCANNING" ? "SEARCHING NEARBY..." :
             bleState === "CONNECTING" ? "PAIRING..." :
             bleState === "READY" ? `CONNECTED: ${connectedDevice?.name}` : "PUMP DISCONNECTED"}
          </Text>
        </View>

        {/* SCAN / DEVICE LIST */}
        {bleState !== "READY" ? (
          <View style={{ width: '100%' }}>
            <TouchableOpacity 
              style={[styles.scanBtn, bleState === "SCANNING" && { opacity: 0.7 }]} 
              onPress={handleStartScan} 
              disabled={bleState === "SCANNING"}
            >
              {bleState === "SCANNING" ? <ActivityIndicator color="#fff" /> : <Scan size={20} color="#fff" />}
              <Text style={styles.scanBtnText}>
                {bleState === "SCANNING" ? "Searching..." : "Scan for Pumps"}
              </Text>
            </TouchableOpacity>

            {scannedDevices.length > 0 && (
              <View style={styles.deviceListContainer}>
                <FlatList
                  data={scannedDevices}
                  keyExtractor={item => item.id}
                  style={{ maxHeight: 120 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.deviceItem} onPress={() => handleDeviceSelection(item)}>
                      <Bluetooth size={16} color="#4F46E5" />
                      <Text style={styles.deviceName}>{item.name || "SmartFuel Unit"}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </View>
        ) : (
          <View style={styles.connectedBadge}>
             <CheckCircle size={20} color="#10B981" />
             <Text style={styles.connectedText}>Hardware Ready</Text>
          </View>
        )}

        {/* BYPASS BUTTON (Simulated Testing) */}
        {showBypass && bleState !== "READY" && (
          <TouchableOpacity 
            style={styles.bypassBtn}
            onPress={() => navigation.navigate("DispensingScreen", { order: activeOrder })}
          >
            <ShieldAlert size={16} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.bypassText}>Bypass for Testing</Text>
          </TouchableOpacity>
        )}

        {/* OTP SECTION */}
        <View style={[styles.otpSection, (bleState !== "READY" && !__DEV__) && { opacity: 0.2 }]}>
          <Text style={styles.otpLabel}>Enter Customer Start OTP</Text>
          <View style={styles.otpInputGroup}>
            {otp.map((digit, index) => renderOtpBox(digit, index))}
          </View>
          <TextInput
            style={styles.hiddenInput}
            keyboardType="number-pad"
            maxLength={4}
            value={otp.join("")}
            onChangeText={(text) => setOtp(text.split("").concat(["","","",""]).slice(0,4))}
            editable={bleState === "READY" || __DEV__}
          />
        </View>

        <TouchableOpacity 
          style={[styles.unlockBtn, (otp.join("").length < 4 || (bleState !== "READY" && !__DEV__)) && styles.btnDisabled]}
          onPress={handleUnlockPump}
          disabled={otp.join("").length < 4 || (bleState !== "READY" && !__DEV__) || isUnlocking}
        >
          {isUnlocking ? <ActivityIndicator color="#fff" /> : <Text style={styles.unlockText}>UNLOCK & START FUELING</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#4F46E5", justifyContent: 'center', alignItems: 'center' },
  header: { position: 'absolute', top: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20 },
  backBtn: { padding: 8 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  card: { width: width * 0.9, backgroundColor: "#fff", borderRadius: 32, padding: 24, alignItems: 'center', elevation: 10 },
  iconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: "900", color: "#111827", marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24, textAlign: 'center' },
  statusBox: { width: '100%', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  bgBlue: { backgroundColor: "#4F46E5" }, 
  bgGreen: { backgroundColor: "#10B981" },
  statusText: { color: "#fff", fontWeight: "800", fontSize: 12, letterSpacing: 0.5 },
  scanBtn: { width: '100%', backgroundColor: "#111827", flexDirection: 'row', paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 10 },
  scanBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  deviceListContainer: { width: '100%', marginTop: 10, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  deviceItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  deviceName: { marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#374151' },
  connectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#ECFDF5', borderRadius: 12, width: '100%', justifyContent: 'center' },
  connectedText: { color: '#065F46', fontWeight: '800', fontSize: 14 },
  bypassBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 16, padding: 12, backgroundColor: '#FEF2F2', borderRadius: 12, borderWidth: 1, borderColor: '#FEE2E2' },
  bypassText: { color: '#DC2626', fontWeight: '700', fontSize: 13 },
  otpSection: { width: '100%', alignItems: 'center', marginVertical: 30 },
  otpLabel: { color: "#6B7280", fontSize: 13, fontWeight: "700", marginBottom: 15, textTransform: 'uppercase' },
  otpInputGroup: { flexDirection: 'row', gap: 12 },
  otpBox: { width: 55, height: 65, borderWidth: 2, borderColor: "#E5E7EB", borderRadius: 15, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  otpBoxActive: { borderColor: "#4F46E5", backgroundColor: "#EEF2FF" },
  otpDigit: { fontSize: 24, fontWeight: "900", color: "#111827" },
  hiddenInput: { position: 'absolute', opacity: 0, width: '100%', height: '100%' },
  unlockBtn: { width: '100%', paddingVertical: 18, borderRadius: 16, backgroundColor: "#111827", alignItems: 'center', justifyContent: 'center' },
  unlockText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  btnDisabled: { backgroundColor: "#E5E7EB" }
});