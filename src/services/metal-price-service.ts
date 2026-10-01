/**
 * WorthBase (家底) - Metal Price Service
 * 获取国际现货黄金/白银价格并折算为 元/克，带本地缓存。
 * 数据源（免费、无需 key）：
 *   - api.gold-api.com: XAU/XAG 现货价（美元/盎司）
 *   - api.frankfurter.dev: USD→CNY 汇率
 * 折算：元/克 = 美元/盎司 × 汇率 ÷ 31.1035
 * 这是 App 唯一的网络功能；离线时回落缓存，失败静默降级（UI 不阻塞）。
 */

import { SettingsRepository } from '@/db/settings-repository';

/** 1 金衡盎司 = 31.1035 克 */
const GRAMS_PER_TROY_OZ = 31.1035;
/** settings 表中的缓存 key（loadAll/saveAll 只认固定 key，不会进入备份导出） */
const CACHE_KEY = 'metal_price_cache';
/** 缓存有效期：10 分钟 */
const CACHE_TTL_MS = 10 * 60 * 1000;
/** 网络请求超时：8 秒 */
const FETCH_TIMEOUT_MS = 8000;

const XAU_URL = 'https://api.gold-api.com/price/XAU';
const XAG_URL = 'https://api.gold-api.com/price/XAG';
const FX_URL = 'https://api.frankfurter.dev/v1/latest?base=USD&symbols=CNY';

/** 贵金属参考价（元/克） */
export interface MetalPrices {
  goldPerGram: number;
  silverPerGram: number;
  /** 获取时间 (ISO 8601) */
  fetchedAt: string;
  /** true = 数据来自过期缓存（网络失败或尚未刷新） */
  stale: boolean;
}

interface CachedMetalPrices {
  goldPerGram: number;
  silverPerGram: number;
  fetchedAt: string;
}

/** 美元/盎司 → 元/克（纯函数，便于单测） */
export function toCnyPerGram(usdPerOz: number, usdToCny: number): number {
  return (usdPerOz * usdToCny) / GRAMS_PER_TROY_OZ;
}

/** 带超时的 fetch */
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
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
    };
  },

  /**
   * 获取当前价格：缓存新鲜（<10 分钟）直接返回；否则联网刷新并写缓存。
   * 网络失败时回落过期缓存（stale=true）；无缓存可用时返回 null。
   */
  async getPrices(): Promise<MetalPrices | null> {
    const cached = await this.getCached();
    if (cached && !cached.stale) return cached;

    try {
      const [xauRes, xagRes, fxRes] = await Promise.all([
        fetchWithTimeout(XAU_URL),
        fetchWithTimeout(XAG_URL),
        fetchWithTimeout(FX_URL),
      ]);
      if (!xauRes.ok || !xagRes.ok || !fxRes.ok) {
        throw new Error(`price api http error: ${xauRes.status}/${xagRes.status}/${fxRes.status}`);
      }
      const xau = await xauRes.json();
      const xag = await xagRes.json();
      const fx = await fxRes.json();
      const usdToCny = fx?.rates?.CNY;
      if (typeof xau?.price !== 'number' || typeof xag?.price !== 'number' || typeof usdToCny !== 'number') {
        throw new Error('unexpected price api response shape');
      }

      const prices: MetalPrices = {
        goldPerGram: toCnyPerGram(xau.price, usdToCny),
        silverPerGram: toCnyPerGram(xag.price, usdToCny),
        fetchedAt: new Date().toISOString(),
        stale: false,
      };
      const { goldPerGram, silverPerGram, fetchedAt } = prices;
      await SettingsRepository.setJSON(CACHE_KEY, { goldPerGram, silverPerGram, fetchedAt } satisfies CachedMetalPrices);
      return prices;
    } catch {
      // 离线/接口异常：回落过期缓存（可能为 null），不打扰用户
      return cached;
    }
  },
};
