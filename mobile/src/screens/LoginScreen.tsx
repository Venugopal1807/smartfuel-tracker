import React, { useState } from "react";
import { View, Text, TextInput, ActivityIndicator, Alert, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

// FIX: Expo requires the EXPO_PUBLIC prefix to read env variables
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

type Props = { 
  onSuccess: (token: string) => void; 
  onNavigateSignup: () => void 
};
const LoginScreen: React.FC<Props> = ({ onSuccess, onNavigateSignup }) => {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const submit = async () => {
    setErrorMessage("");
    
    if (phone.length !== 10) {
      setErrorMessage("Phone number must be exactly 10 digits.");
      return;
    }
    if (pin.length !== 4) {
      setErrorMessage("PIN must be exactly 4 digits.");
      return;
    }
  
    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/api/auth/login`, { phone, pin });
      
      if (res.data?.token) {
        const token = res.data.token;
        // 2. Save to the "Wallet"
        await AsyncStorage.setItem("auth_token", token);
        // 3. Hand the "Badge" to App.tsx
        onSuccess(token); 
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Cannot connect to server.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      {/* FIX: justifyContent "center" moves everything to the middle */}
      <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 32, fontWeight: "800", color: "#111827", marginBottom: 8 }}>Welcome back</Text>
          <Text style={{ fontSize: 16, color: "#6B7280" }}>Enter your details to access your dashboard.</Text>
        </View>

        {errorMessage ? (
          <View style={{ backgroundColor: "#FEF2F2", padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: "#FCA5A5" }}>
            <Text style={{ color: "#DC2626", fontWeight: "600", textAlign: "center" }}>{errorMessage}</Text>
          </View>
        ) : null}

        <TextInput
          placeholder="Phone Number (10 digits)"
          keyboardType="phone-pad"
          value={phone}
          maxLength={10} // FIX: Restrict to 10 digits
          onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))} // Only allow numbers
          style={styles.input}
          placeholderTextColor="#9CA3AF"
        />
        <TextInput
          placeholder="4-digit PIN"
          keyboardType="number-pad"
          secureTextEntry
          value={pin}
          maxLength={4} // FIX: Restrict to 4 digits
          onChangeText={(text) => setPin(text.replace(/[^0-9]/g, ''))} // Only allow numbers
          style={styles.input}
          placeholderTextColor="#9CA3AF"
        />

        <TouchableOpacity onPress={submit} disabled={loading} style={[styles.button, loading && { opacity: 0.7 }]}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onNavigateSignup} style={{ marginTop: 24, padding: 10 }}>
          <Text style={{ color: "#4F46E5", textAlign: "center", fontSize: 16, fontWeight: "600" }}>
            Don't have an account? Sign up
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    fontSize: 16,
    color: "#111827",
  },
  button: {
    backgroundColor: "#4F46E5",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center", // Notice we don't need 'as const' anymore!
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700", // TypeScript now knows this is valid!
    fontSize: 18,
  }
});

export default LoginScreen;