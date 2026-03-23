import * as Print from "expo-print";
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

// 1. Upgraded Interface to include Compliance Data
export type InvoiceData = {
  orderNumber: string;
  customerName: string;
  area: string;
  vehicleReg: string;
  volume: number;
  total: number;
  rate: number;
  transactionId: string;
  // New Compliance Fields
  driverName: string;
  pumpId: string;
  otpVerified: string;
};

// 2. Dynamic Tax Math Utility
export const calculateInvoiceTotals = (volumeDispensed: number, ratePerLiter: number) => {
  const subtotal = volumeDispensed * ratePerLiter;
  const taxRate = 0.18; // 18% GST Example
  const taxAmount = subtotal * taxRate;
  const grandTotal = subtotal + taxAmount;
  
  return {
    totalAmount: subtotal.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    grandTotal: grandTotal.toFixed(2)
  };
};

export const generateInvoice = async (data: InvoiceData) => {
  const now = new Date().toLocaleString('en-IN');
  
  // Apply the math
  const { totalAmount, taxAmount, grandTotal } = calculateInvoiceTotals(data.volume, data.rate);

  const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body { font-family: -apple-system, Roboto, 'Segoe UI', sans-serif; color: #111827; padding: 24px; }
          .header { display:flex; justify-content:space-between; align-items:center; background:#4F46E5; color:#fff; padding:16px; border-radius:8px; }
          .logo { font-weight:800; font-size:18px; }
          .section { margin-top:20px; border:1px solid #E5E7EB; border-radius:6px; padding:14px; }
          .title { margin:0 0 8px 0; font-size:16px; font-weight:800; color:#111827; text-transform: uppercase; }
          .row { display:flex; justify-content:space-between; margin-bottom:6px; font-size:14px; }
          table { width:100%; border-collapse: collapse; margin-top:10px; }
          th, td { border:1px solid #E5E7EB; padding:8px; text-align:left; }
          th { background:#F3F4F6; }
          .text-right { text-align: right; }
          .footer { margin-top:16px; font-size:12px; color:#6B7280; }
          .badge { display:inline-block; background:#10B981; color:#fff; padding:4px 8px; border-radius:12px; font-size:12px; font-weight: bold; }
          .totals { width: 50%; float: right; margin-top: 15px; margin-bottom: 20px;}
          .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;}
          .grand-total { border-top: 2px solid #111827; padding-top: 8px; margin-top: 8px; font-weight: 800; font-size: 18px; }
          .clearfix::after { content: ""; clear: both; display: table; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">SmartFuel Logistics</div>
            <div>Tax Invoice / Proof of Delivery</div>
          </div>
          <div style="text-align: right; font-size: 24px; font-weight: bold;">
            SF
          </div>
        </div>

        <div class="section">
          <div class="title">Billed To</div>
          <div class="row"><span>Customer:</span><span style="font-weight:600;">${data.customerName}</span></div>
          <div class="row"><span>Area/Location:</span><span>${data.area}</span></div>
          <div class="row"><span>Order #:</span><span style="font-weight:600;">${data.orderNumber}</span></div>
        </div>

        <div class="section" style="background:#F9FAFB;">
          <div class="title" style="color:#4B5563;">Delivery Verification</div>
          <div class="row"><span>Driver:</span><span>${data.driverName}</span></div>
          <div class="row"><span>Vehicle Reg:</span><span>${data.vehicleReg}</span></div>
          <div class="row"><span>Hardware ID:</span><span>${data.pumpId}</span></div>
          <div class="row"><span>Security Check:</span><span style="color:#10B981; font-weight:bold;">✓ OTP ${data.otpVerified}</span></div>
        </div>

        <div class="section clearfix">
          <div class="title">Itemized Billing</div>
          <table>
            <tr>
              <th>Description</th>
              <th class="text-right">Quantity (L)</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Total</th>
            </tr>
            <tr>
              <td>High-Speed Diesel (HSD)</td>
              <td class="text-right">${data.volume.toFixed(2)}</td>
              <td class="text-right">₹ ${data.rate.toFixed(2)}</td>
              <td class="text-right">₹ ${totalAmount}</td>
            </tr>
          </table>

          <div class="totals">
            <div class="total-row">
              <span style="color: #6B7280;">Subtotal:</span>
              <span>₹ ${totalAmount}</span>
            </div>
            <div class="total-row">
              <span style="color: #6B7280;">IGST (18% est.):</span>
              <span>₹ ${taxAmount}</span>
            </div>
            <div class="total-row grand-total">
              <span>Grand Total:</span>
              <span>₹ ${grandTotal}</span>
            </div>
          </div>
        </div>

        <div class="section" style="clear: both; margin-top: 30px;">
          <div class="row"><span>Transaction ID:</span><span style="font-weight:600; font-family: monospace;">${data.transactionId}</span></div>
          <div class="row"><span>Timestamp:</span><span>${now}</span></div>
          <div style="margin-top: 10px;">
             <span class="badge">Digitally Verified</span>
          </div>
        </div>
        
        <div class="footer">
            <p>This is a computer-generated tax invoice and does not require a physical signature.</p>
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  } catch (error) {
    console.error("PDF Gen Error:", error);
    throw new Error("Failed to generate PDF");
  }
};

// 3. Helper to immediately share the generated file
export const shareInvoice = async (uri: string, orderNumber: string) => {
    try {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `SmartFuel_Invoice_${orderNumber}.pdf`,
            UTI: 'com.adobe.pdf' // iOS specific
          });
        } else {
          Alert.alert("Error", "Sharing is not available on this device.");
        }
    } catch (error) {
        console.error("Sharing failed", error);
        Alert.alert("Error", "Could not share the document.");
    }
}