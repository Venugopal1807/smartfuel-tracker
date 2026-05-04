import React, { useEffect, useState, useCallback } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, Alert, 
  ActivityIndicator, StyleSheet, ScrollView, 
  KeyboardAvoidingView, Platform, RefreshControl 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { User, Landmark, Edit3, Check, X, LogOut, ChevronLeft } from "lucide-react-native";

// Global Store & Offline Queue
import { enqueueSyncEvent } from "../db/sqlite";
import { useFuelStore } from "../store/useFuelStore"; 

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.3:3000";

interface ProfileScreenProps {
  onLogout: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onLogout }) => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, []);

  // Sync local edit field with global state if it changes externally
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
          placeholderTextColor="#94A3B8"
        />
      ) : (
        <Text style={styles.valueText}>{value || "Not Set"}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Asset Profile</Text>
        <TouchableOpacity 
          onPress={() => (isEditing ? onSave() : setIsEditing(true))}
          style={[styles.editBtn, isEditing ? styles.editBtnActive : null]}
        >
          {isEditing ? <Check size={20} color="#FFFFFF" /> : <Edit3 size={20} color="#0284C7" />}
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0284C7"]} />
        }
      >
        {loading && !isEditing && !refreshing ? (
          <ActivityIndicator size="large" color="#0284C7" style={{ marginTop: 50 }} />
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            
            {/* Personal Details Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconWrapper}>
                  <User size={18} color="#0284C7" />
                </View>
                <Text style={styles.cardTitle}>Operator Details</Text>
              </View>
              {renderInfoRow("Full Name", name, "Enter your name", setName)}
              {renderInfoRow("Assigned Asset", isEditing ? editVehicleNumber : (activeVehicle || ""), "e.g. TS-09-XX-0000", setEditVehicleNumber)}
            </View>

            {/* Bank Details Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconWrapper}>
                  <Landmark size={18} color="#0284C7" />
                </View>
                <Text style={styles.cardTitle}>Payout Details</Text>
              </View>
              {renderInfoRow("Bank Name", bankName, "e.g. HDFC Bank", setBankName)}
              {renderInfoRow("Account Number", accountNumber, "Enter account number", setAccountNumber)}
              {renderInfoRow("IFSC Code", ifsc, "Enter IFSC", setIfsc)}
            </View>

            {isEditing && (
              <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                setIsEditing(false);
                setEditVehicleNumber(activeVehicle || ""); 
              }}>
                <X size={20} color="#64748B" style={{ marginRight: 8 }} />
                <Text style={styles.cancelBtnText}>Discard Changes</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
              <LogOut size={20} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={styles.logoutBtnText}>Terminate Session</Text>
            </TouchableOpacity>

          </KeyboardAvoidingView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  
  // Header matching the clean Stitch look
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#F8FAFC' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  backBtn: { padding: 4, marginLeft: -8 },
  editBtn: { backgroundColor: '#E0F2FE', padding: 12, borderRadius: 16 },
  editBtnActive: { backgroundColor: '#F59E0B' }, // Orange for Save action
  
  scroll: { padding: 20, paddingBottom: 60 },
  
  // Floating White Cards
  card: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    padding: 24, 
    marginBottom: 20, 
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 12 },
      android: { elevation: 3 }
    })
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  iconWrapper: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  
  // Data Rows
  infoRow: { marginBottom: 20 },
  label: { fontSize: 12, color: '#94A3B8', fontWeight: '800', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  valueText: { fontSize: 16, color: '#0F172A', fontWeight: '700' },
  
  // Input Bubbles for Edit Mode
  input: { 
    fontSize: 16, 
    color: '#0F172A', 
    backgroundColor: '#F1F5F9', 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    borderRadius: 12, 
    fontWeight: '600' 
  },
  
  // Action Buttons
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, marginBottom: 8 },
  cancelBtnText: { color: '#64748B', fontWeight: '700', fontSize: 16 },
  
  logoutBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 10, 
    backgroundColor: '#FEF2F2', 
    padding: 18, 
    borderRadius: 16 
  },
  logoutBtnText: { color: '#DC2626', fontWeight: '800', fontSize: 16 }
});

export default ProfileScreen;