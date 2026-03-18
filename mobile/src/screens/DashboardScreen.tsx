import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Alert, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getPendingActions, enqueueAction } from "../db/sqlite";
import { processSyncQueue } from "../services/syncService";

const COLORS = {
  primary: "#4F46E5",
  border: "#E5E7EB",
  success: "#10B981",
  text: "#111827",
  muted: "#6B7280",
};

type Order = {
  id: string;
  customer: string;
  liters: number;
  eta: string;
  distanceKm: number;
  rate: number;
};

const orders: Order[] = [
  { id: "ORD-APOLLO-01", customer: "Apollo Hospital (Generator B)", liters: 500, eta: "Today · 4.5 min", distanceKm: 6.3, rate: 108 },
  { id: "ORD-METRO-02", customer: "Metro Market", liters: 214, eta: "Today · 12 min", distanceKm: 8.5, rate: 108 },
  { id: "ORD-EVA-03", customer: "Eva Diagnostics", liters: 320, eta: "Today · 18 min", distanceKm: 31.2, rate: 108 },
];

const Card: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => (
  <View
    style={[
      {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 4,
        padding: 12,
      },
      style,
    ]}
  >
    {children}
  </View>
);

const DashboardScreen: React.FC = () => {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const loadPending = useCallback(async () => {
    try {
      const pending = await getPendingActions();
      setPendingCount(pending.length);
    } catch (err) {
      console.error("Failed to load pending actions", err);
      setPendingCount(0);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPending();
    }, [loadPending])
  );

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const onAccept = async (order: Order) => {
    try {
      await enqueueAction("ACCEPT_ORDER", {
        orderId: order.id,
        timestamp: new Date().toISOString(),
      });
      Alert.alert("Queued", `Order ${order.id} stored offline.`);
      loadPending();
    } catch (err) {
      console.error("Failed to enqueue order", err);
      Alert.alert("Error", "Could not enqueue order.");
    }
  };

  const onSync = async () => {
    try {
      setSyncing(true);
      const result = await processSyncQueue();
      await loadPending();
      if (result.success) {
        Alert.alert("Sync complete", `Processed ${result.processedCount} item(s).`);
      } else {
        Alert.alert("Sync failed", result.error);
      }
    } catch (err) {
      console.error("Sync error", err);
      Alert.alert("Sync error", "Unable to process queue right now.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: COLORS.border }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: COLORS.text }}>Dashboard</Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Card style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: COLORS.muted }}>Pending Offline Syncs</Text>
            <Text style={{ fontSize: 22, fontWeight: "800", color: COLORS.text, marginTop: 4 }}>{pendingCount}</Text>
          </Card>
          <TouchableOpacity
            onPress={onSync}
            disabled={syncing}
            style={{
              flex: 1,
              backgroundColor: syncing ? "#9CA3AF" : COLORS.primary,
              borderRadius: 4,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 12,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>
              {syncing ? "Syncing..." : "Sync Now"}
            </Text>
          </TouchableOpacity>
          <Card style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: COLORS.muted }}>Completed Jobs</Text>
            <Text style={{ fontSize: 22, fontWeight: "800", color: COLORS.text, marginTop: 4 }}>—</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: COLORS.muted }}>Today's Earnings</Text>
            <Text style={{ fontSize: 22, fontWeight: "800", color: COLORS.text, marginTop: 4 }}>—</Text>
          </Card>
        </View>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 24 }}
        renderItem={({ item }) => {
          const withinZone = item.distanceKm < 30;
          return (
            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Text style={{ fontSize: 20, fontWeight: "800", color: COLORS.text }}>{item.liters.toFixed(0)} L</Text>
                <View
                  style={{
                    backgroundColor: withinZone ? COLORS.success : COLORS.border,
                    borderRadius: 12,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>
                    {withinZone ? "Within Zone" : "Out of Zone"}
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.text }}>{item.customer}</Text>
              <Text style={{ fontSize: 13, color: COLORS.muted, marginBottom: 10 }}>{item.eta}</Text>

              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: COLORS.text }}>₹{item.rate} / L</Text>
                <Text style={{ fontSize: 13, color: COLORS.muted }}>{item.distanceKm.toFixed(1)} km</Text>
              </View>

              <TouchableOpacity
                onPress={() => onAccept(item)}
                disabled={!withinZone}
                style={{
                  width: "100%",
                  backgroundColor: withinZone ? COLORS.primary : "#9CA3AF",
                  paddingVertical: 14,
                  borderRadius: 4,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Accept</Text>
              </TouchableOpacity>
            </Card>
          );
        }}
      />
    </View>
  );
};

export default DashboardScreen;
