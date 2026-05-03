import CryptoJS from 'crypto-js';
import EncryptedStorage from './secureStorage';

const PBKDF2_ITERATIONS = 10000;
const AES_KEY_SIZE = 256;
const IV_SIZE = 16; // 128 bit

export interface EncryptedContent {
  encrypted: string;
  iv: string;
  authTag: string;
}

/**
 * Deriva chiave AES da participant IDs usando PBKDF2
 */
export async function deriveChatKey(participants: string[]): Promise<string> {
  const sorted = participants.sort().join(',');
  const salt = CryptoJS.enc.Utf8.parse(sorted.substring(0, 16));
  const key = CryptoJS.PBKDF2('talksy-chat-key-' + sorted, salt, {
    keySize: AES_KEY_SIZE / 32,
    iterations
