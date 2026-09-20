import { connectDB } from './config/db';
import { User } from './models/User';
import { ProductModel } from './models/Product';
import { BrandModel } from './models/Brand';
import { DeviceModelModel } from './models/DeviceModel';
import { env } from './config/env';

async function seed() {
  console.log('====================================================');
  console.log('            RenewX MongoDB Database Seeder          ');
  console.log('====================================================');

  await connectDB();

  // 1. Seed / Upsert Primary Administrator
  const adminEmail = env.ADMIN_EMAIL.toLowerCase();
  const adminInitialPassword = process.env.ADMIN_INITIAL_PASSWORD?.trim();

  if (!adminInitialPassword) {
    throw new Error('ADMIN_INITIAL_PASSWORD must be configured before running the production database seeder.');
  }

  let adminUser = await User.findOne({ email: adminEmail });
  if (!adminUser) {
    adminUser = await User.create({
      email: adminEmail,
      password: adminInitialPassword
      full_name: 'RenewX Administrator',
      role: 'admin',
    });
    console.log(`✓ Admin user created: ${adminEmail}`);
  } else {
    adminUser.role = 'admin';
    await adminUser.save();
    console.log(`✓ Admin user verified: ${adminEmail} (role: admin)`);
  }

  // 2. Seed Brands
  const initialBrands = [
    {
      name: 'Apple',
      logo_url: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
      category: 'SMARTPHONES',
      description: 'Pioneering premium smartphones, laptops, tablets, and wearables.',
    },
    {
      name: 'Samsung',
      logo_url: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg',
      category: 'SMARTPHONES',
      description: 'Global innovator in AMOLED smartphones, foldable tech, and accessories.',
    },
    {
      name: 'Google Pixel',
      logo_url: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg',
      category: 'SMARTPHONES',
      description: 'Pure Android flagship experience with computational photography.',
    },
    {
      name: 'Sony',
      logo_url: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg',
      category: 'AUDIO',
      description: 'Industry-leading audio engineering and Alpha full-frame cameras.',
    },
    {
      name: 'OnePlus',
      logo_url: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/OP_LU_Reg_1_Line_RGB_RED_copy.svg',
      category: 'SMARTPHONES',
      description: 'Never Settle flagship performance with rapid charging technology.',
    },
    {
      name: 'Dell',
      logo_url: 'https://upload.wikimedia.org/wikipedia/commons/4/48/Dell_Logo.svg',
      category: 'LAPTOPS',
      description: 'Enterprise and ultra-premium XPS workstation laptops.',
    },
    {
      name: 'Lenovo',
      logo_url: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Lenovo_logo_2015.svg',
      category: 'LAPTOPS',
      description: 'World-renowned ThinkPad durability and Legion gaming power.',
    },
  ];

  for (const b of initialBrands) {
    await BrandModel.findOneAndUpdate({ name: b.name }, b, { upsert: true, new: true });
  }
  console.log(`✓ Seeded ${initialBrands.length} brands`);

  // 3. Seed Device Models
  const initialModels = [
    {
      brand_id: 'apple',
      brand_name: 'Apple',
      name: 'iPhone 15 Pro Max',
      category: 'smartphones',
      release_year: 2023,
      base_price: 119999,
      storage_options: ['256GB', '512GB', '1TB'],
      is_featured: true,
    },
    {
      brand_id: 'apple',
      brand_name: 'Apple',
      name: 'iPhone 15 Pro',
      category: 'smartphones',
      release_year: 2023,
      base_price: 99999,
      storage_options: ['128GB', '256GB', '512GB', '1TB'],
      is_featured: true,
    },
    {
      brand_id: 'apple',
      brand_name: 'Apple',
      name: 'iPhone 14 Pro Max',
      category: 'smartphones',
      release_year: 2022,
      base_price: 79999,
      storage_options: ['128GB', '256GB', '512GB'],
      is_featured: true,
    },
    {
      brand_id: 'samsung',
      brand_name: 'Samsung',
      name: 'Galaxy S24 Ultra',
      category: 'smartphones',
      release_year: 2024,
      base_price: 94999,
      storage_options: ['256GB', '512GB', '1TB'],
      is_featured: true,
    },
    {
      brand_id: 'samsung',
      brand_name: 'Samsung',
      name: 'Galaxy S23 Ultra',
      category: 'smartphones',
      release_year: 2023,
      base_price: 69999,
      storage_options: ['256GB', '512GB'],
      is_featured: true,
    },
    {
      brand_id: 'google',
      brand_name: 'Google Pixel',
      name: 'Pixel 8 Pro',
      category: 'smartphones',
      release_year: 2023,
      base_price: 64999,
      storage_options: ['128GB', '256GB', '512GB'],
      is_featured: true,
    },
  ];

  for (const m of initialModels) {
    await DeviceModelModel.findOneAndUpdate({ name: m.name }, m, { upsert: true, new: true });
  }
  console.log(`✓ Seeded ${initialModels.length} device models`);

  // 4. Seed Products
  const initialProducts = [
    {
      name: 'iPhone 15 Pro Max 256GB - Natural Titanium',
      brand: 'Apple',
      category: 'Phones',
      original_price: 159900,
      price: 119999,
      condition: 'Like New',
      warranty_months: 18,
      image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80',
      rating: 4.9,
      reviews: 142,
      stock: 5,
      description: 'Flawless condition with 100% battery health. Titanium frame with zero scratches, Super Retina XDR display with ProMotion.',
      specs: ['256GB Storage', 'A17 Pro 3nm Chip', '48MP Main Camera + 5x Telephoto', 'USB-C Port', '100% Battery Health'],
    },
    {
      name: 'MacBook Pro 16" M3 Max 36GB / 1TB SSD',
      brand: 'Apple',
      category: 'Laptops',
      original_price: 349900,
      price: 279999,
      condition: 'Like New',
      warranty_months: 24,
      image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
      rating: 5.0,
      reviews: 88,
      stock: 3,
      description: 'Certified pristine workstation. 14-core CPU, 30-core GPU, Liquid Retina XDR display. Includes original 140W MagSafe charger.',
      specs: ['M3 Max (14-core CPU, 30-core GPU)', '36GB Unified Memory', '1TB Superfast SSD', '120Hz Liquid Retina XDR', 'Cycle Count: 12'],
    },
    {
      name: 'Samsung Galaxy S24 Ultra 512GB - Titanium Gray',
      brand: 'Samsung',
      category: 'Phones',
      original_price: 139999,
      price: 98999,
      condition: 'Excellent',
      warranty_months: 12,
      image_url: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&auto=format&fit=crop&q=80',
      rating: 4.8,
      reviews: 96,
      stock: 8,
      description: 'Stunning Galaxy AI powerhouse with built-in S-Pen. Clean flat titanium edges, 200MP camera system, 2600 nit AMOLED display.',
      specs: ['Snapdragon 8 Gen 3', '512GB UFS 4.0 Storage', '200MP Quad Tele System', 'S-Pen Included', '5000 mAh Battery'],
    },
    {
      name: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
      brand: 'Sony',
      category: 'Audio',
      original_price: 34990,
      price: 22499,
      condition: 'Like New',
      warranty_months: 12,
      image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
      rating: 4.9,
      reviews: 230,
      stock: 12,
      description: 'Industry-leading dual processor active noise canceling. Plush synthetic leather earcups, 30-hour battery life with quick charge.',
      specs: ['Integrated Processor V1 + QN1', '30-Hour Battery Life', 'Speak-to-Chat & Multipoint', 'Carry Case & Cable Included'],
    },
    {
      name: 'Apple Watch Ultra 2 49mm GPS + Cellular',
      brand: 'Apple',
      category: 'Wearables',
      original_price: 89900,
      price: 64999,
      condition: 'Excellent',
      warranty_months: 12,
      image_url: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80',
      rating: 4.9,
      reviews: 64,
      stock: 4,
      description: 'Aerospace-grade titanium case with sapphire front crystal. Action button, 3000-nit display, precision dual-frequency GPS.',
      specs: ['49mm Titanium Case', '3000-Nit Peak Brightness', 'S9 SiP with Double Tap', 'Depth Gauge & Water Temp', 'Orange Ocean Band'],
    },
    {
      name: 'Sony Alpha A7 IV Full-Frame Mirrorless Camera (Body Only)',
      brand: 'Sony',
      category: 'Cameras',
      original_price: 242990,
      price: 168999,
      condition: 'Like New',
      warranty_months: 18,
      image_url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80',
      rating: 4.9,
      reviews: 41,
      stock: 2,
      description: '33MP full-frame Exmor R sensor with BIONZ XR engine. 4K 60p 10-bit recording, 759-point AF with real-time Eye tracking.',
      specs: ['33MP Full-Frame Sensor', '4K 60p 10-bit 4:2:2', '5-axis In-body Stabilization', 'Shutter Count < 2,400'],
    },
    {
      name: 'iPad Pro 12.9" M2 256GB Wi-Fi + 5G',
      brand: 'Apple',
      category: 'Tablets',
      original_price: 127900,
      price: 89999,
      condition: 'Like New',
      warranty_months: 12,
      image_url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop&q=80',
      rating: 4.8,
      reviews: 72,
      stock: 6,
      description: 'Mini-LED Liquid Retina XDR screen with 1600 nits peak HDR brightness. Apple Pencil hover support, Thunderbolt / USB 4 port.',
      specs: ['Apple M2 Chip', '12.9" Liquid Retina XDR (Mini-LED)', '256GB Storage', '5G Cellular + Wi-Fi 6E', 'Face ID'],
    },
    {
      name: 'Dell XPS 15 9530 i7-13700H / 32GB / RTX 4060 / 3.5K OLED',
      brand: 'Dell',
      category: 'Laptops',
      original_price: 215000,
      price: 144999,
      condition: 'Excellent',
      warranty_months: 12,
      image_url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&auto=format&fit=crop&q=80',
      rating: 4.7,
      reviews: 39,
      stock: 3,
      description: 'Precision CNC machined aluminum chassis with carbon-fiber palm rest. Spectacular 3.5K touch OLED with 100% DCI-P3.',
      specs: ['13th Gen Intel Core i7-13700H', '32GB DDR5 RAM', 'NVIDIA RTX 4060 8GB', '15.6" 3.5K OLED Touch', '1TB NVMe Gen4'],
    },
  ];

  for (const p of initialProducts) {
    await ProductModel.findOneAndUpdate({ name: p.name }, p, { upsert: true, new: true });
  }
  console.log(`✓ Seeded ${initialProducts.length} certified products`);

  console.log('====================================================');
  console.log('✨ Database Seeding Completed Successfully!         ');
  console.log('====================================================');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
