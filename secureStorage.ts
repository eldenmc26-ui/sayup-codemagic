import { Platform } from 'react-native';

type StorageLike = {
  setItem: (key: string, value: string) => Promise<void>;
  getItem: (key: string) => Promise<string | null>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
};

const webStorage: StorageLike = {
  async setItem(key, value) {
    (globalThis as any).localStorage?.setItem(key, value);
  },
  async getItem(key) {
    return (globalThis as any).localStorage?.getItem(key) ?? null;
  },
  async removeItem(key) {
    (globalThis as any).localStorage?.removeItem(key);
  },
  async clear() {
    (globalThis as any).localStorage?.clear();
  },
};

const nativeStorage: StorageLike =
  Platform.OS === 'web'
    ? webStorage
    : require('react-native-encrypted-storage').default;

export default nativeStorage;
