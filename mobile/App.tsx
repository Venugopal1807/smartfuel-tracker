import "./global.css";
import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Home, ClipboardList, Truck, ShieldCheck } from "lucide-react-native"; // <-- Added icons for your flow

import { initDB } from "./src/db/sqlite";
import { startSyncWorker } from "./src/services/syncWorker";

// Screens
import LoginScreen from "./src/screens/LoginScreen";
import SignupScreen from "./src/screens/SignupScreen";
import DashboardScreen from "./src/screens/DashboardScreen"; 
import SyncHistory from "./src/screens/SyncHistory";
import ProfileScreen from "./src/screens/ProfileScreen";
import OrderDetailScreen from "./src/screens/OrderDetailScreen";
import TransitScreen from "./src/screens/TransitScreen";
import SecurityCheckScreen from "./src/screens/SecurityCheckScreen";
import DispensingScreen from "./src/screens/DispensingScreen"; 

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --- YOUR EXACT FLOW AS TABS ---
function MainTabs() {
  return (
    <Tab.Navigator 
      screenOptions={{ 
        headerShown: false,
        tabBarActiveTintColor: "#111827",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 8 }
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ tabBarIcon: ({ color }) => <Home size={22} color={color} /> }}
      />
      <Tab.Screen 
        name="Timeline" 
        component={OrderDetailScreen} 
        options={{ tabBarLabel: "Timeline", tabBarIcon: ({ color }) => <ClipboardList size={22} color={color} /> }}
      />
      <Tab.Screen 
        name="In Transit" 
        component={TransitScreen} 
        options={{ tabBarIcon: ({ color }) => <Truck size={22} color={color} /> }}
      />
      <Tab.Screen 
        name="Security" 
        component={SecurityCheckScreen} 
        options={{ tabBarLabel: "Security", tabBarIcon: ({ color }) => <ShieldCheck size={22} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await initDB();
        startSyncWorker();

        const token = await AsyncStorage.getItem("auth_token");
        if (token) {
          setUserToken(token);
        }
      } catch (err) {
        console.error("Failed to initialize session", err);
      } finally {
        setDbReady(true);
        setIsLoading(false);
      }
    };
    bootstrap();
  }, []);

  if (isLoading || !dbReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={{ marginTop: 12, color: "#111827", fontWeight: "700" }}>SmartFuel is starting...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {userToken === null ? (
          <>
            <Stack.Screen name="Login">
              {(props) => (
                <LoginScreen 
                  {...props} 
                  onSuccess={(token: string) => setUserToken(token)} 
                  onNavigateSignup={() => props.navigation.navigate("Signup")} 
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Signup">
                {(props) => (
                    <SignupScreen 
                        {...props} 
                        onSuccess={(token: string) => setUserToken(token)} 
                        onNavigateLogin={() => props.navigation.navigate("Login")} 
                    />
                )}
            </Stack.Screen>
          </>
        ) : (
          <>
            {/* The Main App (With Your Flow Tabs) */}
            <Stack.Screen name="Main" component={MainTabs} />
            
            {/* Kept Dispensing in the Stack since you mentioned it's inside Security Check */}
            <Stack.Screen name="DispensingScreen" component={DispensingScreen} />
            
            {/* Kept Profile in the Stack so you can still navigate to it to logout */}
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Logs" component={SyncHistory} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}