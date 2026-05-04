import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator, 
  Alert, 
  Platform,
  ScrollView
} from 'react-native';
import { CheckCircle, Share2, Home, Receipt, ArrowRight } from 'lucide-react-native';
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
      // Small delay for UX transition
      setTimeout(() => setIsGenerating(false), 800);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Success Header */}
        <View style={styles.headerBox}>
          <View style={styles.iconCircle}>
            <CheckCircle size={48} color="#10B981" />
          </View>
          <Text style={styles.title}>Delivery Verified</Text>
          <Text style={styles.subtitle}>Logistics Audit ID: {order.id.toUpperCase().substring(0, 12)}</Text>
        </View>

        {/* Transaction Summary Card (Floating Design) */}
        <View style={styles.summaryCard}>
          <View style={styles.cardHeaderRow}>
             <Receipt size={16} color="#94A3B8" />
             <Text style={styles.cardHeader}>OFFICIAL BILL SUMMARY</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Net Dispensed</Text>
            <Text style={styles.value}>{parseFloat(volume).toFixed(2)} <Text style={styles.unit}>LTR</Text></Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Unit Price</Text>
            <Text style={styles.value}>₹ {rate.toFixed(2)}</Text>
          </View>

          <View style={styles.divider} />
          
          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>TOTAL BILL</Text>
              <Text style={styles.taxNote}>Incl. GST & Surcharge</Text>
            </View>
            <Text style={styles.totalValue}>₹ {grandTotal}</Text>
          </View>
        </View>

        {/* Asset Details Info Box */}
        <View style={styles.infoBox}>
           <Text style={styles.infoText}>
             Verified by <Text style={styles.boldText}>{profile.name}</Text> for asset <Text style={styles.boldText}>{profile.vehicleNumber}</Text>
           </Text>
        </View>

        {/* Footer Actions */}
        <View style={styles.buttonStack}>
          <TouchableOpacity 
            style={styles.primaryBtn} 
            onPress={handleShareInvoice}
            disabled={isGenerating}
            activeOpacity={0.8}
          >
            {isGenerating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Share2 size={20} color="#FFFFFF" style={{ marginRight: 12 }} />
                <Text style={styles.primaryBtnText}>Share Digital Invoice</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryBtn} 
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] })}
            activeOpacity={0.7}
          >
            <Home size={20} color="#0F172A" style={{ marginRight: 12 }} />
            <Text style={styles.secondaryBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  
  // Success Header
  headerBox: { alignItems: 'center', marginBottom: 40 },
  iconCircle: { 
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    backgroundColor: '#DCFCE7', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: "#10B981", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 15 },
      android: { elevation: 6 }
    })
  },
  title: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 6, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  // Premium Floating Card
  summaryCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    padding: 28, 
    marginBottom: 24, 
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16 },
      android: { elevation: 4 }
    })
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  cardHeader: { fontSize: 12, fontWeight: '800', color: '#94A3B8', marginLeft: 8, letterSpacing: 1 },
  
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18, alignItems: 'center' },
  label: { fontSize: 15, color: '#64748B', fontWeight: '600' },
  value: { fontSize: 18, color: '#0F172A', fontWeight: '800' },
  unit: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 20 },
  
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, color: '#0F172A', fontWeight: '900', letterSpacing: 0.5 },
  totalValue: { fontSize: 32, color: '#0F172A', fontWeight: '900', letterSpacing: -1 },
  taxNote: { fontSize: 11, color: '#94A3B8', marginTop: 2, fontWeight: '500' },
  
  infoBox: { paddingHorizontal: 20, marginBottom: 40 },
  infoText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
  boldText: { color: '#64748B', fontWeight: '700' },

  // Action Buttons
  buttonStack: { gap: 14 },
  primaryBtn: { 
    flexDirection: 'row', 
    backgroundColor: '#F59E0B', // Kung Fu Panda Orange
    paddingVertical: 20, 
    borderRadius: 18, 
    alignItems: 'center', 
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10 },
      android: { elevation: 6 }
    })
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  
  secondaryBtn: { 
    flexDirection: 'row', 
    backgroundColor: '#FFFFFF', 
    paddingVertical: 18, 
    borderRadius: 18, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 2, 
    borderColor: '#0F172A' 
  },
  secondaryBtnText: { color: '#0F172A', fontSize: 17, fontWeight: '800' }
});