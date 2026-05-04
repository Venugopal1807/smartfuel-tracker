import React, { useState, useEffect } from "react";
import { 
  View, Text, TouchableOpacity, StyleSheet, TextInput, Dimensions, 
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, FlatList,
  StatusBar
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Scan, CheckCircle, Bluetooth, ChevronLeft, ShieldAlert } from "lucide-react-native";

// Hooks & Services
import useBLE from "../hooks/useBLE";
import { buildStartOrderCmd } from "../services/bleCommands";
import { useFuelStore } from "../store/useFuelStore";

const { width } = Dimensions.get("window");

export default function SecurityCheckScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const activeOrder = route.params?.order || { id: "TEST-ORDER-123", customer_name: "Test Client" };

  const [otp, setOtp] = useState(["", "", "", ""]);
  const [isUnlocking, setIsUnlocking] = useState(false);
  
  // FIX: Show Bypass button immediately if we are in Development Mode
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
      setTimeout(() => setShowBypass(true), 1000);
    }
    
    startScan();

    setTimeout(() => {
      stopScan();
      setTimeout(() => {
        setShowBypass(true); 
      }, 5000);
    }, 5000);
  };

  const handleDeviceSelection = (device: any) => {
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

    if (__DEV__ && bleState !== "READY") {
      console.log("[Sim] Bypassing hardware command for OTP:", finalOtp);
      setTimeout(() => {
        setIsUnlocking(false);
        navigation.navigate("DispensingScreen", { order: activeOrder });
      }, 1200);
      return;
    }

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
      <Text style={styles.otpDigit}>{digit || ""}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        
        {/* Header */}
        <View style={styles.header}>
           <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <ChevronLeft size={28} color="#0F172A" />
           </TouchableOpacity>
           <Text style={styles.headerTitle}>Hardware Handshake</Text>
           <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.card}>
            
            <View style={styles.iconCircle}>
               <Bluetooth size={34} color={bleState === "READY" ? "#10B981" : "#0284C7"} />
            </View>
            
            <Text style={styles.title}>MDU Telemetry Link</Text>
            <Text style={styles.subtitle}>Secure connection required to dispense</Text>

            {/* STATUS BANNER */}
            <View style={[styles.statusBox, bleState === "READY" ? styles.bgGreen : styles.bgBlue]}>
              {bleState === "SCANNING" ? <ActivityIndicator size="small" color="#FFFFFF" style={{marginRight: 8}} /> : null}
              {bleState === "READY" ? <CheckCircle size={16} color="#FFFFFF" style={{marginRight: 8}} /> : null}
              <Text style={styles.statusText}>
                {bleState === "SCANNING" ? "SEARCHING FREQUENCIES..." :
                 bleState === "CONNECTING" ? "NEGOTIATING HANDSHAKE..." :
                 bleState === "READY" ? `SECURED: ${connectedDevice?.name}` : "PUMP DISCONNECTED"}
              </Text>
            </View>

            {/* SCAN / DEVICE LIST */}
            {bleState !== "READY" ? (
              <View style={{ width: '100%', marginBottom: 10 }}>
                <TouchableOpacity 
                  style={[styles.scanBtn, bleState === "SCANNING" && { opacity: 0.7 }]} 
                  onPress={handleStartScan} 
                  disabled={bleState === "SCANNING"}
                  activeOpacity={0.8}
                >
                  {bleState === "SCANNING" ? null : <Scan size={20} color="#FFFFFF" />}
                  <Text style={styles.scanBtnText}>
                    {bleState === "SCANNING" ? "Scanning Environment..." : "Initiate Hardware Scan"}
                  </Text>
                </TouchableOpacity>

                {scannedDevices.length > 0 && (
                  <View style={styles.deviceListContainer}>
                    <FlatList
                      data={scannedDevices}
                      keyExtractor={item => item.id}
                      style={{ maxHeight: 130 }}
                      renderItem={({ item }) => (
                        <TouchableOpacity style={styles.deviceItem} onPress={() => handleDeviceSelection(item)}>
                          <View style={styles.deviceItemLeft}>
                            <Bluetooth size={18} color="#0284C7" />
                            <Text style={styles.deviceName}>{item.name || "SmartFuel Asset"}</Text>
                          </View>
                          <Text style={styles.connectLink}>Connect</Text>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.connectedBadge}>
                 <CheckCircle size={20} color="#10B981" />
                 <Text style={styles.connectedText}>Telemetry Stream Active</Text>
              </View>
            )}

            {/* BYPASS BUTTON (Simulated Testing) */}
            {showBypass && bleState !== "READY" && (
              <TouchableOpacity 
                style={styles.bypassBtn}
                onPress={() => navigation.navigate("DispensingScreen", { order: activeOrder })}
              >
                <ShieldAlert size={16} color="#DC2626" style={{ marginRight: 8 }} />
                <Text style={styles.bypassText}>Developer Hardware Bypass</Text>
              </TouchableOpacity>
            )}

            {/* OTP SECTION */}
            <View style={[styles.otpSection, (bleState !== "READY" && !__DEV__) && { opacity: 0.3 }]}>
              <Text style={styles.otpLabel}>Customer Authorization PIN</Text>
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
              style={[
                styles.unlockBtn, 
                (otp.join("").length < 4 || (bleState !== "READY" && !__DEV__)) ? styles.btnDisabled : styles.btnActive
              ]}
              onPress={handleUnlockPump}
              disabled={otp.join("").length < 4 || (bleState !== "READY" && !__DEV__) || isUnlocking}
              activeOpacity={0.8}
            >
              {isUnlocking ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.unlockText}>UNLOCK HARDWARE</Text>}
            </TouchableOpacity>

          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { color: '#0F172A', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  
  // Main Floating Card
  card: { 
    width: width * 0.9, 
    backgroundColor: "#FFFFFF", 
    borderRadius: 32, 
    padding: 28, 
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 20 },
      android: { elevation: 6 }
    })
  },
  
  iconCircle: { 
    width: 76, 
    height: 76, 
    borderRadius: 38, 
    backgroundColor: '#E0F2FE', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: "#0284C7", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 10 },
      android: { elevation: 4 }
    })
  },
  title: { fontSize: 24, fontWeight: "900", color: "#0F172A", marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#64748B', marginBottom: 28, textAlign: 'center', fontWeight: '500' },
  
  // Status Banner
  statusBox: { flexDirection: 'row', width: '100%', paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  bgBlue: { backgroundColor: "#0284C7" }, // Tech Blue
  bgGreen: { backgroundColor: "#10B981" }, // Success Green
  statusText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12, letterSpacing: 0.5 },
  
  // Scan Button
  scanBtn: { width: '100%', backgroundColor: "#0F172A", flexDirection: 'row', paddingVertical: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 10 },
  scanBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  
  // Device List
  deviceListContainer: { width: '100%', marginTop: 12, backgroundColor: '#F8FAFC', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  deviceItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  deviceItemLeft: { flexDirection: 'row', alignItems: 'center' },
  deviceName: { marginLeft: 12, fontSize: 15, fontWeight: '700', color: '#0F172A' },
  connectLink: { color: '#0284C7', fontWeight: '700', fontSize: 13 },
  
  connectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, backgroundColor: '#F0FDF4', borderRadius: 16, width: '100%', justifyContent: 'center', marginBottom: 10 },
  connectedText: { color: '#16A34A', fontWeight: '800', fontSize: 14 },
  
  // Bypass
  bypassBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8, padding: 14, backgroundColor: '#FEF2F2', borderRadius: 14, borderWidth: 1, borderColor: '#FECACA', width: '100%', justifyContent: 'center' },
  bypassText: { color: '#DC2626', fontWeight: '800', fontSize: 13 },
  
  // OTP Section
  otpSection: { width: '100%', alignItems: 'center', marginVertical: 32 },
  otpLabel: { color: "#94A3B8", fontSize: 12, fontWeight: "800", marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  otpInputGroup: { flexDirection: 'row', gap: 14 },
  otpBox: { 
    width: 60, 
    height: 70, 
    borderWidth: 2, 
    borderColor: "transparent", 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#F1F5F9' 
  },
  otpBoxActive: { borderColor: "#0284C7", backgroundColor: "#FFFFFF" },
  otpDigit: { fontSize: 28, fontWeight: "900", color: "#0F172A" },
  hiddenInput: { position: 'absolute', opacity: 0, width: '100%', height: '100%' },
  
  // Unlock Button
  unlockBtn: { width: '100%', paddingVertical: 20, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  btnActive: { 
    backgroundColor: "#F59E0B", 
    ...Platform.select({
      ios: { shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10 },
      android: { elevation: 6 }
    })
  },
  btnDisabled: { backgroundColor: "#E2E8F0" },
  unlockText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16, letterSpacing: 0.5 }
});