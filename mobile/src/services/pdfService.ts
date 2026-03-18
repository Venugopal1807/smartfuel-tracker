import * as Print from "expo-print";

type InvoiceData = {
  orderNumber: string;
  customerName: string;
  area: string;
  vehicleReg: string;
  volume: number;
  total: number;
  rate: number;
  transactionId: string;
};

export const generateInvoice = async (data: InvoiceData) => {
  const now = new Date().toISOString();
  const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body { font-family: -apple-system, Roboto, 'Segoe UI', sans-serif; color: #111827; padding: 24px; }
          .header { display:flex; justify-content:space-between; align-items:center; background:#4F46E5; color:#fff; padding:16px; border-radius:8px; }
          .logo { font-weight:800; font-size:18px; }
          .section { margin-top:20px; border:1px solid #E5E7EB; border-radius:6px; padding:14px; }
          .title { margin:0 0 8px 0; font-size:16px; font-weight:800; color:#111827; }
          .row { display:flex; justify-content:space-between; margin-bottom:6px; font-size:14px; }
          table { width:100%; border-collapse: collapse; margin-top:10px; }
          th, td { border:1px solid #E5E7EB; padding:8px; text-align:left; }
          th { background:#F3F4F6; }
          .footer { margin-top:16px; font-size:12px; color:#6B7280; }
          .badge { display:inline-block; background:#4F46E5; color:#fff; padding:4px 8px; border-radius:12px; font-size:12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">SmartFuel Logistics</div>
            <div>Proof of Delivery</div>
          </div>
          <div>Logo</div>
        </div>

        <div class="section">
          <div class="title">Company</div>
          <div class="row"><span>Apollo Logistics</span><span>Order #: ${data.orderNumber}</span></div>
        </div>

        <div class="section">
          <div class="title">Bill To</div>
          <div class="row"><span>Customer</span><span>${data.customerName}</span></div>
          <div class="row"><span>Area/Location</span><span>${data.area}</span></div>
        </div>

        <div class="section">
          <div class="title">Vehicle Details</div>
          <div class="row"><span>Telangana Vehicle</span><span>${data.vehicleReg}</span></div>
        </div>

        <div class="section">
          <div class="title">Itemized</div>
          <table>
            <tr>
              <th>Description</th><th>Quantity (L)</th><th>Unit Price</th><th>Total</th>
            </tr>
            <tr>
              <td>High-Speed Diesel (HSD)</td>
              <td>${data.volume.toFixed(2)}</td>
              <td>₹ ${data.rate.toFixed(2)}</td>
              <td>₹ ${data.total.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <div class="section">
          <div class="row"><span>Transaction ID</span><span>${data.transactionId}</span></div>
          <div class="row"><span>Timestamp</span><span>${now}</span></div>
          <div class="badge">Digitally Verified</div>
        </div>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  return uri;
};
