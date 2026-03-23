import React, { useState, useEffect } from "react";
import { 
  View, Text, TouchableOpacity, StyleSheet, TextInput, Dimensions, 
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, FlatList 
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Scan, CheckCircle, Bluetooth } from "lucide-react-native";
import useBLE from "../hooks/useBLE";
import { buildStartOrderCmd } from "../services/bleCommands";

const { height, width } = Dimensions.get("window");

export default function SecurityCheckScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const activeOrder = route.params?.order || { id: "TEST-ORDER-123" };

  const [otp, setOtp] = useState(["", "", "", ""]);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showBypass, setShowBypass] = useState(false);

  const { 
    startScan, stopScan, connectToPump, disconnect, sendCommand, 
    scannedDevices, bleState, connectedDevice, errorMessage 
  } = useBLE();

  useEffect(() => {
    if (errorMessage) Alert.alert("Bluetooth", errorMessage);
  }, [errorMessage]);

  useEffect(() => {
    return () => { if (bleState === "READY") disconnect(); };
  }, []);

  // --- TIMER LOGIC ---
  const handleStartScan = () => {
    setShowBypass(false);
    startScan();

    // 1. Scan for exactly 5 seconds, then stop
    setTimeout(() => {
      stopScan();
      
      // 2. Wait exactly 5 more seconds for the user to pick a device
      setTimeout(() => {
        // If they still haven't connected after waiting 5 seconds, show Bypass
        setShowBypass(true); 
      }, 5000);

    }, 5000);
  };

  // --- HARDWARE VALIDATION ---
  const handleDeviceSelection = (device: any) => {
    // If the device doesn't have "SmartFuel" (or "MDU") in its name, reject it!
    if (!device.name || !device.name.toUpperCase().includes("SMARTFUEL")) {
      Alert.alert(
        "Invalid Device", 
        `"${device.name || 'Unknown Device'}" is not a recognized SmartFuel pump. Please select a real pump.`
      );
      return;
    }
    
    // If it is a real pump, connect!
    connectToPump(device);
  };

  const handleUnlockPump = async () => {
    const finalOtp = otp.join("");
    if (finalOtp.length !== 4) return;
    setIsUnlocking(true);

    try {
      const commandBytes = buildStartOrderCmd(activeOrder.id, finalOtp);
      const success = await sendCommand(commandBytes);

      if (success) {
        setTimeout(() => {
          setIsUnlocking(false);
          navigation.navigate("DispensingScreen", { order: activeOrder });
        }, 1000);
      } else {
        setIsUnlocking(false);
        Alert.alert("Failed", "Could not send unlock command.");
      }
    } catch (e) { setIsUnlocking(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <View style={styles.mapBackground}><View style={styles.darkOverlay} /></View>

      <View style={styles.card}>
        <Text style={styles.title}>Security Check</Text>

        {/* STATUS BAR */}
        <View style={[styles.statusBox, bleState === "READY" ? styles.bgGreen : styles.bgBlue]}>
          <Text style={styles.statusText}>
            {bleState === "SCANNING" ? "SEARCHING NEARBY..." :
             bleState === "CONNECTING" ? "PAIRING..." :
             bleState === "READY" ? `CONNECTED TO ${connectedDevice?.name}` : "PUMP DISCONNECTED"}
          </Text>
        </View>

        {/* SCAN BUTTON */}
        {bleState !== "READY" && (
          <TouchableOpacity style={styles.scanBtn} onPress={handleStartScan} disabled={bleState === "SCANNING"}>
            {bleState === "SCANNING" ? <ActivityIndicator color="#fff" style={{ marginRight: 10 }}/> : <Scan size={20} color="#fff" style={{ marginRight: 10 }} />}
            <Text style={styles.scanBtnText}>{bleState === "SCANNING" ? "Scanning (5s)..." : "Scan for Pumps"}</Text>
          </TouchableOpacity>
        )}

        {/* DEVICE LIST */}
        {bleState !== "READY" && scannedDevices.length > 0 && (
          <View style={styles.deviceListContainer}>
            <Text style={styles.listLabel}>Select a Pump:</Text>
            <FlatList
              data={scannedDevices}
              keyExtractor={item => item.id}
              style={{ maxHeight: 150 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.deviceItem} onPress={() => handleDeviceSelection(item)}>
                  <Bluetooth size={16} color="#4F46E5" />
                  <Text style={styles.deviceName}>{item.name || "Unknown Device"}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* BYPASS BUTTON (Appears after 10 seconds total) */}
        {showBypass && bleState !== "READY" && (
          <TouchableOpacity 
            style={styles.bypassBtn}
            onPress={() => navigation.navigate("DispensingScreen", { order: activeOrder })}
          >
            <Text style={styles.bypassText}>Bypass Connection (Proceed to Fueling)</Text>
          </TouchableOpacity>
        )}

        {/* OTP SECTION */}
        <View style={[styles.otpSection, bleState !== "READY" && { opacity: 0.3 }]}>
          <Text style={styles.otpLabel}>Enter Start OTP to Unlock</Text>
          <View style={styles.otpInputGroup}>
            {otp.map((digit, index) => (
              <View key={index} style={[styles.otpBox, digit ? styles.otpBoxActive : null]}>
                <Text style={styles.otpDigit}>{digit || "-"}</Text>
              </View>
            ))}
          </View>
          <TextInput
            style={styles.hiddenInput} keyboardType="number-pad" maxLength={4}
            value={otp.join("")} onChangeText={(text) => setOtp(text.split("").concat(["","","",""]).slice(0,4))}
            editable={bleState === "READY"}
          />
        </View>

        {/* FOOTER */}
        <View style={styles.footerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity 
            style={[styles.unlockBtn, (otp.join("").length < 4 || bleState !== "READY") && styles.btnDisabled]}
            onPress={handleUnlockPump} disabled={otp.join("").length < 4 || bleState !== "READY" || isUnlocking}
          >
            {isUnlocking ? <ActivityIndicator color="#fff" /> : <Text style={styles.unlockText}>Unlock Pump</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111827", justifyContent: 'center', alignItems: 'center' },
  mapBackground: { ...StyleSheet.absoluteFillObject },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17, 24, 39, 0.7)' },
  card: { width: width * 0.9, backgroundColor: "#fff", borderRadius: 24, padding: 24, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: "900", color: "#111827", marginBottom: 16 },
  statusBox: { width: '100%', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginBottom: 16 },
  bgBlue: { backgroundColor: "#3B82F6" }, bgGreen: { backgroundColor: "#10B981" },
  statusText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  scanBtn: { width: '100%', backgroundColor: "#1E3A8A", flexDirection: 'row', paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  scanBtnText: { color: "#fff", fontWeight: "700" },
  
  // NEW STYLES
  deviceListContainer: { width: '100%', marginBottom: 16, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  listLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 8 },
  deviceItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  deviceName: { marginLeft: 10, fontSize: 15, fontWeight: '600', color: '#111827' },
  bypassBtn: { width: '100%', backgroundColor: '#FEF2F2', paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#FCA5A5', marginBottom: 20 },
  bypassText: { color: '#DC2626', fontWeight: '700', fontSize: 13 },

  otpSection: { width: '100%', alignItems: 'center', marginBottom: 24 },
  otpLabel: { color: "#6B7280", fontSize: 14, fontWeight: "600", marginBottom: 12 },
  otpInputGroup: { flexDirection: 'row', gap: 10 },
  otpBox: { width: 50, height: 60, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  otpBoxActive: { borderColor: "#1E3A8A", backgroundColor: "#EEF2FF" },
  otpDigit: { fontSize: 22, fontWeight: "800", color: "#111827" },
  hiddenInput: { position: 'absolute', opacity: 0, width: '100%', height: '100%' },
  footerRow: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", alignItems: 'center' },
  cancelText: { color: "#6B7280", fontWeight: "700" },
  unlockBtn: { flex: 1.2, paddingVertical: 14, borderRadius: 10, backgroundColor: "#111827", alignItems: 'center', justifyContent: 'center' },
  unlockText: { color: "#fff", fontWeight: "800" },
  btnDisabled: { backgroundColor: "#D1D5DB" }
});