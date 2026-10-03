import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SupportedLanguage = 'English' | 'Hindi' | 'Kannada' | 'Tamil' | 'Telugu';
export type LanguageCode = 'en' | 'hi' | 'kn' | 'ta' | 'te';

export interface LanguageOption {
  code: LanguageCode;
  name: SupportedLanguage;
  nativeName: string;
  label: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', label: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', label: 'Hindi (हिंदी)' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', label: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', label: 'Tamil (தமிழ்)' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', label: 'Telugu (తెలుగు)' },
];

const STORAGE_KEY = '@renewx_selected_language';

// Translations Dictionary
const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    // Tabs & Navigation
    tab_home: 'Home',
    tab_shop: 'Categories',
    tab_sell: 'Sell',
    tab_orders: 'Orders',
    tab_track: 'Track',
    tab_account: 'Profile',
    search_placeholder: 'Search RenewX (iPhone, Mac, iPad...)',
    delivering_to: 'Delivering to',
    cart: 'Cart',
    wishlist: 'Wishlist',
    free_delivery_banner: "You've unlocked FREE delivery",

    // Common Buttons & Actions
    checkout: 'Proceed to Checkout',
    add_to_cart: 'Add to Cart',
    added_to_cart: 'Added to Cart',
    buy_now: 'Buy Now',
    view_cart: 'View Cart',
    apply: 'Apply',
    cancel: 'Cancel',
    save: 'Save',
    back: 'Back',
    done: 'Done',
    loading: 'Loading...',
    pre_owned_certified: 'Certified Pre-Owned',
    explore: 'Explore Now',

    // Settings Screen
    settings_title: 'Settings',
    settings_preferences: 'Preferences',
    settings_notifications: 'Notifications',
    settings_notifications_sub: 'Alerts about order updates & offers',
    settings_dark_mode: 'Dark Mode',
    settings_dark_mode_sub: 'Switch to sleek dark appearance',
    settings_language: 'Language',
    settings_location: 'Delivery Location',
    settings_account_section: 'Account & Security',
    settings_manage_addresses: 'Manage Addresses',
    settings_addresses_sub: 'Add, edit or remove delivery addresses',
    settings_payment_methods: 'Payment Methods',
    settings_payment_sub: 'Saved cards, UPI & Netbanking',
    settings_privacy_security: 'Privacy & Security',
    settings_privacy_sub: 'Password, 2FA & biometric login',
    settings_support_section: 'Help & Support',
    settings_contact_us: 'Contact Us',
    settings_contact_sub: '24/7 dedicated customer assistance',
    settings_about_renewx: 'About RenewX',
    settings_terms: 'Terms of Service',
    settings_privacy_policy: 'Privacy Policy',
    settings_logout: 'Log Out',
    settings_choose_language: 'Choose Language',
    settings_lang_changed: 'Language changed to',

    // Account Screen
    account_my_orders: 'My Orders',
    account_my_orders_sub: 'Track, return & view purchases',
    account_my_sell: 'My Sell Requests',
    account_my_sell_sub: 'Track buyback & trade-ins',
    account_wishlist: 'My Wishlist',
    account_addresses: 'Delivery Addresses',
    account_settings: 'Settings & Preferences',
    account_help: 'Help Center',
    account_sign_in_prompt: 'Sign in for the best RenewX experience',
    account_sign_in_btn: 'Sign In / Create Account',

    // Order Confirmation
    order_confirmed_title: 'Order Confirmed!',
    order_thank_you: 'Thank you for your purchase',
    order_placed_desc: 'Your order has been placed successfully and is being processed.',
    order_id: 'Order ID',
    total_amount: 'Total Amount',
    placed_on: 'Placed on',
    payment_method: 'Payment Method',
    order_tracking: 'Order Tracking',
    continue_shopping: 'Continue Shopping',
    download_invoice: 'Download Invoice',

    // Home Screen & Shop
    deals_of_the_day: 'Deals of the Day',
    best_sellers: 'Best Sellers',
    shop_by_category: 'Shop by Category',
    explore_devices: 'Explore Premium Certified Devices',
    sell_old_phone: 'Sell Your Old Device',
    sell_instant_cash: 'Instant cash & free doorstep pickup',
    certified_refreshed: '100% Tested & Verified',
  },
  hi: {
    // Tabs & Navigation
    tab_home: 'होम',
    tab_shop: 'श्रेणियाँ',
    tab_sell: 'बेचें',
    tab_orders: 'ऑर्डर',
    tab_track: 'ट्रैक',
    tab_account: 'प्रोफ़ाइल',
    search_placeholder: 'RenewX में खोजें (iPhone, Mac, iPad...)',
    delivering_to: 'डिलीवरी पता',
    cart: 'कार्ट',
    wishlist: 'विशलिस्ट',
    free_delivery_banner: 'आपने मुफ़्त डिलीवरी अनलॉक कर ली है',

    // Common Buttons & Actions
    checkout: 'चेकआउट के लिए आगे बढ़ें',
    add_to_cart: 'कार्ट में जोड़ें',
    added_to_cart: 'कार्ट में जोड़ा गया',
    buy_now: 'अभी खरीदें',
    view_cart: 'कार्ट देखें',
    apply: 'लागू करें',
    cancel: 'रद्द करें',
    save: 'सहेजें',
    back: 'वापस',
    done: 'हो गया',
    loading: 'लोड हो रहा है...',
    pre_owned_certified: 'सत्यापित प्री-ओन्ड',
    explore: 'अभी देखें',

    // Settings Screen
    settings_title: 'सेटिंग्स',
    settings_preferences: 'प्राथमिकताएं',
    settings_notifications: 'पुश सूचनाएं',
    settings_notifications_sub: 'ऑर्डर अपडेट और ऑफ़र के अलर्ट',
    settings_dark_mode: 'डार्क मोड',
    settings_dark_mode_sub: 'स्लीक डार्क थीम चालू करें',
    settings_language: 'भाषा (Language)',
    settings_location: 'डिलीवरी स्थान',
    settings_account_section: 'खाता और सुरक्षा',
    settings_manage_addresses: 'पते प्रबंधित करें',
    settings_addresses_sub: 'डिलीवरी पते जोड़ें, बदलें या हटाएं',
    settings_payment_methods: 'भुगतान के तरीके',
    settings_payment_sub: 'सहेजे गए कार्ड, UPI और नेटबैंकिंग',
    settings_privacy_security: 'गोपनीयता और सुरक्षा',
    settings_privacy_sub: 'पासवर्ड और सुरक्षा सेटिंग्स',
    settings_support_section: 'सहायता और समर्थन',
    settings_contact_us: 'संपर्क करें',
    settings_contact_sub: '24/7 समर्पित ग्राहक सहायता',
    settings_about_renewx: 'RenewX के बारे में',
    settings_terms: 'सेवा की शर्तें',
    settings_privacy_policy: 'गोपनीयता नीति',
    settings_logout: 'लॉग आउट',
    settings_choose_language: 'भाषा चुनें',
    settings_lang_changed: 'भाषा बदलकर की गई',

    // Account Screen
    account_my_orders: 'मेरे ऑर्डर',
    account_my_orders_sub: 'खरीदारी ट्रैक करें और विवरण देखें',
    account_my_sell: 'मेरे सेल अनुरोध',
    account_my_sell_sub: 'बायबैक और ट्रेड-इन ट्रैक करें',
    account_wishlist: 'मेरी विशलिस्ट',
    account_addresses: 'डिलीवरी पते',
    account_settings: 'सेटिंग्स और प्राथमिकताएं',
    account_help: 'सहायता केंद्र',
    account_sign_in_prompt: 'सर्वश्रेष्ठ अनुभव के लिए साइन इन करें',
    account_sign_in_btn: 'साइन इन / खाता बनाएं',

    // Order Confirmation
    order_confirmed_title: 'ऑर्डर कन्फ़र्म हो गया!',
    order_thank_you: 'आपकी खरीदारी के लिए धन्यवाद',
    order_placed_desc: 'आपका ऑर्डर सफलतापूर्वक दर्ज कर दिया गया है और प्रक्रिया में है।',
    order_id: 'ऑर्डर आईडी',
    total_amount: 'कुल राशि',
    placed_on: 'दर्ज तिथि',
    payment_method: 'भुगतान विधि',
    order_tracking: 'ऑर्डर ट्रैकिंग',
    continue_shopping: 'खरीदारी जारी रखें',
    download_invoice: 'चालान डाउनलोड करें',

    // Home Screen & Shop
    deals_of_the_day: 'आज के ख़ास ऑफ़र',
    best_sellers: 'बेस्ट सेलर डिवाइस',
    shop_by_category: 'श्रेणी के अनुसार खरीदें',
    explore_devices: 'प्रमाणित प्रीमियम डिवाइस देखें',
    sell_old_phone: 'पुराना डिवाइस बेचें',
    sell_instant_cash: 'तुरंत नकद और मुफ़्त होम पिकअप',
    certified_refreshed: '100% परीक्षित और सत्यापित',
  },
  kn: {
    // Tabs & Navigation
    tab_home: 'ಮುಖಪುಟ',
    tab_shop: 'ವಿಭಾಗಗಳು',
    tab_sell: 'ಮಾರಿ',
    tab_orders: 'ಆರ್ಡರ್‌ಗಳು',
    tab_track: 'ಟ್ರ್ಯಾಕ್',
    tab_account: 'ಪ್ರೊಫೈಲ್',
    search_placeholder: 'RenewX ನಲ್ಲಿ ಹುಡುಕಿ (iPhone, Mac, iPad...)',
    delivering_to: 'ವಿತರಣಾ ಸ್ಥಳ',
    cart: 'ಕಾರ್ಟ್',
    wishlist: 'ಇಷ್ಟಪಟ್ಟವು',
    free_delivery_banner: 'ನೀವು ಉಚಿತ ವಿತರಣೆ ಪಡೆದುಕೊಂಡಿದ್ದೀರಿ',

    // Common Buttons & Actions
    checkout: 'ಚೆಕ್‌ಔಟ್‌ಗೆ ಮುಂದುವರಿಯಿರಿ',
    add_to_cart: 'ಕಾರ್ಟ್‌ಗೆ ಸೇರಿಸಿ',
    added_to_cart: 'ಕಾರ್ಟ್‌ಗೆ ಸೇರಿಸಲಾಗಿದೆ',
    buy_now: 'ಈಗಲೇ ಖರೀದಿಸಿ',
    view_cart: 'ಕಾರ್ಟ್ ವೀಕ್ಷಿಸಿ',
    apply: 'ಅನ್ವಯಿಸಿ',
    cancel: 'ರದ್ದುಮಾಡಿ',
    save: 'ಉಳಿಸಿ',
    back: 'ಹಿಂದೆ',
    done: 'ಮುಗಿದಿದೆ',
    loading: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    pre_owned_certified: 'ಪ್ರಮಾಣೀಕೃತ ಪ್ರೀ-ಓನ್ಡ್',
    explore: 'ಈಗಲೇ ಅನ್ವೇಷಿಸಿ',

    // Settings Screen
    settings_title: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    settings_preferences: 'ಆದ್ಯತೆಗಳು',
    settings_notifications: 'ಪುಶ್ ಅಧಿಸೂಚನೆಗಳು',
    settings_notifications_sub: 'ಆರ್ಡರ್ ನವೀಕರಣಗಳು ಮತ್ತು ಕೊಡುಗೆಗಳ ಮಾಹಿತಿ',
    settings_dark_mode: 'ಡಾರ್ಕ್ ಮೋಡ್',
    settings_dark_mode_sub: 'ಡಾರ್ಕ್ ನೋಟಕ್ಕೆ ಬದಲಾಯಿಸಿ',
    settings_language: 'ಭಾಷೆ (Language)',
    settings_location: 'ವಿತರಣಾ ಸ್ಥಳ',
    settings_account_section: 'ಖಾತೆ ಮತ್ತು ಭದ್ರತೆ',
    settings_manage_addresses: 'ವಿಳಾಸಗಳನ್ನು ನಿರ್ವಹಿಸಿ',
    settings_addresses_sub: 'ವಿತರಣಾ ವಿಳಾಸಗಳನ್ನು ಸೇರಿಸಿ ಅಥವಾ ಸಂಪಾದಿಸಿ',
    settings_payment_methods: 'ಪಾವತಿ ವಿಧಾನಗಳು',
    settings_payment_sub: 'ಉಳಿಸಿದ ಕಾರ್ಡ್‌ಗಳು, ಯುಪಿಐ ಮತ್ತು ನೆಟ್‌ಬ್ಯಾಂಕಿಂಗ್',
    settings_privacy_security: 'ಗೌಪ್ಯತೆ ಮತ್ತು ಭದ್ರತೆ',
    settings_privacy_sub: 'ಪಾಸ್‌ವರ್ಡ್ ಮತ್ತು ಭದ್ರತಾ ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    settings_support_section: 'ಸಹಾಯ ಮತ್ತು ಬೆಂಬಲ',
    settings_contact_us: 'ನಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಿ',
    settings_contact_sub: '24/7 ಗ್ರಾಹಕ ಸಹಾಯ ಬೆಂಬಲ',
    settings_about_renewx: 'RenewX ಬಗ್ಗೆ',
    settings_terms: 'ಸೇವಾ ನಿಯಮಗಳು',
    settings_privacy_policy: 'ಗೌಪ್ಯತಾ ನೀತಿ',
    settings_logout: 'ಲಾಗ್ ಔಟ್',
    settings_choose_language: 'ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    settings_lang_changed: 'ಭಾಷೆಯನ್ನು ಬದಲಾಯಿಸಲಾಗಿದೆ',

    // Account Screen
    account_my_orders: 'ನನ್ನ ಆರ್ಡರ್‌ಗಳು',
    account_my_orders_sub: 'ಖರೀದಿಗಳನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ ಮತ್ತು ವೀಕ್ಷಿಸಿ',
    account_my_sell: 'ನನ್ನ ಮಾರಾಟ ವಿನಂತಿಗಳು',
    account_my_sell_sub: 'ಮರುಖರೀದಿ ಮತ್ತು ಟ್ರೇಡ್-ಇನ್ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ',
    account_wishlist: 'ನನ್ನ ಇಷ್ಟಪಟ್ಟ ಪಟ್ಟಿ',
    account_addresses: 'ವಿತರಣಾ ವಿಳಾಸಗಳು',
    account_settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು ಮತ್ತು ಆದ್ಯತೆಗಳು',
    account_help: 'ಸಹಾಯ ಕೇಂದ್ರ',
    account_sign_in_prompt: 'ಉತ್ತಮ RenewX ಅನುಭವಕ್ಕಾಗಿ ಸೈನ್ ಇನ್ ಮಾಡಿ',
    account_sign_in_btn: 'ಸೈನ್ ಇನ್ / ಖಾತೆ ರಚಿಸಿ',

    // Order Confirmation
    order_confirmed_title: 'ಆರ್ಡರ್ ದೃಢೀಕರಿಸಲಾಗಿದೆ!',
    order_thank_you: 'ನಿಮ್ಮ ಖರೀದಿಗೆ ಧನ್ಯವಾದಗಳು',
    order_placed_desc: 'ನಿಮ್ಮ ಆರ್ಡರ್ ಯಶಸ್ವಿಯಾಗಿ ಸಲ್ಲಿಸಲಾಗಿದೆ ಮತ್ತು ಪ್ರಕ್ರಿಯೆಯಲ್ಲಿದೆ.',
    order_id: 'ಆರ್ಡರ್ ಐಡಿ',
    total_amount: 'ಒಟ್ಟು ಮೊತ್ತ',
    placed_on: 'ಸಲ್ಲಿಸಿದ ದಿನಾಂಕ',
    payment_method: 'ಪಾವತಿ ವಿಧಾನ',
    order_tracking: 'ಆರ್ಡರ್ ಟ್ರ್ಯಾಕಿಂಗ್',
    continue_shopping: 'ಶಾಪಿಂಗ್ ಮುಂದುವರಿಸಿ',
    download_invoice: 'ಸರಕುಪಟ್ಟಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ',

    // Home Screen & Shop
    deals_of_the_day: 'ಇಂದಿನ ಅತ್ಯುತ್ತಮ ಡೀಲ್‌ಗಳು',
    best_sellers: 'ಬೆಸ್ಟ್ ಸೆಲ್ಲರ್ ಸಾಧನಗಳು',
    shop_by_category: 'ವರ್ಗದ ಪ್ರಕಾರ ಶಾಪ್ ಮಾಡಿ',
    explore_devices: 'ಪ್ರಮಾಣೀಕೃತ ಪ್ರೀಮಿಯಂ ಸಾಧನಗಳನ್ನು ಅನ್ವೇಷಿಸಿ',
    sell_old_phone: 'ಹಳೆಯ ಸಾಧನವನ್ನು ಮಾರಿ',
    sell_instant_cash: 'ತಕ್ಷಣ ನಗದು ಮತ್ತು ಉಚಿತ ಮನೆ ಪಿಕಪ್',
    certified_refreshed: '100% ಪರೀಕ್ಷಿತ ಮತ್ತು ಪರಿಶೀಲಿತ',
  },
  ta: {
    // Tabs & Navigation
    tab_home: 'முகப்பு',
    tab_shop: 'வகைகள்',
    tab_sell: 'விற்க',
    tab_orders: 'ஆர்டர்கள்',
    tab_track: 'ட்ராக்',
    tab_account: 'சுயவிவரம்',
    search_placeholder: 'RenewX இல் தேடவும் (iPhone, Mac, iPad...)',
    delivering_to: 'டெலிவரி செய்யும் இடம்',
    cart: 'கார்ட்',
    wishlist: 'விருப்பப்பட்டியல்',
    free_delivery_banner: 'இலவச டெலிவரியை அன்லாக் செய்துவிட்டீர்கள்',

    // Common Buttons & Actions
    checkout: 'செக்அவுட்டுக்கு தொடரவும்',
    add_to_cart: 'கார்ட்டில் சேர்க்கவும்',
    added_to_cart: 'கார்ட்டில் சேர்க்கப்பட்டது',
    buy_now: 'இப்போது வாங்கவும்',
    view_cart: 'கார்ட்டைப் பார்க்கவும்',
    apply: 'பயன்படுத்து',
    cancel: 'ரத்துசெய்',
    save: 'சேமி',
    back: 'பின்செல்',
    done: 'முடிந்தது',
    loading: 'ஏற்றுகிறது...',
    pre_owned_certified: 'சான்றளிக்கப்பட்ட ப்ரீ-ஓன்ட்',
    explore: 'இப்போது ஆராயுங்கள்',

    // Settings Screen
    settings_title: 'அமைப்புகள்',
    settings_preferences: 'விருப்பத்தேர்வுகள்',
    settings_notifications: 'புஷ் அறிவிப்புகள்',
    settings_notifications_sub: 'ஆர்டர் அப்டேட்கள் மற்றும் சலுகைகள்',
    settings_dark_mode: 'டார்க் மோட்',
    settings_dark_mode_sub: 'டார்க் தோற்றத்திற்கு மாறவும்',
    settings_language: 'மொழி (Language)',
    settings_location: 'டெலிவரி இருப்பிடம்',
    settings_account_section: 'கணக்கு மற்றும் பாதுகாப்பு',
    settings_manage_addresses: 'முகவரிகளை நிர்வகிக்கவும்',
    settings_addresses_sub: 'டெலிவரி முகவரிகளை சேர்க்கவும் அல்லது மாற்றவும்',
    settings_payment_methods: 'கட்டண முறைகள்',
    settings_payment_sub: 'கார்டுகள், யுபிஐ மற்றும் நெட்பேங்கிங்',
    settings_privacy_security: 'தனியுரிமை மற்றும் பாதுகாப்பு',
    settings_privacy_sub: 'கடவுச்சொல் மற்றும் பாதுகாப்பு அமைப்புகள்',
    settings_support_section: 'உதவி மற்றும் ஆதரவு',
    settings_contact_us: 'எங்களை தொடர்பு கொள்ளவும்',
    settings_contact_sub: '24/7 வாடிக்கையாளர் உதவி மையம்',
    settings_about_renewx: 'RenewX பற்றி',
    settings_terms: 'சேவை விதிமுறைகள்',
    settings_privacy_policy: 'தனியுரிமைக் கொள்கை',
    settings_logout: 'வெளியேறு',
    settings_choose_language: 'மொழியைத் தேர்ந்தெடுக்கவும்',
    settings_lang_changed: 'மொழி மாற்றப்பட்டது',

    // Account Screen
    account_my_orders: 'எனது ஆர்டர்கள்',
    account_my_orders_sub: 'வாங்குதல்களை கண்காணிக்கவும் மற்றும் பார்க்கவும்',
    account_my_sell: 'எனது விற்பனை கோரிக்கைகள்',
    account_my_sell_sub: 'பழைய சாதன விற்பனையை கண்காணிக்கவும்',
    account_wishlist: 'எனது விருப்பப்பட்டியல்',
    account_addresses: 'டெலிவரி முகவரிகள்',
    account_settings: 'அமைப்புகள் மற்றும் விருப்பங்கள்',
    account_help: 'உதவி மையம்',
    account_sign_in_prompt: 'சிறந்த RenewX அனுபவத்திற்கு உள்நுழையவும்',
    account_sign_in_btn: 'உள்நுழை / கணக்கை உருவாக்கு',

    // Order Confirmation
    order_confirmed_title: 'ஆர்டர் உறுதிசெய்யப்பட்டது!',
    order_thank_you: 'நீங்கள் வாங்கியதற்கு நன்றி',
    order_placed_desc: 'உங்கள் ஆர்டர் வெற்றிகரமாக பதிவு செய்யப்பட்டு செயலாக்கப்படுகிறது.',
    order_id: 'ஆர்டர் ஐடி',
    total_amount: 'மொத்த தொகை',
    placed_on: 'பதிவு செய்த தேதி',
    payment_method: 'கட்டண முறை',
    order_tracking: 'ஆர்டர் கண்காணிப்பு',
    continue_shopping: 'தொடர்ந்து ஷாப்பிங் செய்ய',
    download_invoice: 'ரசீதை பதிவிறக்கவும்',

    // Home Screen & Shop
    deals_of_the_day: 'இன்றைய சிறந்த சலுகைகள்',
    best_sellers: 'அதிகம் விற்பனையாகும் சாதனங்கள்',
    shop_by_category: 'வகை வாரியாக வாங்கவும்',
    explore_devices: 'பிரீமியம் சான்றளிக்கப்பட்ட சாதனங்கள்',
    sell_old_phone: 'பழைய சாதனத்தை விற்கவும்',
    sell_instant_cash: 'உடனடி பணம் & இலவச வீட்டு பிக்கப்',
    certified_refreshed: '100% சோதிக்கப்பட்டது மற்றும் சரிபார்க்கப்பட்டது',
  },
  te: {
    // Tabs & Navigation
    tab_home: 'హోమ్',
    tab_shop: 'వర్గాలు',
    tab_sell: 'అమ్మండి',
    tab_orders: 'ఆర్డర్లు',
    tab_track: 'ట్రాక్',
    tab_account: 'ప్రొఫైల్',
    search_placeholder: 'RenewX లో శోధించండి (iPhone, Mac, iPad...)',
    delivering_to: 'డెలివరీ చిరునామా',
    cart: 'కార్ట్',
    wishlist: 'విష్‌లిస్ట్',
    free_delivery_banner: 'మీరు ఉచిత డెలివరీని అన్‌లాక్ చేసారు',

    // Common Buttons & Actions
    checkout: 'చెక్‌అవుట్‌కు కొనసాగండి',
    add_to_cart: 'కార్ట్‌కి జోడించండి',
    added_to_cart: 'కార్ట్‌కి జోడించబడింది',
    buy_now: 'ఇప్పుడే కొనండి',
    view_cart: 'కార్ట్‌ను చూడండి',
    apply: 'వర్తించండి',
    cancel: 'రద్దు చేయండి',
    save: 'సేవ్ చేయండి',
    back: 'వెనుకకు',
    done: 'పూర్తయింది',
    loading: 'లోడ్ అవుతోంది...',
    pre_owned_certified: 'సర్టిఫైడ్ ప్రీ-ఓన్డ్',
    explore: 'ఇప్పుడే అన్వేషించండి',

    // Settings Screen
    settings_title: 'సెట్టింగ్‌లు',
    settings_preferences: 'ప్రాధాన్యతలు',
    settings_notifications: 'పుష్ నోటిఫికేషన్‌లు',
    settings_notifications_sub: 'ఆర్డర్ అప్‌డేట్‌లు & ఆఫర్ల వివరాలు',
    settings_dark_mode: 'డార్క్ మోడ్',
    settings_dark_mode_sub: 'డార్క్ థీమ్‌కి మారండి',
    settings_language: 'భాష (Language)',
    settings_location: 'డెలివరీ ప్రాంతం',
    settings_account_section: 'ఖాతా & భద్రత',
    settings_manage_addresses: 'చిరునామాలను నిర్వహించండి',
    settings_addresses_sub: 'డెలివరీ చిరునామాలను జోడించండి లేదా సవరించండి',
    settings_payment_methods: 'చెల్లింపు విధానాలు',
    settings_payment_sub: 'సేవ్ చేసిన కార్డులు, యూపీఐ & నెట్‌బ్యాంకింగ్',
    settings_privacy_security: 'గోప్యత & భద్రత',
    settings_privacy_sub: 'పాస్‌వర్డ్ & భద్రతా సెట్టింగ్‌లు',
    settings_support_section: 'సహాయం & మద్దతు',
    settings_contact_us: 'మమ్మల్ని సంప్రదించండి',
    settings_contact_sub: '24/7 కస్టమర్ సపోర్ట్ సర్వీస్',
    settings_about_renewx: 'RenewX గురించి',
    settings_terms: 'సేవా నిబంధనలు',
    settings_privacy_policy: 'గోప్యతా విధానం',
    settings_logout: 'లాగ్ అవుట్',
    settings_choose_language: 'భాషను ఎంచుకోండి',
    settings_lang_changed: 'భాష మార్చబడింది',

    // Account Screen
    account_my_orders: 'నా ఆర్డర్లు',
    account_my_orders_sub: 'కొనుగోళ్లను ట్రాక్ చేయండి మరియు చూడండి',
    account_my_sell: 'నా అమ్మకపు అభ్యర్థనలు',
    account_my_sell_sub: 'బైబ్యాక్ & ట్రేడ్-ఇన్‌లను ట్రాక్ చేయండి',
    account_wishlist: 'నా విష్‌లిస్ట్',
    account_addresses: 'డెలివరీ చిరునామాలు',
    account_settings: 'సెట్టింగ్‌లు & ప్రాధాన్యతలు',
    account_help: 'సహాయ కేంద్రం',
    account_sign_in_prompt: 'ఉత్తమ అనుభవం కోసం సైన్ ఇన్ చేయండి',
    account_sign_in_btn: 'సైన్ ఇన్ / ఖాతాను సృష్టించండి',

    // Order Confirmation
    order_confirmed_title: 'ఆర్డర్ నిర్ధారించబడింది!',
    order_thank_you: 'మీ కొనుగోలుకు ధన్యవాదాలు',
    order_placed_desc: 'మీ ఆర్డర్ విజయవంతంగా నమోదు చేయబడింది మరియు ప్రాసెస్ అవుతోంది.',
    order_id: 'ఆర్డర్ ఐడీ',
    total_amount: 'మొత్తం మొత్తం',
    placed_on: 'నమోదు చేసిన తేదీ',
    payment_method: 'చెల్లింపు విధానం',
    order_tracking: 'ఆర్డర్ ట్రాకింగ్',
    continue_shopping: 'షాపింగ్ కొనసాగించండి',
    download_invoice: 'ఇన్‌వాయిస్ డౌన్‌లోడ్ చేయండి',

    // Home Screen & Shop
    deals_of_the_day: 'నేటి ప్రత్యేక డీల్స్',
    best_sellers: 'బెస్ట్ సెల్లర్ పరికరాలు',
    shop_by_category: 'వర్గం వారీగా షాపింగ్ చేయండి',
    explore_devices: 'ప్రీమియం సర్టిఫైడ్ పరికరాలను చూడండి',
    sell_old_phone: 'పాత పరికరాన్ని అమ్మండి',
    sell_instant_cash: 'తక్షణ నగదు & ఉచిత డోర్‌స్టెప్ పికప్',
    certified_refreshed: '100% పరీక్షించబడింది & ధృవీకరించబడింది',
  },
};

