export const PROMOTION_STORAGE_KEY = 'nc_promo_state';

/** @typedef {{ dismissed?: Record<string, string>, copied?: Record<string, boolean> }} PromotionLocalState */

/**
 * @typedef {{ getItem: (key: string) => Promise<string | null> | string | null, setItem: (key: string, value: string) => Promise<void> | void }} PromotionStorageAdapter
 */

/**
 * @param {PromotionStorageAdapter} storage
 */
export function createPromotionLocalState(storage) {
  async function readState() {
    try {
      const raw = await storage.getItem(PROMOTION_STORAGE_KEY);
      if (!raw) return { dismissed: {}, copied: {} };
      const parsed = JSON.parse(raw);
      return {
        dismissed: parsed?.dismissed && typeof parsed.dismissed === 'object' ? parsed.dismissed : {},
        copied: parsed?.copied && typeof parsed.copied === 'object' ? parsed.copied : {},
      };
    } catch {
      return { dismissed: {}, copied: {} };
    }
  }

  async function writeState(state) {
    await storage.setItem(PROMOTION_STORAGE_KEY, JSON.stringify(state));
  }

  return {
    async getState() {
      return readState();
    },

    async getDismissedIds() {
      const state = await readState();
      return Object.keys(state.dismissed || {});
    },

    async getCopiedIds() {
      const state = await readState();
      return Object.keys(state.copied || {}).filter((id) => state.copied[id]);
    },

    async dismiss(promotionId) {
      if (!promotionId) return;
      const state = await readState();
      state.dismissed = { ...state.dismissed, [promotionId]: new Date().toISOString() };
      await writeState(state);
    },

    async markCopied(promotionId) {
      if (!promotionId) return;
      const state = await readState();
      state.copied = { ...state.copied, [promotionId]: true };
      await writeState(state);
    },

    async isDismissed(promotionId) {
      const state = await readState();
      return Boolean(state.dismissed?.[promotionId]);
    },
  };
}

/** Browser localStorage adapter */
export const webPromotionStorage = {
  getItem(key) {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  },
  setItem(key, value) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  },
};
