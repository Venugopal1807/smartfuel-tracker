import React, { useMemo, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert } from "react-native";
import MapView, { Marker, Polyline, LatLng, MapViewProps } from "react-native-maps";

const COLORS = {
  primary: "#4F46E5",
  border: "#E5E7EB",
  text: "#111827",
  muted: "#6B7280",
};

const { height } = Dimensions.get("window");
const MAP_HEIGHT = height * 0.6;

const driverLocation: LatLng = { latitude: 28.6139, longitude: 77.2090 };
const destinationLocation: LatLng = { latitude: 28.5355, longitude: 77.2639 };

const routeCoords: LatLng[] = [driverLocation, destinationLocation];

const TransitScreen: React.FC = () => {
  const mapRef = useRef<MapView>(null);

  const region = useMemo(() => {
    const midLat = (driverLocation.latitude + destinationLocation.latitude) / 2;
    const midLng = (driverLocation.longitude + destinationLocation.longitude) / 2;
    return {
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: Math.abs(driverLocation.latitude - destinationLocation.latitude) * 2 || 0.1,
      longitudeDelta: Math.abs(driverLocation.longitude - destinationLocation.longitude) * 2 || 0.1,
    };
  }, []);

  const fitRoute = () => {
    if (mapRef.current) {
      mapRef.current.fitToCoordinates(routeCoords, {
        edgePadding: { top: 60, right: 40, bottom: 200, left: 40 },
        animated: true,
      });
    }
  };

  const handleArrived = () => {
    Alert.alert("Arrived", "Proceed to Security Check.");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ height: MAP_HEIGHT }}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          onMapReady={fitRoute}
          showsUserLocation={false}
        >
          <Marker coordinate={driverLocation} title="Driver" description="Current position" />
          <Marker coordinate={destinationLocation} title="Apollo Hospital" description="Destination" />
          <Polyline coordinates={routeCoords} strokeColor={COLORS.primary} strokeWidth={4} />
        </MapView>
      </View>

      <View style={styles.sheetWrapper}>
        <View style={styles.card}>
          <Text style={styles.title}>En Route to Apollo Hospital</Text>
          <Text style={styles.sub}>ETA 14 mins • Distance 6.2 km</Text>

          <View style={{ marginTop: 12 }}>
            <Text style={styles.section}>Timeline</Text>
            <View style={styles.timelineRow}>
              <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.timelineText}>Departure</Text>
            </View>
            <View style={styles.timelineRow}>
              <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.timelineText}>On the Way</Text>
            </View>
            <View style={styles.timelineRow}>
              <View style={[styles.dot, { backgroundColor: COLORS.border }]} />
              <Text style={styles.timelineText}>Security Check</Text>
            </View>
          </View>

          <View style={{ marginTop: 16 }}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.outlineButton}
              onPress={() => Alert.alert("Navigation", "Launch Google Maps turn-by-turn")}
            >
              <Text style={{ color: COLORS.text, fontWeight: "700" }}>Turn-by-Turn (Google Maps)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.primaryButton, { marginTop: 10 }]}
              onPress={handleArrived}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>I HAVE ARRIVED</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sheetWrapper: {
    marginTop: -24,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  sub: {
    color: COLORS.muted,
    marginTop: 4,
  },
  section: {
    color: COLORS.text,
    fontWeight: "700",
    marginBottom: 6,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineText: {
    color: COLORS.text,
    fontWeight: "600",
  },
  outlineButton: {
    width: "100%",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  primaryButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: "center",
    backgroundColor: COLORS.primary,
  },
});

export default TransitScreen;
