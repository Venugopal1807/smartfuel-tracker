import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ChevronLeft, CheckCircle2, Circle, Target, Truck, MapPin } from "lucide-react-native";

const { height, width } = Dimensions.get("window");

export default function TransitScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    const loadOrder = async () => {
      const saved = await AsyncStorage.getItem("active_order");
      if (saved) setOrder(JSON.parse(saved));
    };
    loadOrder();
  }, []);

  return (
    <View style={styles.container}>
      
      {/* --- 1. THE MAP BACKGROUND --- */}
      <View style={styles.mapContainer}>
        <View style={styles.mapGrid}>
          {[...Array(10)].map((_, i) => <View key={i} style={[styles.gridV, { left: i * (width / 10) }]} />)}
          <View style={styles.routeLine} />
          <View style={styles.truckMarker}>
             <Truck size={20} color="#fff" />
          </View>
        </View>
        
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* --- 2. THE CHECKPOINT SHEET --- */}
      <View style={styles.sheet}>
        <View style={styles.dragHandle} />
        
        {/* Header Row */}
        <View style={styles.sheetHeader}>
          <Text style={styles.headerTitle}>In Transit</Text>
          <View style={styles.distBadge}>
            <Text style={styles.distText}>725 m</Text>
          </View>
        </View>

        {/* Vertical Timeline */}
        <View style={styles.timeline}>
          <View style={styles.timelineItem}>
            <CheckCircle2 size={20} color="#10B981" />
            <View style={styles.timelineTextGroup}>
              <Text style={styles.timelineTitle}>Arrived at Apollo Hospital</Text>
              <Text style={styles.timelineSub}>11:15 AM</Text>
            </View>
          </View>
          <View style={styles.verticalLineActive} />
          
          <View style={styles.timelineItem}>
            <Target size={20} color="#2563EB" />
            <View style={styles.timelineTextGroup}>
              <Text style={styles.timelineTitle}>Security Check</Text>
              <Text style={styles.timelineSub}>11:30 AM</Text>
            </View>
          </View>
          <View style={styles.verticalLineInactive} />

          <View style={styles.timelineItem}>
            <View style={styles.dotInactive} />
            <View style={styles.timelineTextGroup}>
              <Text style={styles.timelineTitleInactive}>Fuel Dispensing</Text>
              <Text style={styles.timelineSubInactive}>In Progress</Text>
            </View>
          </View>
          <View style={styles.verticalLineInactive} />

          <View style={styles.timelineItem}>
            <Circle size={18} color="#D1D5DB" />
            <View style={styles.timelineTextGroup}>
              <Text style={styles.timelineTitleInactive}>Completed</Text>
            </View>
          </View>
        </View>

        {/* Next Context Card */}
        <View style={styles.contextCard}>
          <View style={styles.contextHeader}>
            <View style={styles.greenDotCircle}>
              <View style={styles.greenDot} />
            </View>
            <Text style={styles.contextTitle}>Arrived at Eva Diagnostics</Text>
          </View>
          <View style={styles.contextFooter}>
            <View style={styles.vehicleInfo}>
              <Truck size={14} color="#6B7280" />
              <Text style={styles.vehicleText}>{order?.vehicle_registration || "KA12AB1234"}</Text>
            </View>
            <Text style={styles.priceText}>₹ 214 / L</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.arriveBtn}
          onPress={() => navigation.navigate("Security", { orderId: order?.id })}
        >
          <Text style={styles.arriveBtnText}>I HAVE ARRIVED</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  
  // Map styles
  mapContainer: { height: height * 0.45, backgroundColor: "#F3F4F6" },
  mapGrid: { ...StyleSheet.absoluteFillObject, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  gridV: { position: 'absolute', width: 1, height: '100%', backgroundColor: '#D1D5DB' },
  routeLine: { position: 'absolute', width: 4, height: 150, backgroundColor: '#2563EB', top: '20%', left: '45%', borderRadius: 2 },
  truckMarker: { position: 'absolute', top: '50%', left: '42%', backgroundColor: '#111827', padding: 8, borderRadius: 10, elevation: 5 },
  backBtn: { position: 'absolute', top: 50, left: 16, backgroundColor: '#fff', padding: 8, borderRadius: 10, elevation: 3 },

  // Sheet styles
  sheet: { flex: 1, backgroundColor: "#fff", borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -35, padding: 24, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 20 },
  dragHandle: { width: 36, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#111827" },
  distBadge: { backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  distText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  // Timeline styles
  timeline: { paddingLeft: 4, marginBottom: 24 },
  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  timelineTextGroup: { flex: 1 },
  timelineTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  timelineSub: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  timelineTitleInactive: { fontSize: 15, fontWeight: '700', color: '#9CA3AF' },
  timelineSubInactive: { fontSize: 12, color: '#D1D5DB' },
  
  verticalLineActive: { width: 2, height: 24, backgroundColor: '#2563EB', marginLeft: 9, marginVertical: 4 },
  verticalLineInactive: { width: 2, height: 24, backgroundColor: '#F3F4F6', marginLeft: 9, marginVertical: 4 },
  dotInactive: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D1D5DB', marginLeft: 5 },

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

  arriveBtn: { backgroundColor: '#111827', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  arriveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});