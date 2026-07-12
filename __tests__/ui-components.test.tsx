/// <reference types="jest" />

/**
 * WorthBase (家底) - UI Component Render Tests
 * Basic smoke tests: components render without crashing.
 */

import React from 'react';
import { create, act, ReactTestRenderer } from 'react-test-renderer';
import { OnboardingView } from '@/components/OnboardingView';
import { HoldingCostBreakdown } from '@/components/HoldingCostBreakdown';
import { ValuationChart } from '@/components/ValuationChart';
import { LockScreen } from '@/components/LockScreen';
import type { HoldingCostResult } from '@/types/models';

// ─── Mock dependencies ───
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useFocusEffect: jest.fn((cb: any) => cb()),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/db/valuation-repository', () => ({
  ValuationRepository: {
    getByAsset: jest.fn(async () => []),
  },
}));

jest.mock('@/stores/settings-store', () => ({
  useSettingsStore: () => ({
    biometricEnabled: false,
    themeColor: '#6C5CE7',
  }),
}));

jest.mock('@/services/auth-service', () => ({
  AuthService: {
    verifyPin: jest.fn(async () => true),
    authenticateWithBiometric: jest.fn(async () => true),
    getBiometricType: jest.fn(async () => 'Face ID'),
    isBiometricAvailable: jest.fn(async () => true),
  },
}));

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn(async () => 'mock-hash'),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));

jest.mock('expo-local-authentication', () => ({
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
  hasHardwareAsync: jest.fn(async () => true),
  isEnrolledAsync: jest.fn(async () => true),
  supportedAuthenticationTypesAsync: jest.fn(async () => [2]),
  authenticateAsync: jest.fn(async () => ({ success: true })),
}));

// ─── Test Data ───
const mockHoldingCostResult: HoldingCostResult = {
  monthlyAmortization: 333.33,
  monthlyRecurring: 100.00,
  monthlyMaintenance: 50.00,
  monthlyTotal: 483.33,
  dailyAverage: 16.11,
  accumulatedTotal: 2500.00,
  remainingUnamortized: 9500.00,
};

// ─── Tests ───
describe('OnboardingView', () => {
  test('renders without crashing', () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(React.createElement(OnboardingView));
    });
    expect(tree!).toBeDefined();
    expect(tree!.toJSON()).toBeDefined();
  });

  test('contains welcome text and feature descriptions', () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(React.createElement(OnboardingView));
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('欢迎使用家底');
    expect(json).toContain('净资产趋势追踪');
    expect(json).toContain('实物资产持有成本计算');
    expect(json).toContain('本地存储');
  });
});

describe('HoldingCostBreakdown', () => {
  test('renders without crashing', () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(
        React.createElement(HoldingCostBreakdown, { result: mockHoldingCostResult })
      );
    });
    expect(tree!).toBeDefined();
    expect(tree!.toJSON()).toBeDefined();
  });

  test('displays all three cost layers', () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(
        React.createElement(HoldingCostBreakdown, { result: mockHoldingCostResult })
      );
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('分摊成本');
    expect(json).toContain('经常性支出');
    expect(json).toContain('维护分摊');
    expect(json).toContain('月持有成本');
  });

  test('displays daily average and accumulated total', () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(
        React.createElement(HoldingCostBreakdown, { result: mockHoldingCostResult })
      );
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('日均');
    expect(json).toContain('累计已分摊');
    expect(json).toContain('剩余未分摊');
  });

  test('accepts custom currency symbol', () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(
        React.createElement(HoldingCostBreakdown, {
          result: mockHoldingCostResult,
          currencySymbol: '$',
        })
      );
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('$');
  });

  test('handles zero total gracefully (no division by zero)', () => {
    const zeroResult: HoldingCostResult = {
      monthlyAmortization: 0,
      monthlyRecurring: 0,
      monthlyMaintenance: 0,
      monthlyTotal: 0,
      dailyAverage: 0,
      accumulatedTotal: 0,
      remainingUnamortized: 0,
    };

    let tree: ReactTestRenderer;
    act(() => {
      tree = create(
        React.createElement(HoldingCostBreakdown, { result: zeroResult })
      );
    });
    expect(tree!).toBeDefined();
    expect(tree!.toJSON()).toBeDefined();
  });
});

describe('ValuationChart', () => {
  test('renders empty state when no history', () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(
        React.createElement(ValuationChart, {
          assetId: 'test-asset',
          purchasePrice: 10000,
        })
      );
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('暂无估值记录');
  });

  test('renders with valuation data', async () => {
    const { ValuationRepository } = require('@/db/valuation-repository');
    (ValuationRepository.getByAsset as jest.Mock).mockResolvedValue([
      { id: '1', assetId: 'test', valuation: 9000, recordedDate: '2025-01-15' },
      { id: '2', assetId: 'test', valuation: 8500, recordedDate: '2025-02-15' },
      { id: '3', assetId: 'test', valuation: 8000, recordedDate: '2025-03-15' },
    ]);

    let tree: ReactTestRenderer;
    await act(async () => {
      tree = create(
        React.createElement(ValuationChart, {
          assetId: 'test',
          purchasePrice: 10000,
        })
      );
      // Wait for async state updates
      await new Promise(r => setTimeout(r, 100));
    });

    expect(tree!).toBeDefined();
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('当前估值');
  });
});

describe('LockScreen', () => {
  test('renders without crashing', () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(
        React.createElement(LockScreen, {
          onUnlocked: jest.fn(),
          themeColor: '#6C5CE7',
        })
      );
    });
    expect(tree!).toBeDefined();
    expect(tree!.toJSON()).toBeDefined();
  });

  test('shows app name and PIN dots', () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(
        React.createElement(LockScreen, {
          onUnlocked: jest.fn(),
          themeColor: '#6C5CE7',
        })
      );
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('家底');
    expect(json).toContain('WorthBase');
  });

  test('shows numeric keypad (0-9)', () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(
        React.createElement(LockScreen, {
          onUnlocked: jest.fn(),
          themeColor: '#6C5CE7',
        })
      );
    });
    const json = JSON.stringify(tree!.toJSON());
    // Numbers appear as children arrays in the JSON tree: ["0"], ["1"], etc.
    for (let i = 0; i <= 9; i++) {
      expect(json).toContain(`["${i}"]`);
    }
  });
});
