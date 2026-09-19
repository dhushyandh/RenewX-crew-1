export default function TrackScreen() {
  const insets = useSafeAreaInsets();
  const [searchId, setSearchId] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderTracking | null>(null);
  const [liveOrdersList, setLiveOrdersList] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const live = await api.orders.getAll();
        if (live && live.length > 0) {
          setLiveOrdersList(live);
          const first = live[0];
          const itemName = first.order_items?.[0]?.product_name || 'Certified Pre-Owned Hardware';
          const trackingNum = first.tracking_number || `BLR${first.id.slice(0, 8).toUpperCase()}`;
          const courierName = first.courier || 'BlueDart Air Express';
          setSelectedOrder({
            id: `#${first.id.slice(0, 8)}`,
            item: itemName,
            price: `₹${Number(first.total || first.subtotal || 49999).toLocaleString('en-IN')}`,
            status: (first.status === 'delivered' ? 'Delivered' : first.status === 'shipped' ? 'In Transit' : 'Processing') as any,
            estimatedDelivery: '2-3 Business Days',
            courier: courierName,
            trackingNumber: trackingNum,
            steps: [
              { title: 'Order Confirmed', description: 'Payment verified & order booked', time: new Date(first.created_at).toLocaleDateString(), completed: true },
              { title: 'Quality Diagnostic Passed', description: '52-point hardware and battery verification passed', time: 'Verified', completed: true },
              { title: 'Shipped from Hub', description: `Dispatched via ${courierName}`, time: 'Active', completed: first.status !== 'pending' },
              { title: 'Out for Delivery', description: 'Courier partner out for doorstep delivery', time: 'Estimated', completed: first.status === 'delivered' || first.status === 'out_for_delivery', current: first.status === 'shipped' },
              { title: 'Delivered', description: 'Package delivered with 1-Year Warranty Certificate', time: 'Pending', completed: first.status === 'delivered' },
            ],
          });
        }
      } catch (err) {
        console.warn('[TrackScreen] Failed to load live orders:', err);
        setLiveOrdersList([]);
        setSelectedOrder(null);
      }
    })();
  }, []);

  const handleSearch = () => {
    if (!searchId.trim()) return;
    const q = searchId.trim().toLowerCase();

    // Check live orders first
    const matchedLive = liveOrdersList.find(
      (o) => o.id?.toLowerCase().includes(q) || o.tracking_number?.toLowerCase().includes(q)
    );
    if (matchedLive) {
      const itemName = matchedLive.order_items?.[0]?.product_name || 'Certified Pre-Owned Hardware';
      const courierName = matchedLive.courier || 'BlueDart Air Express';
      setSelectedOrder({
        id: `#${matchedLive.id.slice(0, 8)}`,
        item: itemName,
        price: `₹${Number(matchedLive.total || matchedLive.subtotal || 49999).toLocaleString('en-IN')}`,
        status: (matchedLive.status === 'delivered' ? 'Delivered' : matchedLive.status === 'shipped' ? 'In Transit' : 'Processing') as any,
        estimatedDelivery: '2-3 Business Days',
        courier: courierName,
        trackingNumber: matchedLive.tracking_number || `BLR${matchedLive.id.slice(0, 8).toUpperCase()}`,
        steps: [
          { title: 'Order Confirmed', description: 'Payment verified & order booked', time: new Date(matchedLive.created_at).toLocaleDateString(), completed: true },
          { title: 'Quality Diagnostic Passed', description: '52-point check verified', time: 'Verified', completed: true },
          { title: 'Shipped from Hub', description: `Dispatched via ${courierName}`, time: 'Active', completed: matchedLive.status !== 'pending' },
          { title: 'Out for Delivery', description: 'Agent assigned', time: 'En route', completed: matchedLive.status === 'delivered' || matchedLive.status === 'out_for_delivery', current: matchedLive.status === 'shipped' },
          { title: 'Delivered', description: 'Delivered with 1-Year Warranty', time: 'Pending', completed: matchedLive.status === 'delivered' },
        ],
      });
      return;
    }

    setSelectedOrder(null);
  };

  if (!selectedOrder) {
    return (
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Track Orders</Text>
        </View>
        <View style={styles.noOrdersState}>
          <Ionicons name="cube-outline" size={44} color="#94a3b8" />
          <Text style={styles.noOrdersTitle}>No orders yet</Text>
          <Text style={styles.noOrdersText}>
            Your confirmed orders will appear here with live delivery status.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Track Orders</Text>
          <View style={styles.liveTag}>
            <View style={styles.pulseDot} />
            <Text style={styles.liveTagText}>Live GPS</Text>
          </View>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: '#f1f5f9',
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 6,
            marginLeft: 'auto',
          }}>
            <Ionicons name="link-outline" size={11} color="#64748b" />
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#475569', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
              /track
            </Text>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>Real-time delivery updates & courier dispatch status</Text>
      </View>

      {/* Search Order Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#9ca3af" />
          <TextInput
            placeholder="Enter Order ID (e.g. RNW-98421)"
            placeholderTextColor="#9ca3af"
            value={searchId}
            onChangeText={setSearchId}
            style={styles.searchInput}
          />
          {searchId.length > 0 && (
            <TouchableOpacity onPress={() => setSearchId('')}>
              <Ionicons name="close-circle" size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Track</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
      >
        {/* Active Order Card */}
        <View style={styles.activeCard}>
          <View style={styles.activeCardHeader}>
            <View>
              <Text style={styles.orderIdText}>{selectedOrder.id}</Text>
              <Text style={styles.orderCourierText}>
                {selectedOrder.courier} • AWB: {selectedOrder.trackingNumber}
              </Text>
            </View>
            <View
              style={[
                styles.statusPill,
                selectedOrder.status === 'Delivered' ? styles.statusDelivered : styles.statusTransit,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  selectedOrder.status === 'Delivered'
                    ? styles.statusTextDelivered
                    : styles.statusTextTransit,
                ]}
              >
                {selectedOrder.status}
              </Text>
            </View>
          </View>

          <Text style={styles.orderItemTitle}>{selectedOrder.item}</Text>
          <Text style={styles.orderPriceText}>{selectedOrder.price}</Text>

          {/* Delivery ETA banner */}
          <View style={styles.etaBanner}>
            <Ionicons name="time-outline" size={18} color="#059669" />
            <View style={{ flex: 1 }}>
              <Text style={styles.etaTitle}>Estimated Delivery</Text>
              <Text style={styles.etaSub}>{selectedOrder.estimatedDelivery}</Text>
            </View>
            <TouchableOpacity
              style={styles.supportCallBtn}
              onPress={() => Linking.openURL('tel:+919876543210')}
            >
              <Ionicons name="call" size={14} color="#000000" />
              <Text style={styles.supportCallText}>Driver</Text>
            </TouchableOpacity>
          </View>

          {/* Stepper Timeline */}
          <View style={styles.timelineBox}>
            <Text style={styles.timelineHeading}>Delivery Milestones</Text>
            {selectedOrder.steps.map((step, index) => {
              const isLast = index === selectedOrder.steps.length - 1;
              return (
                <View key={step.title} style={styles.timelineRow}>
                  <View style={styles.timelineColLeft}>
                    <View
                      style={[
                        styles.timelineDot,
                        step.completed && styles.timelineDotCompleted,
                        step.current && styles.timelineDotCurrent,
                      ]}
                    >
                      {step.completed ? (
                        <Ionicons name="checkmark" size={10} color="#ffffff" />
                      ) : (
                        <View style={styles.innerDot} />
                      )}
                    </View>
                    {!isLast && (
                      <View
                        style={[
                          styles.timelineLine,
                          step.completed && styles.timelineLineCompleted,
                        ]}
                      />
                    )}
                  </View>

                  <View style={styles.timelineColRight}>
                    <View style={styles.stepTitleRow}>
                      <Text
                        style={[
                          styles.stepTitle,
                          step.completed && styles.stepTitleCompleted,
                          step.current && styles.stepTitleCurrent,
                        ]}
                      >
                        {step.title}
                      </Text>
                      <Text style={styles.stepTime}>{step.time}</Text>
                    </View>
                    <Text style={styles.stepDesc}>{step.description}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Other Recent Orders */}
        <Text style={styles.recentHeading}>Your Recent Orders</Text>
        {sampleOrders.map((ord) => (
          <TouchableOpacity
            key={ord.id}
            style={[
              styles.recentOrderItem,
              selectedOrder.id === ord.id && styles.recentOrderItemActive,
            ]}
            onPress={() => setSelectedOrder(ord)}
          >
            <View style={styles.recentItemLeft}>
              <View style={styles.boxIconCircle}>
                <Ionicons name="cube-outline" size={18} color="#4b5563" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recentItemId}>{ord.id}</Text>
                <Text style={styles.recentItemName} numberOfLines={1}>
                  {ord.item}
                </Text>
              </View>
            </View>
            <View style={styles.recentItemRight}>
              <Text style={styles.recentPrice}>{ord.price}</Text>
              <Text style={styles.recentStatus}>{ord.status}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f7f2',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ebe7dd',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  liveTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  searchBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#ffc400',
    fontSize: 13,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  activeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e8e4da',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  activeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderIdText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  orderCourierText: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusTransit: {
    backgroundColor: '#eff6ff',
  },
  statusDelivered: {
    backgroundColor: '#ecfdf5',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusTextTransit: {
    color: '#1d4ed8',
  },
  statusTextDelivered: {
    color: '#059669',
  },
  orderItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginTop: 4,
  },
  orderPriceText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
    marginBottom: 12,
  },
  etaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginBottom: 16,
  },
  etaTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
    textTransform: 'uppercase',
  },
  etaSub: {
    fontSize: 13,
    fontWeight: '800',
    color: '#14532d',
  },
  supportCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffc400',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  supportCallText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
  },
  timelineBox: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 14,
  },
  timelineHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineColLeft: {
    alignItems: 'center',
    width: 24,
  },
  timelineDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineDotCompleted: {
    backgroundColor: '#059669',
  },
  timelineDotCurrent: {
    backgroundColor: '#ffc400',
    borderWidth: 3,
    borderColor: '#fef3c7',
  },
  innerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9ca3af',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 2,
  },
  timelineLineCompleted: {
    backgroundColor: '#059669',
  },
  timelineColRight: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 16,
  },
  stepTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  stepTitleCompleted: {
    color: '#111827',
    fontWeight: '700',
  },
  stepTitleCurrent: {
    color: '#0f172a',
    fontWeight: '800',
  },
  stepTime: {
    fontSize: 10,
    color: '#9ca3af',
  },
  stepDesc: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  recentHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  noOrdersState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  noOrdersTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginTop: 12, marginBottom: 6 },
  noOrdersText: { fontSize: 12, color: '#6b7280', textAlign: 'center', lineHeight: 18, maxWidth: 280 },
  recentOrderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e8e4da',
    marginBottom: 8,
  },
  recentOrderItemActive: {
    borderColor: '#ffc400',
    backgroundColor: '#fefce8',
  },
  recentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  boxIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentItemId: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
  recentItemName: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 1,
  },
  recentItemRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  recentPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  recentStatus: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '700',
    marginTop: 2,
  },
});
