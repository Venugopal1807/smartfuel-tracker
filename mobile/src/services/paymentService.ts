import axios from "axios";
import { enqueueAction } from "../db/sqlite";
import * as Crypto from 'expo-crypto';
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.5:3000";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * processPayment
 * Aligned with SmartFuel Transactions Table logic
 */
export const processPayment = async (
  amount: number, 
  orderId: string, 
  otp: string, 
  volume: number, 
  pumpId: string
) => {
  try {
    const token = await AsyncStorage.getItem("auth_token");

    // 1. CREATE TRANSACTION (Handshake)
    // We send order details, server creates a 'PENDING' row in the transactions table
    const initResponse = await axios.post(
      `${API_URL}/api/payments/create-order`, 
      { orderId, amount, volume, pumpId },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { pgOrderId } = initResponse.data;
    if (!pgOrderId) throw new Error("Server Transaction Creation Failed");

    // 2. SIMULATE SECURE VERIFICATION UX
    await delay(1000); 

    // 3. GENERATE PROOF (Mock Payment ID)
    // In our B2B flow, the 'pg_payment_id' is generated after the app 
    // confirms the hardware successfully accepted the End OTP.
    const pgPaymentId = 'sf_verify_' + await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${pgOrderId}:${otp}:${Date.now()}`
    ).then(hash => hash.substring(0, 12));

    // 4. VERIFY & SETTLE
    // Server updates the transaction to 'PAID' and the order to 'paid'
    const verifyResponse = await axios.post(
      `${API_URL}/api/payments/verify`, 
      { 
        pg_order_id: pgOrderId, 
        pg_payment_id: pgPaymentId 
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return {
      success: true,
      pgPaymentId,
      data: verifyResponse.data
    };

  } catch (err: any) {
    // If it's a 4xx error (Validation/Auth), don't queue it
    if (err.response && err.response.status < 500) {
      throw err; 
    }

    // --- OFFLINE / SYNC QUEUE ---
    console.error("Payment Bridge failed, queuing for background sync...");
    
    await enqueueAction("PAYMENT_VERIFY_RETRY", {
      orderId,
      amount,
      volume,
      otp_proof: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, otp),
      timestamp: new Date().toISOString()
    });

    throw err;
  }
};