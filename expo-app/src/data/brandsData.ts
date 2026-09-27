export interface BrandItem {
  id: string;
  name: string;
  logo: string;
  category: string;
  description: string;
  imageUrl?: string;
  image_url?: string;
  logo_url?: string;
}

export interface DeviceModelItem {
  id: string;
  brandId: string;
  brandName: string;
  name: string;
  category: string;
  releaseYear: number;
  basePrice: number;
  storageOptions: string[];
  isFeatured: boolean;
  imageUrl?: string;
  image_url?: string;
}

export const initialBrands: BrandItem[] = [
  {
    id: 'apple',
    name: 'Apple',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/960px-Apple_logo_black.svg.png',
    category: 'SMARTPHONES',
    description: 'Pioneering premium smartphones, MacBooks, iPads, and Apple Silicon hardware.',
  },
  {
    id: 'samsung',
    name: 'Samsung',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a7/Samsung_logo.svg/960px-Samsung_logo.svg.png',
    category: 'SMARTPHONES',
    description: 'Global leader in Dynamic AMOLED displays, Galaxy S flagships, and foldable innovations.',
  },
  {
    id: 'google-pixel',
    name: 'Google Pixel',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/960px-Google_2015_logo.svg.png',
    category: 'SMARTPHONES',
    description: 'Pure Android flagship experience powered by Google Tensor and computational AI.',
  },
  {
    id: 'oneplus',
    name: 'OnePlus',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f8/OP_LU_Reg_1L_RGB_red_copy-01.svg/960px-OP_LU_Reg_1L_RGB_red_copy-01.svg.png',
    category: 'SMARTPHONES',
    description: 'Never Settle philosophy delivering ultra-fast Warp/SUPERVOOC charging and fluid OxygenOS.',
  },
  {
    id: 'xiaomi',
    name: 'Xiaomi',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ae/Xiaomi_logo_%282021-%29.svg/960px-Xiaomi_logo_%282021-%29.svg.png',
    category: 'SMARTPHONES',
    description: 'High-performance flagships with Leica optical systems and groundbreaking HyperOS.',
  },
  {
    id: 'nothing',
    name: 'Nothing',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4e/Nothing_Phone_1_wordmark.svg/960px-Nothing_Phone_1_wordmark.svg.png',
    category: 'SMARTPHONES',
    description: 'Distinctive transparent Glyph interface design paired with minimalist Nothing OS.',
  },
  {
    id: 'sony',
    name: 'Sony',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/Sony_logo.svg/960px-Sony_logo.svg.png',
    category: 'AUDIO',
    description: 'World-class WH/WF noise-canceling audio, Alpha mirrorless cameras, and PlayStation gaming.',
  },
  {
    id: 'dell',
    name: 'Dell',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/48/Dell_Logo.svg/960px-Dell_Logo.svg.png',
    category: 'LAPTOPS',
    description: 'Ultra-premium XPS infinity-edge ultrabooks and enterprise-grade Latitude workstations.',
  },
  {
    id: 'hp',
    name: 'HP',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ad/HP_logo_2012.svg/960px-HP_logo_2012.svg.png',
    category: 'LAPTOPS',
    description: 'Precision-crafted Spectre x360 convertibles, Envy laptops, and OMEN gaming powerhouses.',
  },
  {
    id: 'lenovo',
    name: 'Lenovo',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b8/Lenovo_logo_2015.svg/960px-Lenovo_logo_2015.svg.png',
    category: 'LAPTOPS',
    description: 'Legendary ThinkPad mil-spec reliability, Yoga versatility, and Legion gaming machines.',
  },
  {
    id: 'asus',
    name: 'ASUS',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2e/ASUS_Logo.svg/960px-ASUS_Logo.svg.png',
    category: 'LAPTOPS',
    description: 'Pioneering ROG Zephyrus gaming powerhouses and Zenbook OLED dual-screen ultrabooks.',
  },
  {
    id: 'realme',
    name: 'Realme',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a2/Realme_logo.svg/960px-Realme_logo.svg.png',
    category: 'SMARTPHONES',
    description: 'Youth-focused powerhouse flagships with ultra-fast charging and standout aesthetics.',
  },
  {
    id: 'vivo',
    name: 'Vivo',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/04/Vivo_%28China%29_logo.svg/960px-Vivo_%28China%29_logo.svg.png',
    category: 'SMARTPHONES',
    description: 'Trailblazing mobile imaging engineered with ZEISS optics and gimbal stabilization.',
  },
  {
    id: 'motorola',
    name: 'Motorola',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e5/Motorola_logo.svg/960px-Motorola_logo.svg.png',
    category: 'SMARTPHONES',
    description: 'Iconic Razr flip smartphones and clean, near-stock Android software experience.',
  },
  {
    id: 'bose',
    name: 'Bose',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/Bose_logo.svg/960px-Bose_logo.svg.png',
    category: 'AUDIO',
    description: 'Benchmark spatial audio acoustics and unmatched active noise cancellation.',
  },
  {
    id: 'canon',
    name: 'Canon',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8d/Canon_logo.svg/960px-Canon_logo.svg.png',
    category: 'CAMERAS',
    description: 'World-renowned EOS R mirrorless full-frame cameras and professional L-series optics.',
  },
  {
    id: 'nikon',
    name: 'Nikon',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f3/Nikon_Logo.svg/960px-Nikon_Logo.svg.png',
    category: 'CAMERAS',
    description: 'Pioneering Z-mount full-frame mirrorless imaging and iconic Japanese craftsmanship.',
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/96/Microsoft_logo_%282012%29.svg/960px-Microsoft_logo_%282012%29.svg.png',
    category: 'LAPTOPS',
    description: 'Premium Surface 2-in-1 devices, Copilot+ PCs, and Xbox Series gaming consoles.',
  },
  {
    id: 'acer',
    name: 'Acer',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/00/Acer_2011.svg/960px-Acer_2011.svg.png',
    category: 'LAPTOPS',
    description: 'Innovative Predator gaming beasts and ultra-lightweight Swift OLED ultrabooks.',
  },
  {
    id: 'msi',
    name: 'MSI',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/47/Micro-Star_International_logo2020.svg/960px-Micro-Star_International_logo2020.svg.png',
    category: 'LAPTOPS',
    description: 'Elite gaming hardware, high-end Creator notebooks, and Titan workstation power.',
  },
  {
    id: 'razer',
    name: 'Razer',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/52/Razer_wordmark.svg/960px-Razer_wordmark.svg.png',
    category: 'LAPTOPS',
    description: 'For Gamers. By Gamers. CNC anodized aluminum Blade laptops and gaming gear.',
  },
  {
    id: 'oppo',
    name: 'Oppo',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0a/OPPO_LOGO_2019.svg/960px-OPPO_LOGO_2019.svg.png',
    category: 'SMARTPHONES',
    description: 'Camera-centric Find flagships, Hasselblad portraits, and industry-leading SuperVOOC fast charging.',
  },
  {
    id: 'iqoo',
    name: 'iQOO',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/aa/IQOO_logo.svg/960px-IQOO_logo.svg.png',
    category: 'SMARTPHONES',
    description: 'Performance-obsessed e-sports grade smartphones with vapor cooling and high frame rates.',
  },
  {
    id: 'garmin',
    name: 'Garmin',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/Garmin_logo_2006.svg/960px-Garmin_logo_2006.svg.png',
    category: 'WEARABLES',
    description: 'Professional multi-sport GPS smartwatches, solar sapphire durability, and elite athletic tracking.',
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e0/Fitbit_logo.svg/960px-Fitbit_logo.svg.png',
    category: 'WEARABLES',
    description: 'Pioneering health, sleep, and heart-rate tracking wearable bands and smartwatches.',
  },
  {
    id: 'jbl',
    name: 'JBL',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bc/JBL_logo.svg/960px-JBL_logo.svg.png',
    category: 'AUDIO',
    description: 'Legendary JBL Pro Sound, rugged portable Bluetooth speakers, and bass-heavy audio gear.',
  },
  {
    id: 'marshall',
    name: 'Marshall',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/69/Marshall_logo.svg/960px-Marshall_logo.svg.png',
    category: 'AUDIO',
    description: 'Iconic vintage rock & roll aesthetics, brass accents, and room-filling multidirectional sound.',
  },
  {
    id: 'sennheiser',
    name: 'Sennheiser',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/11/Sennheiser_logo_%282019%29.svg/960px-Sennheiser_logo_%282019%29.svg.png',
    category: 'AUDIO',
    description: 'German precision audiophile engineering, reference studio monitors, and Momentum ANC headphones.',
  },
  {
    id: 'gopro',
    name: 'GoPro',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c3/GoPro_logo.svg/960px-GoPro_logo.svg.png',
    category: 'CAMERAS',
    description: 'World standard rugged waterproof action cameras with HyperSmooth stabilization.',
  },
  {
    id: 'dji',
    name: 'DJI',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/DJI_Innovations_logo.svg/960px-DJI_Innovations_logo.svg.png',
    category: 'CAMERAS',
    description: 'World-leading aerial drones, 3-axis gimbal cameras, and Osmo handheld stabilization.',
  },
  {
    id: 'fujifilm',
    name: 'Fujifilm',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/Fujifilm_logo.svg/960px-Fujifilm_logo.svg.png',
    category: 'CAMERAS',
    description: 'Legendary film simulation color science, X-Trans sensors, and rangefinder aesthetics.',
  },
  {
    id: 'nintendo',
    name: 'Nintendo',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/Nintendo_logo.svg/960px-Nintendo_logo.svg.png',
    category: 'GAMING',
    description: 'Pioneering hybrid video game consoles and world-beloved interactive entertainment systems.',
  },
];

