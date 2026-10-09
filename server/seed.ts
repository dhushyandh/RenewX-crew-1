import { connectDB } from './config/db';
import { User } from './models/User';
import { ProductModel } from './models/Product';
import { BrandModel } from './models/Brand';
import { DeviceModelModel } from './models/DeviceModel';
import { env } from './config/env';

export const KNOWN_BRANDS = [
  // --- EXISTING 17 BRANDS ---
  {
    name: 'Apple',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/960px-Apple_logo_black.svg.png',
    category: 'SMARTPHONES',
    description: 'Pioneering premium smartphones, MacBooks, iPads, and Apple Silicon hardware.',
  },
  {
    name: 'Samsung',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a7/Samsung_logo.svg/960px-Samsung_logo.svg.png',
    category: 'SMARTPHONES',
    description: 'Global leader in Dynamic AMOLED displays, Galaxy S flagships, and foldable innovations.',
  },
  {
    name: 'Google Pixel',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/960px-Google_2015_logo.svg.png',
    category: 'SMARTPHONES',
    description: 'Pure Android flagship experience powered by Google Tensor and computational AI.',
  },
  {
    name: 'OnePlus',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f8/OP_LU_Reg_1L_RGB_red_copy-01.svg/960px-OP_LU_Reg_1L_RGB_red_copy-01.svg.png',
    category: 'SMARTPHONES',
    description: 'Never Settle philosophy delivering ultra-fast Warp/SUPERVOOC charging and fluid OxygenOS.',
  },
  {
    name: 'Xiaomi',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ae/Xiaomi_logo_%282021-%29.svg/960px-Xiaomi_logo_%282021-%29.svg.png',
    category: 'SMARTPHONES',
    description: 'High-performance flagships with Leica optical systems and groundbreaking HyperOS.',
  },
  {
    name: 'Nothing',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4e/Nothing_Phone_1_wordmark.svg/960px-Nothing_Phone_1_wordmark.svg.png',
    category: 'SMARTPHONES',
    description: 'Distinctive transparent Glyph interface design paired with minimalist Nothing OS.',
  },
  {
    name: 'Sony',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/Sony_logo.svg/960px-Sony_logo.svg.png',
    category: 'AUDIO',
    description: 'World-class WH/WF noise-canceling audio, Alpha mirrorless cameras, and PlayStation gaming.',
  },
  {
    name: 'Dell',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/48/Dell_Logo.svg/960px-Dell_Logo.svg.png',
    category: 'LAPTOPS',
    description: 'Ultra-premium XPS infinity-edge ultrabooks and enterprise-grade Latitude workstations.',
  },
  {
    name: 'HP',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ad/HP_logo_2012.svg/960px-HP_logo_2012.svg.png',
    category: 'LAPTOPS',
    description: 'Precision-crafted Spectre x360 convertibles, Envy laptops, and OMEN gaming powerhouses.',
  },
  {
    name: 'Lenovo',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b8/Lenovo_logo_2015.svg/960px-Lenovo_logo_2015.svg.png',
    category: 'LAPTOPS',
    description: 'Legendary ThinkPad mil-spec reliability, Yoga versatility, and Legion gaming machines.',
  },
  {
    name: 'ASUS',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2e/ASUS_Logo.svg/960px-ASUS_Logo.svg.png',
    category: 'LAPTOPS',
    description: 'Pioneering ROG Zephyrus gaming powerhouses and Zenbook OLED dual-screen ultrabooks.',
  },
  {
    name: 'Realme',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a2/Realme_logo.svg/960px-Realme_logo.svg.png',
    category: 'SMARTPHONES',
    description: 'Youth-focused powerhouse flagships with ultra-fast charging and standout aesthetics.',
  },
  {
    name: 'Vivo',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/04/Vivo_%28China%29_logo.svg/960px-Vivo_%28China%29_logo.svg.png',
    category: 'SMARTPHONES',
    description: 'Trailblazing mobile imaging engineered with ZEISS optics and gimbal stabilization.',
  },
  {
    name: 'Motorola',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e5/Motorola_logo.svg/960px-Motorola_logo.svg.png',
    category: 'SMARTPHONES',
    description: 'Iconic Razr flip smartphones and clean, near-stock Android software experience.',
  },
  {
    name: 'Bose',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/Bose_logo.svg/960px-Bose_logo.svg.png',
    category: 'AUDIO',
    description: 'Benchmark spatial audio acoustics and unmatched active noise cancellation.',
  },
  {
    name: 'Canon',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8d/Canon_logo.svg/960px-Canon_logo.svg.png',
    category: 'CAMERAS',
    description: 'World-renowned EOS R mirrorless full-frame cameras and professional L-series optics.',
  },
  {
    name: 'Nikon',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f3/Nikon_Logo.svg/960px-Nikon_Logo.svg.png',
    category: 'CAMERAS',
    description: 'Pioneering Z-mount full-frame mirrorless imaging and iconic Japanese craftsmanship.',
  },

  // --- NEW 15 EXPANDED BRANDS ---
  {
    name: 'Microsoft',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/96/Microsoft_logo_%282012%29.svg/960px-Microsoft_logo_%282012%29.svg.png',
    category: 'LAPTOPS',
    description: 'Premium Surface 2-in-1 devices, Copilot+ PCs, and Xbox Series gaming consoles.',
  },
  {
    name: 'Acer',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/00/Acer_2011.svg/960px-Acer_2011.svg.png',
    category: 'LAPTOPS',
    description: 'Innovative Predator gaming beasts and ultra-lightweight Swift OLED ultrabooks.',
  },
  {
    name: 'MSI',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/47/Micro-Star_International_logo2020.svg/960px-Micro-Star_International_logo2020.svg.png',
    category: 'LAPTOPS',
    description: 'Elite gaming hardware, high-end Creator notebooks, and Titan workstation power.',
  },
  {
    name: 'Razer',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/52/Razer_wordmark.svg/960px-Razer_wordmark.svg.png',
    category: 'LAPTOPS',
    description: 'For Gamers. By Gamers. CNC anodized aluminum Blade laptops and gaming gear.',
  },
  {
    name: 'Oppo',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0a/OPPO_LOGO_2019.svg/960px-OPPO_LOGO_2019.svg.png',
    category: 'SMARTPHONES',
    description: 'Camera-centric Find flagships, Hasselblad portraits, and industry-leading SuperVOOC fast charging.',
  },
  {
    name: 'iQOO',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/aa/IQOO_logo.svg/960px-IQOO_logo.svg.png',
    category: 'SMARTPHONES',
    description: 'Performance-obsessed e-sports grade smartphones with vapor cooling and high frame rates.',
  },
  {
    name: 'Garmin',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/Garmin_logo_2006.svg/960px-Garmin_logo_2006.svg.png',
    category: 'WEARABLES',
    description: 'Professional multi-sport GPS smartwatches, solar sapphire durability, and elite athletic tracking.',
  },
  {
    name: 'Fitbit',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e0/Fitbit_logo.svg/960px-Fitbit_logo.svg.png',
    category: 'WEARABLES',
    description: 'Pioneering health, sleep, and heart-rate tracking wearable bands and smartwatches.',
  },
  {
    name: 'JBL',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bc/JBL_logo.svg/960px-JBL_logo.svg.png',
    category: 'AUDIO',
    description: 'Legendary JBL Pro Sound, rugged portable Bluetooth speakers, and bass-heavy audio gear.',
  },
  {
    name: 'Marshall',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/69/Marshall_logo.svg/960px-Marshall_logo.svg.png',
    category: 'AUDIO',
    description: 'Iconic vintage rock & roll aesthetics, brass accents, and room-filling multidirectional sound.',
  },
  {
    name: 'Sennheiser',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/11/Sennheiser_logo_%282019%29.svg/960px-Sennheiser_logo_%282019%29.svg.png',
    category: 'AUDIO',
    description: 'German precision audiophile engineering, reference studio monitors, and Momentum ANC headphones.',
  },
  {
    name: 'GoPro',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c3/GoPro_logo.svg/960px-GoPro_logo.svg.png',
    category: 'CAMERAS',
    description: 'World standard rugged waterproof action cameras with HyperSmooth stabilization.',
  },
  {
    name: 'DJI',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/DJI_Innovations_logo.svg/960px-DJI_Innovations_logo.svg.png',
    category: 'CAMERAS',
    description: 'World-leading aerial drones, 3-axis gimbal cameras, and Osmo handheld stabilization.',
  },
  {
    name: 'Fujifilm',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/Fujifilm_logo.svg/960px-Fujifilm_logo.svg.png',
    category: 'CAMERAS',
    description: 'Legendary film simulation color science, X-Trans sensors, and rangefinder aesthetics.',
  },
  {
    name: 'Nintendo',
    logo_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/Nintendo_logo.svg/960px-Nintendo_logo.svg.png',
    category: 'GAMING',
    description: 'Pioneering hybrid video game consoles and world-beloved interactive entertainment systems.',
  },
];

