# RenewX — Expo React Native E-Commerce App

A mobile e-commerce app for certified refurbished electronics, built with **Expo**, **React Native**, **TypeScript**, and **React Navigation**.

## Features

- **Home Screen** — Hero banner, category filter pills, 2-column product grid with pull-to-refresh
- **Categories Screen** — Browse all categories with item counts and filtered product grid
- **Product Detail** — Full-screen product view with specs, warranty info, and add-to-cart
- **Search** — Real-time search across product names and brands
- **Cart** — Quantity controls, savings calculator, checkout with order confirmation
- **Bottom Tab Navigation** — Home, Categories, Cart (with badge count)

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your phone (or an emulator)

### Installation

```bash
cd expo-app
npm install
```

### Run the app

```bash
npx expo start
```

Then scan the QR code with the Expo Go app on your phone, or press:
- `a` to run on Android emulator
- `i` to run on iOS simulator
- `w` to run on web

## Project Structure

```
expo-app/
├── app.json              # Expo configuration
├── babel.config.js       # Babel config (Expo preset)
├── tsconfig.json         # TypeScript config
├── package.json          # Dependencies
└── src/
    ├── App.tsx           # Entry point — navigation + cart provider
    ├── types.ts          # Product & CartItem types
    ├── theme.ts          # Colors, spacing, typography, radius
    ├── data/
    │   └── products.ts   # 17 products across 6 categories
    ├── context/
    │   └── CartContext.tsx  # Cart state management
    ├── components/
    │   ├── HomeHeader.tsx
    │   ├── HeroBanner.tsx
    │   ├── CategoryPills.tsx
    │   └── ProductCard.tsx
    └── screens/
        ├── HomeScreen.tsx
        ├── CategoriesScreen.tsx
        ├── ProductDetailScreen.tsx
        ├── CartScreen.tsx
        └── SearchScreen.tsx
```

## Tech Stack

- **Expo SDK 51** — React Native framework
- **React Navigation 6** — Native stack + bottom tabs
- **TypeScript** — Type-safe development
- **@expo/vector-icons** — Ionicons icon set
- **react-native-safe-area-context** — Safe area handling

## Note

This Expo project cannot be built or previewed in the Bolt web environment. Copy the `expo-app/` folder to your local machine and run it with the Expo CLI as described above.
