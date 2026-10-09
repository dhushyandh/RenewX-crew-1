/**
 * Category-specific specifications configuration for RenewX Admin Inventory.
 * Provides custom specification schemas, default values, option pickers,
 * and live-preview badges tailored specifically for each product category:
 * Smartphones, Laptops, Tablets, Audio, Watches, Cameras, Vehicles, Accessories.
 */

export interface SpecOption {
  label: string;
  value: string;
  color?: string;
  icon?: string;
}

export interface SpecFieldDefinition {
  id: string;
  label: string;
  type: 'select' | 'text' | 'color';
  defaultValue: string;
  options?: SpecOption[];
  placeholder?: string;
  required?: boolean;
  icon?: string;
  gridSpan?: 'full' | 'half';
}

export interface CategorySpecConfig {
  categoryId: string;
  categoryName: string;
  icon: string;
  description: string;
  fields: SpecFieldDefinition[];
  previewHighlights: {
    label: string;
    fieldId: string;
  }[];
}

export const CATEGORY_OPTIONS = [
  { label: 'Smartphones', value: 'Smartphones', icon: 'phone-portrait-outline', desc: 'Mobiles & Flagships' },
  { label: 'Laptops', value: 'Laptops', icon: 'laptop-outline', desc: 'MacBooks & Ultrabooks' },
  { label: 'Tablets', value: 'Tablets', icon: 'tablet-portrait-outline', desc: 'iPads & Android Tabs' },
  { label: 'Audio', value: 'Audio', icon: 'headset-outline', desc: 'TWS & Headphones' },
  { label: 'Watches', value: 'Watches', icon: 'watch-outline', desc: 'Smartwatches & Fitness' },
  { label: 'Cameras', value: 'Cameras', icon: 'camera-outline', desc: 'DSLR, Mirrorless & Action' },
  { label: 'Vehicles', value: 'Vehicles', icon: 'car-outline', desc: 'Electric Vehicles & Bikes' },
  { label: 'Accessories', value: 'Accessories', icon: 'hardware-chip-outline', desc: 'Chargers, Cables & Gear' },
];

