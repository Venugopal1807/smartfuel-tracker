import { useState } from 'react';
import { Alert } from 'react-native';
import * as Network from 'expo-network';
import axios from 'axios';
import { getUnsyncedLogs, markLogAsSynced } from '../db/sqlite';

export const useSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);

  const syncLogs = async (mockMode: boolean = false) => {
    if (isSyncing) return;
    
    // 1. Fetch unsynced logs
    const unsyncedLogs = getUnsyncedLogs();
    
    if (unsyncedLogs.length === 0) {
      Alert.alert('Up to Date', 'All logs are already synced!');
      return;
    }

    setIsSyncing(true);

    try {
      // 2. Connectivity Check
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected || !networkState.isInternetReachable) {
        Alert.alert('Offline', 'No internet connection. Please try again later.');
        setIsSyncing(false);
        return;
      }

      // 3. Sync Process
      if (mockMode) {
        // Mock Sync: Simulate a 2-second successful backend request
        await new Promise((resolve) => setTimeout(resolve, 2000));
        unsyncedLogs.forEach(log => markLogAsSynced(log.mobileOfflineId));
        Alert.alert('Sync Successful (Mock)', `Successfully synced ${unsyncedLogs.length} logs!`);
      } else {
        // Real Sync: POST to the backend batch endpoint (Assuming it will be at /api/fuel-logs/batch)
        // SERVER_URL should ideally come from env, hard-coding to localhost for local testing config.
        const SERVER_URL = 'http://10.0.2.2:3000'; // Standard Android emulator localhost mapped IP
        
        const response = await axios.post(`${SERVER_URL}/api/logs/sync`, { logs: unsyncedLogs }, {
          timeout: 10000 // 10 second timeout
        });

        if (response.status === 200 || response.status === 201) {
          // Success: Mark all synced in SQLite
          unsyncedLogs.forEach(log => markLogAsSynced(log.mobileOfflineId));
          Alert.alert('Sync Successful', `Successfully synced ${unsyncedLogs.length} logs!`);
        } else {
          Alert.alert('Server Error', `Server responded with status: ${response.status}`);
        }
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      Alert.alert('Sync Failed', 'Could not reach the server or request timed out. Logs remain safely offline.');
    } finally {
      setIsSyncing(false);
    }
  };

  return { syncLogs, isSyncing };
};
