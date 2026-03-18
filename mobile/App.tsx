import "./global.css"; // NativeWind global css
import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { initDB } from "./src/db/sqlite";
import { startSyncWorker } from "./src/services/syncWorker";

import Dashboard from "./src/screens/Dashboard";
import FuelEntry from "./src/screens/FuelEntry";
import SyncHistory from "./src/screens/SyncHistory";

export type ScreenName = "Dashboard" | "FuelEntry" | "SyncHistory";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>("Dashboard");

  useEffect(() => {
    initDB()
      .then(() => startSyncWorker())
      .catch((err) => console.error("Failed to init SQLite DB", err));
  }, []);

  const navigate = (screen: ScreenName) => setCurrentScreen(screen);

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="auto" />
      {currentScreen === "Dashboard" && <Dashboard onNavigate={navigate} />}
      {currentScreen === "FuelEntry" && <FuelEntry onNavigate={navigate} />}
      {currentScreen === "SyncHistory" && <SyncHistory onNavigate={navigate} />}
    </View>
  );
}
