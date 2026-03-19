import React, { useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Alert, TextInput } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { enqueueAction } from "../db/sqlite";
import axios from "axios";
import { processPayment } from "../services/paymentService";
import * as Sharing from "expo-sharing";
import { generateInvoice } from "../services/pdfService";

const COLORS = {
  primary: "#4F46E5",
  border: "#E5E7EB",
  success: "#10B981",
  danger: "#DC2626",
  text: "#111827",
  muted: "#6B7280",
};

interface Props {
  route: { params?: { customer?: string; pumpId?: string; orderId?: string; orderOtp?: string } };
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
  const orderId = route.params?.orderId;
  const orderOtp = route.params?.orderOtp || "1234";
  const [volume, setVolume] = useState(0);
  const [running, setRunning] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [finalVolume, setFinalVolume] = useState(0);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [invoiceUri, setInvoiceUri] = useState<string | null>(null);
  const amount = useMemo(() => volume * RATE, [volume]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      if (running) {
        intervalRef.current = setInterval(() => {
          setVolume((v) => {
            const next = Number((v + 0.28).toFixed(2));
            setFinalVolume(next);
            return next;
          });
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
    setFinalVolume(volume);
    await recordDispense();
    if (orderId) {
      try {
        await axios.patch(`${process.env.API_URL || "http://localhost:3000"}/api/orders/${orderId}/complete`, {
          final_volume: volume,
        });
      } catch (err: any) {
        console.error("Complete order failed", err?.message || err);
      }
    }
    try {
      setProcessingPayment(true);
      await processPayment(amount, orderId || "demo-order");
      setPaymentSuccess(true);
      await createAndShareInvoice();
    } catch (err: any) {
      Alert.alert("Payment pending", "Will retry payment verification when online.");
    } finally {
      setProcessingPayment(false);
    }
  };

  const onCollectPayment = async () => {
    await recordDispense();
  };

  const createAndShareInvoice = async () => {
    try {
      setSharing(true);
      const uri = await generateInvoice({
        orderNumber: orderId || "demo-order",
        customerName: customer,
        area: route.params?.orderOtp || "Area",
        vehicleReg: pumpId,
        volume: finalVolume || volume,
        total: amount,
        rate: RATE,
        transactionId: `tx_${Math.random().toString(36).slice(2, 8)}`,
      });
      setInvoiceUri(uri);
      await Sharing.shareAsync(uri);
    } catch (err: any) {
      console.error("Invoice error", err?.message || err);
      Alert.alert("Invoice failed", "Could not generate invoice.");
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
        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: COLORS.text, fontWeight: "700", marginBottom: 6 }}>Enter Order OTP</Text>
          <TextInput
            value={otpInput}
            onChangeText={(t) => setOtpInput(t.slice(0, 6))}
            keyboardType="number-pad"
            style={{
              borderWidth: 1,
              borderColor: COLORS.border,
              borderRadius: 4,
              paddingHorizontal: 12,
              paddingVertical: 12,
            }}
          />
        </View>

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
              onPress={createAndShareInvoice}
              disabled={sharing || processingPayment}
              style={{
                width: "100%",
                borderWidth: 1,
                borderColor: COLORS.border,
                paddingVertical: 14,
                borderRadius: 4,
                alignItems: "center",
                opacity: sharing || processingPayment ? 0.6 : 1,
              }}
            >
              <Text style={{ color: COLORS.text, fontWeight: "700" }}>
                {processingPayment
                  ? "Processing Secure Payment..."
                  : sharing
                  ? "Preparing PDF..."
                  : "Generate PDF Receipt & View Earnings"}
              </Text>
            </TouchableOpacity>

            {paymentSuccess && (
              <TouchableOpacity
                onPress={createAndShareInvoice}
                style={{
                  width: "100%",
                  paddingVertical: 12,
                  borderRadius: 4,
                  alignItems: "center",
                  backgroundColor: "#EEF2FF",
                  borderColor: COLORS.border,
                  borderWidth: 1,
                }}
              >
                <Text style={{ color: COLORS.text, fontWeight: "700" }}>Download Invoice</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {!running && !authorized && (
          <TouchableOpacity
            onPress={() => {
              if (otpInput === orderOtp) {
                setAuthorized(true);
                setRunning(true);
              } else {
                Alert.alert("Invalid OTP", "Please enter the correct Order OTP to start dispensing.");
              }
            }}
            style={{
              marginTop: 12,
              width: "100%",
              backgroundColor: "#4F46E5",
              paddingVertical: 14,
              borderRadius: 4,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Start Dispensing</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default DispensingScreen;
