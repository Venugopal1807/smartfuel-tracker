import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { ChevronLeft, Truck, MapPin, Navigation as NavIcon, Package } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Global Store
import { useFuelStore } from "../store/useFuelStore";

const { height } = Dimensions.get("window");
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.5:3000";

export default function OrderDetailScreen() {
  const navigation = useNavigation<any>();
  const { activeOrder: order, setActiveOrder } = useFuelStore();
  const [actionLoading, setActionLoading] = useState(false);

  // ACTION: Update status to 'in_transit'
  const handleStartTransit = async () => {
    if (!order) return;

    try {
      setActionLoading(true);
      const token = await AsyncStorage.getItem("auth_token");

      const res = await axios.patch(
        `${API_URL}/api/orders/${order.id}/transit`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        const updatedOrder = { ...order, status: 'in_transit' };
        setActiveOrder(updatedOrder);
        await AsyncStorage.setItem("active_order", JSON.stringify(updatedOrder));
        navigation.navigate("In Transit");
      }
    } catch (err) {
      console.log("Transit Error:", err);
      Alert.alert("Offline Mode", "Starting transit locally. Sync will occur when online.");
      const updatedOrder = { ...order, status: 'in_transit' };
      setActiveOrder(updatedOrder);
      navigation.navigate("In Transit");
    } finally {
      setActionLoading(false);
    }
  };

  // EMPTY STATE
  if (!order) {
    return (
      <SafeAreaView style={styles.center}>
        <View style={styles.emptyIconBox}>
           <Package size={48} color="#94A3B8" />
        </View>
        <Text style={styles.emptyTitle}>No Active Order</Text>
        <Text style={styles.emptySub}>Select an assigned task from the Dashboard to view your timeline.</Text>
        <TouchableOpacity
          style={styles.dashBtn}
          onPress={() => navigation.navigate("Dashboard")}
        >
          <Text style={styles.dashBtnText}>Return to Dashboard</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* --- 1. OSM MAP HEADER (Premium Float) --- */}
      <View style={styles.mapContainer}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' }]}>
          {/* Blueprint Map Grid */}
          <View style={StyleSheet.absoluteFillObject}>
            <View style={{ flex: 1, opacity: 0.1, flexDirection: 'row' }}>
              {[...Array(10)].map((_, i) => <View key={i} style={{ width: 1, backgroundColor: '#0F172A', height: '100%', marginLeft: 40 }} />)}
            </View>
            <View style={[StyleSheet.absoluteFillObject, { opacity: 0.1 }]}>
              {[...Array(10)].map((_, i) => <View key={i} style={{ height: 1, backgroundColor: '#0F172A', width: '100%', marginTop: 40 }} />)}
            </View>
          </View>

          {/* Center Marker Placeholder */}
          <View style={styles.markerCircle}>
            <MapPin size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.mapPreviewText}>OFFLINE MAP DATA</Text>
        </View>

        {/* Floating Controls */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.navigateBtn}>
          <NavIcon size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.navigateText}>Navigate</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* --- 2. TIMELINE PROGRESS (Tech Blue) --- */}
        <Text style={styles.sectionLabel}>Delivery Progress</Text>
        <View style={styles.timelineWrapper}>
          <View style={styles.timelineRow}>
            <View style={styles.stepGroup}>
              <View style={styles.dotActive} />
              <Text style={styles.stepTextActive}>Departure</Text>
            </View>
            <View style={styles.connector} />
            <View style={styles.stepGroup}>
              <View style={order.status === 'in_transit' ? styles.dotActive : styles.dotInactive} />
              <Text style={order.status === 'in_transit' ? styles.stepTextActive : styles.stepTextInactive}>In Transit</Text>
            </View>
            <View style={styles.connectorGray} />
            <View style={styles.stepGroup}>
              <View style={styles.dotInactive} />
              <Text style={styles.stepTextInactive}>Delivered</Text>
            </View>
          </View>
        </View>

        {/* --- 3. CUSTOMER HERO CARD (Dark Navy) --- */}
        <View style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBox}><View style={styles.greenDot} /></View>
            <View>
              <Text style={styles.locationName}>{order.customer_name || "Client Name Missing"}</Text>
              <Text style={styles.timeEstimate}>Estimated Volume: <Text style={{ color: '#F8FAFC' }}>{order.volume_requested || order.quantity || "0"} LTR</Text></Text>
            </View>
          </View>

          <View style={styles.pricingRow}>
            <View style={styles.priceBadge}>
              <Text style={styles.priceLabel}>₹ 108 / L</Text>
            </View>
            <View>
              <Text style={styles.totalLabel}>Estimated Total</Text>
              <Text style={styles.totalPrice}>₹ {order.total_price || "0.00"}</Text>
            </View>
          </View>
        </View>

        {/* --- 4. ADDRESS SECTION --- */}
        <View style={styles.addressSection}>
          <Text style={styles.addrHeader}>Destination Details</Text>
          <View style={styles.addrCard}>
            <View style={styles.blueDotContainer}><View style={styles.blueDot} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addrTitle}>{order.customer_name || "Delivery Location"}</Text>
              <Text style={styles.addrSub}>{order.customer_address || "No precise address provided. Relying on coordinates."}</Text>
            </View>
          </View>
        </View>

        {/* --- 5. FOOTER & START --- */}
        <View style={styles.footer}>
          <View style={styles.vehicleRow}>
            <Truck size={18} color="#64748B" />
            <Text style={styles.vehicleText}>Asset: <Text style={{ color: '#0F172A' }}>{order.vehicleNumber || order.vehicle_number || "Unassigned"}</Text></Text>
          </View>

          <TouchableOpacity
            style={[styles.startBtn, (actionLoading || order.status === 'in_transit') && { opacity: 0.6 }]}
            onPress={handleStartTransit}
            disabled={actionLoading || order.status === 'in_transit'}
            activeOpacity={0.8}
          >
            {actionLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.startBtnText}>
                {order.status === 'in_transit' ? "TRANSIT IN PROGRESS" : "START TRANSIT"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  
  // Empty State
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor: '#F8FAFC' },
  emptyIconBox: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 24, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  emptySub: { textAlign: 'center', color: '#64748B', marginTop: 12, lineHeight: 22, fontSize: 15 },
  dashBtn: { marginTop: 32, backgroundColor: '#0284C7', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16 },
  dashBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },

  // Premium Map Header
  mapContainer: { height: height * 0.28, backgroundColor: "#E2E8F0", overflow: 'hidden' },
  markerCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0284C7', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.8)', ...Platform.select({ ios: { shadowColor: "#0284C7", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10 }, android: { elevation: 8 }}) },
  mapPreviewText: { marginTop: 12, color: '#64748B', fontWeight: '800', fontSize: 11, letterSpacing: 1 },
  
  backBtn: { position: 'absolute', top: 50, left: 20, backgroundColor: '#FFFFFF', padding: 10, borderRadius: 12, ...Platform.select({ ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }, android: { elevation: 4 }}) },
  navigateBtn: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#0F172A', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', ...Platform.select({ ios: { shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6 }, android: { elevation: 4 }}) },
  navigateText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },

  content: { flex: 1, paddingHorizontal: 24 },
  
  // Timeline
  sectionLabel: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 32, marginBottom: 20, textTransform: 'uppercase', letterSpacing: 0.5 },
  timelineWrapper: { marginBottom: 32 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepGroup: { alignItems: 'center', width: 80 },
  dotActive: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#0284C7', borderWidth: 3, borderColor: '#E0F2FE' },
  dotInactive: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#CBD5E1' },
  stepTextActive: { fontSize: 11, fontWeight: '800', color: '#0284C7', marginTop: 10, letterSpacing: 0.5 },
  stepTextInactive: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginTop: 10 },
  connector: { flex: 1, height: 3, backgroundColor: '#0284C7', marginBottom: 20 },
  connectorGray: { flex: 1, height: 3, backgroundColor: '#E2E8F0', marginBottom: 20 },

  // Hero Card (Dark Theme)
  mainCard: { backgroundColor: '#0F172A', borderRadius: 24, padding: 24, ...Platform.select({ ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16 }, android: { elevation: 6 }}) },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconBox: { width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  greenDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' },
  locationName: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  timeEstimate: { fontSize: 13, color: '#94A3B8', fontWeight: '600', marginTop: 4 },
  
  pricingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 16 },
  priceBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  priceLabel: { fontSize: 13, fontWeight: '800', color: '#94A3B8' },
  totalLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '700', textAlign: 'right', marginBottom: 2, textTransform: 'uppercase' },
  totalPrice: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },

  // Address
  addressSection: { marginTop: 16 },
  addrHeader: { fontSize: 12, fontWeight: '800', color: '#94A3B8', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  addrCard: { flexDirection: 'row', gap: 16, backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, ...Platform.select({ ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8 }, android: { elevation: 2 }}) },
  blueDotContainer: { paddingTop: 5 },
  blueDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#0284C7', borderWidth: 3, borderColor: '#E0F2FE' },
  addrTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  addrSub: { fontSize: 13, color: '#64748B', lineHeight: 20 },

  // Footer Actions
  footer: { marginTop: 40, alignItems: 'center' },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20, backgroundColor: '#E2E8F0', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100 },
  vehicleText: { fontSize: 13, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' },
  
  startBtn: { 
    width: '100%', 
    backgroundColor: '#F59E0B', // Kung Fu Panda Orange
    paddingVertical: 20, 
    borderRadius: 20, 
    alignItems: 'center',
    ...Platform.select({ ios: { shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10 }, android: { elevation: 6 }}) 
  },
  startBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
});