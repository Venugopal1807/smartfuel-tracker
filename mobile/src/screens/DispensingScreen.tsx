import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { enqueueAction } from "../db/sqlite";

const COLORS = {
  primary: "#4F46E5",
  border: "#E5E7EB",
  success: "#10B981",
  danger: "#DC2626",
  text: "#111827",
  muted: "#6B7280",
};

interface Props {
  route: { params?: { customer?: string; pumpId?: string } };
}

const formatVolume = (value: number) => value.toFixed(2).padStart(6, "0");
const RATE = 90;

const DispensingScreen: React.FC<Props> = ({ route }) => {
  const customer = route.params?.customer || "Apollo Hospital (Generator B)";
  const pumpId = route.params?.pumpId || "MDU_772";
  const [volume, setVolume] = useState(0);
  const [running, setRunning] = useState(true);
  const amount = useMemo(() => volume * RATE, [volume]);

  useFocusEffect(
    React.useCallback(() => {
      let timer: ReturnType<typeof setInterval> | null = null;
      if (running) {
        timer = setInterval(() => {
          setVolume((v) => Number((v + 0.28).toFixed(2)));
        }, 100);
      }
      return () => {
        if (timer) clearInterval(timer);
      };
    }, [running])
  );

  const recordDispense = async () => {
    try {
      await enqueueAction("DISPENSE_FUEL", {
        pumpId,
        volume,
        amount,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to enqueue dispense event", err);
    }
  };

  const onStop = async () => {
    setRunning(false);
    await recordDispense();
  };

  const onCollectPayment = async () => {
    await recordDispense();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderColor: COLORS.border }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.text }}>
          {customer}
        </Text>
      </View>

      <View
        style={{
          margin: 12,
          padding: 12,
          borderWidth: 1,
          borderColor: COLORS.border,
          borderRadius: 4,
          backgroundColor: COLORS.success,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>
          ✅ PUMP_ID: {pumpId} - DISPENSING
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <View
          style={{
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: COLORS.border,
            borderRadius: 4,
            padding: 16,
          }}
        >
          <Text
            style={{
              fontSize: 52,
              fontWeight: "800",
              color: COLORS.text,
              textAlign: "center",
              letterSpacing: 1,
            }}
          >
            {formatVolume(volume)} L
          </Text>
        </View>

        <View
          style={{
            marginTop: 12,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderRadius: 4,
            padding: 14,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text style={{ color: COLORS.muted }}>Rate</Text>
            <Text style={{ color: COLORS.text, fontWeight: "700" }}>₹ {RATE.toFixed(2)}/L</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: COLORS.muted }}>Amount</Text>
            <Text style={{ color: COLORS.text, fontWeight: "800", fontSize: 18 }}>
              ₹ {amount.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ padding: 16 }}>
        {running ? (
          <TouchableOpacity
            onPress={onStop}
            disabled={!running}
            style={{
              width: "100%",
              backgroundColor: COLORS.danger,
              paddingVertical: 14,
              borderRadius: 4,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>STOP DISPENSING</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ gap: 10 }}>
            <TouchableOpacity
              onPress={onCollectPayment}
              style={{
                width: "100%",
                backgroundColor: COLORS.primary,
                paddingVertical: 14,
                borderRadius: 4,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Collect Payment (Razorpay Mock)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {}}
              style={{
                width: "100%",
                borderWidth: 1,
                borderColor: COLORS.border,
                paddingVertical: 14,
                borderRadius: 4,
                alignItems: "center",
              }}
            >
              <Text style={{ color: COLORS.text, fontWeight: "700" }}>
                Generate PDF Receipt & View Earnings
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

export default DispensingScreen;
