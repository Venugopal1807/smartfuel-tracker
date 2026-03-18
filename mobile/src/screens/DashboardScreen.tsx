import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, Alert, ActivityIndicator } from "react-native";
import axios from "axios";
import OrderDetailScreen from "./OrderDetailScreen";

const API_URL = process.env.API_URL || "http://localhost:3000";

type Order = {
  id: string;
  customer_name?: string;
  customer_area?: string;
  status: string;
  expected_volume?: string;
  vehicle_id?: string;
};

const TABS = ["Available Orders", "In Progress"] as const;

const DashboardScreen: React.FC = () => {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Available Orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/orders`, {
        params: tab === "Available Orders" ? { status: "PENDING" } : { status: "ACCEPTED" },
      });
      setOrders(res.data?.data || []);
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [tab]);

  const acceptOrder = async (orderId: string) => {
    try {
      setLoading(true);
      await axios.patch(`${API_URL}/api/orders/${orderId}/accept`, {
        driverId: "driver-placeholder",
        vehicleId: "vehicle-placeholder",
      });
      Alert.alert("Accepted", "Order moved to In Progress");
      fetchOrders();
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Failed to accept order");
    } finally {
      setLoading(false);
    }
  };

  if (selected) {
    return <OrderDetailScreen order={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff", paddingTop: 12 }}>
      <View style={{ flexDirection: "row", marginHorizontal: 12, marginBottom: 12 }}>
        {TABS.map((t) => {
          const active = t === tab;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: active ? "#4F46E5" : "#E5E7EB",
                backgroundColor: active ? "#EEF2FF" : "#fff",
                borderRadius: 4,
                alignItems: "center",
              }}
            >
              <Text style={{ color: active ? "#4F46E5" : "#111827", fontWeight: "700" }}>{t}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color="#4F46E5" />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 12, gap: 12 }}
          renderItem={({ item }) => (
            <View
              style={{
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 4,
                padding: 12,
              }}
            >
              <Text style={{ fontWeight: "800", fontSize: 16 }}>{item.customer_name || "Customer"}</Text>
              <Text style={{ color: "#6B7280", marginVertical: 4 }}>{item.customer_area || "Area"}</Text>
              <Text style={{ color: "#6B7280" }}>Status: {item.status}</Text>
              {tab === "Available Orders" ? (
                <TouchableOpacity
                  onPress={() => acceptOrder(item.id)}
                  style={{
                    marginTop: 10,
                    paddingVertical: 12,
                    backgroundColor: "#4F46E5",
                    borderRadius: 4,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Accept</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => setSelected(item)}
                  style={{
                    marginTop: 10,
                    paddingVertical: 12,
                    backgroundColor: "#111827",
                    borderRadius: 4,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Open</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
};

export default DashboardScreen;
