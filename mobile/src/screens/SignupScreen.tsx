import React, { useState } from "react";
import { View, Text, TextInput, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

type Props = { 
  onSuccess: (token: string) => void; 
  onNavigateLogin: () => void 
};

const SignupScreen: React.FC<Props> = ({ onSuccess, onNavigateLogin }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState(""); // Added for driver tracking
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const submit = async () => {
    setErrorMessage("");
  
    if (!name.trim()) return setErrorMessage("Please enter your full name.");
    if (phone.length !== 10) return setErrorMessage("Phone number must be 10 digits.");
    if (pin.length !== 4) return setErrorMessage("PIN must be 4 digits.");
    if (!vehicleNumber.trim()) return setErrorMessage("Vehicle number is required.");
  
    try {
      setLoading(true);
      // ✅ Matches 'api/auth.ts' body: { name, phone, pin, vehicle_number }
      const res = await axios.post(`${API_URL}/api/auth/signup`, { 
        name, 
        phone, 
        pin,
        vehicle_number: vehicleNumber.toUpperCase() 
      });
      
      if (res.data?.token) {
        const token = res.data.token;
        await AsyncStorage.setItem("auth_token", token);
        onSuccess(token);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Registration failed. Please try again.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to start your delivery shift.</Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <TextInput
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholderTextColor="#9CA3AF"
        />
        
        <TextInput
          placeholder="Phone Number"
          keyboardType="phone-pad"
          value={phone}
          maxLength={10}
          onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
          style={styles.input}
          placeholderTextColor="#9CA3AF"
        />

        <TextInput
          placeholder="Vehicle Number (e.g. TS09-EA-1234)"
          value={vehicleNumber}
          autoCapitalize="characters"
          onChangeText={setVehicleNumber}
          style={styles.input}
          placeholderTextColor="#9CA3AF"
        />

        <TextInput
          placeholder="Set 4-digit Security PIN"
          keyboardType="number-pad"
          secureTextEntry
          value={pin}
          maxLength={4}
          onChangeText={(text) => setPin(text.replace(/[^0-9]/g, ''))}
          style={styles.input}
          placeholderTextColor="#9CA3AF"
        />

        <TouchableOpacity onPress={submit} disabled={loading} style={[styles.button, loading && { opacity: 0.7 }]}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign Up</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={onNavigateLogin} style={styles.linkButton}>
          <Text style={styles.linkText}>Already have an account? Log in</Text>
        </TouchableOpacity>
        
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 24 },
  header: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: "800", color: "#111827", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#6B7280" },
  errorContainer: { backgroundColor: "#FEF2F2", padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: "#FCA5A5" },
  errorText: { color: "#DC2626", fontWeight: "600", textAlign: "center" },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 16, color: "#111827" },
  button: { backgroundColor: "#4F46E5", paddingVertical: 16, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 8, elevation: 4 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  linkButton: { marginTop: 24, padding: 10 },
  linkText: { color: "#4F46E5", textAlign: "center", fontSize: 16, fontWeight: "600" }
});

export default SignupScreen;