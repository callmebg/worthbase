/**
 * WorthBase (家底) - Metal Price Service
 * 获取国际现货黄金/白银价格并折算为 元/克，带本地缓存。
 * 数据源（免费、无需 key）：
 *   - api.gold-api.com: XAU/XAG 现货价（美元/盎司）
 *   - 汇率按序尝试：腾讯 → 新浪（国内，实测 <0.2s）→ open.er-api.com → frankfurter（境外兜底）
 * 折算：元/克 = 美元/盎司 × 汇率 ÷ 31.1035
 *
 * 为什么国内源优先：Cloudflare 系的 er-api / frankfurter 在国内网络下 DNS 易被污染、
 * TLS 随机重置，实测同一台设备 curl 时而 200(0.59s) 时而超时(12s)，不可依赖。
 * 金银价与汇率解耦：汇率源全挂时回落汇率缓存（不限期，仅标注 fxStale），
 * 只有金银现货价也拿不到才整块降级。所有失败均 console.warn，不静默。
 * 这是 App 唯一的网络功能；离线时回落缓存，UI 不阻塞。
 */

import { SettingsRepository } from '@/db/settings-repository';

/** 1 金衡盎司 = 31.1035 克 */
const GRAMS_PER_TROY_OZ = 31.1035;
/** settings 表中的缓存 key（loadAll/saveAll 只认固定 key，不会进入备份导出） */
const CACHE_KEY = 'metal_price_cache';
/** USD→CNY 汇率的独立缓存 key（汇率波动慢，可跨天复用） */
const FX_CACHE_KEY = 'fx_rate_cache';
/** 金银价缓存有效期：10 分钟 */
const CACHE_TTL_MS = 10 * 60 * 1000;
/** 汇率缓存「新鲜」阈值：24 小时；超过仍可用作兜底，但会标注 fxStale */
const FX_TTL_MS = 24 * 60 * 60 * 1000;
/** 网络请求超时：8 秒 */
const FETCH_TIMEOUT_MS = 8000;
/** 单个汇率源超时（国内源正常 <0.2s，5s 已非常宽松） */
const FX_FETCH_TIMEOUT_MS = 5000;
/** 整条汇率链的总预算，避免多源串联把等待时间叠加到几十秒 */
const FX_CHAIN_BUDGET_MS = 8000;
/** 汇率合理区间：挡住解析错位导致的离谱数值（USD/CNY 十年内在 6~7.3 波动） */
const PLAUSIBLE_CNY_MIN = 3;
const PLAUSIBLE_CNY_MAX = 15;

const XAU_URL = 'https://api.gold-api.com/price/XAU';
const XAG_URL = 'https://api.gold-api.com/price/XAG';

/** 贵金属参考价（元/克） */
export interface MetalPrices {
  goldPerGram: number;
  silverPerGram: number;
  /** 获取时间 (ISO 8601) */
  fetchedAt: string;
  /** true = 金银价来自过期缓存（网络失败或尚未刷新） */
  stale: boolean;
  /** 折算所用的 USD→CNY 汇率；来自旧缓存时可能缺失 */
  usdToCny?: number;
  /** true = 汇率取自本地缓存（联网取汇率失败） */
  fxStale?: boolean;
  /** 汇率来源名（诊断用） */
  fxSource?: string;
}

interface CachedMetalPrices {
  goldPerGram: number;
  silverPerGram: number;
  fetchedAt: string;
  /** 折算时用的汇率；一并缓存，命中缓存时 UI 才能说明价格是怎么来的 */
  usdToCny?: number;
}

interface CachedFxRate {
  usdToCny: number;
  fetchedAt: string;
  source?: string;
}

interface MetalSpot {
  goldUsdPerOz: number;
  silverUsdPerOz: number;
}

/** 一个汇率源：URL + 可选请求头 + 从响应体解析出 USD→CNY */
interface FxSource {
  name: string;
  url: string;
  headers?: Record<string, string>;
  parse: (res: Response) => Promise<number | null>;
}

/** 美元/盎司 → 元/克（纯函数，便于单测） */
export function toCnyPerGram(usdPerOz: number, usdToCny: number): number {
  return (usdPerOz * usdToCny) / GRAMS_PER_TROY_OZ;
}

