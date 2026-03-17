import './global.css'; // Import NativeWind global css
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { initDb } from './src/database/db';

import Dashboard from './src/screens/Dashboard';
import FuelEntry from './src/screens/FuelEntry';
import SyncHistory from './src/screens/SyncHistory';

export type ScreenName = 'Dashboard' | 'FuelEntry' | 'SyncHistory';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('Dashboard');

  useEffect(() => {
    // Initialize SQLite database table on app start
    initDb();
  }, []);

  const navigate = (screen: ScreenName) => setCurrentScreen(screen);

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="auto" />
      {currentScreen === 'Dashboard' && <Dashboard onNavigate={navigate} />}
      {currentScreen === 'FuelEntry' && <FuelEntry onNavigate={navigate} />}
      {currentScreen === 'SyncHistory' && <SyncHistory onNavigate={navigate} />}
    </View>
  );
}
