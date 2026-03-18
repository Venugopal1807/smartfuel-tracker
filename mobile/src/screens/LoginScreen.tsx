import React, { useState } from "react";
import { View, Text, TextInput, ActivityIndicator, Alert } from "react-native";
import axios from "axios";

const API_URL = process.env.API_URL || "http://localhost:3000";

const LoginScreen: React.FC<{ onSuccess?: (token: string) => void }> = ({ onSuccess }) => {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!phone || pin.length !== 4) {
      Alert.alert("Missing info", "Enter phone and 4-digit PIN.");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/api/auth/login`, { phone, pin });
      if (res.data?.token) {
        onSuccess?.(res.data.token);
        Alert.alert("Success", "Logged in");
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
    <View style={{ flex: 1, padding: 24, backgroundColor: "#fff" }}>
      <Text style={{ fontSize: 24, fontWeight: "800", marginBottom: 16 }}>Log In</Text>
      <TextInput
        placeholder="Phone Number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        style={styles.input}
      />
      <TextInput
        placeholder="4-digit PIN"
        value={pin}
        onChangeText={(t) => setPin(t.slice(0, 4))}
        keyboardType="number-pad"
        secureTextEntry
        style={styles.input}
      />
      <View style={{ marginTop: 16 }}>
        <Text
          onPress={onSubmit}
          style={{
            backgroundColor: "#4F46E5",
            color: "#fff",
            textAlign: "center",
            paddingVertical: 14,
            borderRadius: 4,
            fontWeight: "700",
            fontSize: 16,
          }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </Text>
      </View>
      {loading ? (
        <View style={{ marginTop: 12 }}>
          <ActivityIndicator color="#4F46E5" />
        </View>
      ) : null}
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