export const KNOWN_MODELS = [
  // ================= APPLE =================
  { brand_name: 'Apple', name: 'iPhone 16 Pro Max', category: 'smartphones', release_year: 2024, base_price: 119900, storage_options: ['256GB', '512GB', '1TB'], is_featured: true },
  { brand_name: 'Apple', name: 'iPhone 16 Pro', category: 'smartphones', release_year: 2024, base_price: 104900, storage_options: ['128GB', '256GB', '512GB', '1TB'], is_featured: true },
  { brand_name: 'Apple', name: 'iPhone 16 Plus', category: 'smartphones', release_year: 2024, base_price: 79900, storage_options: ['128GB', '256GB', '512GB'], is_featured: false },
  { brand_name: 'Apple', name: 'iPhone 16', category: 'smartphones', release_year: 2024, base_price: 69900, storage_options: ['128GB', '256GB', '512GB'], is_featured: true },
  { brand_name: 'Apple', name: 'iPhone 15 Pro Max', category: 'smartphones', release_year: 2023, base_price: 89900, storage_options: ['256GB', '512GB', '1TB'], is_featured: true },
  { brand_name: 'Apple', name: 'iPhone 15 Pro', category: 'smartphones', release_year: 2023, base_price: 78900, storage_options: ['128GB', '256GB', '512GB', '1TB'], is_featured: false },
  { brand_name: 'Apple', name: 'iPhone 15', category: 'smartphones', release_year: 2023, base_price: 54900, storage_options: ['128GB', '256GB', '512GB'], is_featured: true },
  { brand_name: 'Apple', name: 'iPhone 14 Pro Max', category: 'smartphones', release_year: 2022, base_price: 68900, storage_options: ['128GB', '256GB', '512GB', '1TB'], is_featured: false },
  { brand_name: 'Apple', name: 'iPhone 14 Pro', category: 'smartphones', release_year: 2022, base_price: 59900, storage_options: ['128GB', '256GB', '512GB'], is_featured: false },
  { brand_name: 'Apple', name: 'iPhone 14', category: 'smartphones', release_year: 2022, base_price: 45900, storage_options: ['128GB', '256GB', '512GB'], is_featured: false },
  { brand_name: 'Apple', name: 'iPhone 13 Pro Max', category: 'smartphones', release_year: 2021, base_price: 52900, storage_options: ['128GB', '256GB', '512GB'], is_featured: false },
  { brand_name: 'Apple', name: 'iPhone 13', category: 'smartphones', release_year: 2021, base_price: 39900, storage_options: ['128GB', '256GB', '512GB'], is_featured: true },
  { brand_name: 'Apple', name: 'iPhone 12 Pro Max', category: 'smartphones', release_year: 2020, base_price: 41900, storage_options: ['128GB', '256GB', '512GB'], is_featured: false },
  { brand_name: 'Apple', name: 'iPhone 12', category: 'smartphones', release_year: 2020, base_price: 29900, storage_options: ['64GB', '128GB', '256GB'], is_featured: false },
  { brand_name: 'Apple', name: 'iPhone 11 Pro Max', category: 'smartphones', release_year: 2019, base_price: 31900, storage_options: ['64GB', '256GB', '512GB'], is_featured: false },
  { brand_name: 'Apple', name: 'iPhone 11', category: 'smartphones', release_year: 2019, base_price: 22900, storage_options: ['64GB', '128GB'], is_featured: false },
  { brand_name: 'Apple', name: 'iPhone SE (3rd Gen)', category: 'smartphones', release_year: 2022, base_price: 24900, storage_options: ['64GB', '128GB'], is_featured: false },
  { brand_name: 'Apple', name: 'MacBook Pro 16" M3 Max', category: 'laptops', release_year: 2023, base_price: 249000, storage_options: ['512GB', '1TB', '2TB'], is_featured: true },
  { brand_name: 'Apple', name: 'MacBook Pro 14" M3 Pro', category: 'laptops', release_year: 2023, base_price: 169000, storage_options: ['512GB', '1TB'], is_featured: true },
  { brand_name: 'Apple', name: 'MacBook Air 15" M3', category: 'laptops', release_year: 2024, base_price: 114900, storage_options: ['256GB', '512GB'], is_featured: true },
  { brand_name: 'Apple', name: 'MacBook Air 13" M2', category: 'laptops', release_year: 2022, base_price: 79900, storage_options: ['256GB', '512GB'], is_featured: true },
  { brand_name: 'Apple', name: 'MacBook Pro 13" M2', category: 'laptops', release_year: 2022, base_price: 89900, storage_options: ['256GB', '512GB'], is_featured: false },
  { brand_name: 'Apple', name: 'iPad Pro 13" M4', category: 'tablets', release_year: 2024, base_price: 119900, storage_options: ['256GB', '512GB', '1TB', '2TB'], is_featured: true },
  { brand_name: 'Apple', name: 'iPad Pro 12.9" M2', category: 'tablets', release_year: 2022, base_price: 84900, storage_options: ['128GB', '256GB', '512GB', '1TB'], is_featured: false },
  { brand_name: 'Apple', name: 'iPad Air 11" M2', category: 'tablets', release_year: 2024, base_price: 54900, storage_options: ['128GB', '256GB', '512GB'], is_featured: true },
  { brand_name: 'Apple', name: 'iPad mini 6th Gen', category: 'tablets', release_year: 2021, base_price: 38900, storage_options: ['64GB', '256GB'], is_featured: false },
  { brand_name: 'Apple', name: 'iPad 10th Gen', category: 'tablets', release_year: 2022, base_price: 31900, storage_options: ['64GB', '256GB'], is_featured: false },
  { brand_name: 'Apple', name: 'Apple Watch Ultra 2', category: 'wearables', release_year: 2023, base_price: 64900, storage_options: ['64GB'], is_featured: true },
  { brand_name: 'Apple', name: 'Apple Watch Series 9', category: 'wearables', release_year: 2023, base_price: 32900, storage_options: ['64GB'], is_featured: false },
  { brand_name: 'Apple', name: 'AirPods Pro (2nd Gen)', category: 'audio', release_year: 2023, base_price: 18900, storage_options: ['Standard'], is_featured: true },
  { brand_name: 'Apple', name: 'AirPods Max', category: 'audio', release_year: 2020, base_price: 37900, storage_options: ['Standard'], is_featured: false },

  // ================= SAMSUNG =================
  { brand_name: 'Samsung', name: 'Galaxy S24 Ultra', category: 'smartphones', release_year: 2024, base_price: 98999, storage_options: ['256GB', '512GB', '1TB'], is_featured: true },
  { brand_name: 'Samsung', name: 'Galaxy S24+', category: 'smartphones', release_year: 2024, base_price: 74999, storage_options: ['256GB', '512GB'], is_featured: false },
  { brand_name: 'Samsung', name: 'Galaxy S24', category: 'smartphones', release_year: 2024, base_price: 59999, storage_options: ['128GB', '256GB'], is_featured: true },
  { brand_name: 'Samsung', name: 'Galaxy S23 Ultra', category: 'smartphones', release_year: 2023, base_price: 69999, storage_options: ['256GB', '512GB', '1TB'], is_featured: true },
  { brand_name: 'Samsung', name: 'Galaxy S23+', category: 'smartphones', release_year: 2023, base_price: 51999, storage_options: ['256GB', '512GB'], is_featured: false },
  { brand_name: 'Samsung', name: 'Galaxy S23 FE', category: 'smartphones', release_year: 2023, base_price: 36999, storage_options: ['128GB', '256GB'], is_featured: false },
  { brand_name: 'Samsung', name: 'Galaxy S22 Ultra', category: 'smartphones', release_year: 2022, base_price: 49999, storage_options: ['128GB', '256GB', '512GB'], is_featured: false },
  { brand_name: 'Samsung', name: 'Galaxy S22', category: 'smartphones', release_year: 2022, base_price: 32999, storage_options: ['128GB', '256GB'], is_featured: false },
  { brand_name: 'Samsung', name: 'Galaxy Note 20 Ultra 5G', category: 'smartphones', release_year: 2020, base_price: 34999, storage_options: ['128GB', '256GB', '512GB'], is_featured: false },
  { brand_name: 'Samsung', name: 'Galaxy Z Fold 6', category: 'smartphones', release_year: 2024, base_price: 139999, storage_options: ['256GB', '512GB', '1TB'], is_featured: true },
  { brand_name: 'Samsung', name: 'Galaxy Z Fold 5', category: 'smartphones', release_year: 2023, base_price: 99999, storage_options: ['256GB', '512GB'], is_featured: false },
  { brand_name: 'Samsung', name: 'Galaxy Z Fold 4', category: 'smartphones', release_year: 2022, base_price: 74999, storage_options: ['256GB', '512GB'], is_featured: false },
  { brand_name: 'Samsung', name: 'Galaxy Z Flip 6', category: 'smartphones', release_year: 2024, base_price: 79999, storage_options: ['256GB', '512GB'], is_featured: true },
  { brand_name: 'Samsung', name: 'Galaxy Z Flip 5', category: 'smartphones', release_year: 2023, base_price: 54999, storage_options: ['256GB', '512GB'], is_featured: false },
  { brand_name: 'Samsung', name: 'Galaxy A55 5G', category: 'smartphones', release_year: 2024, base_price: 29999, storage_options: ['128GB', '256GB'], is_featured: false },
  { brand_name: 'Samsung', name: 'Galaxy Tab S9 Ultra', category: 'tablets', release_year: 2023, base_price: 89999, storage_options: ['256GB', '512GB', '1TB'], is_featured: true },
  { brand_name: 'Samsung', name: 'Galaxy Tab S9 FE', category: 'tablets', release_year: 2023, base_price: 34999, storage_options: ['128GB', '256GB'], is_featured: false },
  { brand_name: 'Samsung', name: 'Galaxy Watch 6 Classic', category: 'wearables', release_year: 2023, base_price: 22999, storage_options: ['Standard'], is_featured: false },
  { brand_name: 'Samsung', name: 'Galaxy Buds2 Pro', category: 'audio', release_year: 2023, base_price: 11999, storage_options: ['Standard'], is_featured: false },

  // ================= GOOGLE PIXEL =================
  { brand_name: 'Google Pixel', name: 'Pixel 9 Pro Fold', category: 'smartphones', release_year: 2024, base_price: 134999, storage_options: ['256GB', '512GB'], is_featured: true },
  { brand_name: 'Google Pixel', name: 'Pixel 9 Pro XL', category: 'smartphones', release_year: 2024, base_price: 89999, storage_options: ['128GB', '256GB', '512GB'], is_featured: true },
  { brand_name: 'Google Pixel', name: 'Pixel 9 Pro', category: 'smartphones', release_year: 2024, base_price: 79999, storage_options: ['128GB', '256GB', '512GB'], is_featured: true },
  { brand_name: 'Google Pixel', name: 'Pixel 9', category: 'smartphones', release_year: 2024, base_price: 59999, storage_options: ['128GB', '256GB'], is_featured: true },
  { brand_name: 'Google Pixel', name: 'Pixel 8 Pro', category: 'smartphones', release_year: 2023, base_price: 54999, storage_options: ['128GB', '256GB', '512GB'], is_featured: true },
  { brand_name: 'Google Pixel', name: 'Pixel 8', category: 'smartphones', release_year: 2023, base_price: 42999, storage_options: ['128GB', '256GB'], is_featured: false },
  { brand_name: 'Google Pixel', name: 'Pixel 8a', category: 'smartphones', release_year: 2024, base_price: 37999, storage_options: ['128GB', '256GB'], is_featured: true },
  { brand_name: 'Google Pixel', name: 'Pixel 7 Pro', category: 'smartphones', release_year: 2022, base_price: 34999, storage_options: ['128GB', '256GB'], is_featured: false },
  { brand_name: 'Google Pixel', name: 'Pixel 7', category: 'smartphones', release_year: 2022, base_price: 27999, storage_options: ['128GB'], is_featured: false },
  { brand_name: 'Google Pixel', name: 'Pixel 7a', category: 'smartphones', release_year: 2023, base_price: 24999, storage_options: ['128GB'], is_featured: false },
  { brand_name: 'Google Pixel', name: 'Pixel 6 Pro', category: 'smartphones', release_year: 2021, base_price: 21999, storage_options: ['128GB', '256GB'], is_featured: false },
  { brand_name: 'Google Pixel', name: 'Pixel Watch 2', category: 'wearables', release_year: 2023, base_price: 21999, storage_options: ['Standard'], is_featured: false },

  // ================= ONEPLUS =================
  { brand_name: 'OnePlus', name: 'OnePlus 12', category: 'smartphones', release_year: 2024, base_price: 56999, storage_options: ['256GB', '512GB'], is_featured: true },
  { brand_name: 'OnePlus', name: 'OnePlus 12R', category: 'smartphones', release_year: 2024, base_price: 36999, storage_options: ['128GB', '256GB'], is_featured: true },
  { brand_name: 'OnePlus', name: 'OnePlus Open', category: 'smartphones', release_year: 2023, base_price: 99999, storage_options: ['512GB'], is_featured: true },
  { brand_name: 'OnePlus', name: 'OnePlus 11 5G', category: 'smartphones', release_year: 2023, base_price: 41999, storage_options: ['128GB', '256GB'], is_featured: false },
  { brand_name: 'OnePlus', name: 'OnePlus 11R', category: 'smartphones', release_year: 2023, base_price: 27999, storage_options: ['128GB', '256GB'], is_featured: false },
  { brand_name: 'OnePlus', name: 'OnePlus 10 Pro', category: 'smartphones', release_year: 2022, base_price: 29999, storage_options: ['128GB', '256GB'], is_featured: false },
  { brand_name: 'OnePlus', name: 'OnePlus 9 Pro 5G', category: 'smartphones', release_year: 2021, base_price: 23999, storage_options: ['128GB', '256GB'], is_featured: false },
  { brand_name: 'OnePlus', name: 'OnePlus Nord 4', category: 'smartphones', release_year: 2024, base_price: 27999, storage_options: ['128GB', '256GB'], is_featured: true },
  { brand_name: 'OnePlus', name: 'OnePlus Nord CE 4', category: 'smartphones', release_year: 2024, base_price: 21999, storage_options: ['128GB', '256GB'], is_featured: false },
  { brand_name: 'OnePlus', name: 'OnePlus Pad 2', category: 'tablets', release_year: 2024, base_price: 38999, storage_options: ['128GB', '256GB'], is_featured: true },

  // ================= XIAOMI =================
  { brand_name: 'Xiaomi', name: 'Xiaomi 14 Ultra', category: 'smartphones', release_year: 2024, base_price: 89999, storage_options: ['512GB'], is_featured: true },
  { brand_name: 'Xiaomi', name: 'Xiaomi 14', category: 'smartphones', release_year: 2024, base_price: 54999, storage_options: ['256GB', '512GB'], is_featured: true },
  { brand_name: 'Xiaomi', name: 'Xiaomi 13 Pro', category: 'smartphones', release_year: 2023, base_price: 44999, storage_options: ['256GB'], is_featured: false },
  { brand_name: 'Xiaomi', name: 'Redmi Note 13 Pro+ 5G', category: 'smartphones', release_year: 2024, base_price: 26999, storage_options: ['256GB', '512GB'], is_featured: true },
  { brand_name: 'Xiaomi', name: 'Redmi Note 13 Pro', category: 'smartphones', release_year: 2024, base_price: 21999, storage_options: ['128GB', '256GB'], is_featured: false },
  { brand_name: 'Xiaomi', name: 'POCO F6 Pro', category: 'smartphones', release_year: 2024, base_price: 31999, storage_options: ['256GB', '512GB'], is_featured: true },
  { brand_name: 'Xiaomi', name: 'POCO X6 Pro 5G', category: 'smartphones', release_year: 2024, base_price: 22999, storage_options: ['256GB', '512GB'], is_featured: false },
  { brand_name: 'Xiaomi', name: 'Xiaomi Pad 6', category: 'tablets', release_year: 2023, base_price: 22999, storage_options: ['128GB', '256GB'], is_featured: true },

  // ================= NOTHING =================
  { brand_name: 'Nothing', name: 'Nothing Phone (2)', category: 'smartphones', release_year: 2023, base_price: 34999, storage_options: ['128GB', '256GB', '512GB'], is_featured: true },
  { brand_name: 'Nothing', name: 'Nothing Phone (2a)', category: 'smartphones', release_year: 2024, base_price: 21999, storage_options: ['128GB', '256GB'], is_featured: true },
  { brand_name: 'Nothing', name: 'Nothing Phone (2a) Plus', category: 'smartphones', release_year: 2024, base_price: 24999, storage_options: ['256GB'], is_featured: true },
  { brand_name: 'Nothing', name: 'Nothing Phone (1)', category: 'smartphones', release_year: 2022, base_price: 21999, storage_options: ['128GB', '256GB'], is_featured: false },
  { brand_name: 'Nothing', name: 'CMF Phone 1', category: 'smartphones', release_year: 2024, base_price: 14999, storage_options: ['128GB'], is_featured: true },
  { brand_name: 'Nothing', name: 'Nothing Ear (2)', category: 'audio', release_year: 2023, base_price: 7999, storage_options: ['Standard'], is_featured: false },

  // ================= SONY =================
  { brand_name: 'Sony', name: 'WH-1000XM5 Wireless Headphones', category: 'audio', release_year: 2022, base_price: 22499, storage_options: ['Standard'], is_featured: true },
  { brand_name: 'Sony', name: 'WH-1000XM4 Wireless Headphones', category: 'audio', release_year: 2021, base_price: 16999, storage_options: ['Standard'], is_featured: true },
  { brand_name: 'Sony', name: 'WF-1000XM5 True Wireless', category: 'audio', release_year: 2023, base_price: 18999, storage_options: ['Standard'], is_featured: true },
  { brand_name: 'Sony', name: 'Alpha A7 IV Mirrorless Body', category: 'cameras', release_year: 2022, base_price: 168999, storage_options: ['Body Only', 'Kit 28-70mm'], is_featured: true },
  { brand_name: 'Sony', name: 'Alpha A7R V High-Res Body', category: 'cameras', release_year: 2023, base_price: 279999, storage_options: ['Body Only'], is_featured: true },
  { brand_name: 'Sony', name: 'Alpha 7C II Compact Body', category: 'cameras', release_year: 2023, base_price: 154999, storage_options: ['Body Only'], is_featured: false },
  { brand_name: 'Sony', name: 'Sony Xperia 1 VI', category: 'smartphones', release_year: 2024, base_price: 99999, storage_options: ['256GB', '512GB'], is_featured: true },
  { brand_name: 'Sony', name: 'Sony Xperia 5 V', category: 'smartphones', release_year: 2023, base_price: 69999, storage_options: ['128GB', '256GB'], is_featured: false },
  { brand_name: 'Sony', name: 'PlayStation 5 Slim 1TB', category: 'gaming', release_year: 2023, base_price: 44999, storage_options: ['1TB SSD'], is_featured: true },
  { brand_name: 'Sony', name: 'PlayStation VR2 Horizon Bundle', category: 'gaming', release_year: 2023, base_price: 42999, storage_options: ['Standard'], is_featured: false },

  // ================= DELL =================
  { brand_name: 'Dell', name: 'Dell XPS 16 (9640)', category: 'laptops', release_year: 2024, base_price: 189999, storage_options: ['512GB', '1TB', '2TB'], is_featured: true },
  { brand_name: 'Dell', name: 'Dell XPS 15 (9530)', category: 'laptops', release_year: 2023, base_price: 144999, storage_options: ['512GB', '1TB'], is_featured: true },
  { brand_name: 'Dell', name: 'Dell XPS 14 (9440)', category: 'laptops', release_year: 2024, base_price: 149999, storage_options: ['512GB', '1TB'], is_featured: true },
  { brand_name: 'Dell', name: 'Dell XPS 13 Plus (9320)', category: 'laptops', release_year: 2023, base_price: 114999, storage_options: ['512GB', '1TB'], is_featured: true },
  { brand_name: 'Dell', name: 'Alienware m16 R2', category: 'laptops', release_year: 2024, base_price: 159999, storage_options: ['1TB', '2TB'], is_featured: true },
  { brand_name: 'Dell', name: 'Dell Inspiron 16 Plus', category: 'laptops', release_year: 2023, base_price: 79999, storage_options: ['512GB', '1TB'], is_featured: false },
  { brand_name: 'Dell', name: 'Dell Latitude 7440', category: 'laptops', release_year: 2023, base_price: 89999, storage_options: ['512GB', '1TB'], is_featured: false },

  // ================= HP =================
  { brand_name: 'HP', name: 'HP Spectre x360 16', category: 'laptops', release_year: 2024, base_price: 154999, storage_options: ['512GB', '1TB', '2TB'], is_featured: true },
  { brand_name: 'HP', name: 'HP Spectre x360 14', category: 'laptops', release_year: 2024, base_price: 139999, storage_options: ['512GB', '1TB'], is_featured: true },
  { brand_name: 'HP', name: 'HP Envy x360 15', category: 'laptops', release_year: 2023, base_price: 79999, storage_options: ['512GB', '1TB'], is_featured: false },
  { brand_name: 'HP', name: 'HP OMEN 16 Gaming Laptop', category: 'laptops', release_year: 2024, base_price: 114999, storage_options: ['1TB'], is_featured: true },
  { brand_name: 'HP', name: 'HP Pavilion Plus 14', category: 'laptops', release_year: 2023, base_price: 64999, storage_options: ['512GB', '1TB'], is_featured: false },

  // ================= LENOVO =================
  { brand_name: 'Lenovo', name: 'ThinkPad X1 Carbon Gen 12', category: 'laptops', release_year: 2024, base_price: 169999, storage_options: ['512GB', '1TB', '2TB'], is_featured: true },
  { brand_name: 'Lenovo', name: 'ThinkPad X1 Carbon Gen 11', category: 'laptops', release_year: 2023, base_price: 119999, storage_options: ['512GB', '1TB'], is_featured: true },
  { brand_name: 'Lenovo', name: 'ThinkPad T14s Gen 4', category: 'laptops', release_year: 2023, base_price: 84999, storage_options: ['512GB', '1TB'], is_featured: false },
  { brand_name: 'Lenovo', name: 'Legion Pro 7i Gen 9', category: 'laptops', release_year: 2024, base_price: 189999, storage_options: ['1TB', '2TB'], is_featured: true },
  { brand_name: 'Lenovo', name: 'Legion Slim 5', category: 'laptops', release_year: 2023, base_price: 94999, storage_options: ['512GB', '1TB'], is_featured: false },
  { brand_name: 'Lenovo', name: 'Yoga 9i Dual OLED 2-in-1', category: 'laptops', release_year: 2024, base_price: 134999, storage_options: ['512GB', '1TB'], is_featured: true },

  // ================= ASUS =================
  { brand_name: 'ASUS', name: 'ROG Zephyrus G16 (2024)', category: 'laptops', release_year: 2024, base_price: 174999, storage_options: ['1TB', '2TB'], is_featured: true },
  { brand_name: 'ASUS', name: 'ROG Zephyrus G14 (2024)', category: 'laptops', release_year: 2024, base_price: 144999, storage_options: ['1TB'], is_featured: true },
  { brand_name: 'ASUS', name: 'Zenbook Duo Dual OLED (2024)', category: 'laptops', release_year: 2024, base_price: 139999, storage_options: ['1TB', '2TB'], is_featured: true },
  { brand_name: 'ASUS', name: 'Zenbook 14 OLED (2024)', category: 'laptops', release_year: 2024, base_price: 89999, storage_options: ['512GB', '1TB'], is_featured: true },
  { brand_name: 'ASUS', name: 'ROG Phone 8 Pro', category: 'smartphones', release_year: 2024, base_price: 84999, storage_options: ['512GB', '1TB'], is_featured: true },
  { brand_name: 'ASUS', name: 'TUF Gaming F15', category: 'laptops', release_year: 2023, base_price: 69999, storage_options: ['512GB', '1TB'], is_featured: false },

  // ================= REALME =================
  { brand_name: 'Realme', name: 'Realme GT 6', category: 'smartphones', release_year: 2024, base_price: 38999, storage_options: ['256GB', '512GB'], is_featured: true },
  { brand_name: 'Realme', name: 'Realme GT 6T', category: 'smartphones', release_year: 2024, base_price: 29999, storage_options: ['128GB', '256GB'], is_featured: true },
  { brand_name: 'Realme', name: 'Realme 12 Pro+ 5G', category: 'smartphones', release_year: 2024, base_price: 27999, storage_options: ['128GB', '256GB'], is_featured: true },
  { brand_name: 'Realme', name: 'Realme 12 Pro 5G', category: 'smartphones', release_year: 2024, base_price: 22999, storage_options: ['128GB', '256GB'], is_featured: false },

  // ================= VIVO =================
  { brand_name: 'Vivo', name: 'Vivo X100 Pro', category: 'smartphones', release_year: 2024, base_price: 79999, storage_options: ['512GB'], is_featured: true },
  { brand_name: 'Vivo', name: 'Vivo X100', category: 'smartphones', release_year: 2024, base_price: 58999, storage_options: ['256GB', '512GB'], is_featured: true },
  { brand_name: 'Vivo', name: 'Vivo V30 Pro', category: 'smartphones', release_year: 2024, base_price: 38999, storage_options: ['256GB', '512GB'], is_featured: true },
  { brand_name: 'Vivo', name: 'Vivo V30', category: 'smartphones', release_year: 2024, base_price: 29999, storage_options: ['128GB', '256GB'], is_featured: false },

  // ================= MOTOROLA =================
  { brand_name: 'Motorola', name: 'Motorola Razr 50 Ultra', category: 'smartphones', release_year: 2024, base_price: 89999, storage_options: ['512GB'], is_featured: true },
  { brand_name: 'Motorola', name: 'Motorola Razr 40 Ultra', category: 'smartphones', release_year: 2023, base_price: 49999, storage_options: ['256GB'], is_featured: false },
  { brand_name: 'Motorola', name: 'Motorola Edge 50 Ultra', category: 'smartphones', release_year: 2024, base_price: 54999, storage_options: ['512GB'], is_featured: true },
  { brand_name: 'Motorola', name: 'Motorola Edge 50 Pro', category: 'smartphones', release_year: 2024, base_price: 29999, storage_options: ['256GB'], is_featured: true },
  { brand_name: 'Motorola', name: 'Motorola Edge 40 Neo', category: 'smartphones', release_year: 2023, base_price: 19999, storage_options: ['128GB', '256GB'], is_featured: false },

  // ================= BOSE =================
  { brand_name: 'Bose', name: 'QuietComfort Ultra Headphones', category: 'audio', release_year: 2023, base_price: 29999, storage_options: ['Standard'], is_featured: true },
  { brand_name: 'Bose', name: 'QuietComfort Headphones', category: 'audio', release_year: 2023, base_price: 22999, storage_options: ['Standard'], is_featured: false },
  { brand_name: 'Bose', name: 'QuietComfort Ultra Earbuds', category: 'audio', release_year: 2023, base_price: 21999, storage_options: ['Standard'], is_featured: true },
  { brand_name: 'Bose', name: 'SoundLink Max Bluetooth Speaker', category: 'audio', release_year: 2024, base_price: 34999, storage_options: ['Standard'], is_featured: true },

  // ================= CANON =================
  { brand_name: 'Canon', name: 'EOS R5 Mark II Mirrorless', category: 'cameras', release_year: 2024, base_price: 349999, storage_options: ['Body Only'], is_featured: true },
  { brand_name: 'Canon', name: 'EOS R6 Mark II Body', category: 'cameras', release_year: 2023, base_price: 189999, storage_options: ['Body Only', 'Kit 24-105mm'], is_featured: true },
  { brand_name: 'Canon', name: 'EOS R8 Full-Frame Body', category: 'cameras', release_year: 2023, base_price: 114999, storage_options: ['Body Only'], is_featured: true },
  { brand_name: 'Canon', name: 'EOS R50 Compact Mirrorless', category: 'cameras', release_year: 2023, base_price: 54999, storage_options: ['Kit 18-45mm'], is_featured: false },

  // ================= NIKON =================
  { brand_name: 'Nikon', name: 'Nikon Z8 Full-Frame Mirrorless', category: 'cameras', release_year: 2023, base_price: 299999, storage_options: ['Body Only'], is_featured: true },
  { brand_name: 'Nikon', name: 'Nikon Z6 III Mirrorless', category: 'cameras', release_year: 2024, base_price: 219999, storage_options: ['Body Only'], is_featured: true },
  { brand_name: 'Nikon', name: 'Nikon Zf Vintage Mirrorless', category: 'cameras', release_year: 2023, base_price: 164999, storage_options: ['Body Only', 'Kit 40mm SE'], is_featured: true },
  { brand_name: 'Nikon', name: 'Nikon Z50 Mirrorless', category: 'cameras', release_year: 2022, base_price: 64999, storage_options: ['Kit 16-50mm'], is_featured: false },

  // ================= MICROSOFT =================
  { brand_name: 'Microsoft', name: 'Surface Pro 11 Copilot+', category: 'tablets', release_year: 2024, base_price: 112999, storage_options: ['256GB', '512GB', '1TB'], is_featured: true },
  { brand_name: 'Microsoft', name: 'Surface Laptop 7 Copilot+', category: 'laptops', release_year: 2024, base_price: 116999, storage_options: ['256GB', '512GB', '1TB'], is_featured: true },
  { brand_name: 'Microsoft', name: 'Surface Pro 9', category: 'tablets', release_year: 2022, base_price: 79999, storage_options: ['128GB', '256GB', '512GB'], is_featured: false },
  { brand_name: 'Microsoft', name: 'Surface Laptop 5', category: 'laptops', release_year: 2022, base_price: 74999, storage_options: ['256GB', '512GB'], is_featured: false },
  { brand_name: 'Microsoft', name: 'Surface Go 3', category: 'tablets', release_year: 2021, base_price: 34999, storage_options: ['64GB', '128GB'], is_featured: false },
  { brand_name: 'Microsoft', name: 'Xbox Series X 1TB', category: 'gaming', release_year: 2020, base_price: 43999, storage_options: ['1TB SSD'], is_featured: true },
  { brand_name: 'Microsoft', name: 'Xbox Series S 512GB', category: 'gaming', release_year: 2020, base_price: 24999, storage_options: ['512GB SSD'], is_featured: false },

  // ================= ACER =================
  { brand_name: 'Acer', name: 'Predator Helios 16', category: 'laptops', release_year: 2024, base_price: 149999, storage_options: ['1TB', '2TB'], is_featured: true },
  { brand_name: 'Acer', name: 'Swift Go 14 OLED', category: 'laptops', release_year: 2024, base_price: 74999, storage_options: ['512GB', '1TB'], is_featured: true },
  { brand_name: 'Acer', name: 'Nitro V 15 Gaming', category: 'laptops', release_year: 2023, base_price: 64999, storage_options: ['512GB', '1TB'], is_featured: false },
  { brand_name: 'Acer', name: 'Swift Edge 16 OLED', category: 'laptops', release_year: 2023, base_price: 89999, storage_options: ['1TB'], is_featured: false },
  { brand_name: 'Acer', name: 'Aspire 5 Slim', category: 'laptops', release_year: 2023, base_price: 44999, storage_options: ['512GB'], is_featured: false },

  // ================= MSI =================
  { brand_name: 'MSI', name: 'MSI Titan 18 HX', category: 'laptops', release_year: 2024, base_price: 349999, storage_options: ['2TB', '4TB'], is_featured: true },
  { brand_name: 'MSI', name: 'MSI Stealth 16 AI Studio', category: 'laptops', release_year: 2024, base_price: 189999, storage_options: ['1TB', '2TB'], is_featured: true },
  { brand_name: 'MSI', name: 'MSI Raider GE78 HX', category: 'laptops', release_year: 2023, base_price: 179999, storage_options: ['1TB', '2TB'], is_featured: false },
  { brand_name: 'MSI', name: 'MSI Katana 15 Gaming', category: 'laptops', release_year: 2023, base_price: 74999, storage_options: ['512GB', '1TB'], is_featured: true },
  { brand_name: 'MSI', name: 'MSI Cyborg 15 Translucent', category: 'laptops', release_year: 2023, base_price: 64999, storage_options: ['512GB', '1TB'], is_featured: false },

  // ================= RAZER =================
  { brand_name: 'Razer', name: 'Razer Blade 16 (2024)', category: 'laptops', release_year: 2024, base_price: 279999, storage_options: ['1TB', '2TB'], is_featured: true },
  { brand_name: 'Razer', name: 'Razer Blade 14 (2024)', category: 'laptops', release_year: 2024, base_price: 199999, storage_options: ['1TB'], is_featured: true },
  { brand_name: 'Razer', name: 'Razer Blade 18 Workstation', category: 'laptops', release_year: 2024, base_price: 329999, storage_options: ['2TB', '4TB'], is_featured: false },
  { brand_name: 'Razer', name: 'Razer Edge 5G Gaming Handheld', category: 'gaming', release_year: 2023, base_price: 34999, storage_options: ['128GB'], is_featured: true },
  { brand_name: 'Razer', name: 'Razer BlackShark V2 Pro', category: 'audio', release_year: 2023, base_price: 16999, storage_options: ['Standard'], is_featured: false },

  // ================= OPPO =================
  { brand_name: 'Oppo', name: 'Oppo Find X7 Ultra', category: 'smartphones', release_year: 2024, base_price: 84999, storage_options: ['256GB', '512GB'], is_featured: true },
  { brand_name: 'Oppo', name: 'Oppo Find N3 Flip', category: 'smartphones', release_year: 2023, base_price: 64999, storage_options: ['256GB'], is_featured: true },
  { brand_name: 'Oppo', name: 'Oppo Reno 12 Pro 5G', category: 'smartphones', release_year: 2024, base_price: 34999, storage_options: ['256GB', '512GB'], is_featured: true },
  { brand_name: 'Oppo', name: 'Oppo Reno 11 Pro 5G', category: 'smartphones', release_year: 2024, base_price: 29999, storage_options: ['256GB'], is_featured: false },
  { brand_name: 'Oppo', name: 'Oppo F27 Pro+ 5G', category: 'smartphones', release_year: 2024, base_price: 24999, storage_options: ['128GB', '256GB'], is_featured: false },

  // ================= IQOO =================
  { brand_name: 'iQOO', name: 'iQOO 12 5G (Snapdragon 8 Gen 3)', category: 'smartphones', release_year: 2023, base_price: 49999, storage_options: ['256GB', '512GB'], is_featured: true },
  { brand_name: 'iQOO', name: 'iQOO Neo 9 Pro 5G', category: 'smartphones', release_year: 2024, base_price: 34999, storage_options: ['128GB', '256GB'], is_featured: true },
  { brand_name: 'iQOO', name: 'iQOO Z9 Turbo', category: 'smartphones', release_year: 2024, base_price: 24999, storage_options: ['128GB', '256GB'], is_featured: false },
  { brand_name: 'iQOO', name: 'iQOO 11 5G BMW Edition', category: 'smartphones', release_year: 2023, base_price: 39999, storage_options: ['256GB'], is_featured: false },
  { brand_name: 'iQOO', name: 'iQOO Z7 Pro 5G', category: 'smartphones', release_year: 2023, base_price: 19999, storage_options: ['128GB', '256GB'], is_featured: false },

  // ================= GARMIN =================
  { brand_name: 'Garmin', name: 'Garmin Fenix 7 Pro Sapphire Solar', category: 'wearables', release_year: 2023, base_price: 74999, storage_options: ['32GB'], is_featured: true },
  { brand_name: 'Garmin', name: 'Garmin Forerunner 965 AMOLED', category: 'wearables', release_year: 2023, base_price: 59999, storage_options: ['32GB'], is_featured: true },
  { brand_name: 'Garmin', name: 'Garmin Epix Gen 2 Pro', category: 'wearables', release_year: 2023, base_price: 84999, storage_options: ['32GB'], is_featured: false },
  { brand_name: 'Garmin', name: 'Garmin Venu 3 Health Smartwatch', category: 'wearables', release_year: 2023, base_price: 39999, storage_options: ['8GB'], is_featured: true },
  { brand_name: 'Garmin', name: 'Garmin Instinct 2 Solar Tactical', category: 'wearables', release_year: 2022, base_price: 34999, storage_options: ['Standard'], is_featured: false },

  // ================= FITBIT =================
  { brand_name: 'Fitbit', name: 'Fitbit Sense 2 Health Watch', category: 'wearables', release_year: 2022, base_price: 18999, storage_options: ['Standard'], is_featured: true },
  { brand_name: 'Fitbit', name: 'Fitbit Versa 4 Fitness Watch', category: 'wearables', release_year: 2022, base_price: 15499, storage_options: ['Standard'], is_featured: false },
  { brand_name: 'Fitbit', name: 'Fitbit Charge 6 Fitness Tracker', category: 'wearables', release_year: 2023, base_price: 12999, storage_options: ['Standard'], is_featured: true },
  { brand_name: 'Fitbit', name: 'Fitbit Inspire 3 Slim Tracker', category: 'wearables', release_year: 2022, base_price: 7499, storage_options: ['Standard'], is_featured: false },

  // ================= JBL =================
  { brand_name: 'JBL', name: 'JBL Tour ONE M2 Flagship ANC', category: 'audio', release_year: 2023, base_price: 19999, storage_options: ['Standard'], is_featured: true },
  { brand_name: 'JBL', name: 'JBL Boombox 3 Wi-Fi Portable', category: 'audio', release_year: 2023, base_price: 34999, storage_options: ['Standard'], is_featured: true },
  { brand_name: 'JBL', name: 'JBL Charge 5 Waterproof Speaker', category: 'audio', release_year: 2022, base_price: 13999, storage_options: ['Standard'], is_featured: true },
  { brand_name: 'JBL', name: 'JBL Flip 6 Portable Bluetooth', category: 'audio', release_year: 2022, base_price: 8999, storage_options: ['Standard'], is_featured: false },
  { brand_name: 'JBL', name: 'JBL Live Pro 2 True Wireless', category: 'audio', release_year: 2022, base_price: 9999, storage_options: ['Standard'], is_featured: false },
  { brand_name: 'JBL', name: 'JBL PartyBox 310 High Power', category: 'audio', release_year: 2021, base_price: 38999, storage_options: ['Standard'], is_featured: false },

  // ================= MARSHALL =================
  { brand_name: 'Marshall', name: 'Marshall Stanmore III Bluetooth', category: 'audio', release_year: 2022, base_price: 31999, storage_options: ['Standard'], is_featured: true },
  { brand_name: 'Marshall', name: 'Marshall Major V Wireless Headphones', category: 'audio', release_year: 2024, base_price: 13999, storage_options: ['Standard'], is_featured: true },
  { brand_name: 'Marshall', name: 'Marshall Emberton II Portable', category: 'audio', release_year: 2022, base_price: 14999, storage_options: ['Standard'], is_featured: true },
  { brand_name: 'Marshall', name: 'Marshall Motif II A.N.C. Earbuds', category: 'audio', release_year: 2023, base_price: 17499, storage_options: ['Standard'], is_featured: false },
  { brand_name: 'Marshall', name: 'Marshall Acton III Home Speaker', category: 'audio', release_year: 2022, base_price: 24999, storage_options: ['Standard'], is_featured: false },

  // ================= SENNHEISER =================
  { brand_name: 'Sennheiser', name: 'Sennheiser Momentum 4 Wireless', category: 'audio', release_year: 2022, base_price: 24999, storage_options: ['Standard'], is_featured: true },
  { brand_name: 'Sennheiser', name: 'Momentum True Wireless 4', category: 'audio', release_year: 2024, base_price: 26999, storage_options: ['Standard'], is_featured: true },
  { brand_name: 'Sennheiser', name: 'Sennheiser Accentum Plus Wireless', category: 'audio', release_year: 2024, base_price: 14999, storage_options: ['Standard'], is_featured: false },
  { brand_name: 'Sennheiser', name: 'Sennheiser HD 660S2 Audiophile', category: 'audio', release_year: 2023, base_price: 49999, storage_options: ['Standard'], is_featured: false },

  // ================= GOPRO =================
  { brand_name: 'GoPro', name: 'GoPro HERO12 Black Action Camera', category: 'cameras', release_year: 2023, base_price: 36999, storage_options: ['Standard Bundle'], is_featured: true },
  { brand_name: 'GoPro', name: 'GoPro HERO11 Black 5.3K', category: 'cameras', release_year: 2022, base_price: 29999, storage_options: ['Standard Bundle'], is_featured: false },
  { brand_name: 'GoPro', name: 'GoPro HERO10 Black', category: 'cameras', release_year: 2021, base_price: 24999, storage_options: ['Standard Bundle'], is_featured: false },
  { brand_name: 'GoPro', name: 'GoPro MAX 360 Action Cam', category: 'cameras', release_year: 2020, base_price: 38999, storage_options: ['Standard'], is_featured: false },

  // ================= DJI =================
  { brand_name: 'DJI', name: 'DJI Osmo Pocket 3 Creator Combo', category: 'cameras', release_year: 2023, base_price: 54999, storage_options: ['Creator Combo'], is_featured: true },
  { brand_name: 'DJI', name: 'DJI Mini 4 Pro Drone (RC 2)', category: 'cameras', release_year: 2023, base_price: 89999, storage_options: ['Fly More Combo'], is_featured: true },
  { brand_name: 'DJI', name: 'DJI Osmo Action 4 Standard', category: 'cameras', release_year: 2023, base_price: 29999, storage_options: ['Standard'], is_featured: false },
  { brand_name: 'DJI', name: 'DJI Air 3 Fly More Combo', category: 'cameras', release_year: 2023, base_price: 119999, storage_options: ['RC 2 Combo'], is_featured: false },

  // ================= FUJIFILM =================
  { brand_name: 'Fujifilm', name: 'Fujifilm X100VI Fixed Lens Camera', category: 'cameras', release_year: 2024, base_price: 169999, storage_options: ['Standard'], is_featured: true },
  { brand_name: 'Fujifilm', name: 'Fujifilm X-T5 Mirrorless Body', category: 'cameras', release_year: 2022, base_price: 154999, storage_options: ['Body Only', 'Kit 16-80mm'], is_featured: true },
  { brand_name: 'Fujifilm', name: 'Fujifilm X-S20 Mirrorless Body', category: 'cameras', release_year: 2023, base_price: 114999, storage_options: ['Body Only'], is_featured: false },
  { brand_name: 'Fujifilm', name: 'Fujifilm Instax Mini Evo Hybrid', category: 'cameras', release_year: 2022, base_price: 16999, storage_options: ['Standard'], is_featured: false },

  // ================= NINTENDO =================
  { brand_name: 'Nintendo', name: 'Nintendo Switch OLED Model', category: 'gaming', release_year: 2021, base_price: 28999, storage_options: ['64GB OLED'], is_featured: true },
  { brand_name: 'Nintendo', name: 'Nintendo Switch (Extended Battery)', category: 'gaming', release_year: 2019, base_price: 22999, storage_options: ['32GB'], is_featured: false },
  { brand_name: 'Nintendo', name: 'Nintendo Switch Lite', category: 'gaming', release_year: 2019, base_price: 14999, storage_options: ['32GB'], is_featured: false },
];

