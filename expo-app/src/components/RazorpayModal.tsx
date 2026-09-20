import React, { useRef, useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  BackHandler,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';
import { RazorpayCheckoutOptions, RazorpayCheckoutResult } from '@/lib/razorpay';

interface RazorpayModalProps {
  visible: boolean;
  options: RazorpayCheckoutOptions | null;
  onSuccess: (result: RazorpayCheckoutResult) => void;
  onError: (error: Error) => void;
  onClose: () => void;
}

export default function RazorpayModal({
  visible,
  options,
  onSuccess,
  onError,
  onClose,
}: RazorpayModalProps) {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;

    const backAction = () => {
      handleRequestClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [visible]);

  if (!visible || !options) {
    return null;
  }

  const handleRequestClose = () => {
    Alert.alert(
      'Cancel Payment?',
      'Are you sure you want to exit? Your cart items will remain saved.',
      [
        { text: 'Continue Payment', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => {
            onClose();
          },
        },
      ],
    );
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case 'PAYMENT_SUCCESS': {
          const result: RazorpayCheckoutResult = {
            razorpay_order_id: data.data?.razorpay_order_id || String(options.order_id || ''),
            razorpay_payment_id: data.data?.razorpay_payment_id || '',
            razorpay_signature: data.data?.razorpay_signature || '',
          };
          onSuccess(result);
          break;
        }

        case 'PAYMENT_CANCELLED': {
          onClose();
          break;
        }

        case 'PAYMENT_FAILED': {
          const desc = data.error?.description || data.error?.reason || 'Payment failed';
          const err: any = new Error(desc);
          err.code = data.error?.code;
          err.description = desc;
          onError(err);
          break;
        }

        case 'GATEWAY_ERROR': {
          onError(new Error(data.message || 'Payment gateway could not be loaded'));
          break;
        }

        case 'GATEWAY_READY': {
          setLoading(false);
          break;
        }

        default:
          break;
      }
    } catch {
      // Ignore unparseable messages
    }
  };

  // Safe Razorpay Checkout HTML page designed specifically for mobile WebViews
  const checkoutHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>RenewX Secure Payment</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body, html {
      width: 100%;
      height: 100%;
      background-color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      overflow: hidden;
    }
    .loading-container {
      text-align: center;
      padding: 24px;
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 3px solid rgba(255, 196, 0, 0.2);
      border-top-color: #ffc400;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px auto;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .title {
      font-size: 17px;
      font-weight: 700;
      color: #f8fafc;
      margin-bottom: 6px;
    }
    .subtitle {
      font-size: 13px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="loading-container" id="loadingBox">
    <div class="spinner"></div>
    <div class="title">Securing Connection</div>
    <div class="subtitle">Opening Razorpay Payment Gateway...</div>
  </div>

  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    function post(type, payload) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, payload || {})));
      }
    }

    var rzpOpened = false;

    function initPayment() {
      if (rzpOpened) return true;
      if (typeof Razorpay === 'undefined') return false;

      rzpOpened = true;

      try {
        var baseOptions = ${JSON.stringify(options)};

        var options = Object.assign({}, baseOptions, {
          redirect: false,
          handler: function(response) {
            post('PAYMENT_SUCCESS', { data: response });
          },
          modal: {
            ondismiss: function() {
              post('PAYMENT_CANCELLED');
            },
            backdropclose: false,
            escape: false,
            handleback: true
          },
          retry: {
            enabled: true,
            max_count: 3
          }
        });

        var rzp = new Razorpay(options);

        rzp.on('payment.failed', function(resp) {
          post('PAYMENT_FAILED', { error: resp.error });
        });

        post('GATEWAY_READY');

        setTimeout(function() {
          rzp.open();
        }, 200);

        return true;
      } catch (err) {
        post('GATEWAY_ERROR', { message: err.message || 'Payment initialization error' });
        return true;
      }
    }

    // Continuously check for Razorpay script readiness
    var attempts = 0;
    var timer = setInterval(function() {
      attempts++;
      if (initPayment()) {
        clearInterval(timer);
      } else if (attempts > 60) {
        clearInterval(timer);
        post('GATEWAY_ERROR', { message: 'Razorpay SDK took too long to load. Please check your network connection.' });
      }
    }, 150);
  </script>
