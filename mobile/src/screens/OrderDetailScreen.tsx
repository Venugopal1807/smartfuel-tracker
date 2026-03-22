import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Dimensions, StyleSheet, ScrollView, Platform, SafeAreaView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ChevronLeft, Truck, MapPin } from "lucide-react-native";

const { height, width } = Dimensions.get("window");

export default function OrderDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [order, setOrder] = useState<any>(route.params?.order || null);

  useEffect(() => {
    const loadOrder = async () => {
      if (!order) {
        const savedOrder = await AsyncStorage.getItem("active_order");
        if (savedOrder) setOrder(JSON.parse(savedOrder));
      }
    };
    loadOrder();
  }, [route.params?.order]);

  if (!order) return <View style={styles.center}><Text>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      {/* --- 1. MAP HEADER --- */}
      <View style={styles.mapContainer}>
        <View style={styles.mapGrid}>
          {/* Mock Map Background */}
          {[...Array(10)].map((_, i) => <View key={i} style={[styles.gridV, { left: i * (width / 10) }]} />)}
          <View style={styles.markerCircle}>
            <MapPin size={24} color="#fff" />
          </View>
        </View>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.navigateBtn}>
          <Text style={styles.navigateText}>Navigate</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* --- 2. THE TIMELINE STEPPER --- */}
        <Text style={styles.sectionLabel}>Delivery Timeline</Text>
        <View style={styles.timelineWrapper}>
          <View style={styles.timelineRow}>
            <View style={styles.stepGroup}>
              <View style={styles.dotActive} />
              <Text style={styles.stepTextActive}>Departure</Text>
            </View>
            <View style={styles.connector} />
            <View style={styles.stepGroup}>
              <View style={styles.dotInactive} />
              <Text style={styles.stepTextInactive}>On the Way</Text>
            </View>
            <View style={styles.connectorGray} />
            <View style={styles.stepGroup}>
              <View style={styles.dotInactive} />
              <Text style={styles.stepTextInactive}>Delivered</Text>
            </View>
          </View>
        </View>

        {/* --- 3. MAIN LOCATION CARD --- */}
        <View style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBox}><View style={styles.greenDot} /></View>
            <View>
              <Text style={styles.locationName}>{order.customer_name || "Apollo Hospital"}</Text>
              <Text style={styles.timeEstimate}>Today : 4.5 min</Text>
            </View>
          </View>
          
          <View style={styles.pricingRow}>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>₹ 108 / Liter</Text>
            </View>
            <Text style={styles.totalPrice}>₹ 32,400</Text>
          </View>
        </View>

        {/* --- 4. ARRIVED AT SECTION --- */}
        <View style={styles.addressSection}>
          <Text style={styles.addrHeader}>Arrived at</Text>
          <View style={styles.addrCard}>
            <View style={styles.blueDotContainer}><View style={styles.blueDot} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addrTitle}>{order.customer_name || "Apollo Hospital"}</Text>
              <Text style={styles.addrSub}>Today : 4.5 min</Text>
              <View style={styles.priceTagRow}>
                 <Text style={styles.priceTagText}>₹ 108 / Liter</Text>
                 <Text style={styles.priceTagText}>₹ 214  5 min</Text>
              </View>
            </View>
          </View>
        </View>

        {/* --- 5. VEHICLE & START BUTTON --- */}
        <View style={styles.footer}>
          <View style={styles.vehicleRow}>
            <Truck size={18} color="#111827" />
            <Text style={styles.vehicleText}>{order.vehicle_registration || "KA12AB1234"}</Text>
          </View>

          <TouchableOpacity 
            style={styles.startBtn}
            onPress={() => navigation.navigate("In Transit", { orderId: order.id })}
          >
            <Text style={styles.startBtnText}>START TRANSIT</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Map Header
  mapContainer: { height: height * 0.25, backgroundColor: "#E5E7EB" },
  mapGrid: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  gridV: { position: 'absolute', width: 1, height: '100%', backgroundColor: '#E5E7EB' },
  markerCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  backBtn: { position: 'absolute', top: 50, left: 16, backgroundColor: '#fff', padding: 8, borderRadius: 10, elevation: 3 },
  navigateBtn: { position: 'absolute', bottom: 16, right: 16, backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, elevation: 4 },
  navigateText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  content: { flex: 1, paddingHorizontal: 20 },
  sectionLabel: { fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 24, marginBottom: 16 },

  // Timeline Stepper
  timelineWrapper: { marginBottom: 24 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepGroup: { alignItems: 'center', width: 80 },
  dotActive: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2563EB', borderWidth: 3, borderColor: '#DBEAFE' },
  dotInactive: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D1D5DB' },
  stepTextActive: { fontSize: 11, fontWeight: '700', color: '#2563EB', marginTop: 8 },
  stepTextInactive: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', marginTop: 8 },
  connector: { flex: 1, height: 2, backgroundColor: '#2563EB', marginBottom: 18 },
  connectorGray: { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginBottom: 18 },

  // Main Card
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

  // Address Section
  addressSection: { marginTop: 24 },
  addrHeader: { fontSize: 14, fontWeight: '700', color: '#9CA3AF', marginBottom: 12 },
  addrCard: { flexDirection: 'row', gap: 12 },
  blueDotContainer: { paddingTop: 4 },
  blueDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563EB', borderWidth: 2, borderColor: '#DBEAFE' },
  addrTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  addrSub: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  priceTagRow: { flexDirection: 'row', gap: 12 },
  priceTagText: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },

  // Footer
  footer: { marginTop: 40, marginBottom: 30 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, justifyContent: 'center' },
  vehicleText: { fontSize: 14, fontWeight: '700', color: '#111827' },
  startBtn: { backgroundColor: '#111827', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  startBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});