interface LanguageContextType {
  language: SupportedLanguage;
  langCode: LanguageCode;
  setLanguage: (lang: SupportedLanguage | string) => Promise<void>;
  t: (key: string, defaultText?: string) => string;
  supportedLanguages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>('English');
  const [langCode, setLangCode] = useState<LanguageCode>('en');

  // Load persisted language preference on launch
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const match = SUPPORTED_LANGUAGES.find(
            (l) => l.name === stored || l.code === stored || l.label.startsWith(stored)
          );
          if (match) {
            setLanguageState(match.name);
            setLangCode(match.code);
          }
        }
      } catch (err) {
        console.warn('[LanguageContext] Failed to load language preference:', err);
      }
    })();
  }, []);

  const setLanguage = useCallback(async (newLang: SupportedLanguage | string) => {
    const cleanName = newLang.split(' ')[0] as SupportedLanguage;
    const match = SUPPORTED_LANGUAGES.find(
      (l) => l.name === cleanName || l.name === newLang || l.code === newLang
    );
    const chosen = match ? match.name : 'English';
    const code = match ? match.code : 'en';

    setLanguageState(chosen);
    setLangCode(code);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, chosen);
    } catch (err) {
      console.warn('[LanguageContext] Failed to persist language:', err);
    }
  }, []);

  const t = useCallback(
    (key: string, defaultText?: string): string => {
      const activeDict = TRANSLATIONS[langCode];
      if (activeDict && activeDict[key]) {
        return activeDict[key];
      }
      // Fallback to English if missing in target language
      const enDict = TRANSLATIONS.en;
      if (enDict && enDict[key]) {
        return enDict[key];
      }
      return defaultText || key;
    },
    [langCode]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        langCode,
        setLanguage,
        t,
        supportedLanguages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Safe graceful fallback if used outside provider
    return {
      language: 'English' as SupportedLanguage,
      langCode: 'en' as LanguageCode,
      setLanguage: async () => {},
      t: (_key: string, defaultText?: string) => defaultText || _key,
      supportedLanguages: SUPPORTED_LANGUAGES,
    };
  }
  return ctx;
}
