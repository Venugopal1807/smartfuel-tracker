import React, { useState } from "react";
import { View, Text, TextInput, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API_URL = process.env.API_URL || "http://localhost:3000";

type Props = { onSuccess?: () => void; onNavigateSignup?: () => void };

const LoginScreen: React.FC<Props> = ({ onSuccess, onNavigateSignup }) => {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!phone || pin.length !== 4) {
      Alert.alert("Missing info", "Enter phone and 4-digit PIN.");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/api/auth/login`, { phone, pin });
      if (res.data?.token) {
        await AsyncStorage.setItem("auth_token", res.data.token);
        onSuccess?.();
      } else {
        Alert.alert("Login failed", "No token returned.");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Invalid credentials";
      Alert.alert("Login failed", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff", padding: 24 }}>
      <Text style={{ fontSize: 24, fontWeight: "800", marginBottom: 12 }}>Welcome back</Text>

      <TextInput
        placeholder="Phone Number"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        style={styles.input}
      />
      <TextInput
        placeholder="4-digit PIN"
        keyboardType="number-pad"
        secureTextEntry
        value={pin}
        onChangeText={(t) => setPin(t.slice(0, 4))}
        style={styles.input}
      />

      <TouchableOpacity
        onPress={submit}
        disabled={loading}
        style={{
          backgroundColor: "#4F46E5",
          paddingVertical: 14,
          borderRadius: 4,
          alignItems: "center",
          marginTop: 8,
          opacity: loading ? 0.7 : 1,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>{loading ? "Signing in..." : "Sign In"}</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={{ marginTop: 12 }}>
          <ActivityIndicator color="#4F46E5" />
        </View>
      ) : null}

      <TouchableOpacity onPress={onNavigateSignup} style={{ marginTop: 16 }}>
        <Text style={{ color: "#4F46E5", textAlign: "center" }}>Create account</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = {
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
  },
};

export default LoginScreen;