export const CATEGORY_SPEC_CONFIGS: Record<string, CategorySpecConfig> = {
  Smartphones: {
    categoryId: 'Smartphones',
    categoryName: 'Smartphones',
    icon: 'phone-portrait-outline',
    description: 'Mobile phones and handheld cellular devices',
    previewHighlights: [
      { label: 'Storage', fieldId: 'storage' },
      { label: 'RAM', fieldId: 'ram' },
      { label: 'Battery', fieldId: 'batteryHealth' },
      { label: 'SIM', fieldId: 'simNetwork' },
    ],
    fields: [
      {
        id: 'storage',
        label: 'Storage',
        type: 'select',
        defaultValue: '128 GB',
        required: true,
        icon: 'hardware-chip-outline',
        gridSpan: 'half',
        options: [
          { label: '64 GB', value: '64 GB' },
          { label: '128 GB', value: '128 GB' },
          { label: '256 GB', value: '256 GB' },
          { label: '512 GB', value: '512 GB' },
          { label: '1 TB', value: '1 TB' },
        ],
      },
      {
        id: 'ram',
        label: 'RAM / Memory',
        type: 'select',
        defaultValue: '8 GB',
        required: true,
        icon: 'speedometer-outline',
        gridSpan: 'half',
        options: [
          { label: '4 GB', value: '4 GB' },
          { label: '6 GB', value: '6 GB' },
          { label: '8 GB', value: '8 GB' },
          { label: '12 GB', value: '12 GB' },
          { label: '16 GB', value: '16 GB' },
        ],
      },
      {
        id: 'color',
        label: 'Color',
        type: 'color',
        defaultValue: 'Deep Purple',
        required: true,
        icon: 'color-palette-outline',
        gridSpan: 'half',
        options: [
          { label: 'Deep Purple', value: 'Deep Purple', color: '#4E3C56' },
          { label: 'Space Black', value: 'Space Black', color: '#2B2B2D' },
          { label: 'Natural Titanium', value: 'Natural Titanium', color: '#9A958E' },
          { label: 'Silver', value: 'Silver', color: '#E2E4E7' },
          { label: 'Gold', value: 'Gold', color: '#F5E7D3' },
          { label: 'Midnight', value: 'Midnight', color: '#1E293B' },
          { label: 'Blue', value: 'Blue', color: '#3B82F6' },
        ],
      },
      {
        id: 'condition',
        label: 'Condition',
        type: 'select',
        defaultValue: 'Excellent',
        required: true,
        icon: 'checkmark-circle-outline',
        gridSpan: 'half',
        options: [
          { label: 'Like New (Pristine)', value: 'Like New' },
          { label: 'Excellent', value: 'Excellent' },
          { label: 'Good', value: 'Good' },
          { label: 'Fair', value: 'Fair' },
        ],
      },
      {
        id: 'batteryHealth',
        label: 'Battery Health',
        type: 'select',
        defaultValue: 'Above 85%',
        icon: 'battery-charging-outline',
        gridSpan: 'half',
        options: [
          { label: '100% (Brand New Battery)', value: '100%' },
          { label: '90%+ Peak Health', value: '90%+' },
          { label: 'Above 85%', value: 'Above 85%' },
          { label: '80% - 85%', value: '80% - 85%' },
        ],
      },
      {
        id: 'simNetwork',
        label: 'SIM / Network',
        type: 'select',
        defaultValue: 'Dual SIM (Physical + eSIM)',
        icon: 'cellular-outline',
        gridSpan: 'half',
        options: [
          { label: 'Dual SIM (Physical + eSIM)', value: 'Dual SIM (Physical + eSIM)' },
          { label: 'Dual Physical SIM', value: 'Dual Physical SIM' },
          { label: 'eSIM Only', value: 'eSIM Only' },
          { label: '5G Unlocked', value: '5G Unlocked' },
        ],
      },
      {
        id: 'boxAccessories',
        label: 'Box & Accessories',
        type: 'select',
        defaultValue: 'With charger & cable',
        icon: 'cube-outline',
        gridSpan: 'half',
        options: [
          { label: 'With original box & accessories', value: 'With original box & accessories' },
          { label: 'With charger & cable', value: 'With charger & cable' },
          { label: 'Device only', value: 'Device only' },
        ],
      },
      {
        id: 'imei',
        label: 'IMEI / Serial (Optional)',
        type: 'text',
        defaultValue: '',
        placeholder: 'Enter 15-digit IMEI or serial number',
        icon: 'finger-print-outline',
        gridSpan: 'half',
      },
    ],
  },

  Laptops: {
    categoryId: 'Laptops',
    categoryName: 'Laptops',
    icon: 'laptop-outline',
    description: 'Ultrabooks, MacBooks, and gaming laptops',
    previewHighlights: [
      { label: 'Processor', fieldId: 'processor' },
      { label: 'RAM', fieldId: 'ram' },
      { label: 'SSD', fieldId: 'storage' },
      { label: 'Screen', fieldId: 'screenSize' },
    ],
    fields: [
      {
        id: 'processor',
        label: 'Processor / CPU',
        type: 'select',
        defaultValue: 'Apple M3 Pro',
        required: true,
        icon: 'hardware-chip-outline',
        gridSpan: 'half',
        options: [
          { label: 'Apple M3 Pro / Max', value: 'Apple M3 Pro' },
          { label: 'Apple M3', value: 'Apple M3' },
          { label: 'Apple M2', value: 'Apple M2' },
          { label: 'Intel Core i7 13th/14th Gen', value: 'Intel Core i7 13th Gen' },
          { label: 'Intel Core i5 13th Gen', value: 'Intel Core i5 13th Gen' },
          { label: 'AMD Ryzen 7 Series', value: 'AMD Ryzen 7' },
          { label: 'AMD Ryzen 9 Series', value: 'AMD Ryzen 9' },
        ],
      },
      {
        id: 'ram',
        label: 'RAM / Memory',
        type: 'select',
        defaultValue: '16 GB Unified',
        required: true,
        icon: 'speedometer-outline',
        gridSpan: 'half',
        options: [
          { label: '8 GB DDR5', value: '8 GB' },
          { label: '16 GB Unified / DDR5', value: '16 GB Unified' },
          { label: '24 GB Unified', value: '24 GB Unified' },
          { label: '32 GB Unified / DDR5', value: '32 GB Unified' },
          { label: '64 GB High-Performance', value: '64 GB' },
        ],
      },
      {
        id: 'storage',
        label: 'Storage / SSD',
        type: 'select',
        defaultValue: '512 GB SSD',
        required: true,
        icon: 'disc-outline',
        gridSpan: 'half',
        options: [
          { label: '256 GB NVMe SSD', value: '256 GB SSD' },
          { label: '512 GB NVMe SSD', value: '512 GB SSD' },
          { label: '1 TB High-Speed SSD', value: '1 TB SSD' },
          { label: '2 TB High-Speed SSD', value: '2 TB SSD' },
        ],
      },
      {
        id: 'screenSize',
        label: 'Screen Size & Display',
        type: 'select',
        defaultValue: '14.2" Liquid Retina XDR',
        required: true,
        icon: 'tv-outline',
        gridSpan: 'half',
        options: [
          { label: '13.3" Retina Display', value: '13.3" Retina' },
          { label: '13.6" Liquid Retina', value: '13.6" Liquid Retina' },
          { label: '14.2" Liquid Retina XDR (120Hz)', value: '14.2" Liquid Retina XDR' },
          { label: '15.6" FHD 144Hz IPS', value: '15.6" FHD 144Hz' },
          { label: '16" Liquid Retina XDR', value: '16" Liquid Retina XDR' },
          { label: '16.0" 4K OLED / WQXGA', value: '16.0" OLED' },
        ],
      },
      {
        id: 'graphics',
        label: 'Graphics / GPU',
        type: 'select',
        defaultValue: 'Integrated GPU',
        icon: 'desktop-outline',
        gridSpan: 'half',
        options: [
          { label: 'Integrated GPU (Intel Iris / AMD / Apple)', value: 'Integrated GPU' },
          { label: 'Apple 14/18-Core GPU', value: 'Apple 18-Core GPU' },
          { label: 'NVIDIA GeForce RTX 4060 8GB', value: 'NVIDIA RTX 4060 8GB' },
          { label: 'NVIDIA GeForce RTX 4070 8GB', value: 'NVIDIA RTX 4070 8GB' },
          { label: 'NVIDIA GeForce RTX 3050 4GB', value: 'NVIDIA RTX 3050 4GB' },
        ],
      },
      {
        id: 'condition',
        label: 'Condition',
        type: 'select',
        defaultValue: 'Excellent',
        required: true,
        icon: 'checkmark-circle-outline',
        gridSpan: 'half',
        options: [
          { label: 'Like New (Pristine)', value: 'Like New' },
          { label: 'Excellent', value: 'Excellent' },
          { label: 'Good', value: 'Good' },
          { label: 'Fair', value: 'Fair' },
        ],
      },
      {
        id: 'batteryHealth',
        label: 'Battery Health / Cycles',
        type: 'select',
        defaultValue: 'Normal (Above 90%)',
        icon: 'battery-charging-outline',
        gridSpan: 'half',
        options: [
          { label: 'Normal (Above 90% Health)', value: 'Normal (Above 90%)' },
          { label: 'Under 100 Battery Cycles', value: 'Under 100 Cycles' },
          { label: '85% - 89% Health', value: '85% - 89%' },
          { label: 'Brand New Battery Replaced', value: 'New Battery Replaced' },
        ],
      },
      {
        id: 'operatingSystem',
        label: 'Operating System',
        type: 'select',
        defaultValue: 'macOS Sonoma',
        icon: 'code-slash-outline',
        gridSpan: 'half',
        options: [
          { label: 'macOS Sonoma / Sequoia', value: 'macOS Sonoma' },
          { label: 'Windows 11 Home', value: 'Windows 11 Home' },
          { label: 'Windows 11 Pro', value: 'Windows 11 Pro' },
          { label: 'Linux / Ubuntu', value: 'Linux' },
        ],
      },
      {
        id: 'boxAccessories',
        label: 'Box & Charger',
        type: 'select',
        defaultValue: 'Original fast charger & cable',
        icon: 'cube-outline',
        gridSpan: 'half',
        options: [
          { label: 'Original box & MagSafe/PD fast charger', value: 'Original box & charger' },
          { label: 'Original fast charger & cable', value: 'Original fast charger & cable' },
          { label: 'Laptop + OEM certified charger', value: 'Laptop + OEM charger' },
        ],
      },
      {
        id: 'serialNumber',
        label: 'Serial Number (Optional)',
        type: 'text',
        defaultValue: '',
        placeholder: 'e.g. C02G41A...',
        icon: 'finger-print-outline',
        gridSpan: 'half',
      },
    ],
  },

  Tablets: {
    categoryId: 'Tablets',
    categoryName: 'Tablets',
    icon: 'tablet-portrait-outline',
    description: 'iPads, Android tablets, and drawing pads',
    previewHighlights: [
      { label: 'Screen', fieldId: 'screenSize' },
      { label: 'Storage', fieldId: 'storage' },
      { label: 'Network', fieldId: 'connectivity' },
      { label: 'Stylus', fieldId: 'stylusSupport' },
    ],
    fields: [
      {
        id: 'storage',
        label: 'Storage',
        type: 'select',
        defaultValue: '128 GB',
        required: true,
        icon: 'disc-outline',
        gridSpan: 'half',
        options: [
          { label: '64 GB', value: '64 GB' },
          { label: '128 GB', value: '128 GB' },
          { label: '256 GB', value: '256 GB' },
          { label: '512 GB', value: '512 GB' },
          { label: '1 TB', value: '1 TB' },
        ],
      },
      {
        id: 'screenSize',
        label: 'Display & Screen Size',
        type: 'select',
        defaultValue: '11" 120Hz ProMotion',
        required: true,
        icon: 'tv-outline',
        gridSpan: 'half',
        options: [
          { label: '8.3" Liquid Retina', value: '8.3" Liquid Retina' },
          { label: '10.9" Liquid Retina', value: '10.9" Liquid Retina' },
          { label: '11" 120Hz ProMotion', value: '11" 120Hz ProMotion' },
          { label: '12.9" Liquid Retina XDR (Mini-LED)', value: '12.9" Mini-LED' },
          { label: '13" Ultra Retina Tandem OLED', value: '13" Tandem OLED' },
          { label: '12.4" Super AMOLED', value: '12.4" Super AMOLED' },
        ],
      },
      {
        id: 'connectivity',
        label: 'Connectivity',
        type: 'select',
        defaultValue: 'Wi-Fi Only',
        icon: 'wifi-outline',
        gridSpan: 'half',
        options: [
          { label: 'Wi-Fi Only', value: 'Wi-Fi Only' },
          { label: 'Wi-Fi + 5G Cellular', value: 'Wi-Fi + 5G Cellular' },
          { label: 'Wi-Fi + 4G LTE', value: 'Wi-Fi + 4G LTE' },
        ],
      },
      {
        id: 'color',
        label: 'Color',
        type: 'color',
        defaultValue: 'Space Gray',
        icon: 'color-palette-outline',
        gridSpan: 'half',
        options: [
          { label: 'Space Gray', value: 'Space Gray', color: '#4B4846' },
          { label: 'Silver', value: 'Silver', color: '#E2E4E7' },
          { label: 'Starlight', value: 'Starlight', color: '#F0EAE1' },
          { label: 'Blue', value: 'Blue', color: '#3B82F6' },
          { label: 'Pink', value: 'Pink', color: '#F472B6' },
        ],
      },
      {
        id: 'stylusSupport',
        label: 'Stylus / Pen Support',
        type: 'select',
        defaultValue: 'Apple Pencil 2nd Gen / Pro Supported',
        icon: 'pencil-outline',
        gridSpan: 'half',
        options: [
          { label: 'Apple Pencil Pro / 2nd Gen Supported', value: 'Apple Pencil Supported' },
          { label: 'S-Pen Included in Box', value: 'S-Pen Included' },
          { label: 'Stylus Pen Compatible', value: 'Stylus Compatible' },
        ],
      },
      {
        id: 'condition',
        label: 'Condition',
        type: 'select',
        defaultValue: 'Excellent',
        required: true,
        icon: 'checkmark-circle-outline',
        gridSpan: 'half',
        options: [
          { label: 'Like New (Pristine)', value: 'Like New' },
          { label: 'Excellent', value: 'Excellent' },
          { label: 'Good', value: 'Good' },
          { label: 'Fair', value: 'Fair' },
        ],
      },
      {
        id: 'batteryHealth',
        label: 'Battery Health',
        type: 'select',
        defaultValue: 'Above 88%',
        icon: 'battery-charging-outline',
        gridSpan: 'half',
        options: [
          { label: 'Above 90% Peak Health', value: '90%+' },
          { label: 'Above 85% Health', value: 'Above 85%' },
          { label: '80% - 85%', value: '80% - 85%' },
        ],
      },
      {
        id: 'boxAccessories',
        label: 'Box & Accessories',
        type: 'select',
        defaultValue: 'With 20W charger & cable',
        icon: 'cube-outline',
        gridSpan: 'half',
        options: [
          { label: 'With original box & 20W charger', value: 'Original box & charger' },
          { label: 'With 20W charger & cable', value: 'With 20W charger & cable' },
          { label: 'Tablet only', value: 'Tablet only' },
        ],
      },
    ],
  },

  Audio: {
    categoryId: 'Audio',
    categoryName: 'Audio',
    icon: 'headset-outline',
    description: 'Earbuds, ANC headphones, and wireless speakers',
    previewHighlights: [
      { label: 'Type', fieldId: 'formFactor' },
      { label: 'ANC', fieldId: 'noiseCancellation' },
      { label: 'Playtime', fieldId: 'batteryPlaytime' },
      { label: 'Bluetooth', fieldId: 'connectivity' },
    ],
    fields: [
      {
        id: 'formFactor',
        label: 'Audio Form Factor',
        type: 'select',
        defaultValue: 'True Wireless Earbuds (TWS)',
        required: true,
        icon: 'headset-outline',
        gridSpan: 'half',
        options: [
          { label: 'True Wireless Earbuds (TWS)', value: 'True Wireless Earbuds (TWS)' },
          { label: 'Over-Ear Headphones (ANC)', value: 'Over-Ear Headphones' },
          { label: 'On-Ear Wireless Headphones', value: 'On-Ear Headphones' },
          { label: 'Wireless Neckband', value: 'Wireless Neckband' },
          { label: 'Portable Bluetooth Speaker', value: 'Bluetooth Speaker' },
        ],
      },
      {
        id: 'noiseCancellation',
        label: 'Active Noise Cancellation',
        type: 'select',
        defaultValue: 'Active Noise Cancellation (ANC)',
        required: true,
        icon: 'volume-mute-outline',
        gridSpan: 'half',
        options: [
          { label: 'Pro Active Noise Cancellation (ANC)', value: 'Active Noise Cancellation (ANC)' },
          { label: 'Adaptive ANC + Transparency Mode', value: 'Adaptive ANC & Transparency' },
          { label: 'Passive Noise Isolation Only', value: 'Passive Noise Isolation' },
        ],
      },
      {
        id: 'batteryPlaytime',
        label: 'Battery Life / Playtime',
        type: 'select',
        defaultValue: 'Up to 30 Hours (with Case)',
        required: true,
        icon: 'battery-charging-outline',
        gridSpan: 'half',
        options: [
          { label: 'Up to 24 Hours with Case', value: 'Up to 24 Hours' },
          { label: 'Up to 30 Hours with Case', value: 'Up to 30 Hours (with Case)' },
          { label: 'Up to 40 Hours (Over-Ear)', value: 'Up to 40 Hours' },
          { label: 'Up to 60 Hours (Long Battery)', value: 'Up to 60 Hours' },
        ],
      },
      {
        id: 'connectivity',
        label: 'Connectivity / Bluetooth',
        type: 'select',
        defaultValue: 'Bluetooth 5.3 + Multi-point',
        icon: 'bluetooth-outline',
        gridSpan: 'half',
        options: [
          { label: 'Bluetooth 5.3 + Dual Device Multi-point', value: 'Bluetooth 5.3 + Multi-point' },
          { label: 'Bluetooth 5.2 + AAC / SBC', value: 'Bluetooth 5.2' },
          { label: 'LDAC / Hi-Res Audio Certified', value: 'LDAC Hi-Res Audio' },
          { label: '3.5mm Aux Cable + Wireless', value: '3.5mm Aux + Wireless' },
        ],
      },
      {
        id: 'waterResistance',
        label: 'Water / Sweat Rating',
        type: 'select',
        defaultValue: 'IPX4 Splash Resistant',
        icon: 'water-outline',
        gridSpan: 'half',
        options: [
          { label: 'IPX4 Splash & Sweat Resistant', value: 'IPX4 Splash Resistant' },
          { label: 'IP55 Dust & Water Resistant', value: 'IP55 Dust & Water' },
          { label: 'IPX7 Fully Waterproof', value: 'IPX7 Waterproof' },
        ],
      },
      {
        id: 'color',
        label: 'Color',
        type: 'color',
        defaultValue: 'White',
        icon: 'color-palette-outline',
        gridSpan: 'half',
        options: [
          { label: 'White', value: 'White', color: '#F8FAFC' },
          { label: 'Black', value: 'Black', color: '#0F172A' },
          { label: 'Midnight Blue', value: 'Midnight Blue', color: '#1E3A8A' },
          { label: 'Silver', value: 'Silver', color: '#E2E4E7' },
        ],
      },
      {
        id: 'condition',
        label: 'Condition',
        type: 'select',
        defaultValue: 'Excellent',
        required: true,
        icon: 'checkmark-circle-outline',
        gridSpan: 'half',
        options: [
          { label: 'Like New (Sanitized)', value: 'Like New' },
          { label: 'Excellent', value: 'Excellent' },
          { label: 'Good', value: 'Good' },
        ],
      },
      {
        id: 'boxAccessories',
        label: 'Box & Accessories',
        type: 'select',
        defaultValue: 'With charging case & cable',
        icon: 'cube-outline',
        gridSpan: 'half',
        options: [
          { label: 'Full original box with all ear tip sizes', value: 'Original box & all ear tips' },
          { label: 'With charging case & USB cable', value: 'With charging case & cable' },
          { label: 'Earbuds & charging case only', value: 'Device & case only' },
        ],
      },
    ],
  },

  Watches: {
    categoryId: 'Watches',
    categoryName: 'Watches',
    icon: 'watch-outline',
    description: 'Apple Watches, Galaxy Watches, and fitness trackers',
    previewHighlights: [
      { label: 'Dial Size', fieldId: 'dialSize' },
      { label: 'Material', fieldId: 'caseMaterial' },
      { label: 'Network', fieldId: 'connectivity' },
      { label: 'Battery', fieldId: 'batteryHealth' },
    ],
    fields: [
      {
        id: 'dialSize',
        label: 'Case / Dial Size',
        type: 'select',
        defaultValue: '45mm',
        required: true,
        icon: 'watch-outline',
        gridSpan: 'half',
        options: [
          { label: '40mm / 41mm Compact', value: '41mm' },
          { label: '44mm / 45mm Standard', value: '45mm' },
          { label: '46mm / 47mm Classic', value: '47mm' },
          { label: '49mm Rugged Ultra', value: '49mm Ultra' },
        ],
      },
      {
        id: 'caseMaterial',
        label: 'Case Material',
        type: 'select',
        defaultValue: 'Aerospace Aluminum',
        required: true,
        icon: 'shield-outline',
        gridSpan: 'half',
        options: [
          { label: 'Aerospace Grade Aluminum', value: 'Aerospace Aluminum' },
          { label: 'Polished Stainless Steel', value: 'Stainless Steel' },
          { label: 'Aerospace Titanium', value: 'Titanium' },
          { label: 'Ceramic Case', value: 'Ceramic' },
        ],
      },
      {
        id: 'connectivity',
        label: 'Connectivity',
        type: 'select',
        defaultValue: 'GPS Only',
        required: true,
        icon: 'cellular-outline',
        gridSpan: 'half',
        options: [
          { label: 'GPS Only', value: 'GPS Only' },
          { label: 'GPS + Cellular (4G LTE)', value: 'GPS + Cellular' },
        ],
      },
      {
        id: 'strapType',
        label: 'Band / Strap Type',
        type: 'select',
        defaultValue: 'Sport Band',
        icon: 'ribbon-outline',
        gridSpan: 'half',
        options: [
          { label: 'Silicone Sport Band', value: 'Sport Band' },
          { label: 'Milanese Loop Stainless Mesh', value: 'Milanese Loop' },
          { label: 'Trail Loop / Alpine Loop', value: 'Trail Loop' },
          { label: 'Ocean Band (Water Sports)', value: 'Ocean Band' },
          { label: 'Genuine Leather Strap', value: 'Leather Strap' },
        ],
      },
      {
        id: 'color',
        label: 'Color / Finish',
        type: 'color',
        defaultValue: 'Midnight',
        icon: 'color-palette-outline',
        gridSpan: 'half',
        options: [
          { label: 'Midnight', value: 'Midnight', color: '#1E293B' },
          { label: 'Starlight', value: 'Starlight', color: '#F0EAE1' },
          { label: 'Silver', value: 'Silver', color: '#E2E4E7' },
          { label: 'Space Black', value: 'Space Black', color: '#2B2B2D' },
          { label: 'Natural Titanium', value: 'Natural Titanium', color: '#9A958E' },
        ],
      },
      {
        id: 'condition',
        label: 'Condition',
        type: 'select',
        defaultValue: 'Excellent',
        required: true,
        icon: 'checkmark-circle-outline',
        gridSpan: 'half',
        options: [
          { label: 'Like New (Pristine)', value: 'Like New' },
          { label: 'Excellent', value: 'Excellent' },
          { label: 'Good', value: 'Good' },
          { label: 'Fair', value: 'Fair' },
        ],
      },
      {
        id: 'batteryHealth',
        label: 'Battery Health',
        type: 'select',
        defaultValue: 'Above 85%',
        icon: 'battery-charging-outline',
        gridSpan: 'half',
        options: [
          { label: 'Above 90% Peak Health', value: '90%+' },
          { label: 'Above 85%', value: 'Above 85%' },
          { label: '80% - 85%', value: '80% - 85%' },
        ],
      },
      {
        id: 'healthSensors',
        label: 'Health Sensors Included',
        type: 'select',
        defaultValue: 'ECG + Blood Oxygen + Heart Rate',
        icon: 'fitness-outline',
        gridSpan: 'half',
        options: [
          { label: 'ECG + Blood Oxygen (SpO2) + Heart Rate', value: 'ECG + SpO2 + Heart Rate' },
          { label: 'Optical Heart Rate + Sleep Tracking', value: 'Heart Rate + Sleep' },
          { label: 'Body Temperature + ECG + Fall Detection', value: 'ECG + Temp + Fall Detect' },
        ],
      },
      {
        id: 'boxAccessories',
        label: 'Box & Charger',
        type: 'select',
        defaultValue: 'With magnetic fast charger cable',
        icon: 'cube-outline',
        gridSpan: 'half',
        options: [
          { label: 'Original box & magnetic fast charging cable', value: 'Original box & charger' },
          { label: 'With magnetic fast charging cable', value: 'With magnetic fast charger cable' },
          { label: 'Watch unit & strap only', value: 'Watch & strap only' },
        ],
      },
    ],
  },

  Cameras: {
    categoryId: 'Cameras',
    categoryName: 'Cameras',
    icon: 'camera-outline',
    description: 'DSLR, full-frame mirrorless, action cameras & cinema rigs',
    previewHighlights: [
      { label: 'Type', fieldId: 'cameraType' },
      { label: 'Sensor', fieldId: 'sensorResolution' },
      { label: 'Lens', fieldId: 'lensIncluded' },
      { label: 'Shutter', fieldId: 'shutterCount' },
    ],
    fields: [
      {
        id: 'cameraType',
        label: 'Camera Type',
        type: 'select',
        defaultValue: 'Mirrorless',
        required: true,
        icon: 'camera-outline',
        gridSpan: 'half',
        options: [
          { label: 'Full-Frame Mirrorless', value: 'Mirrorless' },
          { label: 'DSLR (Digital Single-Lens Reflex)', value: 'DSLR' },
          { label: 'Rugged Action Camera (Waterproof)', value: 'Action Camera' },
          { label: 'Cinema / 4K Vlogging Rig', value: 'Cinema / Vlog Cam' },
          { label: 'Premium Point & Shoot', value: 'Point & Shoot' },
        ],
      },
      {
        id: 'sensorResolution',
        label: 'Sensor & Resolution',
        type: 'select',
        defaultValue: 'Full-Frame 24.2 MP',
        required: true,
        icon: 'aperture-outline',
        gridSpan: 'half',
        options: [
          { label: 'Full-Frame 24.2 MP CMOS', value: 'Full-Frame 24.2 MP' },
          { label: 'Full-Frame 33.0 MP Exmor R', value: 'Full-Frame 33 MP' },
          { label: 'Full-Frame 45.0 MP High-Res', value: 'Full-Frame 45 MP' },
          { label: 'APS-C 26.0 MP Sensor', value: 'APS-C 26 MP' },
          { label: 'Micro Four Thirds Sensor', value: 'Micro Four Thirds' },
          { label: '1-inch CMOS Sensor (Action/Pocket)', value: '1-inch Sensor' },
        ],
      },
      {
        id: 'lensIncluded',
        label: 'Lens / Mount Included',
        type: 'select',
        defaultValue: 'Body Only',
        required: true,
        icon: 'disc-outline',
        gridSpan: 'half',
        options: [
          { label: 'Camera Body Only (No Lens)', value: 'Body Only' },
          { label: 'With 18-55mm Standard Kit Lens', value: 'With 18-55mm Kit Lens' },
          { label: 'With 24-70mm f/2.8 Pro Zoom', value: 'With 24-70mm f/2.8' },
          { label: 'With 28-70mm Kit Zoom Lens', value: 'With 28-70mm Zoom' },
          { label: 'Dual Lens Kit (Zoom + Prime)', value: 'Dual Lens Kit' },
        ],
      },
      {
        id: 'shutterCount',
        label: 'Shutter Actuation Count',
        type: 'select',
        defaultValue: 'Under 5,000 actuations',
        required: true,
        icon: 'timer-outline',
        gridSpan: 'half',
        options: [
          { label: 'Ultra Low: Under 5,000 actuations', value: 'Under 5,000 actuations' },
          { label: 'Low: 5,000 - 15,000 actuations', value: '5,000 - 15,000 actuations' },
          { label: 'Moderate: 15,000 - 35,000 actuations', value: '15,000 - 35,000 actuations' },
          { label: 'Electronic Shutter / Action Cam (N.A.)', value: 'Electronic Shutter / N.A.' },
        ],
      },
      {
        id: 'videoResolution',
        label: 'Video Capability',
        type: 'select',
        defaultValue: '4K 60fps 10-Bit',
        icon: 'videocam-outline',
        gridSpan: 'half',
        options: [
          { label: '4K 60fps 10-Bit 4:2:2 Log', value: '4K 60fps 10-Bit' },
          { label: '4K 120fps High Frame Rate', value: '4K 120fps' },
          { label: '8K 30fps Cinema Recording', value: '8K 30fps' },
          { label: '4K 30fps HDR', value: '4K 30fps HDR' },
          { label: 'Full HD 1080p 120fps Slow-Mo', value: '1080p 120fps' },
        ],
      },
      {
        id: 'condition',
        label: 'Condition',
        type: 'select',
        defaultValue: 'Excellent',
        required: true,
        icon: 'checkmark-circle-outline',
        gridSpan: 'half',
        options: [
          { label: 'Like New (Mint Condition)', value: 'Like New' },
          { label: 'Excellent (Clean Sensor & Optics)', value: 'Excellent' },
          { label: 'Good (Minor Cosmetic Wear)', value: 'Good' },
          { label: 'Fair', value: 'Fair' },
        ],
      },
      {
        id: 'mediaSlot',
        label: 'Memory Card / Media Slot',
        type: 'select',
        defaultValue: 'Dual SD UHS-II Slots',
        icon: 'card-outline',
        gridSpan: 'half',
        options: [
          { label: 'Dual SD UHS-II Card Slots', value: 'Dual SD UHS-II Slots' },
          { label: 'CFexpress Type A + SD UHS-II Slot', value: 'CFexpress Type A + SD' },
          { label: 'CFexpress Type B + SD Slot', value: 'CFexpress Type B' },
          { label: 'Single SD Card Slot', value: 'Single SD UHS-II' },
          { label: 'MicroSD Card Slot (Action Cam)', value: 'MicroSD Slot' },
        ],
      },
      {
        id: 'batteryHealth',
        label: 'Battery & Health',
        type: 'select',
        defaultValue: 'Original Battery (High Health)',
        icon: 'battery-charging-outline',
        gridSpan: 'half',
        options: [
          { label: 'Original Battery (High Health)', value: 'Original Battery (High Health)' },
          { label: '2x Genuine OEM Batteries Included', value: '2x Batteries Included' },
          { label: 'Battery + Dual Charger Combo', value: 'Battery + Dual Charger' },
        ],
      },
      {
        id: 'boxAccessories',
        label: 'Box & Accessories',
        type: 'select',
        defaultValue: 'Original box, neck strap & battery charger',
        icon: 'cube-outline',
        gridSpan: 'half',
        options: [
          { label: 'Original box, neck strap & battery charger', value: 'Original box, neck strap & charger' },
          { label: 'Camera body, battery & neck strap', value: 'Body, battery & strap' },
          { label: 'Camera body with cap only', value: 'Body with cap only' },
        ],
      },
      {
        id: 'serialNumber',
        label: 'Camera Serial Number (Optional)',
        type: 'text',
        defaultValue: '',
        placeholder: 'e.g. S01-729482...',
        icon: 'finger-print-outline',
        gridSpan: 'half',
      },
    ],
  },

  Vehicles: {
    categoryId: 'Vehicles',
    categoryName: 'Vehicles',
    icon: 'car-outline',
    description: 'Electric scooters, EV bikes, pre-owned cars & motorcycles',
    previewHighlights: [
      { label: 'Fuel / EV', fieldId: 'fuelType' },
      { label: 'Kilometers', fieldId: 'kilometersDriven' },
      { label: 'Year', fieldId: 'modelYear' },
      { label: 'Range', fieldId: 'rangeOrBattery' },
    ],
    fields: [
      {
        id: 'vehicleType',
        label: 'Vehicle Type',
        type: 'select',
        defaultValue: 'Electric Scooter',
        required: true,
        icon: 'bicycle-outline',
        gridSpan: 'half',
        options: [
          { label: 'Electric Scooter (EV)', value: 'Electric Scooter' },
          { label: 'Electric Bike / Motorcycle (EV)', value: 'Electric Bike' },
          { label: 'Electric Car / SUV (EV)', value: 'Electric Car (EV)' },
          { label: 'Commuter Motorcycle', value: 'Commuter Motorcycle' },
          { label: 'Pre-Owned Hatchback / Sedan', value: 'Hatchback / Sedan' },
          { label: 'Pre-Owned SUV', value: 'SUV' },
        ],
      },
      {
        id: 'fuelType',
        label: 'Fuel / Power Type',
        type: 'select',
        defaultValue: '100% Electric (EV)',
        required: true,
        icon: 'flash-outline',
        gridSpan: 'half',
        options: [
          { label: '100% Electric Battery (EV)', value: '100% Electric (EV)' },
          { label: 'Petrol Engine', value: 'Petrol' },
          { label: 'Hybrid (Petrol + Electric)', value: 'Strong Hybrid' },
          { label: 'Diesel Engine', value: 'Diesel' },
        ],
      },
      {
        id: 'kilometersDriven',
        label: 'Kilometers Driven (Odometer)',
        type: 'select',
        defaultValue: '5,000 - 15,000 km',
        required: true,
        icon: 'speedometer-outline',
        gridSpan: 'half',
        options: [
          { label: 'Ultra Low: Under 5,000 km', value: 'Under 5,000 km' },
          { label: 'Low: 5,000 - 15,000 km', value: '5,000 - 15,000 km' },
          { label: 'Moderate: 15,000 - 30,000 km', value: '15,000 - 30,000 km' },
          { label: '30,000 - 50,000 km', value: '30,000 - 50,000 km' },
          { label: '50,000+ km', value: '50,000+ km' },
        ],
      },
      {
        id: 'modelYear',
        label: 'Model / Registration Year',
        type: 'select',
        defaultValue: '2023',
        required: true,
        icon: 'calendar-outline',
        gridSpan: 'half',
        options: [
          { label: '2024 (Current Year)', value: '2024' },
          { label: '2023', value: '2023' },
          { label: '2022', value: '2022' },
          { label: '2021', value: '2021' },
          { label: '2020', value: '2020' },
          { label: '2019', value: '2019' },
          { label: '2018 or Earlier', value: '2018' },
        ],
      },
      {
        id: 'ownership',
        label: 'Ownership History',
        type: 'select',
        defaultValue: '1st Owner',
        required: true,
        icon: 'person-outline',
        gridSpan: 'half',
        options: [
          { label: '1st Owner (Single Handed)', value: '1st Owner' },
          { label: '2nd Owner', value: '2nd Owner' },
          { label: '3rd Owner', value: '3rd Owner' },
        ],
      },
      {
        id: 'rangeOrBattery',
        label: 'Battery Health / Range per Charge',
        type: 'select',
        defaultValue: '90%+ Battery / 120+ km Range',
        required: true,
        icon: 'battery-charging-outline',
        gridSpan: 'half',
        options: [
          { label: '90%+ Battery Health / 120+ km Range', value: '90%+ Battery / 120+ km Range' },
          { label: '85%+ Battery Health / 100 km Range', value: '85%+ Battery / 100 km Range' },
          { label: 'High Capacity 350-450 km Single Charge', value: '450 km Single Charge Range' },
          { label: 'Fuel Economy: 45-50 km/l Mileage', value: '45-50 km/l Mileage' },
          { label: 'Fuel Economy: 18-22 km/l (Car)', value: '18-22 km/l Mileage' },
        ],
      },
      {
        id: 'transmission',
        label: 'Transmission',
        type: 'select',
        defaultValue: 'Single-Speed Direct EV',
        icon: 'cog-outline',
        gridSpan: 'half',
        options: [
          { label: 'Single-Speed Direct Drive (EV)', value: 'Single-Speed Direct EV' },
          { label: 'Automatic (CVT / Torque Converter / DCT)', value: 'Automatic' },
          { label: 'Manual 5-Speed Gearbox', value: 'Manual 5-Speed' },
          { label: 'Manual 6-Speed Gearbox', value: 'Manual 6-Speed' },
        ],
      },
      {
        id: 'condition',
        label: 'Condition',
        type: 'select',
        defaultValue: 'Excellent',
        required: true,
        icon: 'checkmark-circle-outline',
        gridSpan: 'half',
        options: [
          { label: 'Pristine / Showroom Condition', value: 'Showroom Condition' },
          { label: 'Excellent (Clean Body & Battery)', value: 'Excellent' },
          { label: 'Good (Minor Scratches / Serviced)', value: 'Good' },
          { label: 'Fair', value: 'Fair' },
        ],
      },
      {
        id: 'insuranceRto',
        label: 'Insurance & Documents',
        type: 'select',
        defaultValue: 'Comprehensive Insurance Valid',
        icon: 'document-text-outline',
        gridSpan: 'half',
        options: [
          { label: 'Comprehensive Insurance Valid + Clean NOC', value: 'Comprehensive Insurance Valid' },
          { label: 'Zero Depreciation Insurance Valid', value: 'Zero Dep Insurance Valid' },
          { label: 'Third-Party Insurance Valid', value: 'Third-Party Valid' },
          { label: 'Insurance Expired (NOC Available)', value: 'Insurance Expired' },
        ],
      },
      {
        id: 'accessoriesSpares',
        label: 'Accessories & Spares',
        type: 'select',
        defaultValue: 'Home fast charger, 2 smart keys & service book',
        icon: 'cube-outline',
        gridSpan: 'half',
        options: [
          { label: 'Home fast charger, 2 smart keys & service book', value: 'Home charger, 2 keys & book' },
          { label: '2 keys, toolkit & first aid kit', value: '2 keys + toolkit' },
          { label: 'Vehicle + home charger unit', value: 'Vehicle + home charger' },
        ],
      },
      {
        id: 'registrationState',
        label: 'Registration / RTO Code (Optional)',
        type: 'text',
        defaultValue: '',
        placeholder: 'e.g. MH-12 or DL-03 registered',
        icon: 'location-outline',
        gridSpan: 'half',
      },
    ],
  },

  Accessories: {
    categoryId: 'Accessories',
    categoryName: 'Accessories',
    icon: 'hardware-chip-outline',
    description: 'Fast chargers, cables, power banks & cases',
    previewHighlights: [
      { label: 'Type', fieldId: 'accessoryType' },
      { label: 'Compatibility', fieldId: 'compatibility' },
      { label: 'Wattage', fieldId: 'wattageCapacity' },
      { label: 'Condition', fieldId: 'condition' },
    ],
    fields: [
      {
        id: 'accessoryType',
        label: 'Accessory Type',
        type: 'select',
        defaultValue: 'Fast Charger / Adapter',
        required: true,
        icon: 'flash-outline',
        gridSpan: 'half',
        options: [
          { label: 'Fast Wall Charger / Power Adapter', value: 'Fast Charger / Adapter' },
          { label: 'Braided Fast Charging Cable (Type-C / Lightning)', value: 'Fast Charging Cable' },
          { label: 'MagSafe / Qi2 Wireless Charger', value: 'Wireless Charger' },
          { label: 'High Capacity Power Bank', value: 'Power Bank' },
          { label: 'Shockproof Protective Case / Cover', value: 'Protective Case' },
          { label: 'Stylus Pen / Pencil', value: 'Stylus Pen' },
        ],
      },
      {
        id: 'compatibility',
        label: 'Device Compatibility',
        type: 'select',
        defaultValue: 'Universal Type-C Devices',
        required: true,
        icon: 'git-network-outline',
        gridSpan: 'half',
        options: [
          { label: 'Universal Type-C Devices (Phones/Laptops)', value: 'Universal Type-C' },
          { label: 'Apple iPhone / iPad (Lightning & MagSafe)', value: 'Apple MagSafe / Lightning' },
          { label: 'MacBook & USB-C Laptops (PD Fast Charge)', value: 'MacBook & Laptops' },
          { label: 'Multi-device Universal', value: 'Universal' },
        ],
      },
      {
        id: 'wattageCapacity',
        label: 'Wattage / Capacity',
        type: 'select',
        defaultValue: '67W GaN Fast Charging',
        icon: 'battery-charging-outline',
        gridSpan: 'half',
        options: [
          { label: '20W USB-C Fast Charger', value: '20W Fast Charger' },
          { label: '35W Dual USB-C GaN Charger', value: '35W Dual GaN' },
          { label: '67W GaN Fast Charging', value: '67W GaN Fast Charging' },
          { label: '100W PD Ultra Fast Charger', value: '100W PD' },
          { label: '10,000 mAh Magnetic Power Bank', value: '10,000 mAh' },
          { label: '20,000 mAh High Capacity Power Bank', value: '20,000 mAh' },
          { label: 'Not Applicable', value: 'N.A.' },
        ],
      },
      {
        id: 'color',
        label: 'Color',
        type: 'color',
        defaultValue: 'White',
        icon: 'color-palette-outline',
        gridSpan: 'half',
        options: [
          { label: 'White', value: 'White', color: '#F8FAFC' },
          { label: 'Black', value: 'Black', color: '#0F172A' },
          { label: 'Space Gray', value: 'Space Gray', color: '#64748B' },
          { label: 'Midnight Blue', value: 'Midnight Blue', color: '#1E3A8A' },
        ],
      },
      {
        id: 'condition',
        label: 'Condition',
        type: 'select',
        defaultValue: 'Brand New Sealed',
        required: true,
        icon: 'checkmark-circle-outline',
        gridSpan: 'half',
        options: [
          { label: 'Brand New (Factory Sealed)', value: 'Brand New Sealed' },
          { label: 'Like New (Open Box)', value: 'Like New' },
          { label: 'Excellent', value: 'Excellent' },
        ],
      },
      {
        id: 'boxAccessories',
        label: 'Packaging',
        type: 'select',
        defaultValue: 'Original retail packaging',
        icon: 'cube-outline',
        gridSpan: 'half',
        options: [
          { label: 'Original retail sealed packaging', value: 'Original retail packaging' },
          { label: 'Original box opened with all papers', value: 'Original box opened' },
          { label: 'Accessory only (Certified)', value: 'Accessory only' },
        ],
      },
    ],
  },
};

