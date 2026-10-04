/// <reference types="jest" />

/**
 * WorthBase (家底) - Metal Price Service Tests
 * toCnyPerGram conversion + cache/multi-source fx fallback with mocked fetch and settings store.
 */

// ─── Mock settings storage (cache backend, keyed) ───
const METAL_KEY = 'metal_price_cache';
const FX_KEY = 'fx_rate_cache';
let store: Record<string, unknown> = {};

const getMetalCache = () => store[METAL_KEY] as any;
const getFxCache = () => store[FX_KEY] as any;
const setMetalCache = (v: unknown) => { if (v === null) delete store[METAL_KEY]; else store[METAL_KEY] = v; };
const setFxCache = (v: unknown) => { if (v === null) delete store[FX_KEY]; else store[FX_KEY] = v; };

jest.mock('@/db/settings-repository', () => ({
  SettingsRepository: {
    getJSON: jest.fn(async (key: string, defaultValue: unknown) =>
      key in store ? store[key] : defaultValue
    ),
    setJSON: jest.fn(async (key: string, value: unknown) => {
      store[key] = value;
    }),
  },
}));

import { MetalPriceService, toCnyPerGram, isPlausibleCnyRate } from '@/services/metal-price-service';

/** 金价 3110.35 USD/oz、银价 62.207 USD/oz、汇率 7 → 金 700 元/克、银 14 元/克 */
const XAU_USD = 3110.35;
const XAG_USD = 62.207;
const RATE = 7;

// 各汇率源的真实响应形态
const tencentBody = (r: number) => `v_whUSDCNY="310~美元人民币~USDCNY~${r.toFixed(4)}~0~20261001025956~6.7065~6.7050";`;
const sinaBody = (r: number) => `var hq_str_fx_susdcny="03:00:00,${r.toFixed(10)},6.7072000000,6.7050000000,51.0000000000,${r.toFixed(10)}";`;

const textRes = (body: string) => ({
  ok: true, status: 200, text: async () => body, json: async () => ({}),
});
const jsonRes = (obj: unknown) => ({
  ok: true, status: 200, json: async () => obj, text: async () => JSON.stringify(obj),
});

function fxResponseFor(url: string, rate: number) {
  if (url.includes('qt.gtimg.cn')) return textRes(tencentBody(rate));
  if (url.includes('sinajs.cn')) return textRes(sinaBody(rate));
  return jsonRes({ rates: { CNY: rate } }); // er-api / frankfurter 同形
}

function mockFetchSuccess(xauUsd = XAU_USD, xagUsd = XAG_USD, usdToCny = RATE) {
  (globalThis as any).fetch = jest.fn(async (url: string) => {
    if (url.includes('XAU')) return jsonRes({ price: xauUsd });
    if (url.includes('XAG')) return jsonRes({ price: xagUsd });
    return fxResponseFor(url, usdToCny);
  });
}

function mockFetchFailure() {
  (globalThis as any).fetch = jest.fn(async () => { throw new Error('network down'); });
}

/** 金银价正常，指定 URL 片段的汇率源失败（模拟 DNS 污染 / TLS 重置） */
function mockFetchWithFxDown(downPatterns: string[], usdToCny = RATE) {
  (globalThis as any).fetch = jest.fn(async (url: string) => {
    if (url.includes('XAU')) return jsonRes({ price: XAU_USD });
    if (url.includes('XAG')) return jsonRes({ price: XAG_USD });
    if (downPatterns.some(p => url.includes(p))) throw new Error(`blocked: ${url}`);
    return fxResponseFor(url, usdToCny);
  });
}

const fresh = (msAgo = 0) => new Date(Date.now() - msAgo).toISOString();

// ─── Conversion math ───
describe('toCnyPerGram', () => {
  test('converts USD/oz to CNY/g (31.1035 g per troy oz)', () => {
    // 3110.35 USD/oz × 7 CNY/USD ÷ 31.1035 = 700 CNY/g
    expect(toCnyPerGram(3110.35, 7)).toBeCloseTo(700, 5);
  });

  test('realistic values: $4183.2/oz × 6.7045 ≈ ¥902/g', () => {
    expect(toCnyPerGram(4183.2, 6.7045)).toBeCloseTo(902.19, 0);
  });
});

