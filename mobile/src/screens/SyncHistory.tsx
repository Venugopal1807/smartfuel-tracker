import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { ArrowLeft, CheckCircle2, Clock } from 'lucide-react-native';
import { getLogs, FuelLog } from '../db/sqlite';

interface Props {
  onNavigate: (screen: 'Dashboard' | 'FuelEntry' | 'SyncHistory') => void;
}

export default function SyncHistory({ onNavigate }: Props) {
  const [logs, setLogs] = useState<FuelLog[]>([]);

  useEffect(() => {
    // Fetch logs from local SQLite database on mount
    const fetchLogs = () => {
      const localLogs = getLogs();
      setLogs(localLogs);
    };
    fetchLogs();
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('Dashboard')}>
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Local Fuel Logs</Text>
        <View style={styles.headerSpacer} /> {/* Spacer */}
      </View>
      
      {logs.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrapper}>
            <Clock size={48} color="#6b7280" />
          </View>
          <Text style={styles.emptyText}>No logs saved locally yet.</Text>
        </View>
      ) : (
        <FlatList 
          data={logs}
          keyExtractor={(item) => item.mobileOfflineId}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View>
                <Text style={styles.volumeText}>{item.volume.toFixed(2)} L</Text>
                <Text style={styles.timestampText}>
                  {new Date(item.timestamp).toLocaleString()}
                </Text>
              </View>
              
              <View style={[styles.badge, item.synced ? styles.badgeSynced : styles.badgePending]}>
                {item.synced ? (
                  <CheckCircle2 size={16} color="#16a34a" />
                ) : (
                  <Clock size={16} color="#ea580c" />
                )}
                <Text style={[styles.badgeLabel, item.synced ? styles.badgeLabelSynced : styles.badgeLabelPending]}>
                  {item.synced ? 'Synced' : 'Pending'}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingTop: 64,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  backButton: {
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerSpacer: {
    width: 40,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.5,
  },
  emptyIconWrapper: {
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6b7280',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  volumeText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 4,
  },
  timestampText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  badgeSynced: {
    backgroundColor: '#ecfdf3',
    borderColor: '#bbf7d0',
  },
  badgePending: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
  },
  badgeLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  badgeLabelSynced: {
    color: '#15803d',
  },
  badgeLabelPending: {
    color: '#c2410c',
  },
});
