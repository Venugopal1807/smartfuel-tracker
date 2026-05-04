import React, { useEffect, useState, useCallback } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet, 
  ScrollView, 
  Modal, 
  FlatList,
  Alert,
  RefreshControl,
  Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { Bell, Truck, ChevronDown, MapPin, User, Check } from "lucide-react-native";

// Global Store & Offline Queue
import { useFuelStore } from "../store/useFuelStore"; 
import { enqueueSyncEvent } from "../db/sqlite";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.3:3000"; 
const TABS = ["New", "Confirmed", "In Transit", "History"] as const;

interface Order {
  id: string;
  customer_name?: string;
  customer_address?: string;
  expected_volume?: string;
  status: string;
  distance_km?: number;
}

interface DriverProfile {
  id?: string;
  name: string;
  initials: string;
  pumpId?: string;
}

interface Vehicle {
  id: string;
  reg: string;
}

export default function DashboardScreen() {
  const { setActiveOrder, activeVehicle, setActiveVehicle } = useFuelStore(); 

  const [tab, setTab] = useState<(typeof TABS)[number]>("New");
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<DriverProfile>({ name: "Driver", initials: "DR" });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const navigation = useNavigation<any>();

  const getHeaders = async () => {
    const token = await AsyncStorage.getItem("auth_token");
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  };

  const fetchProfileAndVehicles = async () => {
    try {
      const headers = await getHeaders();
      if (!headers.Authorization.includes("Bearer null")) {
        const profileRes = await fetch(`${API_URL}/api/auth/profile`, { headers });
        const profileData = await profileRes.json();
        
        if (profileData?.success) {
          const p = profileData.data;
          const name = p.name || "Driver";
          const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
          
          setProfile({ id: p.id, name, initials, pumpId: p.pumpId });

          if (p.vehicleNumber && !activeVehicle) {
            setActiveVehicle(p.vehicleNumber);
          }

          const vehicleRes = await fetch(`${API_URL}/api/auth/vehicles/pump`, { headers });
          const vehicleData = await vehicleRes.json();
          
          if (vehicleData?.success) {
            setVehicles(vehicleData.data);
          }
        }
      }
    } catch (err: any) {
      console.log("[Network] Profile Fetch Error:", err.message);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const headers = await getHeaders();
      const statusMap: Record<string, string> = {
        "New": "pending",
        "Confirmed": "accepted",
        "In Transit": "in_transit",
        "History": "completed"
      };
      
      const res = await fetch(`${API_URL}/api/orders?status=${statusMap[tab]}`, { headers });
      const data = await res.json();
      setOrders(data?.data || []);
    } catch (err: any) {
      console.log("[Network] Order Fetch Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchProfileAndVehicles(),
      fetchOrders()
    ]);
    setRefreshing(false);
  }, [tab]);

  const handleAcceptOrder = async (orderId: string) => {
    try {
      setLoading(true);
      const headers = await getHeaders();
      const driverId = profile.id || "temp-driver-id";

      const res = await fetch(`${API_URL}/api/orders/${orderId}/accept`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ driverId })
      });
      
      const data = await res.json();

      if (data.success) {
        const acceptedOrder = data.data;
        setActiveOrder(acceptedOrder);
        await AsyncStorage.setItem("active_order", JSON.stringify(acceptedOrder));
        navigation.navigate("Timeline"); 
        fetchOrders();
      }
    } catch (err: any) {
      console.log("[Flow] Accept error. Using fallback navigation.");
      const fallbackOrder = { id: orderId, status: 'accepted' };
      setActiveOrder(fallbackOrder);
      navigation.navigate("Timeline");
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = async (item: Order) => {
    setActiveOrder(item);
    await AsyncStorage.setItem("active_order", JSON.stringify(item));
    const target = item.status === 'in_transit' ? "In Transit" : "Timeline";
    navigation.navigate(target);
  };

  const handleVehicleChange = async (vehicleReg: string) => {
    const previousVehicle = activeVehicle;
    setActiveVehicle(vehicleReg);
    setShowVehiclePicker(false);

    try {
      const headers = await getHeaders();
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ vehicle_number: vehicleReg })
      });

      if (res.status === 409) {
        setActiveVehicle(previousVehicle);
        Alert.alert("Vehicle Unavailable", "This vehicle was just claimed by another driver.");
        return;
      }
      if (!res.ok) throw new Error("HTTP_ERROR");
      
    } catch (err: any) {
      if (err.message !== "HTTP_ERROR") {
        await enqueueSyncEvent("VEHICLE_SWITCH_SYNC", { vehicle_number: vehicleReg });
        Alert.alert("Offline Mode", "Vehicle switch queued locally. Will sync automatically.");
      } else {
        setActiveVehicle(previousVehicle);
        Alert.alert("Error", "Could not switch vehicles at this time.");
      }
    }
  };

  useEffect(() => { fetchProfileAndVehicles(); }, []);
  useEffect(() => { fetchOrders(); }, [tab]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.initialsCircle}>
              <Text style={styles.initialsText}>{profile.initials}</Text>
            </View>
            <View style={styles.welcomeTextGroup}>
              <Text style={styles.welcomeSub}>Welcome back</Text>
              <Text style={styles.driverName}>{profile.name}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn}><Bell size={24} color="#0F172A" /></TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={[styles.iconBtn, { marginLeft: 16 }]}><User size={24} color="#0F172A" /></TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollPadding}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0284C7"]} />
          }
        >
          
          {/* THE HERO CARD (Dark Slate Theme) */}
          <View style={styles.vehicleSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconBox}><Truck size={18} color="#E2E8F0" /></View>
              <Text style={styles.sectionTitle}>Active Asset</Text>
            </View>
            <TouchableOpacity style={styles.vehiclePicker} onPress={() => setShowVehiclePicker(true)}>
              <Text style={styles.pickerValue}>{activeVehicle || "Select Vehicle"}</Text>
              <ChevronDown size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* TABS (Tech Blue Active State) */}
          <View style={styles.tabWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabInner}>
              {TABS.map((t) => (
                <TouchableOpacity 
                  key={t} 
                  onPress={() => setTab(t)} 
                  style={[styles.miniTab, t === tab && styles.miniTabActive]}
                >
                  <Text style={[styles.miniTabText, t === tab && styles.miniTabTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* LIST (Floating White Cards with Shadows) */}
          <View style={styles.listSection}>
            {loading && !refreshing ? (
              <ActivityIndicator color="#0284C7" style={{ marginTop: 40 }} size="large" />
            ) : (
              orders.map((order) => (
                <View key={order.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.volumeText}>{`${order.expected_volume || "0.0"} L`}</Text>
                    <Text style={styles.orderNumberLabel}>{`ID: ${order.id.substring(0,8).toUpperCase()}`}</Text>
                  </View>
                  <View style={styles.locationRow}>
                    <View style={styles.locationIconWrapper}>
                       <MapPin size={16} color="#0284C7" />
                    </View>
                    <Text style={styles.addressText} numberOfLines={2}>
                      <Text style={styles.customerNameText}>{order.customer_name || "Client"}</Text>{"\n"}
                      {order.customer_address || "No Address"}
                    </Text>
                  </View>
                  <View style={styles.cardFooter}>
                    <View style={styles.distanceBadge}>
                      <Text style={styles.distanceText}>{`↑ ${order.distance_km || "4.2"} km`}</Text>
                    </View>
                    
                    <TouchableOpacity 
                      style={[styles.actionBtn, tab === "New" ? styles.actionBtnOrange : styles.actionBtnNavy]} 
                      onPress={() => tab === "New" ? handleAcceptOrder(order.id) : handleViewOrder(order)}
                    >
                      <Text style={styles.actionBtnText}>
                        {tab === "New" ? "Accept Order" : "View Details"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* MODAL */}
        <Modal visible={showVehiclePicker} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Asset</Text>
                <TouchableOpacity onPress={() => setShowVehiclePicker(false)}><Text style={styles.closeText}>Cancel</Text></TouchableOpacity>
              </View>
              <FlatList
                data={vehicles}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.vehicleItem} onPress={() => handleVehicleChange(item.reg)}>
                    <View style={styles.vehicleItemLeft}>
                      <Truck size={22} color={activeVehicle === item.reg ? "#0284C7" : "#94A3B8"} />
                      <Text style={[styles.vehicleRegText, activeVehicle === item.reg && styles.activeVehicleText]}>{item.reg}</Text>
                    </View>
                    {activeVehicle === item.reg && <View style={styles.checkCircle}><Check size={14} color="#fff" /></View>}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  
  // Clean Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingVertical: 16, backgroundColor: "#F8FAFC" },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  initialsCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E0F2FE", justifyContent: "center", alignItems: "center", marginRight: 14 },
  initialsText: { fontWeight: "800", color: "#0284C7", fontSize: 16 },
  welcomeTextGroup: { justifyContent: "center" },
  welcomeSub: { fontSize: 13, color: "#64748B", fontWeight: "500" },
  driverName: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  headerRight: { flexDirection: "row", alignItems: "center" },
  iconBtn: { padding: 4 },
  scrollPadding: { paddingBottom: 40 },
  
  // Hero Card (Dark Theme Inversion)
  vehicleSection: { 
    marginHorizontal: 20, 
    marginBottom: 24,
    padding: 20, 
    backgroundColor: "#0F172A", // Deep Navy
    borderRadius: 24, 
    ...Platform.select({
      ios: { shadowColor: "#0284C7", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16 },
      android: { elevation: 8 }
    })
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  iconBox: { width: 32, height: 32, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
  sectionTitle: { fontWeight: "600", fontSize: 14, color: "#94A3B8", textTransform: 'uppercase', letterSpacing: 0.5 },
  vehiclePicker: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16 },
  pickerValue: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  
  // Tab Navigation
  tabWrapper: { marginBottom: 20 },
  tabInner: { paddingHorizontal: 20, gap: 10 },
  miniTab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 100, backgroundColor: "#F1F5F9" },
  miniTabActive: { backgroundColor: "#0284C7" }, // Tech Blue
  miniTabText: { fontSize: 14, fontWeight: "700", color: "#64748B" },
  miniTabTextActive: { color: "#FFFFFF" },
  
  // Floating Order Cards
  listSection: { paddingHorizontal: 20 },
  card: { 
    backgroundColor: "#FFFFFF", 
    borderRadius: 24, 
    padding: 20, 
    marginBottom: 16, 
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 4 }
    })
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 },
  volumeText: { fontSize: 24, fontWeight: "900", color: "#0F172A", letterSpacing: -0.5 },
  orderNumberLabel: { fontSize: 12, fontWeight: "700", color: "#94A3B8", backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  
  locationRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 20, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12 },
  locationIconWrapper: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2 },
  addressText: { color: "#64748B", fontSize: 13, flex: 1, lineHeight: 20 },
  customerNameText: { color: "#0F172A", fontWeight: "700", fontSize: 14 },
  
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  distanceBadge: { backgroundColor: "#F0FDF4", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  distanceText: { color: "#16A34A", fontSize: 13, fontWeight: "800" }, // Green for distance/arrival
  
  // Action Buttons
  actionBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 14 },
  actionBtnOrange: { backgroundColor: "#F59E0B" }, // Kung Fu Panda Orange for primary action
  actionBtnNavy: { backgroundColor: "#0F172A" }, // Navy for secondary
  actionBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  
  // Modal Enhancements
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '65%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  closeText: { color: '#64748B', fontWeight: '700', fontSize: 16 },
  vehicleItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  vehicleItemLeft: { flexDirection: 'row', alignItems: 'center' },
  vehicleRegText: { fontSize: 17, fontWeight: '600', color: '#475569', marginLeft: 16 },
  activeVehicleText: { color: '#0284C7', fontWeight: '800' },
  checkCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#0284C7', justifyContent: 'center', alignItems: 'center' }
});