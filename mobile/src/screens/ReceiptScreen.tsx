import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { CheckCircle, Share2, Home } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateInvoice, shareInvoice, calculateInvoiceTotals } from '../services/pdfService';

export default function ReceiptScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  // 1. Extract data passed from DispensingScreen
  const { 
    order = { id: 'ORD-PROV', customer_name: 'Customer', customer_address: 'Site' }, 
    volume = "0.00", 
    rate = 108.00 
  } = route.params || {};

  const [isGenerating, setIsGenerating] = useState(false);
  const [profile, setProfile] = useState({ name: "Driver", vehicleNumber: "TS-09-XX-0000" });

  // 2. Fetch Driver Identity for the Invoice
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user_profile");
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setProfile({
            name: user.name || "Driver",
            vehicleNumber: user.vehicleNumber || user.vehicle_number || "TS-09-XX-0000"
          });
        }
      } catch (err) {
        console.error("Failed to load profile for receipt", err);
      }
    };
    loadProfile();
  }, []);

  // 3. Calculate financial breakdown
  const { totalAmount, grandTotal } = calculateInvoiceTotals(parseFloat(volume), rate);

  const handleShareInvoice = async () => {
    setIsGenerating(true);
    try {
      // Generate the PDF with REAL driver and vehicle data
      const uri = await generateInvoice({
        orderNumber: order.id,
        customerName: order.customer_name || "Valued Client",
        area: order.customer_address || "Delivery Site",
        vehicleReg: profile.vehicleNumber, 
        volume: parseFloat(volume),
        total: parseFloat(totalAmount),
        rate: rate,
        transactionId: `TXN-${Date.now().toString().slice(-6)}`,
        driverName: profile.name, 
        pumpId: "MDU-001",
        otpVerified: "YES"
      });
      
      await shareInvoice(uri, order.id);
    } catch (error) {
      Alert.alert("Error", "Could not generate PDF. Please check permissions.");
    } finally {
      setIsGenerating(true); // Small delay for UX
      setTimeout(() => setIsGenerating(false), 1000);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {/* Success Header */}
        <View style={styles.headerBox}>
          <View style={styles.iconCircle}>
            <CheckCircle size={50} color="#10B981" />
          </View>
          <Text style={styles.title}>Delivery Verified</Text>
          <Text style={styles.subtitle}>Order ID: {order.id.toUpperCase()}</Text>
        </View>

        {/* Transaction Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardHeader}>Transaction Details</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>Net Volume</Text>
            <Text style={styles.value}>{parseFloat(volume).toFixed(2)} Liters</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Unit Price</Text>
            <Text style={styles.value}>₹ {rate.toFixed(2)} / L</Text>
          </View>

          <View style={styles.divider} />
          
          <View style={styles.row}>
            <Text style={styles.totalLabel}>Total Bill Amount</Text>
            <Text style={styles.totalValue}>₹ {grandTotal}</Text>
          </View>
          <Text style={styles.taxNote}>(Inclusive of all applicable taxes)</Text>
        </View>

        {/* Footer Actions */}
        <View style={styles.buttonStack}>
          <TouchableOpacity 
            style={styles.primaryBtn} 
            onPress={handleShareInvoice}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Share2 size={20} color="#fff" style={{ marginRight: 10 }} />
                <Text style={styles.primaryBtnText}>Share Digital Invoice</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryBtn} 
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] })}
          >
            <Home size={20} color="#4F46E5" style={{ marginRight: 10 }} />
            <Text style={styles.secondaryBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  headerBox: { alignItems: 'center', marginBottom: 32 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '900', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4, fontWeight: '700' },
  summaryCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, marginBottom: 32 },
  cardHeader: { fontSize: 12, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' },
  label: { fontSize: 16, color: '#4B5563', fontWeight: '500' },
  value: { fontSize: 16, color: '#111827', fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  totalLabel: { fontSize: 18, color: '#111827', fontWeight: '800' },
  totalValue: { fontSize: 26, color: '#10B981', fontWeight: '900' },
  taxNote: { fontSize: 12, color: '#9CA3AF', textAlign: 'right', marginTop: 4 },
  buttonStack: { gap: 12 },
  primaryBtn: { flexDirection: 'row', backgroundColor: '#4F46E5', paddingVertical: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  secondaryBtn: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#4F46E5' },
  secondaryBtnText: { color: '#4F46E5', fontSize: 17, fontWeight: '700' }
});