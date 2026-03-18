import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import MapView, { Marker } from "react-native-maps";

type Props = {
  order: any;
  onBack: () => void;
};

const OrderDetailScreen: React.FC<Props> = ({ order, onBack }) => {
  const lat = Number(order.customer_lat) || 0;
  const lng = Number(order.customer_lng) || 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ height: 220 }}>
        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            latitude: lat || 0,
            longitude: lng || 0,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          <Marker coordinate={{ latitude: lat, longitude: lng }} title="Customer" />
        </MapView>
      </View>

      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "800" }}>{order.customer_name || "Customer"}</Text>
        <Text style={{ color: "#6B7280", marginTop: 4 }}>{order.customer_phone || ""}</Text>
        <Text style={{ marginTop: 6 }}>{order.customer_address || ""}</Text>
        <Text style={{ color: "#6B7280" }}>{order.customer_area || ""}</Text>

        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: "700" }}>Order ID: {order.id}</Text>
          <Text style={{ color: "#6B7280" }}>Scheduled: {order.scheduled_date || "N/A"}</Text>
          <Text style={{ color: "#6B7280" }}>Vehicle: {order.vehicle_registration_number || "TS-XX-XXXX"}</Text>
        </View>

        <TouchableOpacity
          onPress={onBack}
          style={{
            marginTop: 16,
            paddingVertical: 12,
            backgroundColor: "#4F46E5",
            borderRadius: 4,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Start Transit</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onBack} style={{ marginTop: 10 }}>
          <Text style={{ color: "#4F46E5", textAlign: "center" }}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default OrderDetailScreen;
