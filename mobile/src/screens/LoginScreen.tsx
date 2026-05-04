import React, { useState } from "react";
import { 
  View, Text, TextInput, ActivityIndicator, 
  TouchableOpacity, KeyboardAvoidingView, Platform, 
  StyleSheet, SafeAreaView, StatusBar
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Truck, Phone, Lock } from "lucide-react-native";

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
      const res = await axios.post(`${API_URL}/api/auth/login`, { phone, pin });
      
      if (res.data?.token) {
        const token = res.data.token;
        await AsyncStorage.setItem("auth_token", token);
        onSuccess(token); 
      }
    } catch (err: any) {
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
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <View style={styles.innerContainer}>
          
          {/* Branding Header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Truck size={36} color="#0284C7" />
            </View>
            <Text style={styles.title}>SmartFuel</Text>
            <Text style={styles.subtitle}>Enterprise Fleet Logistics</Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Operator Login</Text>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <View style={styles.inputWrapper}>
              <Phone size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                placeholder="Phone Number"
                keyboardType="phone-pad"
                value={phone}
                maxLength={10}
                onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
                style={styles.input}
                placeholderTextColor="#94A3B8"
              />
            </View>
            
            <View style={styles.inputWrapper}>
              <Lock size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                placeholder="4-digit Security PIN"
                keyboardType="number-pad"
                secureTextEntry
                value={pin}
                maxLength={4}
                onChangeText={(text) => setPin(text.replace(/[^0-9]/g, ''))}
                style={styles.input}
                placeholderTextColor="#94A3B8"
              />
            </View>

            <TouchableOpacity 
              onPress={submit} 
              disabled={loading} 
              activeOpacity={0.8}
              style={[styles.button, loading && { opacity: 0.7 }]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Authenticate Session</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Link */}
          <TouchableOpacity onPress={onNavigateSignup} style={styles.linkContainer}>
            <Text style={styles.linkText}>
              Unregistered Asset? <Text style={styles.linkTextBold}>Request Access</Text>
            </Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  innerContainer: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  
  // Header & Branding
  header: { alignItems: "center", marginBottom: 40 },
  logoCircle: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: "#E0F2FE", 
    justifyContent: "center", 
    alignItems: "center", 
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: "#0284C7", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12 },
      android: { elevation: 6 }
    })
  },
  title: { fontSize: 32, fontWeight: "900", color: "#0F172A", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: "#64748B", fontWeight: "600", marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
  
  // Premium Card
  card: { 
    backgroundColor: "#FFFFFF", 
    borderRadius: 24, 
    padding: 24, 
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16 },
      android: { elevation: 4 }
    })
  },
  cardHeader: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginBottom: 20 },
  
  errorBox: { backgroundColor: "#FEF2F2", padding: 14, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: "#FECACA" },
  errorText: { color: "#DC2626", fontWeight: "700", textAlign: "center", fontSize: 13 },
  
  // Input Bubbles
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 60,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: "#0F172A", fontWeight: "600", height: '100%' },
  
  // Amber Action Button
  button: { 
    backgroundColor: "#F59E0B", // Kung Fu Panda Orange
    paddingVertical: 18, 
    borderRadius: 16, 
    alignItems: "center", 
    justifyContent: "center", 
    marginTop: 12,
    ...Platform.select({
      ios: { shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10 },
      android: { elevation: 6 }
    })
  },
  buttonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16, letterSpacing: 0.5 },
  
  // Footer Link
  linkContainer: { marginTop: 32, padding: 10, alignItems: 'center' },
  linkText: { color: "#64748B", fontSize: 14, fontWeight: '500' },
  linkTextBold: { color: "#0F172A", fontWeight: "800" }
});

export default LoginScreen;