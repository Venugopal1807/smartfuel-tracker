import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";

const API_URL = process.env.API_URL || "http://localhost:3000";

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("auth_token");
      const res = await axios.get(`${API_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data?.data;
      setProfile(data);
      setVehicleNumber(data?.vehicleNumber || "");
      setBankName(data?.bankName || "");
      setAccountNumber(data?.accountNumber || "");
      setIfsc(data?.ifscCode || "");
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const onSave = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("auth_token");
      await axios.patch(
        `${API_URL}/api/auth/profile`,
        {
          vehicle_number: vehicleNumber,
          bank_name: bankName,
          account_number: accountNumber,
          ifsc_code: ifsc,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Saved", "Profile updated");
      fetchProfile();
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  const onLogout = async () => {
    await AsyncStorage.removeItem("auth_token");
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff", padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "800", marginBottom: 12 }}>Profile & Bank</Text>
      {loading && <ActivityIndicator color="#4F46E5" style={{ marginBottom: 12 }} />}
      {profile && (
        <>
          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} value={profile.name} editable={false} />

          <Text style={styles.label}>Phone</Text>
          <TextInput style={styles.input} value={profile.phone} editable={false} />

          <Text style={styles.label}>Vehicle Number</Text>
          <TextInput style={styles.input} value={vehicleNumber} onChangeText={setVehicleNumber} placeholder="TS-09-XXXX" />

          <View style={{ marginTop: 16, borderTopWidth: 1, borderColor: "#E5E7EB", paddingTop: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>Bank Info</Text>
            <Text style={styles.label}>Bank Name</Text>
            <TextInput style={styles.input} value={bankName} onChangeText={setBankName} />
            <Text style={styles.label}>Account Number</Text>
            <TextInput style={styles.input} value={accountNumber} onChangeText={setAccountNumber} keyboardType="number-pad" />
            <Text style={styles.label}>IFSC Code</Text>
            <TextInput style={styles.input} value={ifsc} onChangeText={setIfsc} autoCapitalize="characters" />
          </View>

          <TouchableOpacity
            onPress={onSave}
            disabled={loading}
            style={{
              marginTop: 16,
              backgroundColor: "#4F46E5",
              paddingVertical: 14,
              borderRadius: 4,
              alignItems: "center",
              opacity: loading ? 0.7 : 1,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Save Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onLogout} style={{ marginTop: 12 }}>
            <Text style={{ color: "#EF4444", textAlign: "center", fontWeight: "700" }}>Logout</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = {
  label: {
    color: "#6B7280",
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
};

export default ProfileScreen;
