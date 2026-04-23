import { useState } from 'react';
import { Alert } from 'react-native';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { getUnsyncedLogs, markLogAsSynced } from '../db/sqlite';

// ✅ Use the shared environment variable
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.5:3000";

export const useSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);

  const syncLogs = async () => {
    if (isSyncing) return;
    
    // 1. Fetch unsynced logs from SQLite
    const unsyncedLogs = getUnsyncedLogs();
    
    if (unsyncedLogs.length === 0) {
      Alert.alert('Up to Date', 'All your dispensing logs are already synced.');
      return;
    }

    setIsSyncing(true);

    try {
      // 2. Connectivity Check
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected || !networkState.isInternetReachable) {
        Alert.alert('Offline', 'Please connect to the internet to sync your logs.');
        setIsSyncing(false);
        return;
      }

      // 3. Get the Authentication "Badge"
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        Alert.alert('Session Expired', 'Please log in again to sync your data.');
        setIsSyncing(false);
        return;
      }

      // 4. Batch Sync to Backend
      // We map the SQLite data to match the Backend's 'IncomingFuelLog' type
      const payload = {
        logs: unsyncedLogs.map(log => ({
          mobileOfflineId: log.mobileOfflineId,
          userId: log.userId, // This is now a String (UUID)
          volume: log.volume,
          lat: log.latitude,
          lng: log.longitude,
          timestamp: log.timestamp,
          orderId: log.orderId
        }))
      };

      const response = await axios.post(`${API_URL}/api/logs/sync`, payload, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000 
      });

      if (response.data.success) {
        // 5. Success: Clean up local SQLite
        // We only mark them as synced if the server explicitly says "Success"
        unsyncedLogs.forEach(log => markLogAsSynced(log.mobileOfflineId));
        
        Alert.alert(
          'Sync Successful', 
          `Uploaded ${unsyncedLogs.length} logs to the dashboard.`
        );
      } else {
        Alert.alert('Sync Failed', 'The server could not process the logs. Please try again.');
      }
    } catch (error: any) {
      console.error('Manual Sync error:', error.response?.data || error.message);
      
      const errorMsg = error.response?.status === 401 
        ? "Your session has expired. Please log in again."
        : "Could not reach the server. Logs remain safely on your device.";
        
      Alert.alert('Sync Incomplete', errorMsg);
    } finally {
      setIsSyncing(false);
    }
  };

  return { syncLogs, isSyncing };
};