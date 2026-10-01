/// <reference types="jest" />

/**
 * WorthBase (家底) - Metal Price Service Tests
 * toCnyPerGram conversion + cache/fallback behavior with mocked fetch and settings store.
 */

// ─── Mock settings storage (cache backend) ───
const settingsStore: { value: unknown } = { value: null };

jest.mock('@/db/settings-repository', () => ({
  SettingsRepository: {
    getJSON: jest.fn(async (_key: string, defaultValue: unknown) =>
      settingsStore.value !== null ? settingsStore.value : defaultValue
    ),
    setJSON: jest.fn(async (_key: string, value: unknown) => {
      settingsStore.value = value;
    }),
  },
}));

import { MetalPriceService, toCnyPerGram } from '@/services/metal-price-service';

function mockFetchSuccess(xauUsd: number, xagUsd: number, usdToCny: number) {
  (globalThis as any).fetch = jest.fn(async (url: string) => {
    if (url.includes('XAU')) return { ok: true, status: 200, json: async () => ({ price: xauUsd }) };
    if (url.includes('XAG')) return { ok: true, status: 200, json: async () => ({ price: xagUsd }) };
    return { ok: true, status: 200, json: async () => ({ rates: { CNY: usdToCny } }) };
  });
}

function mockFetchFailure() {
  (globalThis as any).fetch = jest.fn(async () => { throw new Error('network down'); });
}

// ─── Conversion math ───
describe('toCnyPerGram', () => {
  test('converts USD/oz to CNY/g (31.1035 g per troy oz)', () => {
    // 3110.35 USD/oz × 2 CNY/USD ÷ 31.1035 = 200 CNY/g
    expect(toCnyPerGram(3110.35, 2)).toBeCloseTo(200, 5);
  });

  test('realistic values: $4183.2/oz × 6.7045 ≈ ¥902/g', () => {
    expect(toCnyPerGram(4183.2, 6.7045)).toBeCloseTo(902.19, 0);
  });
});

// ─── Service cache & fallback behavior ───
describe('MetalPriceService', () => {
  beforeEach(() => {
    settingsStore.value = null;
    jest.clearAllMocks();
  });

  test('fresh cache (<10min) is returned without fetching', async () => {
    settingsStore.value = {
      goldPerGram: 900, silverPerGram: 13,
      fetchedAt: new Date().toISOString(),
    };
    mockFetchFailure();

    const prices = await MetalPriceService.getPrices();
    expect(prices).not.toBeNull();
    expect(prices!.stale).toBe(false);
    expect(prices!.goldPerGram).toBe(900);
    expect((globalThis as any).fetch).not.toHaveBeenCalled();
  });

  test('stale cache triggers refresh and rewrites cache', async () => {
    settingsStore.value = {
      goldPerGram: 800, silverPerGram: 12,
      fetchedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    };
    mockFetchSuccess(3110.35, 62.207, 2); // → gold 200/g, silver 4/g

    const prices = await MetalPriceService.getPrices();
    expect(prices!.goldPerGram).toBeCloseTo(200, 5);
    expect(prices!.silverPerGram).toBeCloseTo(4, 5);
    expect(prices!.stale).toBe(false);
    // Cache was rewritten with fresh values
    expect((settingsStore.value as any).goldPerGram).toBeCloseTo(200, 5);
  });

  test('network failure falls back to stale cache', async () => {
    settingsStore.value = {
      goldPerGram: 800, silverPerGram: 12,
      fetchedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    };
    mockFetchFailure();

    const prices = await MetalPriceService.getPrices();
    expect(prices).not.toBeNull();
    expect(prices!.goldPerGram).toBe(800);
    expect(prices!.stale).toBe(true);
  });

  test('network failure without cache returns null', async () => {
    mockFetchFailure();
    expect(await MetalPriceService.getPrices()).toBeNull();
  });

  test('HTTP error response is treated as failure', async () => {
    (globalThis as any).fetch = jest.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    expect(await MetalPriceService.getPrices()).toBeNull();
  });

  test('malformed response shape is treated as failure', async () => {
    (globalThis as any).fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ unexpected: true }) }));
    expect(await MetalPriceService.getPrices()).toBeNull();
  });

  test('getCached marks old entries stale and passes through fresh ones', async () => {
    settingsStore.value = {
      goldPerGram: 900, silverPerGram: 13,
      fetchedAt: new Date().toISOString(),
    };
    const fresh = await MetalPriceService.getCached();
    expect(fresh!.stale).toBe(false);

    settingsStore.value = {
      goldPerGram: 900, silverPerGram: 13,
      fetchedAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    };
    const old = await MetalPriceService.getCached();
    expect(old!.stale).toBe(true);

    settingsStore.value = null;
    expect(await MetalPriceService.getCached()).toBeNull();
  });
});
