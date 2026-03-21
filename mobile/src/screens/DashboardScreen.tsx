import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, Alert, ActivityIndicator, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import OrderDetailScreen from "./OrderDetailScreen";
import { useNavigation } from "@react-navigation/native";

// FIX: Expo requires EXPO_PUBLIC prefix
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.3:3000";

type Order = {
  id: string;
  customer_name?: string;
  status: string;
  expected_volume?: string;
  vehicle_registration?: string;
};

const TABS = ["Available", "In Progress"] as const;

const DashboardScreen: React.FC = () => {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Available");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);
  const navigation = useNavigation<any>();

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // FIX: Get the token to prove who is logged in
      const token = await AsyncStorage.getItem("auth_token");
      
      const res = await axios.get(`${API_URL}/api/orders`, {
        params: tab === "Available" ? { status: "pending" } : { status: "accepted" },
        // FIX: Send the token to the backend
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data?.data || []);
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [tab]);

  const acceptOrder = async (orderId: string) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("auth_token");
      
      await axios.patch(`${API_URL}/api/orders/${orderId}/accept`, 
        {}, // Empty body, auth token tells the backend who the driver is
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      Alert.alert("Success", "Order Accepted!");
      setTab("In Progress"); // Auto-switch to the next tab
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Failed to accept order");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('auth_token');
    navigation.replace('Login'); 
  };

  if (selected) {
    return <OrderDetailScreen order={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Orders</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {TABS.map((t) => {
          const active = t === tab;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tabButton, active && styles.tabButtonActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#4F46E5" />
      ) : orders.length === 0 ? (
         <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No {tab.toLowerCase()} orders right now.</Text>
            <TouchableOpacity onPress={fetchOrders} style={styles.refreshBtn}>
              <Text style={styles.refreshBtnText}>Refresh List</Text>
            </TouchableOpacity>
         </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16, gap: 16 }}
          refreshing={loading}
          onRefresh={fetchOrders}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.customerName}>{item.customer_name || "SmartFuel Client"}</Text>
                <Text style={styles.statusBadge}>{item.status}</Text>
              </View>
              
              <Text style={styles.detailText}>Requested Volume: {item.expected_volume || "0"} L</Text>
              <Text style={styles.detailText}>Vehicle: {item.vehicle_registration || "Any"}</Text>

              {tab === "Available" ? (
                <TouchableOpacity onPress={() => acceptOrder(item.id)} style={styles.acceptBtn}>
                  <Text style={styles.acceptBtnText}>Accept Order</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setSelected(item)} style={styles.viewBtn}>
                  <Text style={styles.viewBtnText}>Dispense Fuel</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB", paddingTop: 50 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: "800", color: "#111827" },
  logoutBtn: { backgroundColor: "#FEE2E2", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  logoutText: { color: "#EF4444", fontWeight: "700", fontSize: 14 },
  
  tabContainer: { flexDirection: "row", marginHorizontal: 20, marginBottom: 16, backgroundColor: "#E5E7EB", padding: 4, borderRadius: 8 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 6 },
  tabButtonActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tabText: { color: "#6B7280", fontWeight: "600", fontSize: 15 },
  tabTextActive: { color: "#111827", fontWeight: "700" },
  
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  customerName: { fontWeight: "800", fontSize: 18, color: "#1F2937" },
  statusBadge: { backgroundColor: "#FEF3C7", color: "#D97706", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontSize: 12, fontWeight: "700", overflow: "hidden" },
  detailText: { color: "#4B5563", marginBottom: 6, fontSize: 15 },
  
  acceptBtn: { marginTop: 16, paddingVertical: 14, backgroundColor: "#4F46E5", borderRadius: 8, alignItems: "center" },
  acceptBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  viewBtn: { marginTop: 16, paddingVertical: 14, backgroundColor: "#111827", borderRadius: 8, alignItems: "center" },
  viewBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 16, color: "#6B7280", marginBottom: 16 },
  refreshBtn: { backgroundColor: "#4F46E5", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  refreshBtnText: { color: "#fff", fontWeight: "600" },
});

export default DashboardScreen;