export async function seedBrandsAndModels(): Promise<{ brandsCount: number; modelsCount: number }> {
  console.log(`📦 Upserting ${KNOWN_BRANDS.length} brands into MongoDB...`);
  const brandMap = new Map<string, string>(); // brand_name -> mongoId

  for (const b of KNOWN_BRANDS) {
    const existing = await BrandModel.findOne({ name: b.name });
    let savedBrand;
    if (existing) {
      existing.category = b.category;
      existing.description = b.description;
      if (!existing.logo_url || existing.logo_url.includes('upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg')) {
        existing.logo_url = b.logo_url;
      }
      savedBrand = await existing.save();
    } else {
      savedBrand = await BrandModel.create(b);
    }
    const brandId = savedBrand._id ? savedBrand._id.toString() : savedBrand.id;
    brandMap.set(b.name.toLowerCase(), brandId);
  }
  console.log(`✓ Seeded/verified ${KNOWN_BRANDS.length} brands in MongoDB`);

  console.log(`📱 Upserting ${KNOWN_MODELS.length} device models into MongoDB...`);
  let modelCount = 0;
  for (const m of KNOWN_MODELS) {
    const brandMongoId = brandMap.get(m.brand_name.toLowerCase()) || m.brand_name.toLowerCase();

    await DeviceModelModel.findOneAndUpdate(
      {
        brand_name: m.brand_name,
        name: m.name,
      },
      {
        ...m,
        brand_id: brandMongoId,
      },
      { upsert: true, new: true }
    );
    modelCount++;
  }
  console.log(`✓ Seeded/verified ${modelCount} device models in MongoDB`);

  return { brandsCount: KNOWN_BRANDS.length, modelsCount: modelCount };
}

