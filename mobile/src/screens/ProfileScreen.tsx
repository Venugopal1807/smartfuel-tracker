import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { enqueueSyncEvent } from "../db/sqlite";

// FIX: Use EXPO_PUBLIC prefix for React Native
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.3:3000";

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [name, setName] = useState("");
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
      setName(data?.name || "");
      setVehicleNumber(data?.vehicleNumber || "");
      setBankName(data?.bankName || "");
      setAccountNumber(data?.accountNumber || "");
      setIfsc(data?.ifscCode || "");
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Failed to load profile. Are you online?");
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
          name,
          vehicle_number: vehicleNumber,
          bank_name: bankName,
          account_number: accountNumber,
          ifsc_code: ifsc,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Success", "Profile successfully updated.");
      fetchProfile();
    } catch (err: any) {
      // Offline fallback
      await enqueueSyncEvent("PROFILE_UPDATE_SYNC", {
        name,
        vehicle_number: vehicleNumber,
        bank_name: bankName,
        account_number: accountNumber,
        ifsc_code: ifsc,
      });
      Alert.alert("Offline Mode", "Profile saved locally. It will sync when connection is restored.");
    } finally {
      setLoading(false);
    }
  };

  const onLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Logout", 
        style: "destructive", 
        onPress: async () => {
          // 1. Remove the badge from the wallet
          await AsyncStorage.removeItem("auth_token");
          
          // 2. Clear the navigation and send them back to Login
          // Because we used Conditional Navigation in App.tsx, 
          // a simple refresh or navigating back to the start will 
          // trigger the Guard to re-check the (now empty) wallet.
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
          
          // Note: Since we aren't using a global state manager yet,
          // you might need to reload the app manually once after logout 
          // or I can show you the "Context API" in the next step!
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile & Bank</Text>
          <View style={{ width: 60 }} /> {/* Spacer to center title */}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {loading && !profile && <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 20 }} />}
          
          {profile && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Personal Details</Text>
                
                <Text style={styles.label}>Full Name</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="John Doe" />

                <Text style={styles.label}>Registered Phone</Text>
                <TextInput style={[styles.input, styles.inputDisabled]} value={profile.phone} editable={false} />

                <Text style={styles.label}>Vehicle Registration Number</Text>
                <TextInput style={styles.input} value={vehicleNumber} onChangeText={setVehicleNumber} placeholder="TS-09-XXXX" autoCapitalize="characters" />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Bank Information</Text>
                <Text style={styles.label}>Bank Name</Text>
                <TextInput style={styles.input} value={bankName} onChangeText={setBankName} placeholder="HDFC Bank" />
                
                <Text style={styles.label}>Account Number</Text>
                <TextInput style={styles.input} value={accountNumber} onChangeText={setAccountNumber} keyboardType="number-pad" placeholder="0000000000" secureTextEntry />
                
                <Text style={styles.label}>IFSC Code</Text>
                <TextInput style={styles.input} value={ifsc} onChangeText={setIfsc} autoCapitalize="characters" placeholder="HDFC0001234" />
              </View>

              <TouchableOpacity onPress={onSave} disabled={loading} style={[styles.saveBtn, loading && { opacity: 0.7 }]}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
                <Text style={styles.logoutBtnText}>Log Out Securely</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// FIX: Use StyleSheet.create for TypeScript compatibility and performance
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  backButton: { padding: 8 },
  backButtonText: { color: "#4B5563", fontWeight: "600", fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  
  scrollContent: { padding: 20, paddingBottom: 40 },
  section: { backgroundColor: "#fff", borderRadius: 12, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: "#E5E7EB" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 16 },
  
  label: { color: "#4B5563", fontWeight: "600", marginBottom: 6, fontSize: 14 },
  input: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 16, color: "#111827" },
  inputDisabled: { backgroundColor: "#E5E7EB", color: "#6B7280" },
  
  saveBtn: { backgroundColor: "#4F46E5", paddingVertical: 16, borderRadius: 12, alignItems: "center", shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  
  logoutBtn: { marginTop: 24, paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: "#FECACA", backgroundColor: "#FEF2F2", alignItems: "center" },
  logoutBtnText: { color: "#EF4444", fontWeight: "700", fontSize: 16 }
});

export default ProfileScreen;