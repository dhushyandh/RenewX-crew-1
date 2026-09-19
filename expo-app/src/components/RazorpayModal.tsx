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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
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

        default:
          break;
      }
    } catch {
      // Ignore unparseable messages
    }
  };

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
      background-color: #0b1120;
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
      font-size: 16px;
      font-weight: 600;
      color: #f8fafc;
      margin-bottom: 6px;
    }
    .subtitle {
      font-size: 13px;
      color: #94a3b8;
    }
  </style>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body>
  <div class="loading-container">
    <div class="spinner"></div>
    <div class="title">Securing Connection</div>
    <div class="subtitle">Opening Razorpay Payment Gateway...</div>
  </div>

  <script>
    function post(type, payload) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, payload || {})));
      }
    }

    window.addEventListener('DOMContentLoaded', function() {
      try {
        if (typeof Razorpay === 'undefined') {
          post('GATEWAY_ERROR', { message: 'Razorpay SDK script failed to load' });
          return;
        }

        var options = ${JSON.stringify(options)};

        options.handler = function(response) {
          post('PAYMENT_SUCCESS', { data: response });
        };

        options.modal = {
          ondismiss: function() {
            post('PAYMENT_CANCELLED');
          },
          backdropclose: false,
          escape: false
        };

        var rzp = new Razorpay(options);

        rzp.on('payment.failed', function(resp) {
          post('PAYMENT_FAILED', { error: resp.error });
        });

        // Small delay to allow WebView layout to settle
        setTimeout(function() {
          rzp.open();
        }, 300);

      } catch (err) {
        post('GATEWAY_ERROR', { message: err.message || 'Failed to initialize payment' });
      }
    });
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

        <View style={styles.webviewContainer}>
          <WebView
            ref={webViewRef}
            source={{ html: checkoutHtml, baseUrl: 'https://checkout.razorpay.com' }}
            onMessage={handleMessage}
            onLoadEnd={() => setLoading(false)}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            originWhitelist={['*']}
            allowsInlineMediaPlayback={true}
            mixedContentMode="always"
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
    borderRadius: radius.md,
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
  },
  amountPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  amountText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  webviewContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0b1120',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0b1120',
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0b1120',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderText: {
    color: '#94a3b8',
    fontSize: fontSize.sm,
  },
  testModeBanner: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
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
});