export async function seedDatabase() {
  console.log('====================================================');
  console.log('            RenewX MongoDB Database Seeder          ');
  console.log('====================================================');

  await connectDB();

  // 1. Seed / Upsert Primary Administrator (graceful check)
  const adminEmail = env.ADMIN_EMAIL.toLowerCase();
  const adminInitialPassword = process.env.ADMIN_INITIAL_PASSWORD?.trim();

  let adminUser = await User.findOne({ email: adminEmail });
  if (!adminUser) {
    if (adminInitialPassword) {
      adminUser = await User.create({
        email: adminEmail,
        password: adminInitialPassword,
        full_name: 'RenewX Administrator',
        role: 'admin',
      });
      console.log(`✓ Admin user created: ${adminEmail}`);
    } else {
      console.warn(`⚠️ Admin user ${adminEmail} does not exist and ADMIN_INITIAL_PASSWORD was not provided. Skipping admin creation.`);
    }
  } else {
    adminUser.role = 'admin';
    await adminUser.save();
    console.log(`✓ Admin user verified: ${adminEmail} (role: admin)`);
  }

  // 2. Seed Brands & Device Models (real reference catalog for dropdowns)
  const { brandsCount, modelsCount } = await seedBrandsAndModels();

  console.log('====================================================');
  console.log(`✨ Setup Complete: Admin Verified, ${brandsCount} Brands & ${modelsCount} Device Models Catalogued!`);
  console.log('   (No mock/dummy product records created - clean production store)');
  console.log('====================================================');
}

// Auto-run if executed directly via CLI
if (require.main === module || process.argv[1]?.endsWith('seed.ts')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}
