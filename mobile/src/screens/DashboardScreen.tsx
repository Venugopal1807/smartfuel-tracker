import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, SafeAreaView, ScrollView, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { Bell, Truck, ChevronDown, MapPin, User } from "lucide-react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.3:3000";

const TABS = ["New", "Confirmed", "In Transit", "History"] as const;

const getOrderNumber = (id: string) => {
  const cleanId = id.replace(/[^a-zA-Z0-9]/g, '');
  return (cleanId.substring(0, 8)).toUpperCase();
};

export default function DashboardScreen() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("New");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("auth_token");
      const statusMap: Record<string, string> = {
        "New": "pending",
        "Confirmed": "accepted",
        "In Transit": "in_transit",
        "History": "completed"
      };
      const res = await axios.get(`${API_URL}/api/orders`, {
        params: { status: statusMap[tab] },
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data?.data || []);
    } catch (err) {
      console.log("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [tab]);

  // FIX: New function to save order data so Tabs can access it
  const handleViewOrder = async (item: any) => {
    await AsyncStorage.setItem("active_order", JSON.stringify(item));
    await AsyncStorage.setItem("active_order_id", item.id);
    navigation.navigate("Timeline", { order: item });
  };

  const renderOrder = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.volumeText}>{item.expected_volume || "500.0"} L</Text>
        <Text style={styles.orderNumberLabel}>#{getOrderNumber(item.id)}</Text>
      </View>

      <View style={styles.locationRow}>
        <MapPin size={14} color="#6B7280" style={{ marginRight: 6 }} />
        <Text style={styles.addressText} numberOfLines={1}>
          Apollo Hospital, Jubilee Hills...
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>↑ 4.2 km</Text>
        </View>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleViewOrder(item)}
        >
          <Text style={styles.actionBtnText}>
            {tab === "New" ? "Accept" : "View Details"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* --- 1. Header with Profile & Notification --- */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
             <View style={styles.initialsCircle}>
                <Text style={styles.initialsText}>VE</Text>
              </View>
            <View style={styles.welcomeTextGroup}>
              <Text style={styles.welcomeSub}>Welcome back</Text>
              <Text style={styles.driverName}>Venugopal</Text>
            </View>
          </View>
          
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn}>
              <Bell size={22} color="#1F2937" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={[styles.iconBtn, { marginLeft: 12 }]}>
              <User size={22} color="#1F2937" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>

          {/* --- 2. Vehicle Card --- */}
          <View style={styles.vehicleSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconBox}><Truck size={16} color="#4B5563" /></View>
              <Text style={styles.sectionTitle}>Selected Vehicle</Text>
            </View>
            <TouchableOpacity style={styles.vehiclePicker}>
              <Text style={styles.pickerValue}>TS-09-EA-1234</Text>
              <ChevronDown size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* --- 3. The 4 Mini Tabs --- */}
          <View style={styles.tabWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabInner}>
              {TABS.map((t) => {
                const active = t === tab;
                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setTab(t)}
                    style={[styles.miniTab, active && styles.miniTabActive]}
                  >
                    <Text style={[styles.miniTabText, active && styles.miniTabTextActive]}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* --- 4. Orders List --- */}
          <View style={styles.listSection}>
            {loading ? (
              <ActivityIndicator color="#4F46E5" style={{ marginTop: 20 }} />
            ) : orders.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No {tab.toLowerCase()} orders</Text>
              </View>
            ) : (
              orders.map((order) => <View key={order.id}>{renderOrder({ item: order })}</View>)
            )}
          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { 
    flex: 1, 
    backgroundColor: "#F9FAFB",
    // FIX: Content moved further down to clear the status bar
    paddingTop: Platform.OS === 'android' ? 50 : 20 
  },

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
  emptyTitle: { color: "#9CA3AF", fontWeight: "600" }
});