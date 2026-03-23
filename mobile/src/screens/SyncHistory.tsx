import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle2, Clock, Inbox, MapPin } from 'lucide-react-native';
import MapView, { UrlTile, Marker } from 'react-native-maps';
import { getLogs, FuelLog } from '../db/sqlite';
import { useNavigation } from '@react-navigation/native';

/**
 * MINI MAP COMPONENT
 * Renders the specific location where the fuel was dispensed.
 * Uses 'latitude' and 'longitude' to match the FuelLog type.
 */
const LogMiniMap = ({ latitude, longitude }: { latitude: number; longitude: number }) => {
  const region = {
    latitude: latitude || 17.3850,
    longitude: longitude || 78.4867,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };

  return (
    <View style={styles.mapWrapper}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={region}
        scrollEnabled={false}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        cacheEnabled={Platform.OS === 'android'}
      >
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />
        <Marker coordinate={region}>
           <View style={styles.miniMarker}>
              <MapPin size={12} color="#fff" />
           </View>
        </Marker>
      </MapView>
    </View>
  );
};

export default function SyncHistory() {
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();

  // Fetching logs from the local SQLite database
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const localLogs = await getLogs();
      setLogs(localLogs || []);
    } catch (err) {
      console.error("Failed to fetch local logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{"Local Fuel Logs"}</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        ) : logs.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrapper}>
              <Inbox size={48} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyText}>{"No logs saved locally yet."}</Text>
          </View>
        ) : (
          <FlatList 
            data={logs}
            keyExtractor={(item) => `${item.mobileOfflineId}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listPadding}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.infoSection}>
                    <Text style={styles.volumeText}>{`${item.volume?.toFixed(2) || '0.00'} L`}</Text>
                    <Text style={styles.timestampText}>
                      {`${item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Unknown Time'}`}
                    </Text>
                  </View>
                  
                  <View style={[styles.badge, item.synced ? styles.badgeSynced : styles.badgePending]}>
                    {item.synced ? (
                      <CheckCircle2 size={14} color="#16a34a" />
                    ) : (
                      <Clock size={14} color="#ea580c" />
                    )}
                    <Text style={[styles.badgeLabel, item.synced ? styles.badgeLabelSynced : styles.badgeLabelPending]}>
                      {item.synced ? "Synced" : "Pending"}
                    </Text>
                  </View>
                </View>

                {/* --- RENDER MAP IF COORDINATES EXIST --- */}
                {item.latitude && item.longitude ? (
                  <LogMiniMap latitude={item.latitude} longitude={item.longitude} />
                ) : (
                  <View style={styles.noLocationBox}>
                    <Text style={styles.noLocationText}>{"Location data not available"}</Text>
                  </View>
                )}
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#f9fafb', paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  backButton: { padding: 8, backgroundColor: '#ffffff', borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  headerSpacer: { width: 40 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  emptyIconWrapper: { marginBottom: 12, opacity: 0.5 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#9CA3AF' },
  listPadding: { paddingBottom: 40 },
  
  // Card Styles
  card: { backgroundColor: '#ffffff', padding: 16, marginBottom: 16, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  infoSection: { flex: 1 },
  volumeText: { fontSize: 24, fontWeight: '900', color: '#111827', marginBottom: 2 },
  timestampText: { fontSize: 12, fontWeight: '500', color: '#6b7280' },
  
  // Badge Styles
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  badgeSynced: { backgroundColor: '#ecfdf3', borderColor: '#bbf7d0' },
  badgePending: { backgroundColor: '#fff7ed', borderColor: '#fed7aa' },
  badgeLabel: { fontSize: 12, fontWeight: '700', marginLeft: 6 },
  badgeLabelSynced: { color: '#15803d' },
  badgeLabelPending: { color: '#c2410c' },

  // Map Styles
  mapWrapper: { height: 120, width: '100%', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#F3F4F6', marginTop: 4 },
  miniMarker: { backgroundColor: '#4F46E5', padding: 4, borderRadius: 10, borderWidth: 1, borderColor: '#fff' },
  noLocationBox: { height: 40, backgroundColor: '#F3F4F6', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#D1D5DB' },
  noLocationText: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' }
});