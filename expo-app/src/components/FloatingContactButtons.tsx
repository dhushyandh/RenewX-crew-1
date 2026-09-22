import { View, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function FloatingContactButtons() {
  const openWhatsApp = () => {
    Linking.openURL('https://wa.me/+919080168778?text=Hello%20RenewX%2C%20I%20have%20an%20inquiry%20about%20a%20device.');
  };

  const openCall = () => {
    Linking.openURL('tel:+919080168778');
  };

  const openInstagram = () => {
    Linking.openURL('https://www.instagram.com/renewx_crew/');
  };

  return (
    <View
      pointerEvents={Platform.OS === 'web' ? undefined : 'box-none'}
      style={[styles.container, Platform.OS === 'web' ? ({ pointerEvents: 'box-none' } as any) : undefined]}
    >
      <TouchableOpacity
        style={[styles.floatingBtn, styles.whatsappBtn]}
        onPress={openWhatsApp}
        activeOpacity={0.85}
        accessibilityLabel="WhatsApp support"
      >
        <Ionicons name="logo-whatsapp" size={20} color="#ffffff" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.floatingBtn, styles.phoneBtn]}
        onPress={openCall}
        activeOpacity={0.85}
        accessibilityLabel="Phone support"
      >
        <Ionicons name="call" size={18} color="#ffffff" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.floatingBtn, styles.instagramBtn]}
        onPress={openInstagram}
        activeOpacity={0.85}
        accessibilityLabel="Instagram"
      >
        <Ionicons name="logo-instagram" size={20} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 12,
    bottom: 85,
    gap: 10,
    zIndex: 999,
    alignItems: 'center',
  },
  floatingBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.25)',
    elevation: 6,
  },
  whatsappBtn: {
    backgroundColor: '#25D366',
  },
  phoneBtn: {
    backgroundColor: '#0f172a',
  },
  instagramBtn: {
    backgroundColor: '#E1306C',
  },
});
