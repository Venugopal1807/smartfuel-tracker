import React, { useState } from "react";
import { 
  View, Text, TextInput, ActivityIndicator, 
  TouchableOpacity, KeyboardAvoidingView, Platform, 
  StyleSheet, SafeAreaView 
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

// Expo environment variable check
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
      setErrorMessage("Please enter a valid 10-digit phone number.");
      return;
    }
    if (pin.length !== 4) {
      setErrorMessage("Your security PIN must be 4 digits.");
      return;
    }
  
    try {
      setLoading(true);
      // ✅ Matches 'api/auth.ts' login route
      const res = await axios.post(`${API_URL}/api/auth/login`, { phone, pin });
      
      if (res.data?.token) {
        const token = res.data.token;
        // Save the token for future sessions
        await AsyncStorage.setItem("auth_token", token);
        // Trigger the state change in App.tsx
        onSuccess(token); 
      }
    } catch (err: any) {
      // Provide user-friendly feedback based on server response
      const status = err.response?.status;
      const msg = status === 404 ? "Account not found." : 
                  status === 401 ? "Incorrect PIN. Please try again." :
                  "Unable to connect. Check your internet.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <View style={styles.innerContainer}>
          
          <View style={styles.header}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Enter your details to access your dashboard.</Text>
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

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
            placeholder="4-digit Security PIN"
            keyboardType="number-pad"
            secureTextEntry
            value={pin}
            maxLength={4}
            onChangeText={(text) => setPin(text.replace(/[^0-9]/g, ''))}
            style={styles.input}
            placeholderTextColor="#9CA3AF"
          />

          <TouchableOpacity 
            onPress={submit} 
            disabled={loading} 
            style={[styles.button, loading && { opacity: 0.7 }]}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={onNavigateSignup} style={styles.linkContainer}>
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.linkTextBold}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  innerContainer: { flex: 1, justifyContent: "center", padding: 24 },
  header: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: "800", color: "#111827", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#6B7280" },
  errorBox: { backgroundColor: "#FEF2F2", padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: "#FCA5A5" },
  errorText: { color: "#DC2626", fontWeight: "600", textAlign: "center" },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 16, color: "#111827" },
  button: { backgroundColor: "#4F46E5", paddingVertical: 16, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 8, elevation: 4 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  linkContainer: { marginTop: 24, padding: 10 },
  linkText: { color: "#6B7280", textAlign: "center", fontSize: 16 },
  linkTextBold: { color: "#4F46E5", fontWeight: "700" }
});

export default LoginScreen;