/**
 * Normalizes category string to matching CategorySpecConfig key
 */
export function normalizeCategoryKey(category?: string): string {
  const norm = (category || '').trim().toLowerCase();
  if (norm.includes('cam')) return 'Cameras';
  if (norm.includes('vehic') || norm.includes('car') || norm.includes('bike') || norm.includes('scooter') || norm.includes('ev')) {
    return 'Vehicles';
  }
  if (norm.includes('laptop') || norm.includes('macbook') || norm.includes('computer')) return 'Laptops';
  if (norm.includes('tablet') || norm.includes('pad')) return 'Tablets';
  if (norm.includes('watch') || norm.includes('wearable')) return 'Watches';
  if (norm.includes('ear') || norm.includes('audio') || norm.includes('headphone') || norm.includes('sound')) return 'Audio';
  if (norm.includes('access') || norm.includes('cable') || norm.includes('charger')) return 'Accessories';
  return 'Smartphones';
}

/**
 * Returns the specification configuration for a given category.
 */
export function getSpecConfigForCategory(category?: string): CategorySpecConfig {
  const key = normalizeCategoryKey(category);
  return CATEGORY_SPEC_CONFIGS[key] || CATEGORY_SPEC_CONFIGS.Smartphones;
}

/**
 * Returns default field values for a category.
 */
