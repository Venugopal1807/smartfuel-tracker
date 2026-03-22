import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Dimensions, KeyboardAvoidingView, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ShieldCheck, Scan, X } from "lucide-react-native";

const { height, width } = Dimensions.get("window");

export default function SecurityCheckScreen() {
  const navigation = useNavigation<any>();
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [pumpStatus, setPumpStatus] = useState("DISCONNECTED");

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    // Logic to move to next input would go here
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={styles.container}
    >
      {/* --- 1. DARK MOCKED MAP BACKGROUND --- */}
      <View style={styles.mapBackground}>
        <View style={styles.gridContainer}>
          {[...Array(12)].map((_, i) => <View key={`v-${i}`} style={[styles.gridLineV, { left: i * (width / 10) }]} />)}
          {[...Array(15)].map((_, i) => <View key={`h-${i}`} style={[styles.gridLineH, { top: i * (height / 15) }]} />)}
        </View>
        <View style={styles.darkOverlay} />
      </View>

      {/* --- 2. SECURITY CHECK CARD --- */}
      <View style={styles.card}>
        <Text style={styles.title}>Security Check</Text>

        {/* Pump Status Bar */}
        <View style={[styles.statusBox, pumpStatus === "DISCONNECTED" ? styles.bgOrange : styles.bgGreen]}>
          <Text style={styles.statusText}>Pump Status: {pumpStatus}</Text>
        </View>

        {/* Scan Button */}
        <TouchableOpacity style={styles.scanBtn} activeOpacity={0.8}>
          <Scan size={20} color="#fff" style={{ marginRight: 10 }} />
          <Text style={styles.scanBtnText}>Scan for Nearby Pumps</Text>
        </TouchableOpacity>

        <View style={styles.otpSection}>
          <Text style={styles.otpLabel}>Enter Start OTP to Unlock</Text>
          <View style={styles.otpInputGroup}>
            {otp.map((digit, index) => (
              <View key={index} style={styles.otpBox}>
                <Text style={styles.otpDigit}>{digit || "-"}</Text>
              </View>
            ))}
          </View>
          {/* Hidden TextInput to handle keyboard entry */}
          <TextInput
            style={styles.hiddenInput}
            keyboardType="number-pad"
            maxLength={4}
            onChangeText={(text) => setOtp(text.split(""))}
            autoFocus
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.footerRow}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.unlockBtn, otp.join("").length < 4 && styles.btnDisabled]}
            onPress={() => navigation.navigate("DispensingScreen")}
            disabled={otp.join("").length < 4}
          >
            <Text style={styles.unlockText}>Unlock Pump</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111827", justifyContent: 'center', alignItems: 'center' },
  
  // Map Background Styles
  mapBackground: { ...StyleSheet.absoluteFillObject },
  gridContainer: { ...StyleSheet.absoluteFillObject, opacity: 0.15 },
  gridLineV: { position: 'absolute', width: 1, height: '100%', backgroundColor: '#fff' },
  gridLineH: { position: 'absolute', height: 1, width: '100%', backgroundColor: '#fff' },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17, 24, 39, 0.7)' },

  // Main Card
  card: { width: width * 0.9, backgroundColor: "#fff", borderRadius: 24, padding: 24, alignItems: 'center', elevation: 20, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 15 },
  title: { fontSize: 28, fontWeight: "900", color: "#111827", marginBottom: 24 },

  statusBox: { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  bgOrange: { backgroundColor: "#F59E0B" },
  bgGreen: { backgroundColor: "#10B981" },
  statusText: { color: "#fff", fontWeight: "800", fontSize: 16, letterSpacing: 0.5 },

  scanBtn: { width: '100%', backgroundColor: "#1E3A8A", flexDirection: 'row', paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  scanBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  otpSection: { width: '100%', alignItems: 'center', marginBottom: 32 },
  otpLabel: { color: "#6B7280", fontSize: 14, fontWeight: "600", marginBottom: 16 },
  otpInputGroup: { flexDirection: 'row', gap: 12 },
  otpBox: { width: 55, height: 65, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  otpDigit: { fontSize: 24, fontWeight: "800", color: "#111827" },
  hiddenInput: { position: 'absolute', opacity: 0, width: '100%', height: '100%' },

  footerRow: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", alignItems: 'center' },
  cancelText: { color: "#6B7280", fontWeight: "700" },
  unlockBtn: { flex: 1.2, paddingVertical: 16, borderRadius: 12, backgroundColor: "#111827", alignItems: 'center' },
  unlockText: { color: "#fff", fontWeight: "800" },
  btnDisabled: { backgroundColor: "#D1D5DB" }
});