/** 汇率是否落在合理区间（防止解析错位污染估值） */
export function isPlausibleCnyRate(rate: unknown): rate is number {
  return typeof rate === 'number' && isFinite(rate) && rate >= PLAUSIBLE_CNY_MIN && rate <= PLAUSIBLE_CNY_MAX;
}

/** JSON 型：{ rates: { CNY } }（er-api / frankfurter 同形） */
async function parseJsonRate(res: Response): Promise<number | null> {
  const json = await res.json();
  const rate = json?.rates?.CNY;
  return isPlausibleCnyRate(rate) ? rate : null;
}

/**
 * 分隔符型：从 v_xxx="a~b~6.7050~..." 或 var hq_str="t,6.7050,..." 中取汇率。
 * 这类接口是 GBK 编码，中文经 UTF-8 解码会乱码，但数字与分隔符是 ASCII，
 * 故只按分隔符取候选片段并做数值+区间校验，不依赖任何中文字段。
 */
function parseDelimitedRate(body: string, delimiter: '~' | ','): number | null {
  const quoted = body.match(/"([^"]*)"/);
  const fields = (quoted ? quoted[1] : body).split(delimiter);
  // 前 8 个字段里挑第一个像汇率的数（腾讯 index 3、新浪 index 1）
  for (const field of fields.slice(0, 8)) {
    const n = parseFloat(String(field).trim());
    if (isPlausibleCnyRate(n) && /^[\d.]+$/.test(String(field).trim())) return n;
  }
  return null;
}

/** 汇率源，按序尝试：国内优先（快且不受污染），境外兜底 */
const FX_SOURCES: FxSource[] = [
  {
    name: 'tencent',
    url: 'https://qt.gtimg.cn/q=whUSDCNY',
    parse: async res => parseDelimitedRate(await res.text(), '~'),
  },
  {
    name: 'sina',
    url: 'https://hq.sinajs.cn/list=fx_susdcny',
    // 新浪要求 Referer，否则 403
    headers: { Referer: 'https://finance.sina.com.cn' },
    parse: async res => parseDelimitedRate(await res.text(), ','),
  },
  {
    name: 'er-api',
    url: 'https://open.er-api.com/v6/latest/USD',
    parse: parseJsonRate,
  },
  {
    name: 'frankfurter',
    url: 'https://api.frankfurter.dev/v1/latest?base=USD&symbols=CNY',
    parse: parseJsonRate,
  },
];

/** 带超时的 fetch */
async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** 取现货金银价（美元/盎司）；失败返回 null */
async function fetchMetalSpot(): Promise<MetalSpot | null> {
  try {
    const [xauRes, xagRes] = await Promise.all([
      fetchWithTimeout(XAU_URL, FETCH_TIMEOUT_MS),
      fetchWithTimeout(XAG_URL, FETCH_TIMEOUT_MS),
    ]);
    if (!xauRes.ok || !xagRes.ok) {
      throw new Error(`metal api http error: ${xauRes.status}/${xagRes.status}`);
    }
    const xau = await xauRes.json();
    const xag = await xagRes.json();
    if (typeof xau?.price !== 'number' || typeof xag?.price !== 'number') {
      throw new Error('unexpected metal api response shape');
    }
    return { goldUsdPerOz: xau.price, silverUsdPerOz: xag.price };
  } catch (err) {
    console.warn('[MetalPrice] 现货金银价获取失败', err);
    return null;
  }
}

/** 读汇率缓存；无有效缓存返回 null */
async function getCachedFx(): Promise<CachedFxRate | null> {
  const cached = await SettingsRepository.getJSON<CachedFxRate | null>(FX_CACHE_KEY, null);
  if (!cached || !isPlausibleCnyRate(cached.usdToCny)) return null;
  return cached;
}

/**
 * 取 USD→CNY：依次尝试各源，成功即写缓存；总耗时受 FX_CHAIN_BUDGET_MS 约束。
 * 全部失败则回落汇率缓存（不限期，fromCache=true 供 UI 标注）。
 */