export function getDefaultSpecsForCategory(category?: string): Record<string, string> {
  const config = getSpecConfigForCategory(category);
  const defaults: Record<string, string> = {};
  config.fields.forEach((field) => {
    defaults[field.id] = field.defaultValue;
  });
  return defaults;
}

export interface CustomSpecItem {
  id: string;
  key: string;
  value: string;
}

/**
 * Parses existing product.specs array into structured category fields and custom specs.
 */
export function parseExistingSpecs(
  specs: string[] | undefined,
  category?: string
): { specValues: Record<string, string>; customSpecs: CustomSpecItem[] } {
  const config = getSpecConfigForCategory(category);
  const specValues = getDefaultSpecsForCategory(category);
  const customSpecs: CustomSpecItem[] = [];

  if (!Array.isArray(specs) || specs.length === 0) {
    return { specValues, customSpecs };
  }

  const fieldKeyMap: Record<string, string> = {};
  config.fields.forEach((f) => {
    fieldKeyMap[f.label.toLowerCase()] = f.id;
    fieldKeyMap[f.id.toLowerCase()] = f.id;
  });

  // Additional fuzzy mappings
  fieldKeyMap['storage'] = 'storage';
  fieldKeyMap['ram'] = 'ram';
  fieldKeyMap['color'] = 'color';
  fieldKeyMap['condition'] = 'condition';
  fieldKeyMap['battery health'] = 'batteryHealth';
  fieldKeyMap['battery'] = 'batteryHealth';
  fieldKeyMap['accessories'] = 'boxAccessories';
  fieldKeyMap['box & accessories'] = 'boxAccessories';
  fieldKeyMap['imei'] = 'imei';
  fieldKeyMap['processor'] = 'processor';
  fieldKeyMap['screen size'] = 'screenSize';
  fieldKeyMap['display'] = 'screenSize';
  fieldKeyMap['graphics'] = 'graphics';
  fieldKeyMap['gpu'] = 'graphics';
  fieldKeyMap['operating system'] = 'operatingSystem';
  fieldKeyMap['os'] = 'operatingSystem';
  fieldKeyMap['camera type'] = 'cameraType';
  fieldKeyMap['sensor'] = 'sensorResolution';
  fieldKeyMap['lens'] = 'lensIncluded';
  fieldKeyMap['shutter count'] = 'shutterCount';
  fieldKeyMap['video'] = 'videoResolution';
  fieldKeyMap['vehicle type'] = 'vehicleType';
  fieldKeyMap['fuel type'] = 'fuelType';
  fieldKeyMap['kilometers driven'] = 'kilometersDriven';
  fieldKeyMap['mileage'] = 'kilometersDriven';
  fieldKeyMap['year'] = 'modelYear';
  fieldKeyMap['model year'] = 'modelYear';
  fieldKeyMap['ownership'] = 'ownership';
  fieldKeyMap['range'] = 'rangeOrBattery';
  fieldKeyMap['transmission'] = 'transmission';
  fieldKeyMap['insurance'] = 'insuranceRto';

  specs.forEach((item, index) => {
    if (typeof item !== 'string' || !item.trim()) return;
    const colonIdx = item.indexOf(':');
    if (colonIdx !== -1) {
      const rawKey = item.slice(0, colonIdx).trim();
      const rawVal = item.slice(colonIdx + 1).trim();
      const matchedFieldId = fieldKeyMap[rawKey.toLowerCase()];

      if (matchedFieldId && specValues[matchedFieldId] !== undefined) {
        specValues[matchedFieldId] = rawVal;
      } else {
        customSpecs.push({
          id: `custom-${index}-${Date.now()}`,
          key: rawKey,
          value: rawVal,
        });
      }
    } else {
      customSpecs.push({
        id: `custom-${index}-${Date.now()}`,
        key: 'Specification',
        value: item.trim(),
      });
    }
  });

  return { specValues, customSpecs };
}

/**
 * Builds the final string array payload for the `specs` field on save.
 */
export function buildSpecsPayload(
  category: string,
  specValues: Record<string, string>,
  customSpecs: CustomSpecItem[]
): string[] {
  const config = getSpecConfigForCategory(category);
  const result: string[] = [];

  config.fields.forEach((field) => {
    const val = specValues[field.id]?.trim();
    if (val) {
      result.push(`${field.label}: ${val}`);
    }
  });

  customSpecs.forEach((cs) => {
    const k = cs.key.trim();
    const v = cs.value.trim();
    if (k && v) {
      result.push(`${k}: ${v}`);
    }
  });

  return result;
}
