import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet, 
  ScrollView, 
  Modal, 
  FlatList,
  Alert
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
        
        // Fetch Profile
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

          // Fetch Vehicles
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
    
    // 1. Optimistic UI Update
    setActiveVehicle(vehicleReg);
    setShowVehiclePicker(false);

    try {
      const headers = await getHeaders();
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ vehicle_number: vehicleReg })
      });

      // 2. Concurrency Lock Rollback (Fetch handles HTTP statuses here)
      if (res.status === 409) {
        setActiveVehicle(previousVehicle);
        Alert.alert("Vehicle Unavailable", "This vehicle was just claimed by another driver.");
        return;
      }

      if (!res.ok) {
        throw new Error("HTTP_ERROR");
      }
      
    } catch (err: any) {
      // 3. Offline Queue Logic (Fetch throws here on network failure)
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

  // UI Render Remains Exactly the Same
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
            <TouchableOpacity style={styles.iconBtn}><Bell size={22} color="#1F2937" /></TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={[styles.iconBtn, { marginLeft: 12 }]}><User size={22} color="#1F2937" /></TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
          
          <View style={styles.vehicleSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconBox}><Truck size={16} color="#4B5563" /></View>
              <Text style={styles.sectionTitle}>Active Vehicle</Text>
            </View>
            <TouchableOpacity style={styles.vehiclePicker} onPress={() => setShowVehiclePicker(true)}>
              <Text style={styles.pickerValue}>{activeVehicle || "Select Vehicle"}</Text>
              <ChevronDown size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* TABS */}
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

          {/* LIST */}
          <View style={styles.listSection}>
            {loading ? (
              <ActivityIndicator color="#4F46E5" style={{ marginTop: 20 }} />
            ) : (
              orders.map((order) => (
                <View key={order.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.volumeText}>{`${order.expected_volume || "0.0"} L`}</Text>
                    <Text style={styles.orderNumberLabel}>{`#${order.id.substring(0,8).toUpperCase()}`}</Text>
                  </View>
                  <View style={styles.locationRow}>
                    <MapPin size={14} color="#6B7280" style={{ marginRight: 6 }} />
                    <Text style={styles.addressText} numberOfLines={1}>
                      {`${order.customer_name || "Client"} - ${order.customer_address || "No Address"}`}
                    </Text>
                  </View>
                  <View style={styles.cardFooter}>
                    <View style={styles.distanceBadge}>
                      <Text style={styles.distanceText}>{`↑ ${order.distance_km || "4.2"} km`}</Text>
                    </View>
                    
                    <TouchableOpacity 
                      style={[styles.actionBtn, tab === "New" && { backgroundColor: '#10B981' }]} 
                      onPress={() => tab === "New" ? handleAcceptOrder(order.id) : handleViewOrder(order)}
                    >
                      <Text style={styles.actionBtnText}>
                        {tab === "New" ? "Accept" : "View Details"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        <Modal visible={showVehiclePicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Vehicle</Text>
                <TouchableOpacity onPress={() => setShowVehiclePicker(false)}><Text style={styles.closeText}>Cancel</Text></TouchableOpacity>
              </View>
              <FlatList
                data={vehicles}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.vehicleItem} onPress={() => handleVehicleChange(item.reg)}>
                    <View style={styles.vehicleItemLeft}>
                      <Truck size={20} color={activeVehicle === item.reg ? "#4F46E5" : "#6B7280"} />
                      <Text style={[styles.vehicleRegText, activeVehicle === item.reg && styles.activeVehicleText]}>{item.reg}</Text>
                    </View>
                    {activeVehicle === item.reg && <Check size={20} color="#4F46E5" />}
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
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  initialsCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center", marginRight: 12, borderWidth: 1, borderColor: "#C7D2FE" },
  initialsText: { fontWeight: "bold", color: "#4F46E5", fontSize: 14 },
  welcomeTextGroup: { justifyContent: "center" },
  welcomeSub: { fontSize: 11, color: "#6B7280" },
  driverName: { fontSize: 16, fontWeight: "800", color: "#111827" },
  headerRight: { flexDirection: "row", alignItems: "center" },
  iconBtn: { padding: 4 },
  scrollPadding: { paddingBottom: 30 },
  vehicleSection: { margin: 16, padding: 16, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  iconBox: { width: 28, height: 28, backgroundColor: "#F3F4F6", borderRadius: 6, justifyContent: "center", alignItems: "center", marginRight: 8 },
  sectionTitle: { fontWeight: "700", fontSize: 14, color: "#4B5563" },
  vehiclePicker: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, backgroundColor: "#F9FAFB", borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB" },
  pickerValue: { fontSize: 15, fontWeight: "700", color: "#111827" },
  tabWrapper: { marginBottom: 16 },
  tabInner: { paddingHorizontal: 16, gap: 8 },
  miniTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB" },
  miniTabActive: { backgroundColor: "#111827", borderColor: "#111827" },
  miniTabText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  miniTabTextActive: { color: "#fff" },
  listSection: { paddingHorizontal: 16 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  volumeText: { fontSize: 20, fontWeight: "900", color: "#111827" },
  orderNumberLabel: { fontSize: 12, fontWeight: "700", color: "#9CA3AF" },
  locationRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  addressText: { color: "#6B7280", fontSize: 13, flex: 1 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 12 },
  distanceBadge: { backgroundColor: "#ECFDF5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  distanceText: { color: "#10B981", fontSize: 12, fontWeight: "700" },
  actionBtn: { backgroundColor: "#111827", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  emptyCard: { padding: 40, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: "#9CA3AF", fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  closeText: { color: '#6B7280', fontWeight: '600' },
  vehicleItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  vehicleItemLeft: { flexDirection: 'row', alignItems: 'center' },
  vehicleRegText: { fontSize: 16, fontWeight: '600', color: '#374151', marginLeft: 15 },
  activeVehicleText: { color: '#4F46E5', fontWeight: '800' }
});