async function fetchUsdToCny(): Promise<{ rate: number; fromCache: boolean; source: string } | null> {
  const startedAt = Date.now();

  for (const source of FX_SOURCES) {
    const remaining = FX_CHAIN_BUDGET_MS - (Date.now() - startedAt);
    if (remaining <= 500) {
      console.warn('[MetalPrice] 汇率链超出总预算，停止尝试后续源');
      break;
    }
    try {
      const res = await fetchWithTimeout(source.url, Math.min(FX_FETCH_TIMEOUT_MS, remaining), {
        headers: source.headers,
      });
      if (!res.ok) throw new Error(`fx api http error: ${res.status}`);
      const rate = await source.parse(res);
      if (rate === null) throw new Error('fx rate missing or out of plausible range');
      await SettingsRepository.setJSON(FX_CACHE_KEY, {
        usdToCny: rate,
        fetchedAt: new Date().toISOString(),
        source: source.name,
      } satisfies CachedFxRate);
      return { rate, fromCache: false, source: source.name };
    } catch (err) {
      console.warn(`[MetalPrice] 汇率源失败，尝试下一个: ${source.name}`, err);
    }
  }

  const cached = await getCachedFx();
  if (cached) return { rate: cached.usdToCny, fromCache: true, source: `${cached.source ?? 'cache'}(cached)` };
  return null;
}

export const MetalPriceService = {
  /** 读取本地缓存；无缓存返回 null。超过 TTL 时 stale=true */
  async getCached(): Promise<MetalPrices | null> {
    const cached = await SettingsRepository.getJSON<CachedMetalPrices | null>(CACHE_KEY, null);
    if (!cached || typeof cached.goldPerGram !== 'number' || typeof cached.silverPerGram !== 'number') {
      return null;
    }
    const age = Date.now() - new Date(cached.fetchedAt).getTime();
    return {
      goldPerGram: cached.goldPerGram,
      silverPerGram: cached.silverPerGram,
      fetchedAt: cached.fetchedAt,
      stale: !isFinite(age) || age > CACHE_TTL_MS,
      usdToCny: isPlausibleCnyRate(cached.usdToCny) ? cached.usdToCny : undefined,
    };
  },

  /** 汇率缓存是否在 24h 内（仅供诊断/测试） */
  async isFxCachedFresh(): Promise<boolean> {
    const cached = await getCachedFx();
    if (!cached) return false;
    const age = Date.now() - new Date(cached.fetchedAt).getTime();
    return isFinite(age) && age <= FX_TTL_MS;
  },

  /**
   * 获取当前价格：缓存新鲜（<10 分钟）直接返回；否则联网刷新并写缓存。
   * 金银价失败时回落过期缓存（stale=true）；
   * 汇率失败但金银价拿到时，用汇率缓存折算（fxStale=true）；
   * 两者都无可用数据时返回 null。
   */
  async getPrices(): Promise<MetalPrices | null> {
    const cached = await this.getCached();
    if (cached && !cached.stale) return cached;

    // 金银价与汇率并行获取，互不拖死
    const [spot, fx] = await Promise.all([fetchMetalSpot(), fetchUsdToCny()]);

    if (!spot) {
      console.warn('[MetalPrice] 无现货价可用，回落缓存', { hasCache: !!cached });
      return cached;
    }
    if (!fx) {
      // 有美元金价但没有汇率，无法折算成元/克
      console.warn('[MetalPrice] 汇率不可用（含缓存），无法折算为元/克');
      return cached;
    }

    const prices: MetalPrices = {
      goldPerGram: toCnyPerGram(spot.goldUsdPerOz, fx.rate),
      silverPerGram: toCnyPerGram(spot.silverUsdPerOz, fx.rate),
      fetchedAt: new Date().toISOString(),
      stale: false,
      usdToCny: fx.rate,
      fxStale: fx.fromCache,
      fxSource: fx.source,
    };
    const { goldPerGram, silverPerGram, fetchedAt, usdToCny } = prices;
    await SettingsRepository.setJSON(CACHE_KEY, {
      goldPerGram, silverPerGram, fetchedAt, usdToCny,
    } satisfies CachedMetalPrices);
    return prices;
  },
};
