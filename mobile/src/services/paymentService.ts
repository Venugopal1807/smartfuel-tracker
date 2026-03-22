import axios from "axios";
import { enqueueAction } from "../db/sqlite";
import * as Crypto from 'expo-crypto';

// Use the standard internal IP or localhost for testing
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.3:3000";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * processPayment
 * * Logic:
 * 1. Request a 'Payment Challenge' from the server (Handshake)
 * 2. Generate a Client Signature using the OTP + Challenge (Proof of Presence)
 * 3. Send the Proof to the server for final verification
 */
export const processPayment = async (amount: number, orderId: string, otp: string) => {
  try {
    // 1. INITIATE HANDSHAKE
    // We tell the server we are ready to pay. It gives us a 'transaction_nonce' (a one-time random string)
    const initResponse = await axios.post(`${API_URL}/api/payments/initiate`, {
      orderId,
      amount,
    });

    const { transactionId, nonce } = initResponse.data;
    if (!transactionId || !nonce) throw new Error("Server Handshake Failed");

    // 2. SIMULATE SECURE PROCESSING UX
    // We keep the delay so the driver feels the 'verification' happening
    await delay(1500); 

    // 3. GENERATE CRYPTOGRAPHIC PROOF (HMAC-SHA256 Style)
    // We combine the server's nonce with the user's OTP.
    // This proves the driver is physically there with the customer's code.
    const authProof = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${nonce}:${otp}:${amount}`
    );

    // 4. VERIFY & SETTLE
    // We send the proof back. The server calculates the same hash. 
    // If they match, the payment is considered 'Authentic'.
    const verifyResponse = await axios.post(`${API_URL}/api/payments/verify`, {
      transactionId,
      authProof,
      orderId
    });

    return verifyResponse.data;

  } catch (err: any) {
    // If it's a 401/403 (Invalid OTP), we don't queue it, we let the UI show the error.
    if (err.response && err.response.status < 500) {
      throw err; 
    }

    // --- OFFLINE / SYNC QUEUE ---
    // If the server is down or network is gone, we queue a 'Verification Retry'
    console.error("Payment Bridge failed, queuing for background sync...");
    
    await enqueueAction("PAYMENT_VERIFY_RETRY", {
      orderId,
      amount,
      timestamp: new Date().toISOString(),
      error: err?.message || "Connection lost during handshake"
    });

    // Re-throw so DispensingScreen knows to trigger the 'PAYMENT_PENDING' alert
    throw err;
  }
};