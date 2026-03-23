import React from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  ActivityIndicator 
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { 
  ChevronLeft, 
  CheckCircle2, 
  Target, 
  Truck, 
  MapPin, 
  AlertCircle 
} from "lucide-react-native";
import MapView, { UrlTile, Marker, Polyline } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

// ✅ Import the global store to get the active order
import { useFuelStore } from "../store/useFuelStore"; 

const { height } = Dimensions.get("window");

export default function TransitScreen() {
  const navigation = useNavigation<any>();
  
  // ✅ Grab the order directly from global state
  // This ensures the data is there even if navigated via the Tab Bar
  const { activeOrder: order } = useFuelStore();

  // Mock Driver Location (Replace with expo-location for real tracking)
  const driverLoc = {
    latitude: 17.4474,
    longitude: 78.3762,
  };

  // 1. EMPTY STATE: If no order is active, show a helpful prompt
  if (!order) {
    return (
      <SafeAreaView style={styles.center}>
        <AlertCircle size={48} color="#9CA3AF" />
        <Text style={styles.emptyTitle}>No Active Delivery</Text>
        <Text style={styles.emptySub}>Please select an assigned task from the Dashboard to start your journey.</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate("Dashboard")}
          style={styles.backToDashBtn}
        >
          <Text style={styles.backToDashText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // 2. DATA PREP: Destination from Order Data
  const destLoc = {
    latitude: parseFloat(order.latitude) || 17.3850,
    longitude: parseFloat(order.longitude) || 78.4867,
  };

  return (
    <View style={styles.container}>
      
      {/* --- MAP SECTION --- */}
      <View style={styles.mapContainer}>
        <MapView
          style={StyleSheet.absoluteFillObject}
          initialRegion={{
            latitude: (driverLoc.latitude + destLoc.latitude) / 2,
            longitude: (driverLoc.longitude + destLoc.longitude) / 2,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
        >
          <UrlTile
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />
          
          <Marker coordinate={driverLoc} title={"Your Truck"}>
            <View style={styles.truckMarker}>
               <Truck size={18} color="#fff" />
            </View>
          </Marker>

          <Marker coordinate={destLoc} title={order.customer_name || "Client"}>
            <View style={styles.destMarker}>
               <MapPin size={18} color="#fff" />
            </View>
          </Marker>

          <Polyline
            coordinates={[driverLoc, destLoc]}
            strokeColor="#2563EB"
            strokeWidth={4}
            lineDashPattern={[5, 5]}
          />
        </MapView>
        
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* --- INTERACTIVE INFO SHEET --- */}
      <View style={styles.sheet}>
        <View style={styles.dragHandle} />
        
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.statusLabel}>CURRENT STATUS</Text>
            <Text style={styles.headerTitle}>In Transit</Text>
          </View>
          <View style={styles.distBadge}>
            <Text style={styles.distText}>2.4 km left</Text>
          </View>
        </View>

        {/* Journey Timeline */}
        <View style={styles.timeline}>
          <View style={styles.timelineItem}>
            <CheckCircle2 size={18} color="#10B981" />
            <View style={styles.timelineTextGroup}>
              <Text style={styles.timelineTitle}>Journey Started</Text>
              <Text style={styles.timelineSub}>Departure logged at warehouse</Text>
            </View>
          </View>
          <View style={styles.verticalLineActive} />
          
          <View style={styles.timelineItem}>
            <Target size={18} color="#2563EB" />
            <View style={styles.timelineTextGroup}>
              <Text style={styles.timelineTitle}>Heading to Destination</Text>
              <Text style={styles.timelineSub}>{order.customer_name || "Client Location"}</Text>
            </View>
          </View>
        </View>

        {/* Destination Details Card */}
        <View style={styles.contextCard}>
          <View style={styles.contextHeader}>
            <View style={styles.greenDotCircle}>
              <View style={styles.greenDot} />
            </View>
            <Text style={styles.contextTitle}>{order.customer_name || "Customer"}</Text>
          </View>
          <View style={styles.contextFooter}>
            <View style={styles.vehicleInfo}>
              <Truck size={14} color="#6B7280" />
              <Text style={styles.vehicleText}>{order.vehicle_number || order.vehicleNumber || "N/A"}</Text>
            </View>
            <Text style={styles.priceText}>Expected: {order.volume_requested || order.quantity || "0"} L</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.arriveBtn}
          onPress={() => navigation.navigate("Security", { order })}
        >
          <Text style={styles.arriveBtnText}>I HAVE ARRIVED</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor: '#F9FAFB' },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  backToDashBtn: { marginTop: 24, backgroundColor: '#111827', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backToDashText: { color: '#fff', fontWeight: '700' },

  // Map
  mapContainer: { height: height * 0.40, backgroundColor: "#F3F4F6" },
  truckMarker: { backgroundColor: '#111827', padding: 6, borderRadius: 8, borderWidth: 2, borderColor: '#fff' },
  destMarker: { backgroundColor: '#EF4444', padding: 6, borderRadius: 8, borderWidth: 2, borderColor: '#fff' },
  backBtn: { position: 'absolute', top: 50, left: 16, backgroundColor: '#fff', padding: 8, borderRadius: 10, elevation: 3 },

  // Sheet
  sheet: { flex: 1, backgroundColor: "#fff", borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -35, padding: 24, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 20 },
  dragHandle: { width: 36, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  statusLabel: { fontSize: 10, fontWeight: '800', color: '#6B7280', letterSpacing: 1 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#111827" },
  distBadge: { backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  distText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  // Timeline
  timeline: { paddingLeft: 4, marginBottom: 24 },
  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  timelineTextGroup: { flex: 1 },
  timelineTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  timelineSub: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  verticalLineActive: { width: 2, height: 20, backgroundColor: '#2563EB', marginLeft: 8, marginVertical: 4 },

  // Context Card
  contextCard: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 24 },
  contextHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  greenDotCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center' },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  contextTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  contextFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12 },
  vehicleInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vehicleText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  priceText: { fontSize: 14, fontWeight: '800', color: '#111827' },

  arriveBtn: { backgroundColor: '#111827', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 'auto' },
  arriveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});