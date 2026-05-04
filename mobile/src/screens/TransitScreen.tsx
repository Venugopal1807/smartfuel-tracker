import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform
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
import { SafeAreaView } from "react-native-safe-area-context";

// Global store to get the active order
import { useFuelStore } from "../store/useFuelStore";

const { height } = Dimensions.get("window");

export default function TransitScreen() {
  const navigation = useNavigation<any>();

  // Grab the order directly from global state
  const { activeOrder: order } = useFuelStore();

  // Mock Driver Location
  const driverLoc = {
    latitude: 17.4474,
    longitude: 78.3762,
  };

  // 1. EMPTY STATE
  if (!order) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <View style={styles.emptyIconBox}>
          <AlertCircle size={48} color="#94A3B8" />
        </View>
        <Text style={styles.emptyTitle}>No Active Delivery</Text>
        <Text style={styles.emptySub}>Please select an assigned task from the Dashboard to start your journey.</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("Dashboard")}
          style={styles.dashBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.dashBtnText}>Return to Dashboard</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // 2. DATA PREP
  const destLoc = {
    latitude: parseFloat(order.latitude) || 17.3850,
    longitude: parseFloat(order.longitude) || 78.4867,
  };

  return (
    <View style={styles.container}>

      {/* --- MAP SECTION (Premium Blueprint) --- */}
      <View style={styles.mapContainer}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }]}>

          {/* 1. Visual Background Grid */}
          <View style={StyleSheet.absoluteFillObject}>
            <View style={{ flex: 1, opacity: 0.1, flexDirection: 'row' }}>
              {[...Array(10)].map((_, i) => <View key={i} style={{ width: 1, backgroundColor: '#0F172A', height: '100%', marginLeft: 50 }} />)}
            </View>
            <View style={[StyleSheet.absoluteFillObject, { opacity: 0.1 }]}>
              {[...Array(10)].map((_, i) => <View key={i} style={{ height: 1, backgroundColor: '#0F172A', width: '100%', marginTop: 50 }} />)}
            </View>
          </View>

          {/* 2. Mock Path Line */}
          <View style={{
            position: 'absolute',
            width: 220,
            height: 3,
            backgroundColor: '#0284C7',
            transform: [{ rotate: '-45deg' }],
            opacity: 0.5,
            borderStyle: 'dashed',
            borderRadius: 2,
          }} />

          {/* 3. Visual Markers */}
          {/* Driver/Truck Position */}
          <View style={[styles.truckMarker, { position: 'absolute', top: '60%', left: '30%' }]}>
            <Truck size={18} color="#FFFFFF" />
          </View>

          {/* Destination Position */}
          <View style={[styles.destMarker, { position: 'absolute', top: '30%', left: '70%' }]}>
            <MapPin size={18} color="#FFFFFF" />
          </View>

          {/* 4. Overlay Label */}
          <View style={styles.mapPreviewPill}>
            <Text style={styles.mapPreviewText}>OFFLINE MAP SIMULATION</Text>
          </View>

        </View>

        {/* 5. Floating Back Button */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* --- INTERACTIVE INFO SHEET (High Contrast) --- */}
      <View style={styles.sheet}>
        <View style={styles.dragHandle} />

        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.statusLabel}>LIVE TELEMETRY</Text>
            <Text style={styles.headerTitle}>In Transit</Text>
          </View>
          <View style={styles.distBadge}>
            <Text style={styles.distText}>2.4 km left</Text>
          </View>
        </View>

        {/* Journey Timeline */}
        <View style={styles.timeline}>
          <View style={styles.timelineItem}>
            <CheckCircle2 size={20} color="#10B981" />
            <View style={styles.timelineTextGroup}>
              <Text style={styles.timelineTitle}>Journey Started</Text>
              <Text style={styles.timelineSub}>Departure logged at secure facility</Text>
            </View>
          </View>
          <View style={styles.verticalLineActive} />

          <View style={styles.timelineItem}>
            <Target size={20} color="#0284C7" />
            <View style={styles.timelineTextGroup}>
              <Text style={styles.timelineTitle}>Approaching Destination</Text>
              <Text style={styles.timelineSub}>{order.customer_name || "Client Location"}</Text>
            </View>
          </View>
        </View>

        {/* Destination Details Card (Dark Navy Hero) */}
        <View style={styles.contextCard}>
          <View style={styles.contextHeader}>
            <View style={styles.greenDotCircle}>
              <View style={styles.greenDot} />
            </View>
            <Text style={styles.contextTitle}>{order.customer_name || "Authorized Customer"}</Text>
          </View>
          <View style={styles.contextFooter}>
            <View style={styles.vehicleInfo}>
              <Truck size={16} color="#94A3B8" />
              <Text style={styles.vehicleText}>{order.vehicle_number || order.vehicleNumber || "Asset Linked"}</Text>
            </View>
            <View style={styles.priceBadge}>
               <Text style={styles.priceText}>{order.volume_requested || order.quantity || "0"} LTR</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.arriveBtn}
          onPress={() => navigation.navigate("Security", { order })}
          activeOpacity={0.8}
        >
          <Text style={styles.arriveBtnText}>I HAVE ARRIVED</Text>
        </TouchableOpacity>
      </View>
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

  // Map
  mapContainer: { height: height * 0.42, backgroundColor: "#E2E8F0" },
  truckMarker: { 
    backgroundColor: '#0F172A', padding: 8, borderRadius: 20, borderWidth: 3, borderColor: '#FFFFFF',
    ...Platform.select({ ios: { shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 6 }})
  },
  destMarker: { 
    backgroundColor: '#F59E0B', padding: 8, borderRadius: 20, borderWidth: 3, borderColor: '#FFFFFF',
    ...Platform.select({ ios: { shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 6 }})
  },
  backBtn: { position: 'absolute', top: 55, left: 20, backgroundColor: '#FFFFFF', padding: 10, borderRadius: 12, ...Platform.select({ ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }, android: { elevation: 4 }}) },
  mapPreviewPill: { position: 'absolute', bottom: 50, backgroundColor: 'rgba(15, 23, 42, 0.8)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  mapPreviewText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },

  // Sheet
  sheet: { 
    flex: 1, 
    backgroundColor: "#FFFFFF", 
    borderTopLeftRadius: 36, 
    borderTopRightRadius: 36, 
    marginTop: -40, 
    padding: 28, 
    ...Platform.select({ ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.1, shadowRadius: 15 }, android: { elevation: 20 }}) 
  },
  dragHandle: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 24 },
  statusLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 1, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  headerTitle: { fontSize: 28, fontWeight: "900", color: "#0F172A", letterSpacing: -0.5 },
  distBadge: { backgroundColor: '#E0F2FE', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  distText: { color: '#0284C7', fontWeight: '800', fontSize: 14 },

  // Timeline
  timeline: { paddingLeft: 4, marginBottom: 32 },
  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  timelineTextGroup: { flex: 1 },
  timelineTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  timelineSub: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  verticalLineActive: { width: 3, height: 24, backgroundColor: '#0284C7', marginLeft: 8, marginVertical: 6, borderRadius: 2 },

  // Context Card (Dark Navy Hero)
  contextCard: { 
    backgroundColor: '#0F172A', 
    borderRadius: 20, 
    padding: 20, 
    marginBottom: 32,
    ...Platform.select({ ios: { shadowColor: "#0F172A", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12 }, android: { elevation: 6 }})
  },
  contextHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  greenDotCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.2)', justifyContent: 'center', alignItems: 'center' },
  greenDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' },
  contextTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  
  contextFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 16 },
  vehicleInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vehicleText: { fontSize: 14, fontWeight: '700', color: '#94A3B8' },
  
  priceBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  priceText: { fontSize: 15, fontWeight: '900', color: '#FFFFFF' },

  arriveBtn: { 
    backgroundColor: '#F59E0B', // Kung Fu Panda Orange
    paddingVertical: 20, 
    borderRadius: 18, 
    alignItems: 'center', 
    marginTop: 'auto',
    ...Platform.select({ ios: { shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 }, android: { elevation: 6 }})
  },
  arriveBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
});