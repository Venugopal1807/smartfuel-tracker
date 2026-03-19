import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Fuel, History, Wifi, WifiOff, CloudOff, RefreshCcw, HardDrive } from 'lucide-react-native';
import * as Network from 'expo-network';
import * as Location from 'expo-location';
import axios from 'axios';
import { getUnsyncedLogs, saveFuelLog } from '../database/db';
import { useSync } from '../hooks/useSync';
import { useFuelSensor } from '../hooks/useFuelSensor';

interface Props {
  onNavigate: (screen: 'Dashboard' | 'FuelEntry' | 'SyncHistory') => void;
}

export default function Dashboard({ onNavigate }: Props) {
  // Stats & States
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [stats, setStats] = useState({ totalVolume: '0.00', totalLogs: 0 });
  const [isFetchingStats, setIsFetchingStats] = useState(false);
  
  // Custom Hooks
  const { syncLogs, isSyncing } = useSync();
  const { dispensing, currentVolume, startDispensing, stopDispensing } = useFuelSensor();

  // Initialization & Polling
  useEffect(() => {
    checkNetwork();
    refreshLocalData();
    fetchBackendStats();
    
    // Poll Network status every 5 seconds
    const interval = setInterval(checkNetwork, 5000);
    return () => clearInterval(interval);
  }, []);

  // Re-fetch local data after a sync finishes
  useEffect(() => {
    if (!isSyncing) {
      refreshLocalData();
      if (isOnline) fetchBackendStats();
    }
  }, [isSyncing, isOnline]);

  const checkNetwork = async () => {
    const net = await Network.getNetworkStateAsync();
    setIsOnline(!!net.isInternetReachable);
  };

  const refreshLocalData = () => {
    setUnsyncedCount(getUnsyncedLogs().length);
  };

  const fetchBackendStats = async () => {
    if (!isOnline) return;
    setIsFetchingStats(true);
    try {
      const SERVER_URL = 'http://10.0.2.2:3000';
      const res = await axios.get(`${SERVER_URL}/api/stats/1`, { timeout: 5000 });
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (e) {
      console.log('Failed to fetch stats, likely offline or server down.');
    } finally {
      setIsFetchingStats(false);
    }
  };

  // Hardware Mock Flow
  const handleStopDispensing = async () => {
    const finalVolume = stopDispensing();
    if (finalVolume <= 0) return;

    try {
      // Try to get real location, fallback to 0,0 if denied for speed
      let lat = 0.0;
      let lng = 0.0;
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getLastKnownPositionAsync();
        lat = loc?.coords.latitude || 0;
        lng = loc?.coords.longitude || 0;
      }

      saveFuelLog(finalVolume, lat, lng, 1);
      refreshLocalData();
      Alert.alert('Hardware Mock complete', `Saved ${finalVolume.toFixed(2)}L to SQLite.`);
    } catch (e) {
      Alert.alert('Error', 'Failed to save mock log.');
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-900 px-6 pt-16">
      
      {/* ─── Header & Signal Strength ────────────────────────── */}
      <View className="flex-row items-center justify-between mb-8">
        <View>
          <Text className="text-3xl font-black text-white tracking-tight">SmartFuel</Text>
          <Text className="text-sm font-medium text-slate-400">Terminal 1 • Offline-First</Text>
        </View>
        <View className={`px-3 py-1.5 rounded-full flex-row items-center border ${
          isOnline ? 'bg-emerald-900/30 border-emerald-500/50' : 'bg-rose-900/30 border-rose-500/50'
        }`}>
          {isOnline ? <Wifi size={14} color="#34d399" /> : <WifiOff size={14} color="#fb7185" />}
          <Text className={`ml-2 text-xs font-bold uppercase tracking-wider ${
            isOnline ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* ─── Hardware Simulation Widget ──────────────────────── */}
      <View className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl mb-6">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-slate-400 font-bold uppercase tracking-wider text-xs">BLE Fuel Sensor Mock</Text>
          {dispensing && <ActivityIndicator color="#3b82f6" />}
        </View>

        <View className="items-center mb-6">
          <Text className="text-6xl font-black text-white">{currentVolume.toFixed(2)}</Text>
          <Text className="text-slate-400 font-medium">Liters Dispensed</Text>
        </View>

        <TouchableOpacity 
          className={`py-4 rounded-2xl flex-row justify-center items-center shadow-lg ${
            dispensing ? 'bg-rose-600 active:bg-rose-700' : 'bg-blue-600 active:bg-blue-700'
          }`}
          onPress={dispensing ? handleStopDispensing : startDispensing}
        >
          <HardDrive size={20} color="white" />
          <Text className="text-white font-bold text-lg ml-2 pb-0.5">
            {dispensing ? 'STOP & SAVE' : 'START DISPENSING'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── 24hr Analytics ──────────────────────────────────── */}
      <View className="flex-row justify-between mb-6 gap-4">
        <View className="flex-1 bg-slate-800 rounded-2xl p-4 border border-slate-700 relative overflow-hidden">
          <Text className="text-slate-400 text-xs font-bold tracking-wider mb-1">TOTAL 24HR</Text>
          <Text className="text-2xl font-black text-white">{stats.totalVolume} L</Text>
          {isFetchingStats && <ActivityIndicator size="small" className="absolute top-4 right-4" color="#64748b" />}
        </View>
        <View className="flex-1 bg-slate-800 rounded-2xl p-4 border border-slate-700">
          <Text className="text-slate-400 text-xs font-bold tracking-wider mb-1">LOGS 24HR</Text>
          <Text className="text-2xl font-black text-white">{stats.totalLogs}</Text>
        </View>
      </View>

      {/* ─── Sync Status Banner ─────────────────────────────── */}
      <View className="w-full mb-8">
        {unsyncedCount > 0 ? (
          <View className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 flex-row items-center">
            <View className="bg-orange-500/20 p-2 rounded-full mr-3">
              <CloudOff size={24} color="#f97316" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-orange-400 text-base">Pending Sync</Text>
              <Text className="text-orange-200/70 text-sm">{unsyncedCount} offline record{unsyncedCount !== 1 ? 's' : ''}</Text>
            </View>
            
            <TouchableOpacity 
              className={`px-4 py-3 rounded-xl flex-row items-center ${isSyncing || !isOnline ? 'bg-orange-500/50' : 'bg-orange-600 active:bg-orange-700'}`}
              onPress={() => syncLogs(false)} // Run real sync targeting backend
              disabled={isSyncing || !isOnline}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <RefreshCcw size={16} color="#fff" />
                  <Text className="text-white font-bold text-sm ml-2">Sync</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex-row items-center justify-center">
            <RefreshCcw size={20} color="#10b981" />
            <Text className="font-bold text-emerald-400 text-sm ml-2">Data safely synced to Headquarters</Text>
          </View>
        )}
      </View>

      {/* ─── Navigation Actions ──────────────────────────────── */}
      <View className="w-full gap-4 pb-12">
        <TouchableOpacity 
          className="bg-slate-800 border border-slate-700 p-5 rounded-2xl flex-row items-center justify-center space-x-3 active:bg-slate-700"
          onPress={() => onNavigate('FuelEntry')}
        >
          <Fuel size={24} color="#94a3b8" />
          <Text className="text-slate-200 text-lg font-bold ml-2">Manual Entry</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="bg-slate-800 border border-slate-700 p-5 rounded-2xl flex-row items-center justify-center space-x-3 active:bg-slate-700"
          onPress={() => onNavigate('SyncHistory')}
        >
          <History size={24} color="#94a3b8" />
          <Text className="text-slate-200 text-lg font-bold ml-2">Stored Logs</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}
