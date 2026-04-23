import React, { useEffect, useState } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, Alert, 
  ActivityIndicator, StyleSheet, ScrollView, 
  KeyboardAvoidingView, Platform 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { User, Landmark, Edit3, Check, X, LogOut, ChevronLeft } from "lucide-react-native";

// Global Store & Offline Queue
import { enqueueSyncEvent } from "../db/sqlite";
import { useFuelStore } from "../store/useFuelStore"; 

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.5:3000";

interface ProfileScreenProps {
  onLogout: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onLogout }) => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Global Vehicle State
  const { activeVehicle, setActiveVehicle } = useFuelStore();

  // Local Form State
  const [name, setName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");

  // We keep a local vehicle state only for editing purposes
  const [editVehicleNumber, setEditVehicleNumber] = useState("");

  const getHeaders = async () => {
    const token = await AsyncStorage.getItem("auth_token");
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  };

  // 1. Fetch Data from Database on Load
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const headers = await getHeaders();
      const res = await fetch(`${API_URL}/api/auth/profile`, { headers });
      
      if (!res.ok) {
        if (res.status === 404 || res.status === 401) {
          await AsyncStorage.removeItem("auth_token");
          onLogout();
          return;
        }
        throw new Error("HTTP_ERROR");
      }

      const responseData = await res.json();
      const data = responseData?.data;
      
      if (data) {
        setName(data.name || "");
        setBankName(data.bank_name || "");
        setAccountNumber(data.account_number || "");
        setIfsc(data.ifsc_code || "");
        
        // Sync database vehicle with global store and local edit state
        const dbVehicle = data.vehicle_number || "";
        if (dbVehicle && !activeVehicle) {
           setActiveVehicle(dbVehicle);
        }
        setEditVehicleNumber(dbVehicle);
      }
    } catch (err: any) {
      console.error("Profile Fetch Error", err);
      Alert.alert("Error", "Could not fetch profile data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Sync local edit field with global state if it changes externally (e.g. from Dashboard)
  useEffect(() => {
    if (activeVehicle && !isEditing) {
      setEditVehicleNumber(activeVehicle);
    }
  }, [activeVehicle, isEditing]);

  // 2. Save Data and Update Database
  const onSave = async () => {
    const payload = {
      name,
      vehicle_number: editVehicleNumber,
      bank_name: bankName,
      account_number: accountNumber,
      ifsc_code: ifsc,
    };

    try {
      setLoading(true);
      const headers = await getHeaders();
      
      // Optimistic Global State Update
      const previousVehicle = activeVehicle;
      setActiveVehicle(editVehicleNumber);

      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        // Rollback on conflict or server error
        setActiveVehicle(previousVehicle);
        throw new Error(`HTTP_ERROR_${res.status}`);
      }
      
      setIsEditing(false);
      Alert.alert("Success", "Profile updated in database.");
      
    } catch (err: any) {
      // Offline fallback
      if (!err.message.includes("HTTP_ERROR")) {
         await enqueueSyncEvent("PROFILE_UPDATE_SYNC", payload);
         setIsEditing(false);
         Alert.alert("Offline", "Changes saved locally and will sync later.");
      } else {
         Alert.alert("Error", "Could not update profile.");
      }
    } finally {
      setLoading(false);
    }
  };

  const renderInfoRow = (label: string, value: string, placeholder: string, onChange: (t: string) => void) => (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}</Text>
      {isEditing ? (
        <TextInput 
          style={styles.input} 
          value={value} 
          onChangeText={onChange} 
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
        />
      ) : (
        <Text style={styles.valueText}>{value || "Not Set"}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Settings</Text>
        <TouchableOpacity 
          onPress={() => (isEditing ? onSave() : setIsEditing(true))}
          style={styles.editBtn}
        >
          {isEditing ? <Check size={20} color="#10B981" /> : <Edit3 size={20} color="#4F46E5" />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading && !isEditing ? (
          <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 50 }} />
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {/* Personal Details Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <User size={18} color="#4F46E5" />
                <Text style={styles.cardTitle}>Personal Details</Text>
              </View>
              {renderInfoRow("Full Name", name, "Enter your name", setName)}
              {/* Note: We render the activeVehicle from global state when not editing */}
              {renderInfoRow("Vehicle Number", isEditing ? editVehicleNumber : (activeVehicle || ""), "e.g. TS-09-XX-0000", setEditVehicleNumber)}
            </View>

            {/* Bank Details Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Landmark size={18} color="#4F46E5" />
                <Text style={styles.cardTitle}>Bank Details</Text>
              </View>
              {renderInfoRow("Bank Name", bankName, "e.g. HDFC Bank", setBankName)}
              {renderInfoRow("Account Number", accountNumber, "Enter account number", setAccountNumber)}
              {renderInfoRow("IFSC Code", ifsc, "Enter IFSC", setIfsc)}
            </View>

            {isEditing && (
              <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                setIsEditing(false);
                setEditVehicleNumber(activeVehicle || ""); // Reset local edit state
              }}>
                <X size={18} color="#EF4444" style={{ marginRight: 8 }} />
                <Text style={styles.cancelBtnText}>Discard Changes</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
              <LogOut size={18} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.logoutBtnText}>Logout Account</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  backBtn: { padding: 4 },
  editBtn: { backgroundColor: '#F3F4F6', padding: 10, borderRadius: 12 },
  scroll: { padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },
  infoRow: { marginBottom: 16 },
  label: { fontSize: 12, color: '#9CA3AF', fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
  valueText: { fontSize: 16, color: '#111827', fontWeight: '600' },
  input: { fontSize: 16, color: '#111827', borderBottomWidth: 1.5, borderBottomColor: '#E5E7EB', paddingVertical: 4, fontWeight: '600' },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15 },
  cancelBtnText: { color: '#EF4444', fontWeight: '700' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, backgroundColor: '#FEE2E2', padding: 16, borderRadius: 12 },
  logoutBtnText: { color: '#EF4444', fontWeight: '700' }
});

export default ProfileScreen;