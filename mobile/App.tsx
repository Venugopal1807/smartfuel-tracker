import "./global.css";
import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View, Text } from "react-native";
import { initDB } from "./src/db/sqlite";
import { startSyncWorker } from "./src/services/syncWorker";

import LoginScreen from "./src/screens/LoginScreen";
import SignupScreen from "./src/screens/SignupScreen";
// FIX 1: Point this to the real Dashboard Screen
import DashboardScreen from "./src/screens/DashboardScreen"; 
import FuelEntry from "./src/screens/FuelEntry";
import SyncHistory from "./src/screens/SyncHistory";

type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Dashboard: undefined;
  FuelEntry: undefined;
  SyncHistory: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const LoginWrapper = ({ navigation }: any) => (
  <LoginScreen onSuccess={() => navigation.replace("Dashboard")} onNavigateSignup={() => navigation.navigate("Signup")} />
);

const SignupWrapper = ({ navigation }: any) => (
  <SignupScreen onSuccess={() => navigation.replace("Dashboard")} onNavigateLogin={() => navigation.navigate("Login")} />
);

// We keep these wrappers just in case your FuelEntry/SyncHistory still rely on them
const FuelEntryWrapper = ({ navigation }: any) => (
  <FuelEntry onNavigate={(screen: any) => navigation.navigate(screen)} />
);

const SyncHistoryWrapper = ({ navigation }: any) => (
  <SyncHistory onNavigate={(screen: any) => navigation.navigate(screen)} />
);

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await initDB();
        startSyncWorker();
        setDbReady(true);
      } catch (err) {
        console.error("Failed to initialize SQLite", err);
      }
    };
    bootstrap();
  }, []);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={{ marginTop: 12, color: "#4F46E5", fontWeight: "700" }}>Preparing workspace...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginWrapper} />
        <Stack.Screen name="Signup" component={SignupWrapper} />
        {/* FIX 2: Use the newly imported DashboardScreen */}
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="FuelEntry" component={FuelEntryWrapper} />
        <Stack.Screen name="SyncHistory" component={SyncHistoryWrapper} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}