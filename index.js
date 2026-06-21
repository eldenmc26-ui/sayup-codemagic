class SimpleTextEncoder {
  encode(text) {
    const stringValue = String(text);
    const bytes = [];
    for (let i = 0; i < stringValue.length; i += 1) {
      const code = stringValue.charCodeAt(i);
      if (code < 0x80) {
        bytes.push(code);
      } else if (code < 0x800) {
        bytes.push(0xc0 | (code >> 6));
        bytes.push(0x80 | (code & 0x3f));
      } else if (code < 0xd800 || code >= 0xe000) {
        bytes.push(0xe0 | (code >> 12));
        bytes.push(0x80 | ((code >> 6) & 0x3f));
        bytes.push(0x80 | (code & 0x3f));
      } else {
        i += 1;
        const next = stringValue.charCodeAt(i);
        const fullCodePoint = 0x10000 + (((code & 0x3ff) << 10) | (next & 0x3ff));
        bytes.push(0xf0 | (fullCodePoint >> 18));
        bytes.push(0x80 | ((fullCodePoint >> 12) & 0x3f));
        bytes.push(0x80 | ((fullCodePoint >> 6) & 0x3f));
        bytes.push(0x80 | (fullCodePoint & 0x3f));
      }
    }
    return Uint8Array.from(bytes);
  }
}

class SimpleTextDecoder {
  decode(input) {
    const bytes = input instanceof Uint8Array ? input : Uint8Array.from(input || []);
    let output = '';
    for (let i = 0; i < bytes.length; i += 1) {
      const byte = bytes[i];
      if (byte < 0x80) {
        output += String.fromCharCode(byte);
      } else if (byte < 0xe0) {
        const next = bytes[++i] & 0x3f;
        output += String.fromCharCode(((byte & 0x1f) << 6) | next);
      } else if (byte < 0xf0) {
        const next1 = bytes[++i] & 0x3f;
        const next2 = bytes[++i] & 0x3f;
        output += String.fromCharCode(((byte & 0x0f) << 12) | (next1 << 6) | next2);
      } else {
        const next1 = bytes[++i] & 0x3f;
        const next2 = bytes[++i] & 0x3f;
        const next3 = bytes[++i] & 0x3f;
        const codePoint = ((byte & 0x07) << 18) | (next1 << 12) | (next2 << 6) | next3;
        const adjusted = codePoint - 0x10000;
        output += String.fromCharCode(0xd800 + (adjusted >> 10));
        output += String.fromCharCode(0xdc00 + (adjusted & 0x3ff));
      }
    }
    return output;
  }
}

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = SimpleTextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = SimpleTextDecoder;
}

// Polyfill for CryptoJS.lib.WordArray.random in React Native
import CryptoJS from 'crypto-js';
if (CryptoJS && CryptoJS.lib && CryptoJS.lib.WordArray) {
  CryptoJS.lib.WordArray.random = function(nBytes) {
    const words = [];
    for (let i = 0; i < nBytes; i += 4) {
      words.push((Math.random() * 0x100000000) | 0);
    }
    return CryptoJS.lib.WordArray.create(words, nBytes);
  };
}

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
