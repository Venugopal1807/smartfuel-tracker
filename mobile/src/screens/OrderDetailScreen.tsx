import React from "react";
import { View, Text, TouchableOpacity, Linking, Dimensions } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useNavigation } from "@react-navigation/native";

const { height } = Dimensions.get("window");
const MAP_HEIGHT = height * 0.35;

type Props = {
  order: any;
  onBack: () => void;
};

const OrderDetailScreen: React.FC<Props> = ({ order, onBack }) => {
  const navigation = useNavigation<any>();
  const lat = Number(order.customer_lat) || 0;
  const lng = Number(order.customer_lng) || 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ height: MAP_HEIGHT }}>
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

      <View style={{ padding: 16, borderTopWidth: 1, borderColor: "#E5E7EB" }}>
        <View
          style={{
            borderWidth: 1,
            borderColor: "#E5E7EB",
            borderRadius: 4,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "800" }}>{order.customer_name || "Customer"}</Text>
          <TouchableOpacity onPress={() => order.customer_phone && Linking.openURL(`tel:${order.customer_phone}`)}>
            <Text style={{ color: "#4F46E5", marginTop: 6 }}>{order.customer_phone || "Phone not provided"}</Text>
          </TouchableOpacity>
          <Text style={{ marginTop: 6 }}>{order.customer_address || ""}</Text>
          <Text style={{ color: "#6B7280" }}>{order.customer_area || ""}</Text>
        </View>

        <View
          style={{
            borderWidth: 1,
            borderColor: "#E5E7EB",
            borderRadius: 4,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <Text style={{ fontWeight: "700" }}>Order #{order.order_number || order.id}</Text>
          <Text style={{ color: "#6B7280", marginTop: 4 }}>Scheduled: {order.scheduled_date || "N/A"}</Text>
          <Text style={{ color: "#6B7280", marginTop: 4 }}>
            Vehicle: {order.vehicle_registration || "TS-XX-XXXX"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate("Transit", { orderId: order.id })}
          style={{
            backgroundColor: "#4F46E5",
            paddingVertical: 14,
            borderRadius: 4,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>START TRANSIT</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onBack} style={{ marginTop: 12 }}>
          <Text style={{ color: "#4F46E5", textAlign: "center" }}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default OrderDetailScreen;
