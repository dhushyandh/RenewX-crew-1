/**
 * RenewX Showcase Orders & Data Models (Web)
 * Features:
 * - Dynamic localization to the logged-in user's short address (e.g., "Koramangala, Bengaluru")
 * - Authentic RenewX Dispatch Hubs for the "FROM" telemetry (e.g., "RenewX Hub, Bengaluru")
 * - Full normalization helper from backend MongoDB/Supabase orders to rich ShippingOrder models
 */

export interface ShowcaseOrder {
  id: string;
  trackingId: string;
  productName: string;
  productSubtitle: string;
  productImage: string;
  price: number;
  total: number;
  quantity: number;
  status: 'transit' | 'process' | 'delivered' | 'cancelled';
  statusRaw: 'shipped' | 'processing' | 'delivered' | 'out_for_delivery' | 'pending' | 'cancelled';
  statusLabel: string;
  etaText: string;
  activeStepIndex: number; // 0: Placed, 1: Processed, 2: Transit, 3: Delivered
  fromHub: {
    title: string;
    date: string;
    hubCode: string;
  };
  toDestination: {
    recipientOrCity: string;
    dateText: string;
    fullAddress: string;
    pincode: string;
  };
  courier: {
    name: string;
    waybill: string;
    phone?: string;
    trackingUrl?: string;
  };
  customerInfo: {
    name: string;
    phone: string;
    email: string;
    address: string;
    pincode: string;
  };
  paymentMethod: 'razorpay' | 'cod';
  paymentStatus: 'paid' | 'pending';
  warrantyMonths: number;
  createdAt: string;
}

/**
 * Converts any user address string, city, and state into a short readable destination
 * e.g., "Koramangala, Bengaluru", "Indiranagar, Bengaluru", "Bandra West, Mumbai"
 */