export const initialModels: DeviceModelItem[] = [
  // Apple
  { id: 'apple-iphone-16-pro-max', brandId: 'apple', brandName: 'Apple', name: 'iPhone 16 Pro Max', category: 'smartphones', releaseYear: 2024, basePrice: 119900, storageOptions: ['256GB', '512GB', '1TB'], isFeatured: true },
  { id: 'apple-iphone-16-pro', brandId: 'apple', brandName: 'Apple', name: 'iPhone 16 Pro', category: 'smartphones', releaseYear: 2024, basePrice: 104900, storageOptions: ['128GB', '256GB', '512GB', '1TB'], isFeatured: true },
  { id: 'apple-iphone-16', brandId: 'apple', brandName: 'Apple', name: 'iPhone 16', category: 'smartphones', releaseYear: 2024, basePrice: 69900, storageOptions: ['128GB', '256GB', '512GB'], isFeatured: true },
  { id: 'apple-iphone-15-pro-max', brandId: 'apple', brandName: 'Apple', name: 'iPhone 15 Pro Max', category: 'smartphones', releaseYear: 2023, basePrice: 89900, storageOptions: ['256GB', '512GB', '1TB'], isFeatured: true },
  { id: 'apple-iphone-15', brandId: 'apple', brandName: 'Apple', name: 'iPhone 15', category: 'smartphones', releaseYear: 2023, basePrice: 54900, storageOptions: ['128GB', '256GB', '512GB'], isFeatured: true },
  { id: 'apple-iphone-14-pro-max', brandId: 'apple', brandName: 'Apple', name: 'iPhone 14 Pro Max', category: 'smartphones', releaseYear: 2022, basePrice: 68900, storageOptions: ['128GB', '256GB', '512GB'], isFeatured: false },
  { id: 'apple-iphone-13', brandId: 'apple', brandName: 'Apple', name: 'iPhone 13', category: 'smartphones', releaseYear: 2021, basePrice: 39900, storageOptions: ['128GB', '256GB', '512GB'], isFeatured: true },
  { id: 'apple-macbook-pro-16-m3', brandId: 'apple', brandName: 'Apple', name: 'MacBook Pro 16" M3 Max', category: 'laptops', releaseYear: 2023, basePrice: 249000, storageOptions: ['512GB', '1TB', '2TB'], isFeatured: true },
  { id: 'apple-macbook-air-15-m3', brandId: 'apple', brandName: 'Apple', name: 'MacBook Air 15" M3', category: 'laptops', releaseYear: 2024, basePrice: 114900, storageOptions: ['256GB', '512GB'], isFeatured: true },
  { id: 'apple-ipad-pro-13-m4', brandId: 'apple', brandName: 'Apple', name: 'iPad Pro 13" M4', category: 'tablets', releaseYear: 2024, basePrice: 119900, storageOptions: ['256GB', '512GB', '1TB'], isFeatured: true },

  // Samsung
  { id: 'samsung-galaxy-s24-ultra', brandId: 'samsung', brandName: 'Samsung', name: 'Galaxy S24 Ultra', category: 'smartphones', releaseYear: 2024, basePrice: 98999, storageOptions: ['256GB', '512GB', '1TB'], isFeatured: true },
  { id: 'samsung-galaxy-s24', brandId: 'samsung', brandName: 'Samsung', name: 'Galaxy S24', category: 'smartphones', releaseYear: 2024, basePrice: 59999, storageOptions: ['128GB', '256GB'], isFeatured: true },
  { id: 'samsung-galaxy-s23-ultra', brandId: 'samsung', brandName: 'Samsung', name: 'Galaxy S23 Ultra', category: 'smartphones', releaseYear: 2023, basePrice: 69999, storageOptions: ['256GB', '512GB', '1TB'], isFeatured: true },
  { id: 'samsung-galaxy-z-fold-6', brandId: 'samsung', brandName: 'Samsung', name: 'Galaxy Z Fold 6', category: 'smartphones', releaseYear: 2024, basePrice: 139999, storageOptions: ['256GB', '512GB', '1TB'], isFeatured: true },
  { id: 'samsung-galaxy-z-flip-6', brandId: 'samsung', brandName: 'Samsung', name: 'Galaxy Z Flip 6', category: 'smartphones', releaseYear: 2024, basePrice: 79999, storageOptions: ['256GB', '512GB'], isFeatured: true },
  { id: 'samsung-galaxy-tab-s9-ultra', brandId: 'samsung', brandName: 'Samsung', name: 'Galaxy Tab S9 Ultra', category: 'tablets', releaseYear: 2023, basePrice: 89999, storageOptions: ['256GB', '512GB', '1TB'], isFeatured: true },

  // Google Pixel
  { id: 'pixel-9-pro-xl', brandId: 'google-pixel', brandName: 'Google Pixel', name: 'Pixel 9 Pro XL', category: 'smartphones', releaseYear: 2024, basePrice: 89999, storageOptions: ['128GB', '256GB', '512GB'], isFeatured: true },
  { id: 'pixel-9', brandId: 'google-pixel', brandName: 'Google Pixel', name: 'Pixel 9', category: 'smartphones', releaseYear: 2024, basePrice: 59999, storageOptions: ['128GB', '256GB'], isFeatured: true },
  { id: 'pixel-8-pro', brandId: 'google-pixel', brandName: 'Google Pixel', name: 'Pixel 8 Pro', category: 'smartphones', releaseYear: 2023, basePrice: 54999, storageOptions: ['128GB', '256GB', '512GB'], isFeatured: true },

  // OnePlus
  { id: 'oneplus-12', brandId: 'oneplus', brandName: 'OnePlus', name: 'OnePlus 12', category: 'smartphones', releaseYear: 2024, basePrice: 56999, storageOptions: ['256GB', '512GB'], isFeatured: true },
  { id: 'oneplus-open', brandId: 'oneplus', brandName: 'OnePlus', name: 'OnePlus Open', category: 'smartphones', releaseYear: 2023, basePrice: 99999, storageOptions: ['512GB'], isFeatured: true },

  // Microsoft
  { id: 'microsoft-surface-pro-11', brandId: 'microsoft', brandName: 'Microsoft', name: 'Surface Pro 11 Copilot+', category: 'tablets', releaseYear: 2024, basePrice: 112999, storageOptions: ['256GB', '512GB', '1TB'], isFeatured: true },
  { id: 'microsoft-surface-laptop-7', brandId: 'microsoft', brandName: 'Microsoft', name: 'Surface Laptop 7 Copilot+', category: 'laptops', releaseYear: 2024, basePrice: 116999, storageOptions: ['256GB', '512GB', '1TB'], isFeatured: true },
  { id: 'microsoft-xbox-series-x', brandId: 'microsoft', brandName: 'Microsoft', name: 'Xbox Series X 1TB', category: 'gaming', releaseYear: 2020, basePrice: 43999, storageOptions: ['1TB SSD'], isFeatured: true },

  // Razer
  { id: 'razer-blade-16', brandId: 'razer', brandName: 'Razer', name: 'Razer Blade 16 (2024)', category: 'laptops', releaseYear: 2024, basePrice: 279999, storageOptions: ['1TB', '2TB'], isFeatured: true },

  // Nintendo
  { id: 'nintendo-switch-oled', brandId: 'nintendo', brandName: 'Nintendo', name: 'Nintendo Switch OLED Model', category: 'gaming', releaseYear: 2021, basePrice: 28999, storageOptions: ['64GB OLED'], isFeatured: true },

  // DJI
  { id: 'dji-osmo-pocket-3', brandId: 'dji', brandName: 'DJI', name: 'DJI Osmo Pocket 3 Creator Combo', category: 'cameras', releaseYear: 2023, basePrice: 54999, storageOptions: ['Creator Combo'], isFeatured: true },
  { id: 'dji-mini-4-pro', brandId: 'dji', brandName: 'DJI', name: 'DJI Mini 4 Pro Drone (RC 2)', category: 'cameras', releaseYear: 2023, basePrice: 89999, storageOptions: ['Fly More Combo'], isFeatured: true },

  // GoPro
  { id: 'gopro-hero-12', brandId: 'gopro', brandName: 'GoPro', name: 'GoPro HERO12 Black Action Camera', category: 'cameras', releaseYear: 2023, basePrice: 36999, storageOptions: ['Standard Bundle'], isFeatured: true },

  // Marshall
  { id: 'marshall-stanmore-iii', brandId: 'marshall', brandName: 'Marshall', name: 'Marshall Stanmore III Bluetooth', category: 'audio', releaseYear: 2022, basePrice: 31999, storageOptions: ['Standard'], isFeatured: true },

  // JBL
  { id: 'jbl-tour-one-m2', brandId: 'jbl', brandName: 'JBL', name: 'JBL Tour ONE M2 Flagship ANC', category: 'audio', releaseYear: 2023, basePrice: 19999, storageOptions: ['Standard'], isFeatured: true },

  // Garmin
  { id: 'garmin-fenix-7-pro', brandId: 'garmin', brandName: 'Garmin', name: 'Garmin Fenix 7 Pro Sapphire Solar', category: 'wearables', releaseYear: 2023, basePrice: 74999, storageOptions: ['32GB'], isFeatured: true },
];
