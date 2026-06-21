import CryptoJS from 'crypto-js';
import EncryptedStorage from './secureStorage';

const PBKDF2_ITERATIONS = 10000;
const AES_KEY_SIZE = 256;
const STORAGE_PREFIX = 'sayup-e2ee-v1';

export interface EncryptedContent {
  encrypted: string;
  iv: string;
  authTag: string;
}

export async function deriveChatKey(participants: string[]): Promise<string> {
  const normalized = [...participants].sort().join(',');
  const salt = CryptoJS.enc.Utf8.parse(normalized.slice(0, 16));
  const key = CryptoJS.PBKDF2(`${STORAGE_PREFIX}:${normalized}`, salt, {
    keySize: AES_KEY_SIZE / 32,
    iterations: PBKDF2_ITERATIONS,
  });

  return key.toString(CryptoJS.enc.Hex);
}

export function encryptMessage(plainText: string, key: string): EncryptedContent {
  const encrypted = CryptoJS.AES.encrypt(plainText, key);
  return {
    encrypted: encrypted.toString(),
    iv: encrypted.iv?.toString() ?? '',
    authTag: '',
  };
}

export function decryptMessage(payload: EncryptedContent | string, key: string): string {
  const encryptedText = typeof payload === 'string' ? payload : payload.encrypted;
  const bytes = CryptoJS.AES.decrypt(encryptedText, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export async function saveChatKey(chatId: string, key: string): Promise<void> {
  await EncryptedStorage.setItem(`${STORAGE_PREFIX}:chat:${chatId}`, key);
}

export async function getChatKey(chatId: string): Promise<string | null> {
  return EncryptedStorage.getItem(`${STORAGE_PREFIX}:chat:${chatId}`);
}

export async function deleteChatKey(chatId: string): Promise<void> {
  await EncryptedStorage.removeItem(`${STORAGE_PREFIX}:chat:${chatId}`);
}