export function formatShortAddress(
  address?: string | null,
  city?: string | null,
  state?: string | null
): string {
  const rawCity = city?.trim();
  const rawState = state?.trim();

  if (address && address.trim()) {
    // Clean out pincodes (e.g., 560034)
    let cleaned = address.replace(/\b\d{3}\s?\d{3}\b/g, '').trim();
    // Clean out country suffixes
    cleaned = cleaned.replace(/,\s*(India|IN)\s*$/i, '').trim();

    const statesRegex =
      /^(karnataka|maharashtra|tamil nadu|delhi|telangana|andhra pradesh|kerala|gujarat|rajasthan|uttar pradesh|west bengal|haryana|punjab)$/i;

    const parts = cleaned
      .split(',')
      .map((p) => p.trim())
      .filter((p) => {
        if (!p) return false;
        if (statesRegex.test(p)) return false;
        if (/^(flat|apt|apartment|house|h\.no|door|plot|villa|no\.?|#)\s*[\w\d\s\-/]+/i.test(p)) {
          return false;
        }
        return true;
      });

    if (parts.length >= 2) {
      const area = parts[parts.length - 2].replace(/\s+(sector|phase|block|stage)\s*\d+/i, '').trim();
      const detectedCity = parts[parts.length - 1];
      if (area && detectedCity && area.toLowerCase() !== detectedCity.toLowerCase()) {
        return `${area}, ${detectedCity}`;
      }
      return detectedCity || area;
    } else if (parts.length === 1) {
      if (rawCity && parts[0].toLowerCase() !== rawCity.toLowerCase()) {
        return `${parts[0]}, ${rawCity}`;
      }
      return parts[0];
    }
  }

  if (rawCity && rawState) {
    return `${rawCity}, ${rawState}`;
  }
  if (rawCity) {
    return rawCity;
  }

  return 'Koramangala, Bengaluru';
}

/**
 * Baseline showcase orders with verified RenewX Indian Hubs and authentic product visuals
 */
export const SHOWCASE_ORDERS: ShowcaseOrder[] = [
  {
    id: 'ord_demo_001',
    trackingId: 'D314315783',
    productName: 'Studio Headphones',
    productSubtitle: 'Matte Black • Active Noise Cancellation • 40h Battery',
    productImage: '/images/products/headphones.png',
    price: 18999,
    total: 18999,
    quantity: 1,
    status: 'transit',
    statusRaw: 'shipped',
    statusLabel: 'TRANSIT',
    etaText: '4h Away',
    activeStepIndex: 2,
    fromHub: {
      title: 'RenewX Hub, Bengaluru',
      date: '05 Nov 26',
      hubCode: 'RNX-BLR-01',
    },
    toDestination: {
      recipientOrCity: 'Koramangala, Bengaluru',
      dateText: 'Estimated Today, 4 PM',
      fullAddress: '42, 5th Cross, Koramangala 4th Block, Bengaluru, Karnataka',
      pincode: '560034',
    },
    courier: {
      name: 'Delhivery Air Express',
      waybill: 'D314315783',
      phone: '+91 98765 43210',
      trackingUrl: 'https://www.delhivery.com/track/package/D314315783',
    },
    customerInfo: {
      name: 'Aarav Sharma',
      phone: '+91 98451 23456',
      email: 'aarav.sharma@example.com',
      address: '42, 5th Cross, Koramangala 4th Block, Bengaluru, Karnataka',
      pincode: '560034',
    },
    paymentMethod: 'razorpay',
    paymentStatus: 'paid',
    warrantyMonths: 6,
    createdAt: '2026-11-05T08:30:00.000Z',
  },
  {
    id: 'ord_demo_002',
    trackingId: 'D514315784',
    productName: 'Apple Watch Ultra',
    productSubtitle: 'Titanium Case 49mm • Orange Ocean Band • GPS + Cellular',
    productImage: '/images/products/smartwatch.png',
    price: 52999,
    total: 52999,
    quantity: 1,
    status: 'process',
    statusRaw: 'processing',
    statusLabel: 'PROCESS',
    etaText: '2d Away',
    activeStepIndex: 1,
    fromHub: {
      title: 'RenewX Hub, Mumbai',
      date: '06 Nov 26',
      hubCode: 'RNX-BOM-02',
    },
    toDestination: {
      recipientOrCity: 'Indiranagar, Bengaluru',
      dateText: 'Estimated 09 Nov 26',
      fullAddress: '100ft Road, 12th Main, Indiranagar, Bengaluru, Karnataka',
      pincode: '560038',
    },
    courier: {
      name: 'Blue Dart Surface',
      waybill: 'D514315784',
      phone: '+91 98220 12345',
      trackingUrl: 'https://www.bluedart.com',
    },
    customerInfo: {
      name: 'Rohan Verma',
      phone: '+91 98452 34567',
      email: 'rohan.verma@example.com',
      address: '100ft Road, 12th Main, Indiranagar, Bengaluru, Karnataka',
      pincode: '560038',
    },
    paymentMethod: 'razorpay',
    paymentStatus: 'paid',
    warrantyMonths: 6,
    createdAt: '2026-11-06T11:45:00.000Z',
  },
  {
    id: 'ord_demo_003',
    trackingId: 'D314315785',
    productName: 'MacBook Pro 14',
    productSubtitle: 'Space Black • Apple M3 Pro • 18GB Unified RAM • 512GB SSD',
    productImage: '/images/products/mac.png',
    price: 144999,
    total: 144999,
    quantity: 1,
    status: 'delivered',
    statusRaw: 'delivered',
    statusLabel: 'DELIVERED',
    etaText: 'Delivered',
    activeStepIndex: 3,
    fromHub: {
      title: 'RenewX Hub, Bengaluru',
      date: '01 Nov 26',
      hubCode: 'RNX-BLR-01',
    },
    toDestination: {
      recipientOrCity: 'HSR Layout, Bengaluru',
      dateText: 'Delivered 04 Nov 26',
      fullAddress: 'Sector 1, 19th Main Road, HSR Layout, Bengaluru, Karnataka',
      pincode: '560102',
    },
    courier: {
      name: 'Blue Dart Apex Express',
      waybill: 'D314315785',
      phone: '+91 98110 54321',
      trackingUrl: 'https://www.bluedart.com',
    },
    customerInfo: {
      name: 'Sneha Patel',
      phone: '+91 98453 45678',
      email: 'sneha.patel@example.com',
      address: 'Sector 1, 19th Main Road, HSR Layout, Bengaluru, Karnataka',
      pincode: '560102',
    },
    paymentMethod: 'razorpay',
    paymentStatus: 'paid',
    warrantyMonths: 12,
    createdAt: '2026-11-01T09:15:00.000Z',
  },
  {
    id: 'ord_demo_004',
    trackingId: 'D892104192',
    productName: 'iPhone 15 Pro Max',
    productSubtitle: 'Natural Titanium • 256GB • Grade A+ Super Retina XDR',
    productImage: '/images/products/smartphone.png',
    price: 94999,
    total: 94999,
    quantity: 1,
    status: 'transit',
    statusRaw: 'out_for_delivery',
    statusLabel: 'TRANSIT',
    etaText: 'Today, 2 PM',
    activeStepIndex: 2,
    fromHub: {
      title: 'RenewX Hub, Delhi NCR',
      date: '05 Nov 26',
      hubCode: 'RNX-DEL-01',
    },
    toDestination: {
      recipientOrCity: 'Indiranagar, Bengaluru',
      dateText: 'Arriving Today',
      fullAddress: '100ft Road, 12th Main, Indiranagar, Bengaluru',
      pincode: '560038',
    },
    courier: {
      name: 'Shadowfax Same-Day',
      waybill: 'D892104192',
      phone: '+91 98450 88888',
      trackingUrl: 'https://www.shadowfax.in',
    },
    customerInfo: {
      name: 'Rohan Sharma',
      phone: '+91 98450 88888',
      email: 'rohan.sharma@example.com',
      address: '100ft Road, 12th Main, Indiranagar, Bengaluru',
      pincode: '560038',
    },
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    warrantyMonths: 6,
    createdAt: '2026-11-05T14:20:00.000Z',
  },
  {
    id: 'ord_demo_005',
    trackingId: 'D741209381',
    productName: 'iPad Pro 12.9" M2',
    productSubtitle: 'Space Gray • Liquid Retina XDR • 128GB Wi-Fi',
    productImage: '/images/products/tablets.png',
    price: 78999,
    total: 78999,
    quantity: 1,
    status: 'process',
    statusRaw: 'processing',
    statusLabel: 'PROCESS',
    etaText: '3d Away',
    activeStepIndex: 1,
    fromHub: {
      title: 'RenewX Hub, Bengaluru',
      date: '06 Nov 26',
      hubCode: 'RNX-BLR-02',
    },
    toDestination: {
      recipientOrCity: 'Bandra West, Mumbai',
      dateText: 'Estimated 10 Nov 26',
      fullAddress: 'Pali Hill, Building 8B, Bandra West, Mumbai',
      pincode: '400050',
    },
    courier: {
      name: 'Delhivery Surface Plus',
      waybill: 'D741209381',
      phone: '+91 98200 99999',
      trackingUrl: 'https://www.delhivery.com',
    },
    customerInfo: {
      name: 'Priya Mehta',
      phone: '+91 98200 99999',
      email: 'priya.mehta@example.com',
      address: 'Pali Hill, Building 8B, Bandra West, Mumbai',
      pincode: '400050',
    },
    paymentMethod: 'razorpay',
    paymentStatus: 'paid',
    warrantyMonths: 6,
    createdAt: '2026-11-06T16:00:00.000Z',
  },
];

/**
 * Returns showcase orders localized to the user's short address if logged in
 */
export function getLocalizedShowcaseOrders(user?: any | null): ShowcaseOrder[] {
  if (!user || (!user.address && !user.city)) {
    return SHOWCASE_ORDERS;
  }

  const shortAddr = formatShortAddress(user.address, user.city, user.state);
  const fullAddr = user.address?.trim() || shortAddr;
  const pincode = user.pincode?.trim() || '';
  const customerName = user.full_name?.trim() || user.name?.trim() || 'You';

  return SHOWCASE_ORDERS.map((order) => ({
    ...order,
    toDestination: {
      ...order.toDestination,
      recipientOrCity: shortAddr || order.toDestination.recipientOrCity,
      fullAddress: fullAddr || order.toDestination.fullAddress,
      pincode: pincode || order.toDestination.pincode,
    },
    customerInfo: {
      ...order.customerInfo,
      name: customerName || order.customerInfo.name,
      address: fullAddr || order.customerInfo.address,
      pincode: pincode || order.customerInfo.pincode,
      phone: user.phone || order.customerInfo.phone,
      email: user.email || order.customerInfo.email,
    },
  }));
}

/**
 * Normalizes any real database order into the ShippingOrder format
 */
export function normalizeOrderToShipping(
  rawOrder: any,
  indexFallback: number = 0,
  currentUser?: any | null
): ShowcaseOrder {
  const firstItem = rawOrder.items?.[0] || rawOrder.order_items?.[0] || {};
  const itemCount = rawOrder.items?.length || rawOrder.order_items?.length || 1;
  const rawStatus = (rawOrder.status || 'pending').toLowerCase();
  const statusRaw: ShowcaseOrder['statusRaw'] =
    rawStatus === 'shipped' ||
    rawStatus === 'processing' ||
    rawStatus === 'delivered' ||
    rawStatus === 'out_for_delivery' ||
    rawStatus === 'cancelled'
      ? rawStatus
      : 'pending';

  let status: 'transit' | 'process' | 'delivered' | 'cancelled' = 'process';
  let statusLabel = 'PROCESS';
  let activeStepIndex = 1;
  let etaText = '2d Away';

  if (rawStatus === 'shipped' || rawStatus === 'out_for_delivery') {
    status = 'transit';
    statusLabel = 'TRANSIT';
    activeStepIndex = 2;
    etaText = rawStatus === 'out_for_delivery' ? 'Arriving Today' : 'In Transit (2d)';
  } else if (rawStatus === 'delivered') {
    status = 'delivered';
    statusLabel = 'DELIVERED';
    activeStepIndex = 3;
    etaText = 'Delivered';
  } else if (rawStatus === 'cancelled') {
    status = 'cancelled';
    statusLabel = 'CANCELLED';
    activeStepIndex = 0;
    etaText = 'Cancelled';
  } else {
    // pending or processing
    status = 'process';
    statusLabel = 'PROCESS';
    activeStepIndex = 1;
    etaText = 'Inspection & Packing';
  }

  const idClean = (rawOrder.id || rawOrder._id || `RNX-${1000 + indexFallback}`).toString();
  const trackingNumber =
    rawOrder.tracking_number ||
    rawOrder.trackingNumber ||
    rawOrder.tracking_id ||
    `D${idClean.replace(/[^0-9]/g, '').slice(-9) || '31431578' + indexFallback}`;

  const createdDate = rawOrder.created_at ? new Date(rawOrder.created_at) : new Date();
  const fromDateStr = createdDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });

  const estDate = new Date(createdDate.getTime() + 3 * 24 * 60 * 60 * 1000);
  const toDateStr =
    status === 'delivered'
      ? `Delivered ${estDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}`
      : `Estimated ${estDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}`;

  const customerName =
    rawOrder.customer_info?.name ||
    rawOrder.customer?.name ||
    rawOrder.shipping_address?.name ||
    rawOrder.customer_name ||
    currentUser?.full_name ||
    'Customer';

  const rawAddress =
    rawOrder.customer_info?.address ||
    rawOrder.shipping_address?.address ||
    rawOrder.shipping_address ||
    rawOrder.address ||
    currentUser?.address ||
    '';

  const rawCity =
    rawOrder.customer_info?.city ||
    rawOrder.shipping_address?.city ||
    rawOrder.city ||
    currentUser?.city ||
    '';

  const rawState =
    rawOrder.customer_info?.state ||
    rawOrder.shipping_address?.state ||
    rawOrder.state ||
    currentUser?.state ||
    '';

  const shortAddress = formatShortAddress(rawAddress, rawCity, rawState);
  const fullAddress =
    typeof rawAddress === 'string' && rawAddress.trim()
      ? rawAddress
      : shortAddress || 'Standard Delivery Address';

  const rawPin =
    rawOrder.customer_info?.pincode ||
    rawOrder.shipping_address?.pincode ||
    rawOrder.pincode ||
    currentUser?.pincode ||
    '';

  // Determine fallback image based on name
  let defaultImg = '/images/products/smartphone.png';
  const pName = (
    firstItem.product_name ||
    firstItem.name ||
    rawOrder.product_name ||
    'Certified Device'
  ).toLowerCase();
  if (pName.includes('headphone') || pName.includes('audio') || pName.includes('earbud'))
    defaultImg = '/images/products/headphones.png';
  else if (pName.includes('watch')) defaultImg = '/images/products/smartwatch.png';
  else if (pName.includes('mac') || pName.includes('laptop')) defaultImg = '/images/products/mac.png';
  else if (pName.includes('pad') || pName.includes('tablet')) defaultImg = '/images/products/tablets.png';

  return {
    id: idClean,
    trackingId: trackingNumber,
    productName:
      firstItem.product_name ||
      firstItem.name ||
      rawOrder.product_name ||
      'Certified Renewed Device',
    productSubtitle:
      itemCount > 1
        ? `Includes ${itemCount} items • Serial Certified`
        : 'Quality Tested • 6-Month Warranty',
    productImage: firstItem.image_url || firstItem.image || rawOrder.image || defaultImg,
    price: Number(firstItem.price || rawOrder.total || 0),
    total: Number(rawOrder.total || rawOrder.subtotal || rawOrder.total_amount || 0),
    quantity: itemCount,
    status,
    statusRaw,
    statusLabel,
    etaText,
    activeStepIndex,
    fromHub: {
      title: 'RenewX Hub, Bengaluru',
      date: fromDateStr,
      hubCode: 'RNX-BLR-01',
    },
    toDestination: {
      recipientOrCity: shortAddress,
      dateText: toDateStr,
      fullAddress,
      pincode: rawPin,
    },
    courier: {
      name: rawOrder.courier || rawOrder.tracking?.courier || 'Blue Dart Express',
      waybill: trackingNumber,
      phone: rawOrder.courier_phone || rawOrder.tracking?.courier_phone || '+91 98450 88888',
      trackingUrl: `https://www.delhivery.com/track/package/${trackingNumber}`,
    },
    customerInfo: {
      name: customerName,
      phone: rawOrder.customer_info?.phone || rawOrder.phone || currentUser?.phone || '',
      email: rawOrder.customer_info?.email || rawOrder.email || currentUser?.email || '',
      address: fullAddress,
      pincode: rawPin,
    },
    paymentMethod:
      (rawOrder.payment_method || rawOrder.payment?.method) === 'cod' ? 'cod' : 'razorpay',
    paymentStatus:
      (rawOrder.payment_status || rawOrder.payment?.status) === 'paid' ? 'paid' : 'pending',
    warrantyMonths: 6,
    createdAt: createdDate.toISOString(),
  };
}