// ─── 汇率合理性校验（挡住解析错位污染估值） ───
describe('isPlausibleCnyRate', () => {
  test('accepts realistic USD/CNY rates', () => {
    expect(isPlausibleCnyRate(6.705)).toBe(true);
    expect(isPlausibleCnyRate(7.3)).toBe(true);
  });

  test('rejects garbage that would wreck valuations', () => {
    expect(isPlausibleCnyRate(0)).toBe(false);
    expect(isPlausibleCnyRate(2)).toBe(false);        // 低于区间
    expect(isPlausibleCnyRate(51)).toBe(false);       // 新浪响应里的成交量字段
    expect(isPlausibleCnyRate(310)).toBe(false);      // 腾讯响应里的首字段
    expect(isPlausibleCnyRate(NaN)).toBe(false);
    expect(isPlausibleCnyRate('6.705')).toBe(false);
    expect(isPlausibleCnyRate(null)).toBe(false);
  });
});

// ─── Service cache & fallback behavior ───
describe('MetalPriceService', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    store = {};
    jest.clearAllMocks();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  test('fresh cache (<10min) is returned without fetching', async () => {
    setMetalCache({ goldPerGram: 900, silverPerGram: 13, fetchedAt: fresh() });
    mockFetchFailure();

    const prices = await MetalPriceService.getPrices();
    expect(prices).not.toBeNull();
    expect(prices!.stale).toBe(false);
    expect(prices!.goldPerGram).toBe(900);
    expect((globalThis as any).fetch).not.toHaveBeenCalled();
  });

  test('stale cache triggers refresh and rewrites cache', async () => {
    setMetalCache({ goldPerGram: 800, silverPerGram: 12, fetchedAt: fresh(60 * 60 * 1000) });
    mockFetchSuccess(); // → gold 700/g, silver 14/g

    const prices = await MetalPriceService.getPrices();
    expect(prices!.goldPerGram).toBeCloseTo(700, 5);
    expect(prices!.silverPerGram).toBeCloseTo(14, 5);
    expect(prices!.stale).toBe(false);
    expect(getMetalCache().goldPerGram).toBeCloseTo(700, 5);
  });

  test('primary (tencent) source is used first and its rate cached', async () => {
    mockFetchSuccess(XAU_USD, XAG_USD, 6.705);

    const prices = await MetalPriceService.getPrices();
    expect(prices!.fxSource).toBe('tencent');
    expect(prices!.usdToCny).toBe(6.705);
    expect(getFxCache().usdToCny).toBe(6.705);
    expect(getFxCache().source).toBe('tencent');
  });

  test('cache hit preserves the fx rate used, so the UI can explain the price', async () => {
    mockFetchSuccess(XAU_USD, XAG_USD, 6.705);
    await MetalPriceService.getPrices(); // 联网成功并写缓存

    mockFetchFailure(); // 之后断网
    const cached = await MetalPriceService.getCached();
    expect(cached!.usdToCny).toBe(6.705);

    const prices = await MetalPriceService.getPrices(); // 命中新鲜缓存，不联网
    expect(prices!.goldPerGram).toBeCloseTo(670.5, 1);
    expect(prices!.usdToCny).toBe(6.705);
    expect((globalThis as any).fetch).not.toHaveBeenCalled();
  });

  test('network failure falls back to stale cache', async () => {
    setMetalCache({ goldPerGram: 800, silverPerGram: 12, fetchedAt: fresh(60 * 60 * 1000) });
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
    (globalThis as any).fetch = jest.fn(async () => ({ ok: false, status: 500, json: async () => ({}), text: async () => '' }));
    expect(await MetalPriceService.getPrices()).toBeNull();
  });

  test('malformed response shape is treated as failure', async () => {
    (globalThis as any).fetch = jest.fn(async () => jsonRes({ unexpected: true }));
    expect(await MetalPriceService.getPrices()).toBeNull();
  });

  test('getCached marks old entries stale and passes through fresh ones', async () => {
    setMetalCache({ goldPerGram: 900, silverPerGram: 13, fetchedAt: fresh() });
    expect((await MetalPriceService.getCached())!.stale).toBe(false);

    setMetalCache({ goldPerGram: 900, silverPerGram: 13, fetchedAt: fresh(11 * 60 * 1000) });
    expect((await MetalPriceService.getCached())!.stale).toBe(true);

    setMetalCache(null);
    expect(await MetalPriceService.getCached()).toBeNull();
  });
});

