# WorthBase (家底)

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/callmebg/worthbase?color=blue" alt="License"></a>
  <a href="https://github.com/callmebg/worthbase/releases"><img src="https://img.shields.io/github/v/release/callmebg/worthbase" alt="Release"></a>
  <img src="https://img.shields.io/badge/platform-Android%20%7C%20iOS-brightgreen" alt="Platform">
  <img src="https://img.shields.io/badge/Expo-SDK%2057-black" alt="Expo">
  <a href="./CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs Welcome"></a>
</p>

> How much money do you have across accounts? What are your things worth? How much does it cost to own them all?

A **privacy-first, fully offline** personal net worth tracker. No transaction logging — instead, it answers three core questions:

1. **How much money do I have** — Multi-account balance overview with periodic manual updates
2. **What are my things worth** — Physical asset valuation tracking + holding cost calculation
3. **How is my net worth trending** — Historical snapshot charts and goal progress tracking

📖 English | [中文](./README.md)

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=callmebg/worthbase&type=Date)](https://star-history.com/#callmebg/worthbase)

## Screenshots

<!-- TODO: Add screenshots -->

---

## Features

### Account Balance Management
- Supports WeChat Pay, Alipay, bank cards, cash, funds, and more
- Periodic manual balance updates, each saved as a snapshot
- Multi-account balance summary with one-tap total

### Net Worth Trend Analysis
- Net worth trend line chart based on historical balance snapshots
- Time range switching: 6 months / 1 year / 2 years
- Net worth goal setting with progress bar visualization

### Physical Asset Management
- 8 asset categories: Vehicles, Real Estate, Electronics, Digital, Furniture, Appliances, Luxury, Other
- Full asset lifecycle: In Use → Retired / Sold
- Valuation tracking with optional history curve
- Sell settlement: auto-calculates purchase price, sell price, depreciation, cumulative holding cost, net spend, daily cost

### Holding Cost Calculation (Key Feature)
4 depreciation methods, freely selectable per asset:

| Method | Formula | Characteristic |
|--------|---------|----------------|
| Simple Linear | Purchase Price ÷ Months Owned | Monthly cost decreases over time |
| Expected Lifespan | Purchase Price ÷ Expected Months | Fixed monthly cost |
| Residual Value | (Purchase Price - Residual Value) ÷ Expected Months | Fixed, accounts for residual value |
| No Depreciation | 0 | Only recurring expenses and maintenance |

- **Recurring expenses**: Phone bills, fuel, insurance, etc. with effective date ranges
- **One-time maintenance**: Repairs, servicing — optionally included in cost allocation
- **Monthly & daily views**: See both monthly holding cost and daily cost
- **Summary panel**: Total monthly holding cost across all assets

### Data Security
- **Fully local storage**: No server, no registration, no data upload
- **App lock**: PIN + biometric authentication (fingerprint / Face ID)
- **Auto backup**: Automatic SQLite database backup on app exit (keeps last 3)
- **Import/Export**: JSON (full backup) and CSV (readable export) formats

### Appearance
- Dark mode (follows system / light / dark)
- 4 theme colors
- Customizable currency symbol

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React Native 0.86 + Expo SDK 57 |
| Language | TypeScript ~6.0 |
| Routing | Expo Router |
| Database | expo-sqlite (SQLite) |
| State Management | Zustand |
| Charts | react-native-chart-kit |
| Security | expo-local-authentication |
| Build Tool | EAS Build |
| Testing | Jest + ts-jest |

---

## Quick Start

### Prerequisites

- Node.js >= 20.19.4 (recommend [nvm](https://github.com/nvm-sh/nvm))
- npm
- Android Studio (for local Android builds, includes JDK 17+)
- Xcode (macOS only, for local iOS builds)

### Install Dependencies

```bash
cd worthbase
npm install
```

### Development Mode

The fastest way — no native compilation needed:

```bash
npm start
```

Then install **Expo Go** on your phone and scan the QR code from the terminal.

### Platform-Specific

```bash
# Android (requires connected emulator or device)
npm run android

# iOS (macOS only, requires Xcode)
npm run ios
```

---

## Building

### EAS Cloud Build (Recommended)

No local Android Studio / Xcode needed:

```bash
npm install -g eas-cli
eas login
eas build --profile preview --platform android
eas build --profile preview --platform ios
```

### Local Build

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

> Requires `JAVA_HOME` pointing to JDK 17+ and `ANDROID_HOME` set to Android SDK.

---

## Testing

```bash
npm test
```

Runs 36 unit tests covering the holding cost calculation engine: 4 depreciation strategies, recurring expense intervals, sell settlement, maintenance allocation, and more.

---

## Project Structure

```
worthbase/
├── app/                        # Page routes (Expo Router)
├── src/
│   ├── components/             # UI components
│   ├── db/                     # Database layer (SQLite)
│   ├── engine/                 # Calculation engine (strategy pattern)
│   │   └── strategies/         # 4 depreciation strategy implementations
│   ├── stores/                 # Zustand state management
│   ├── services/               # Data services (backup/export/import)
│   ├── hooks/                  # Custom Hooks
│   ├── types/                  # Type definitions
│   └── utils/                  # Utility functions
├── __tests__/                  # Unit tests
├── assets/                     # Icons and splash screen
├── app.json                    # Expo config
├── eas.json                    # EAS Build config
├── jest.config.js              # Jest config
└── tsconfig.json               # TypeScript config
```

---

## Contributing

Issues and Pull Requests are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

For security issues, please see [SECURITY.md](./SECURITY.md).

---

## License

[MIT](./LICENSE) © callmebg
