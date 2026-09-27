import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getApiBaseUrl } from './api';

export interface InvoiceOrderData {
  id: string;
  _id?: string;
  order_number?: string;
  subtotal?: number;
  total?: number;
  savings?: number;
  status?: string;
  payment_status?: string;
  payment_method?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  tracking_number?: string;
  courier?: string;
  created_at?: string;
  createdAt?: string;
  estimated_delivery?: string;
  customer_info?: {
    name?: string;
    phone?: string;
    address?: string;
    pincode?: string;
    email?: string;
  };
  shipping_address?: {
    fullName?: string;
    phone?: string;
    addressLine1?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  order_items?: Array<{
    product_id?: string;
    product_name?: string;
    name?: string;
    quantity?: number;
    qty?: number;
    price?: number;
    warranty?: string;
  }>;
  items?: Array<{
    product_id?: string;
    product_name?: string;
    name?: string;
    quantity?: number;
    qty?: number;
    price?: number;
    warranty?: string;
  }>;
  [key: string]: any;
}

export function generateInvoiceHtml(order: InvoiceOrderData, currentUser?: any): string {
  const orderId = String(order.order_number || order.id || order._id || 'RX-0000').toUpperCase();
  const rawDate = order.created_at || order.createdAt || new Date().toISOString();
  const orderDate = new Date(rawDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const customerName =
    order.customer_info?.name ||
    order.shipping_address?.fullName ||
    currentUser?.full_name ||
    'Valued Customer';

  const customerPhone =
    order.customer_info?.phone ||
    order.shipping_address?.phone ||
    currentUser?.phone ||
    'Not provided';

  const customerEmail =
    order.customer_info?.email ||
    currentUser?.email ||
    '';

  const address =
    order.customer_info?.address ||
    [order.shipping_address?.addressLine1, order.shipping_address?.city, order.shipping_address?.state]
      .filter(Boolean)
      .join(', ') ||
    'Standard Delivery Address';

  const pincode = order.customer_info?.pincode || order.shipping_address?.pincode || '';

  const rawItems = order.order_items || order.items || [];
  const items = rawItems.length > 0 ? rawItems : [
    {
      product_name: order.product_name || order.productName || 'Certified RenewX Device',
      quantity: 1,
      price: order.total || order.subtotal || 0,
    }
  ];

  const subtotal = Number(order.subtotal || order.total || 0);
  const total = Number(order.total || order.subtotal || 0);
  const savings = Number(order.savings || 0);
  const paymentMethod = (order.payment_method || 'Online Payment').toUpperCase();
  const paymentStatus = (order.payment_status || 'Paid').toUpperCase();
  const status = (order.status || 'Confirmed').toUpperCase();

  const itemsHtml = items.map((item: any, idx: number) => {
    const itemName = item.product_name || item.name || 'Certified RenewX Tech';
    const quantity = Number(item.quantity || item.qty || 1);
    const unitPrice = Number(item.price || (total / (items.length || 1)));
    const lineTotal = unitPrice * quantity;

    return `
      <tr>
        <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; text-align: center;">${idx + 1}</td>
        <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 700; color: #0f172a;">
          ${itemName}
          <div style="font-size: 11px; font-weight: 500; color: #16a34a; margin-top: 3px;">
            ✓ 6-Month RenewX Certified Warranty Included
          </div>
        </td>
        <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: center; color: #334155;">${quantity}</td>
        <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right; color: #334155;">₹${unitPrice.toLocaleString('en-IN')}</td>
        <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 700; text-align: right; color: #0f172a;">₹${lineTotal.toLocaleString('en-IN')}</td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>RenewX Tax Invoice - #${orderId}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 32px 24px;
      color: #0f172a;
      background: #f8fafc;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 18px;
      border: 1px solid #e2e8f0;
      padding: 40px 36px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 24px;
      margin-bottom: 28px;
    }
    .brand-title {
      font-size: 28px;
      font-weight: 900;
      letter-spacing: -0.8px;
      color: #0f172a;
      margin: 0;
    }
    .brand-title span { color: #f59e0b; }
    .brand-subtitle {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #64748b;
      margin-top: 4px;
    }
    .badge-tax {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1px;
      padding: 5px 12px;
      border-radius: 6px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .invoice-meta {
      text-align: right;
    }
    .invoice-id {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .invoice-date {
      font-size: 13px;
      color: #64748b;
      margin-top: 4px;
    }
    .grid-parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 28px;
    }
    .party-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-bottom: 8px;
    }
    .party-name {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .party-detail {
      font-size: 13px;
      line-height: 1.5;
      color: #475569;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 28px;
    }
    th {
      background: #f1f5f9;
      padding: 12px 14px;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #334155;
      border-bottom: 2px solid #cbd5e1;
    }
    .totals-wrap {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 32px;
    }
    .totals-box {
      width: 320px;
      background: #fafafa;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px 20px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: #475569;
      margin-bottom: 10px;
    }
    .totals-row.grand {
      border-top: 2px solid #0f172a;
      padding-top: 10px;
      margin-top: 10px;
      font-size: 17px;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 0;
    }
    .guarantee-box {
      display: flex;
      align-items: center;
      gap: 14px;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 28px;
    }
    .guarantee-badge {
      background: #10b981;
      color: #ffffff;
      width: 38px;
      height: 38px;
      border-radius: 19px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 900;
      flex-shrink: 0;
    }
    .guarantee-title {
      font-size: 14px;
      font-weight: 800;
      color: #065f46;
    }
    .guarantee-sub {
      font-size: 12px;
      color: #047857;
      margin-top: 2px;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.6;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .invoice-card { box-shadow: none; border: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <!-- Header -->
    <div class="header-row">
      <div>
        <h1 class="brand-title">Renew<span>X</span></h1>
        <div class="brand-subtitle">Certified Pre-Owned Tech Crew</div>
      </div>
      <div class="invoice-meta">
        <div class="badge-tax">Tax Invoice / Bill of Supply</div>
        <div class="invoice-id">Invoice #${orderId}</div>
        <div class="invoice-date">Date: ${orderDate}</div>
      </div>
    </div>

    <!-- Parties Grid -->
    <div class="grid-parties">
      <div>
        <div class="party-title">Sold By (Seller)</div>
        <div class="party-name">RenewX Crew India Pvt Ltd</div>
        <div class="party-detail">
          Certified Refurbished Technology Hub<br />
          Email: support@renewx.in<br />
          Web: https://renewx.in<br />
          GSTIN: 33AAACR2938L1Z8
        </div>
      </div>
      <div>
        <div class="party-title">Billed & Shipped To (Customer)</div>
        <div class="party-name">${customerName}</div>
        <div class="party-detail">
          ${address}${pincode ? ` - ${pincode}` : ''}<br />
          Phone: ${customerPhone}<br />
          ${customerEmail ? `Email: ${customerEmail}<br />` : ''}
          Order Status: <strong>${status}</strong>
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <table>
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">#</th>
          <th style="text-align: left;">Item Description & Coverage</th>
          <th style="width: 60px; text-align: center;">Qty</th>
          <th style="width: 120px; text-align: right;">Unit Price</th>
          <th style="width: 120px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals-wrap">
      <div class="totals-box">
        <div class="totals-row">
          <span>Subtotal</span>
          <span>₹${subtotal.toLocaleString('en-IN')}</span>
        </div>
        <div class="totals-row">
          <span>Certified Express Shipping</span>
          <span style="color: #16a34a; font-weight: 700;">FREE</span>
        </div>
        ${savings > 0 ? `
        <div class="totals-row">
          <span>Special Savings</span>
          <span style="color: #16a34a; font-weight: 700;">-₹${savings.toLocaleString('en-IN')}</span>
        </div>` : ''}
        <div class="totals-row">
          <span>Payment Method</span>
          <span style="font-weight: 600;">${paymentMethod}</span>
        </div>
        <div class="totals-row">
          <span>Payment Status</span>
          <span style="color: #16a34a; font-weight: 700;">${paymentStatus}</span>
        </div>
        <div class="totals-row grand">
          <span>Total Paid</span>
          <span>₹${total.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>

    <!-- Guarantee Callout -->
    <div class="guarantee-box">
      <div class="guarantee-badge">✓</div>
      <div>
        <div class="guarantee-title">RenewX 6-Month Comprehensive Warranty Active</div>
        <div class="guarantee-sub">
          This certified unit passed our multi-point rigorous hardware diagnostics. Keep this tax invoice as valid proof of warranty.
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      Questions about your order or warranty? Reach out at <strong>support@renewx.in</strong> or through the RenewX app.<br />
      Thank you for championing sustainable, circular electronics with RenewX Crew.
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Downloads or shares the order invoice as a true PDF file (no print dialog).
 */
export async function downloadOrderInvoicePdf(order: InvoiceOrderData, currentUser?: any): Promise<{ success: boolean; uri?: string }> {
  try {
    const orderId = String(order.order_number || order.id || order._id || 'order').replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `RenewX_Tax_Invoice_${orderId}.pdf`;

    if (Platform.OS === 'web') {
      // 1. Primary: Download the official server-generated PDF directly to Downloads folder
      const targetId = order.id || order._id;
      if (targetId && typeof window !== 'undefined') {
        try {
          const token = await AsyncStorage.getItem('@renewx_auth_token');
          const apiUrl = getApiBaseUrl();
          const pdfUrl = `${apiUrl}/orders/${targetId}/invoice/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;

          const res = await fetch(pdfUrl, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });

          if (res.ok) {
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.style.display = 'none';
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
            return { success: true };
          }
        } catch (apiErr) {
          console.warn('[InvoiceService] Direct API PDF download failed, using client-side generator:', apiErr);
        }
      }

      // 2. Client-side Fallback: Convert invoice HTML into PDF and download directly via html2pdf without print dialog
      if (typeof document !== 'undefined') {
        const html = generateInvoiceHtml(order, currentUser);
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = '800px';
        container.style.background = '#ffffff';
        container.innerHTML = html;
        document.body.appendChild(container);

        try {
          const html2pdfModule = await import('html2pdf.js');
          const html2pdf = (html2pdfModule as any).default || html2pdfModule;
          const opt = {
            margin: [10, 10, 10, 10],
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          };
          await html2pdf().set(opt).from(container).save();
          return { success: true };
        } finally {
          document.body.removeChild(container);
        }
      }

      return { success: true };
    }

    // On mobile devices (Android / iOS):
    // 1. Generate real PDF file on the device filesystem
    const html = generateInvoiceHtml(order, currentUser);
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // 2. Share or save the PDF file via native intent sheet (Save to Files / Drive / Downloads)
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Download Invoice #${orderId}.pdf`,
      });
    }

    return { success: true, uri };
  } catch (err: any) {
    console.error('[InvoiceService] Failed to download invoice PDF:', err);
    throw err;
  }
}
