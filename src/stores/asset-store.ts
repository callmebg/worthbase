/**
 * WorthBase (家底) - Asset Store (Zustand)
 * State: assets[], statusFilter, categoryFilter
 * Actions: addAsset, editAsset, deleteAsset, markRetired, recordSale, updateValuation, loadAssets
 */

import { create } from 'zustand';
import { AssetRepository } from '@/db/asset-repository';
import { ValuationRepository } from '@/db/valuation-repository';
import type { Asset } from '@/types/models';
import { AmortizationType, AssetCategory, AssetStatus } from '@/types/enums';

type StatusFilter = 'all' | AssetStatus;

interface AssetStore {
  assets: Asset[];
  statusFilter: StatusFilter;
  isLoading: boolean;

  loadAssets: () => Promise<void>;
  addAsset: (data: Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<Asset>;
  editAsset: (id: string, updates: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  markRetired: (id: string) => Promise<void>;
  restoreAsset: (id: string) => Promise<void>;
  recordSale: (id: string, sellDate: string, sellPrice: number) => Promise<void>;
  updateValuation: (id: string, valuation: number, date?: string) => Promise<void>;
  setStatusFilter: (filter: StatusFilter) => void;
  getFilteredAssets: () => Asset[];
}

export const useAssetStore = create<AssetStore>((set, get) => ({
  assets: [],
  statusFilter: 'all',
  isLoading: false,

  loadAssets: async () => {
    set({ isLoading: true });
    const assets = await AssetRepository.getAll();
    set({ assets, isLoading: false });
  },

  addAsset: async (data) => {
    const asset = await AssetRepository.create({
      ...data,
      status: AssetStatus.ACTIVE,
    });
    set(state => ({ assets: [asset, ...state.assets] }));
    return asset;
  },

  editAsset: async (id, updates) => {
    await AssetRepository.update(id, updates);
    set(state => ({
      assets: state.assets.map(a => a.id === id ? { ...a, ...updates } : a),
    }));
  },

  deleteAsset: async (id) => {
    await AssetRepository.delete(id);
    set(state => ({
      assets: state.assets.filter(a => a.id !== id),
    }));
  },

  markRetired: async (id) => {
    await AssetRepository.markRetired(id);
    set(state => ({
      assets: state.assets.map(a =>
        a.id === id ? { ...a, status: AssetStatus.RETIRED } : a
      ),
    }));
  },

  restoreAsset: async (id) => {
    await AssetRepository.restoreActive(id);
    set(state => ({
      assets: state.assets.map(a =>
        a.id === id ? { ...a, status: AssetStatus.ACTIVE } : a
      ),
    }));
  },

  recordSale: async (id, sellDate, sellPrice) => {
    await AssetRepository.recordSale(id, sellDate, sellPrice);
    set(state => ({
      assets: state.assets.map(a =>
        a.id === id
          ? { ...a, status: AssetStatus.SOLD, sellDate, sellPrice }
          : a
      ),
    }));
  },

  updateValuation: async (id, valuation, date) => {
    const recordedDate = date ?? new Date().toISOString().substring(0, 10);
    await ValuationRepository.create({
      assetId: id,
      valuation,
      recordedDate,
    });
    await AssetRepository.update(id, { currentValuation: valuation });
    set(state => ({
      assets: state.assets.map(a =>
        a.id === id ? { ...a, currentValuation: valuation } : a
      ),
    }));
  },

  setStatusFilter: (filter) => set({ statusFilter: filter }),

  getFilteredAssets: () => {
    const { assets, statusFilter } = get();
    if (statusFilter === 'all') return assets;
    return assets.filter(a => a.status === statusFilter);
  },
}));