</body>
</html>
  `;

  const amountDisplay = options.amount
    ? `₹${(Number(options.amount) / 100).toLocaleString('en-IN')}`
    : '';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleRequestClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Modal Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleRequestClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <View style={styles.secureBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#10b981" />
              <Text style={styles.headerTitle}>Secure Payment</Text>
            </View>
            <Text style={styles.headerSubtitle}>Powered by Razorpay</Text>
          </View>

          {amountDisplay ? (
            <View style={styles.amountPill}>
              <Text style={styles.amountText}>{amountDisplay}</Text>
            </View>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {String(options.key || '').startsWith('rzp_test_') && (
          <View style={styles.testModeBanner}>
            <Ionicons name="information-circle-outline" size={15} color="#b45309" />
            <Text style={styles.testModeText}>
              <Text style={styles.testModeHighlight}>Test Mode:</Text> Select UPI (enter <Text style={styles.testModeHighlight}>success@razorpay</Text>) or Netbanking (click Success).
            </Text>
          </View>
        )}

        {/* WebView Container */}
        <View style={styles.webviewContainer}>
          <WebView
            ref={webViewRef}
            source={{ html: checkoutHtml, baseUrl: 'https://api.razorpay.com' }}
            onMessage={handleMessage}
            onLoadEnd={() => setLoading(false)}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            thirdPartyCookiesEnabled={true}
            sharedCookiesEnabled={true}
            setSupportMultipleWindows={false}
            javaScriptCanOpenWindowsAutomatically={true}
            originWhitelist={['*']}
            allowsInlineMediaPlayback={true}
            mixedContentMode="always"
            userAgent="Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
            onShouldStartLoadWithRequest={(request: WebViewNavigation) => {
              const { url } = request;
              if (!url) return true;

              // Allow standard http/https web traffic
              if (url.startsWith('http://') || url.startsWith('https://')) {
                return true;
              }

              // Intercept UPI and third-party payment app deep links
              if (
                url.startsWith('upi://') ||
                url.startsWith('gpay://') ||
                url.startsWith('tez://') ||
                url.startsWith('phonepe://') ||
                url.startsWith('paytmmp://') ||
                url.startsWith('paytm://') ||
                url.startsWith('cred://') ||
                url.startsWith('bhim://') ||
                url.startsWith('intent://')
              ) {
                Linking.canOpenURL(url).then((supported) => {
                  if (supported) {
                    Linking.openURL(url).catch(() => {});
                  } else {
                    Alert.alert(
                      'App Not Installed',
                      'The selected payment app (Google Pay / UPI) is not installed on this device.\n\nIn Test Mode:\n• Select UPI ID and enter: success@razorpay\n• Or choose Netbanking and click "Success"',
                    );
                  }
                }).catch(() => {
                  Alert.alert(
                    'App Not Installed',
                    'In Test Mode, select "UPI ID" and enter success@razorpay, or choose Netbanking and click "Success".',
                  );
                });
                return false;
              }

              return true;
            }}
            style={styles.webview}
          />

          {loading && (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loaderText}>Connecting to Razorpay...</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#fff',
  },
  closeButton: {
    padding: 6,
  },
  titleContainer: {
    alignItems: 'center',
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  amountPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  amountText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  testModeBanner: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
  },
  testModeText: {
    fontSize: 11,
    color: '#92400e',
    flex: 1,
    lineHeight: 16,
  },
  testModeHighlight: {
    fontWeight: fontWeight.bold,
  },
  webviewContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderText: {
    color: '#94a3b8',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
});