// ─── 汇率多源回落（国内优先 → 境外兜底 → 缓存兜底） ───
describe('MetalPriceService fx fallback chain', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    store = {};
    jest.clearAllMocks();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  test('tencent down → sina takes over', async () => {
    mockFetchWithFxDown(['qt.gtimg.cn'], RATE);

    const prices = await MetalPriceService.getPrices();
    expect(prices).not.toBeNull();
    expect(prices!.goldPerGram).toBeCloseTo(700, 5);
    expect(prices!.fxSource).toBe('sina');
    expect(prices!.fxStale).toBe(false);
  });

  test('both domestic sources down → overseas er-api takes over', async () => {
    mockFetchWithFxDown(['qt.gtimg.cn', 'sinajs.cn'], RATE);

    const prices = await MetalPriceService.getPrices();
    expect(prices!.goldPerGram).toBeCloseTo(700, 5);
    expect(prices!.fxSource).toBe('er-api');
  });

  test('first three down → frankfurter is the last resort', async () => {
    mockFetchWithFxDown(['qt.gtimg.cn', 'sinajs.cn', 'er-api'], RATE);

    const prices = await MetalPriceService.getPrices();
    expect(prices!.goldPerGram).toBeCloseTo(700, 5);
    expect(prices!.fxSource).toBe('frankfurter');
  });

  test('all fx sources down → uses cached rate and flags fxStale', async () => {
    setFxCache({ usdToCny: RATE, fetchedAt: fresh(), source: 'tencent' });
    mockFetchWithFxDown(['qt.gtimg.cn', 'sinajs.cn', 'er-api', 'frankfurter']);

    const prices = await MetalPriceService.getPrices();
    expect(prices).not.toBeNull();
    expect(prices!.goldPerGram).toBeCloseTo(700, 5);
    expect(prices!.fxStale).toBe(true);
    expect(prices!.stale).toBe(false);
  });

  test('all fx sources down + no cache → null even though spot prices arrived', async () => {
    // 真实故障场景：金银价拿得到，汇率源全挂且首次运行无缓存
    mockFetchWithFxDown(['qt.gtimg.cn', 'sinajs.cn', 'er-api', 'frankfurter']);

    expect(await MetalPriceService.getPrices()).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  test('fx cache older than 24h is still usable as fallback', async () => {
    setFxCache({ usdToCny: RATE, fetchedAt: fresh(3 * 24 * 60 * 60 * 1000), source: 'sina' });
    mockFetchWithFxDown(['qt.gtimg.cn', 'sinajs.cn', 'er-api', 'frankfurter']);

    const prices = await MetalPriceService.getPrices();
    expect(prices!.goldPerGram).toBeCloseTo(700, 5);
    expect(prices!.fxStale).toBe(true);
    expect(await MetalPriceService.isFxCachedFresh()).toBe(false);
  });

  test('implausible fx rate is rejected, not used to compute a bogus valuation', async () => {
    // 腾讯返回成交量字段错位的畸形响应：汇率位是 51
    (globalThis as any).fetch = jest.fn(async (url: string) => {
      if (url.includes('XAU')) return jsonRes({ price: XAU_USD });
      if (url.includes('XAG')) return jsonRes({ price: XAG_USD });
      if (url.includes('qt.gtimg.cn')) return textRes('v_whUSDCNY="310~x~USDCNY~51.0000~0~20261001~";');
      if (url.includes('sinajs.cn')) return textRes('var hq_str_fx_susdcny="03:00:00,999.0,1.0";');
      return jsonRes({ rates: { CNY: 99999 } });
    });

    expect(await MetalPriceService.getPrices()).toBeNull();
    expect(getFxCache()).toBeUndefined();
  });

  test('metal spot down but fx fine → falls back to metal cache, not null', async () => {
    setMetalCache({ goldPerGram: 880, silverPerGram: 12, fetchedAt: fresh(60 * 60 * 1000) });
    (globalThis as any).fetch = jest.fn(async (url: string) => {
      if (url.includes('XAU') || url.includes('XAG')) throw new Error('metal api down');
      return fxResponseFor(url, RATE);
    });

    const prices = await MetalPriceService.getPrices();
    expect(prices!.goldPerGram).toBe(880);
    expect(prices!.stale).toBe(true);
  });
});
