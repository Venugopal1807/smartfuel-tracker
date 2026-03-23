import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Dimensions, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  Alert 
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { ChevronLeft, Truck, MapPin, Navigation as NavIcon, Package } from "lucide-react-native";
import MapView, { UrlTile, Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

// ✅ Import the global store
import { useFuelStore } from "../store/useFuelStore"; 

const { height } = Dimensions.get("window");
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.3:3000";

export default function OrderDetailScreen() {
  const navigation = useNavigation<any>();
  
  // ✅ Grab activeOrder and the setter from Zustand
  const { activeOrder: order, setActiveOrder } = useFuelStore();
  const [actionLoading, setActionLoading] = useState(false);
  
  // 1. Coordinates for the map (Safe fallback if no order)
  const destCoords = {
    latitude: parseFloat(order?.latitude) || 17.3850,
    longitude: parseFloat(order?.longitude) || 78.4867,
  };

  // 2. ACTION: Update status to 'in_transit' and sync globally
  const handleStartTransit = async () => {
    if (!order) return;
    
    try {
      setActionLoading(true);
      const token = await AsyncStorage.getItem("auth_token");
      
      // Update status on the backend
      const res = await axios.patch(
        `${API_URL}/api/orders/${order.id}/transit`, 
        {}, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        const updatedOrder = { ...order, status: 'in_transit' };
        
        // ✅ Update the Global Store (This updates the Transit Tab instantly)
        setActiveOrder(updatedOrder);
        
        // Persist to storage for app restarts
        await AsyncStorage.setItem("active_order", JSON.stringify(updatedOrder));
        
        // Navigate to the next phase
        navigation.navigate("In Transit");
      }
    } catch (err) {
      console.log("Transit Error:", err);
      Alert.alert("Offline", "Started transit locally. We'll sync with the server when online.");
      
      // Fallback for offline: Update locally anyway so the driver can proceed
      const updatedOrder = { ...order, status: 'in_transit' };
      setActiveOrder(updatedOrder);
      navigation.navigate("In Transit");
    } finally {
      setActionLoading(false);
    }
  };

  // 3. EMPTY STATE: If the driver clicks the "Timeline" tab without an order
  if (!order) {
    return (
      <SafeAreaView style={styles.center}>
        <Package size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No Active Order</Text>
        <Text style={styles.emptySub}>Select an assigned task from the Dashboard to see your delivery timeline.</Text>
        <TouchableOpacity 
          style={styles.dashBtn}
          onPress={() => navigation.navigate("Dashboard")}
        >
          <Text style={styles.dashBtnText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* --- 1. OSM MAP HEADER --- */}
      <View style={styles.mapContainer}>
        <MapView
          style={StyleSheet.absoluteFillObject}
          initialRegion={{
            ...destCoords,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
        >
          <UrlTile
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />
          <Marker coordinate={destCoords}>
            <View style={styles.markerCircle}>
              <MapPin size={20} color="#fff" />
            </View>
          </Marker>
        </MapView>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.navigateBtn}>
          <NavIcon size={16} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.navigateText}>Navigate</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* --- 2. TIMELINE PROGRESS --- */}
        <Text style={styles.sectionLabel}>Delivery Timeline</Text>
        <View style={styles.timelineWrapper}>
          <View style={styles.timelineRow}>
            <View style={styles.stepGroup}>
              <View style={styles.dotActive} />
              <Text style={styles.stepTextActive}>Departure</Text>
            </View>
            <View style={styles.connector} />
            <View style={styles.stepGroup}>
              <View style={order.status === 'in_transit' ? styles.dotActive : styles.dotInactive} />
              <Text style={order.status === 'in_transit' ? styles.stepTextActive : styles.stepTextInactive}>On the Way</Text>
            </View>
            <View style={styles.connectorGray} />
            <View style={styles.stepGroup}>
              <View style={styles.dotInactive} />
              <Text style={styles.stepTextInactive}>Delivered</Text>
            </View>
          </View>
        </View>

        {/* --- 3. CUSTOMER CARD --- */}
        <View style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBox}><View style={styles.greenDot} /></View>
            <View>
              <Text style={styles.locationName}>{order.customer_name || "Client"}</Text>
              <Text style={styles.timeEstimate}>Expected Vol: {order.volume_requested || order.quantity || "0"}L</Text>
            </View>
          </View>
          
          <View style={styles.pricingRow}>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>₹ 108 / Liter</Text>
            </View>
            <Text style={styles.totalPrice}>₹ {order.total_price || "Pending"}</Text>
          </View>
        </View>

        {/* --- 4. ADDRESS --- */}
        <View style={styles.addressSection}>
          <Text style={styles.addrHeader}>Delivery Address</Text>
          <View style={styles.addrCard}>
            <View style={styles.blueDotContainer}><View style={styles.blueDot} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addrTitle}>{order.customer_name || "Location"}</Text>
              <Text style={styles.addrSub}>{order.customer_address || "Address coordinates pinned"}</Text>
            </View>
          </View>
        </View>

        {/* --- 5. FOOTER & START --- */}
        <View style={styles.footer}>
          <View style={styles.vehicleRow}>
            <Truck size={18} color="#111827" />
            <Text style={styles.vehicleText}>{order.vehicleNumber || order.vehicle_number || "No Truck Assigned"}</Text>
          </View>

          <TouchableOpacity 
            style={[styles.startBtn, (actionLoading || order.status === 'in_transit') && { opacity: 0.7 }]}
            onPress={handleStartTransit}
            disabled={actionLoading || order.status === 'in_transit'}
          >
            {actionLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.startBtnText}>
                {order.status === 'in_transit' ? "ALREADY IN TRANSIT" : "START TRANSIT"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 20 },
  emptySub: { textAlign: 'center', color: '#6B7280', marginTop: 10, lineHeight: 22 },
  dashBtn: { marginTop: 30, backgroundColor: '#111827', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 12 },
  dashBtnText: { color: '#fff', fontWeight: '700' },
  
  mapContainer: { height: height * 0.25, backgroundColor: "#E5E7EB", overflow: 'hidden' },
  markerCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  backBtn: { position: 'absolute', top: 50, left: 16, backgroundColor: '#fff', padding: 8, borderRadius: 10, elevation: 3 },
  navigateBtn: { position: 'absolute', bottom: 16, right: 16, backgroundColor: '#2563EB', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, elevation: 4, flexDirection: 'row', alignItems: 'center' },
  navigateText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  
  content: { flex: 1, paddingHorizontal: 20 },
  sectionLabel: { fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 24, marginBottom: 16 },
  timelineWrapper: { marginBottom: 24 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepGroup: { alignItems: 'center', width: 80 },
  dotActive: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2563EB', borderWidth: 3, borderColor: '#DBEAFE' },
  dotInactive: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D1D5DB' },
  stepTextActive: { fontSize: 11, fontWeight: '700', color: '#2563EB', marginTop: 8 },
  stepTextInactive: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', marginTop: 8 },
  connector: { flex: 1, height: 2, backgroundColor: '#2563EB', marginBottom: 18 },
  connectorGray: { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginBottom: 18 },
  
  mainCard: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconBox: { width: 32, height: 32, backgroundColor: '#fff', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  locationName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  timeEstimate: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  pricingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12 },
  priceItem: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB' },
  priceLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
  totalPrice: { fontSize: 18, fontWeight: '900', color: '#111827' },
  
  addressSection: { marginTop: 24 },
  addrHeader: { fontSize: 14, fontWeight: '700', color: '#9CA3AF', marginBottom: 12 },
  addrCard: { flexDirection: 'row', gap: 12 },
  blueDotContainer: { paddingTop: 4 },
  blueDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563EB', borderWidth: 2, borderColor: '#DBEAFE' },
  addrTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  addrSub: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  
  footer: { marginTop: 40, marginBottom: 30 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, justifyContent: 'center' },
  vehicleText: { fontSize: 14, fontWeight: '700', color: '#111827' },
  startBtn: { backgroundColor: '#111827', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  startBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});