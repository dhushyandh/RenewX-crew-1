import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

export default function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const { items, subtotal, clearCart, hydrated } = useCart();
  const { user } = useAuth();
  const [name, setName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [processing, setProcessing] = useState(false);

  const placeOrder = async () => {
    const cleanPhone = phone.replace(/D/g, '');
    if (!name.trim() || !address.trim() || !/^d{10}$/.test(cleanPhone) || !/^d{6}$/.test(pincode.trim())) {
      Alert.alert('Complete delivery details', 'Enter your name, valid 10-digit phone, full address and 6-digit pincode.');
      return;
    }
    if (!items.length) {
      Alert.alert('Cart is empty', 'Add a product before checking out.');
      return;
    }

    setProcessing(true);
    try {
      const order = await api.orders.create({
        items: items.map((item) => ({ product_id: String(item.id), quantity: item.quantity })),
        customer_info: {
          name: name.trim(),
          phone: cleanPhone,
          address: address.trim(),
          pincode: pincode.trim(),
        },
      });
      clearCart();
      Alert.alert(
        'Order Confirmed',
        'Your order has been created successfully.',
        [{ text: 'Track Order', onPress: () => navigation.navigate('MainTabs', { screen: 'Track' }) }],
        { cancelable: false }
      );
    } catch (error: any) {
      Alert.alert('Order could not be placed', error?.message || 'Please try again. Your cart was not cleared.');
    } finally {
      setProcessing(false);
    }
  };

  if (!hydrated) {
    return <SafeAreaView style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Checkout</Text>
            <Text style={styles.subtitle}>Secure delivery details</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor="#94a3b8" style={styles.input} />
            <TextInput value={phone} onChangeText={setPhone} placeholder="10-digit mobile number" placeholderTextColor="#94a3b8" keyboardType="phone-pad" maxLength={10} style={styles.input} />
            <TextInput value={address} onChangeText={setAddress} placeholder="Full delivery address" placeholderTextColor="#94a3b8" multiline style={[styles.input, styles.address]} />
            <TextInput value={pincode} onChangeText={setPincode} placeholder="6-digit pincode" placeholderTextColor="#94a3b8" keyboardType="number-pad" maxLength={6} style={styles.input} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.row}><Text style={styles.label}>{items.reduce((n, i) => n + i.quantity, 0)} items</Text><Text style={styles.value}>₹{subtotal.toLocaleString('en-IN')}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Shipping</Text><Text style={styles.free}>Free</Text></View>
            <View style={styles.totalRow}><Text style={styles.totalLabel}>Total</Text><Text style={styles.total}>₹{subtotal.toLocaleString('en-IN')}</Text></View>
          </View>

          <View style={styles.notice}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#64748b" />
            <Text style={styles.noticeText}>Final price and stock are verified by the RenewX server.</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View><Text style={styles.footerLabel}>Total</Text><Text style={styles.footerTotal}>₹{subtotal.toLocaleString('en-IN')}</Text></View>
          <TouchableOpacity style={[styles.place, processing && { opacity: 0.6 }]} onPress={placeOrder} disabled={processing}>
            {processing ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.placeText}>Place Order</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:colors.background},
  loading:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:colors.background},
  header:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:spacing.lg,paddingVertical:spacing.md,backgroundColor:'#fff',borderBottomWidth:1,borderBottomColor:colors.border},
  backButton:{padding:4},
  title:{fontSize:fontSize.xl,fontWeight:fontWeight.bold,color:colors.text},
  subtitle:{fontSize:fontSize.xs,color:colors.textMuted,marginTop:2},
  content:{padding:spacing.md,paddingBottom:130},
  section:{backgroundColor:'#fff',borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,padding:spacing.md,marginBottom:spacing.md},
  sectionTitle:{fontSize:fontSize.md,fontWeight:fontWeight.bold,color:colors.text,marginBottom:12},
  input:{borderWidth:1,borderColor:colors.border,borderRadius:radius.md,paddingHorizontal:12,paddingVertical:12,marginBottom:10,color:colors.text,backgroundColor:'#fff',fontSize:fontSize.sm},
  address:{minHeight:90,textAlignVertical:'top'},
  row:{flexDirection:'row',justifyContent:'space-between',marginBottom:10},
  label:{fontSize:fontSize.sm,color:colors.textSecondary},
  value:{fontSize:fontSize.sm,fontWeight:fontWeight.bold,color:colors.text},
  free:{fontSize:fontSize.sm,fontWeight:fontWeight.bold,color:'#10b981'},
  totalRow:{flexDirection:'row',justifyContent:'space-between',borderTopWidth:1,borderTopColor:colors.border,paddingTop:12,marginTop:4},
  totalLabel:{fontSize:fontSize.md,fontWeight:fontWeight.bold,color:colors.text},
  total:{fontSize:fontSize.lg,fontWeight:fontWeight.black,color:colors.text},
  notice:{flexDirection:'row',gap:8,alignItems:'center',padding:12},
  noticeText:{flex:1,fontSize:11,color:colors.textMuted,lineHeight:16},
  footer:{position:'absolute',left:0,right:0,bottom:0,backgroundColor:'#fff',borderTopWidth:1,borderTopColor:colors.border,padding:spacing.md,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  footerLabel:{fontSize:10,color:colors.textMuted},
  footerTotal:{fontSize:fontSize.lg,fontWeight:fontWeight.black,color:colors.text},
  place:{backgroundColor:'#000',borderRadius:radius.md,minWidth:150,minHeight:48,alignItems:'center',justifyContent:'center',paddingHorizontal:18},
  placeText:{color:colors.primary,fontSize:fontSize.sm,fontWeight:fontWeight.bold},
});
