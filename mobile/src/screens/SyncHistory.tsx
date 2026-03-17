import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { ArrowLeft, CheckCircle2, Clock } from 'lucide-react-native';
import { getLogs, FuelLog } from '../database/db';

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
    <View className="flex-1 bg-gray-50 pt-16 px-6">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-8">
        <TouchableOpacity 
          className="p-2 bg-white rounded-full shadow-sm border border-gray-100"
          onPress={() => onNavigate('Dashboard')}
        >
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Local Fuel Logs</Text>
        <View className="w-10" /> {/* Spacer */}
      </View>
      
      {logs.length === 0 ? (
        <View className="flex-1 justify-center items-center opacity-50">
          <Clock size={48} color="#6b7280" className="mb-4" />
          <Text className="text-lg font-medium text-gray-500">No logs saved locally yet.</Text>
        </View>
      ) : (
        <FlatList 
          data={logs}
          keyExtractor={(item) => item.mobileOfflineId}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => (
            <View className="bg-white p-5 mb-4 rounded-2xl shadow-sm flex-row justify-between items-center border border-gray-100">
              <View>
                <Text className="text-2xl font-black text-gray-900 mb-1">{item.volume.toFixed(2)} L</Text>
                <Text className="text-xs font-medium text-gray-500">
                  {new Date(item.timestamp).toLocaleString()}
                </Text>
              </View>
              
              <View className={`px-4 py-2 rounded-full flex-row items-center ${item.synced ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
                {item.synced ? (
                  <CheckCircle2 size={16} color="#16a34a" />
                ) : (
                  <Clock size={16} color="#ea580c" />
                )}
                <Text className={`text-sm font-bold ml-2 ${item.synced ? 'text-green-700' : 'text-orange-700'}`}>
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
