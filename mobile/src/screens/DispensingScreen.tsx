import React, { useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
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

const escapeHtml = (val: string) =>
  val
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const DispensingScreen: React.FC<Props> = ({ route }) => {
  const customer = escapeHtml(route.params?.customer || "Apollo Hospital (Generator B)");
  const pumpId = escapeHtml(route.params?.pumpId || "MDU_772");
  const [volume, setVolume] = useState(0);
  const [running, setRunning] = useState(true);
  const [sharing, setSharing] = useState(false);
  const amount = useMemo(() => volume * RATE, [volume]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      if (running) {
        intervalRef.current = setInterval(() => {
          setVolume((v) => Number((v + 0.28).toFixed(2)));
        }, 100);
      }
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
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
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    await recordDispense();
  };

  const onCollectPayment = async () => {
    await recordDispense();
  };

  const generateAndSharePDF = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const now = new Date();
      const html = `
        <html>
          <head>
            <meta name="viewport" content="initial-scale=1.0, width=device-width" />
            <style>
              body { font-family: -apple-system, Roboto, 'Segoe UI', sans-serif; color: #111827; padding: 24px; }
              .header { background: #4F46E5; color: #fff; padding: 16px; border-radius: 6px; }
              .title { margin: 0; font-size: 20px; font-weight: 800; }
              .section { margin-top: 20px; padding: 16px; border: 1px solid #E5E7EB; border-radius: 6px; }
              .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
              .label { color: #6B7280; font-size: 13px; }
              .value { font-weight: 700; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 class="title">SmartFuel B2B Receipt</h1>
              <div style="margin-top:4px; font-size:14px;">Option C • PDF Receipt</div>
            </div>
            <div class="section">
              <div class="row"><span class="label">Client</span><span class="value">Apollo Hospital</span></div>
              <div class="row"><span class="label">Pump ID</span><span class="value">${pumpId}</span></div>
              <div class="row"><span class="label">Date/Time</span><span class="value">${now.toLocaleString()}</span></div>
              <div class="row"><span class="label">Volume Dispensed</span><span class="value">${volume.toFixed(2)} L</span></div>
              <div class="row"><span class="label">Rate</span><span class="value">₹ 90.00 / L</span></div>
              <div class="row"><span class="label">Total Amount</span><span class="value">₹ ${amount.toFixed(2)}</span></div>
            </div>
            <p style="margin-top:16px; color:#6B7280; font-size:12px;">Generated offline by SmartFuel. Sync to HQ when online.</p>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (err: any) {
      console.error("PDF share error", err?.message || err);
      Alert.alert("Share failed", "Could not generate or share the receipt.");
    } finally {
      setSharing(false);
    }
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
              onPress={generateAndSharePDF}
              disabled={sharing}
              style={{
                width: "100%",
                borderWidth: 1,
                borderColor: COLORS.border,
                paddingVertical: 14,
                borderRadius: 4,
                alignItems: "center",
                opacity: sharing ? 0.6 : 1,
              }}
            >
              <Text style={{ color: COLORS.text, fontWeight: "700" }}>
                {sharing ? "Preparing PDF..." : "Generate PDF Receipt & View Earnings"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

export default DispensingScreen;
