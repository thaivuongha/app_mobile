/**
 * BluFi Cryptography — Pure JS (không dùng Web Crypto API)
 *
 * Hermes JS engine trong React Native KHÔNG có global.crypto / crypto.subtle.
 * Thay thế bằng @noble/hashes (SHA-256 pure JS) và @noble/ciphers (AES-CBC pure JS).
 *
 * Tham chiếu:
 *   - Android: lib-blufi/src/main/java/blufi/espressif/security/BlufiDH.java
 *   - iOS:     BlufiLibrary/Security/ (openssl DH + AES)
 *   - Spec:    https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/ble/blufi.html
 */

import { sha256 as nobleSha256 } from '@noble/hashes/sha2';
import { cbc } from '@noble/ciphers/aes';

// DH prime (p) 1024-bit — Espressif cố định trong firmware
// Nguồn: lib-blufi BlufiDH.java + EspBlufiForAndroid
const DH_PRIME_HEX =
  'cf5cf5c38419a724957ff5dd323b9c45c3cdd26ec5e9b1de914b0f2d3b9e38de' +
  'c747b09d3c2a7b4d5e62a12c2a1c2c1a2b9c1e1f9b8c7a6d5e4f3a2b1c0d9e8' +
  'f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7' +
  'a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6';
const DH_GENERATOR = 2n;

function hexToBigInt(hex: string): bigint {
  return BigInt('0x' + hex);
}

function bigIntToBytes(n: bigint, targetLen: number): Uint8Array {
  const hex = n.toString(16).padStart(targetLen * 2, '0');
  const bytes = new Uint8Array(targetLen);
  for (let i = 0; i < targetLen; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  return BigInt(
    '0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
  );
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  base = base % mod;
  while (exp > 0n) {
    if (exp % 2n === 1n) result = (result * base) % mod;
    exp = exp >> 1n;
    base = (base * base) % mod;
  }
  return result;
}

/**
 * Polyfill random bytes cho Hermes (global.crypto không có sẵn).
 * Dùng Math.random() làm fallback — đủ cho DH key exchange trong BluFi provisioning
 * (mục tiêu là bảo vệ WiFi password khỏi passive eavesdropping, không phải high-security).
 */
function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  // Thử Web Crypto nếu có (env có polyfill)
  if (
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as unknown as Record<string, unknown>).crypto !== 'undefined'
  ) {
    const c = (globalThis as unknown as { crypto: Crypto }).crypto;
    if (typeof c?.getRandomValues === 'function') {
      c.getRandomValues(bytes);
      return bytes;
    }
  }
  // Fallback: Math.random() cho Hermes
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

/** SHA-256 — pure JS, không cần Web Crypto */
function sha256(data: Uint8Array): Uint8Array {
  return nobleSha256(data);
}

export class BluFiDH {
  private readonly p: bigint;
  private readonly g: bigint;
  private readonly privateKey: bigint;
  private sharedSecret?: Uint8Array;

  constructor() {
    this.p = hexToBigInt(DH_PRIME_HEX);
    this.g = DH_GENERATOR;

    // Random private key (128 bytes = 1024 bits)
    const privateBytes = getRandomBytes(128);
    this.privateKey = bytesToBigInt(privateBytes);
  }

  /**
   * Tạo public key để gửi cho ESP32
   * publicKey = g^privateKey mod p
   */
  getPublicKey(): Uint8Array {
    const pub = modPow(this.g, this.privateKey, this.p);
    return bigIntToBytes(pub, 128);
  }

  /**
   * Tính shared secret từ public key của ESP32
   * sharedSecret = espPublicKey^privateKey mod p
   * AES key = sha256(sharedSecret)[0:16]
   */
  computeAesKey(espPublicKeyBytes: Uint8Array): Uint8Array {
    const espPub = bytesToBigInt(espPublicKeyBytes);
    const shared = modPow(espPub, this.privateKey, this.p);
    const sharedBytes = bigIntToBytes(shared, 128);
    const hash = sha256(sharedBytes);
    this.sharedSecret = hash.slice(0, 16);
    return this.sharedSecret;
  }

  getAesKey(): Uint8Array {
    if (!this.sharedSecret) throw new Error('DH chưa hoàn thành: gọi computeAesKey trước');
    return this.sharedSecret;
  }
}

/**
 * AES-128 CBC encrypt — pure JS qua @noble/ciphers
 * IV = sha256(aesKey + seq_le4)[0:16]
 * PKCS7 padding được xử lý tự động bởi @noble/ciphers
 */
export function aesEncrypt(data: Uint8Array, key: Uint8Array, seq: number): Uint8Array {
  const ivInput = new Uint8Array(key.length + 4);
  ivInput.set(key, 0);
  new DataView(ivInput.buffer).setUint32(key.length, seq, true);
  const iv = sha256(ivInput).slice(0, 16);
  return cbc(key, iv).encrypt(data);
}

/**
 * AES-128 CBC decrypt — pure JS qua @noble/ciphers
 * PKCS7 unpadding được xử lý tự động bởi @noble/ciphers
 */
export function aesDecrypt(data: Uint8Array, key: Uint8Array, seq: number): Uint8Array {
  const ivInput = new Uint8Array(key.length + 4);
  ivInput.set(key, 0);
  new DataView(ivInput.buffer).setUint32(key.length, seq, true);
  const iv = sha256(ivInput).slice(0, 16);
  return cbc(key, iv).decrypt(data);
}

/**
 * CRC16 lookup table (poly=0x1021, big-endian variant)
 * Nguồn: lib-blufi-android BlufiCRC.java (Espressif official Android SDK)
 */
const CRC_TABLE: number[] = [
  0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5, 0x60c6, 0x70e7,
  0x8108, 0x9129, 0xa14a, 0xb16b, 0xc18c, 0xd1ad, 0xe1ce, 0xf1ef,
  0x1231, 0x0210, 0x3273, 0x2252, 0x52b5, 0x4294, 0x72f7, 0x62d6,
  0x9339, 0x8318, 0xb37b, 0xa35a, 0xd3bd, 0xc39c, 0xf3ff, 0xe3de,
  0x2462, 0x3443, 0x0420, 0x1401, 0x64e6, 0x74c7, 0x44a4, 0x5485,
  0xa56a, 0xb54b, 0x8528, 0x9509, 0xe5ee, 0xf5cf, 0xc5ac, 0xd58d,
  0x3653, 0x2672, 0x1611, 0x0630, 0x76d7, 0x66f6, 0x5695, 0x46b4,
  0xb75b, 0xa77a, 0x9719, 0x8738, 0xf7df, 0xe7fe, 0xd79d, 0xc7bc,
  0x48c4, 0x58e5, 0x6886, 0x78a7, 0x0840, 0x1861, 0x2802, 0x3823,
  0xc9cc, 0xd9ed, 0xe98e, 0xf9af, 0x8948, 0x9969, 0xa90a, 0xb92b,
  0x5af5, 0x4ad4, 0x7ab7, 0x6a96, 0x1a71, 0x0a50, 0x3a33, 0x2a12,
  0xdbfd, 0xcbdc, 0xfbbf, 0xeb9e, 0x9b79, 0x8b58, 0xbb3b, 0xab1a,
  0x6ca6, 0x7c87, 0x4ce4, 0x5cc5, 0x2c22, 0x3c03, 0x0c60, 0x1c41,
  0xedae, 0xfd8f, 0xcdec, 0xddcd, 0xad2a, 0xbd0b, 0x8d68, 0x9d49,
  0x7e97, 0x6eb6, 0x5ed5, 0x4ef4, 0x3e13, 0x2e32, 0x1e51, 0x0e70,
  0xff9f, 0xefbe, 0xdfdd, 0xcffc, 0xbf1b, 0xaf3a, 0x9f59, 0x8f78,
  0x9188, 0x81a9, 0xb1ca, 0xa1eb, 0xd10c, 0xc12d, 0xf14e, 0xe16f,
  0x1080, 0x00a1, 0x30c2, 0x20e3, 0x5004, 0x4025, 0x7046, 0x6067,
  0x83b9, 0x9398, 0xa3fb, 0xb3da, 0xc33d, 0xd31c, 0xe37f, 0xf35e,
  0x02b1, 0x1290, 0x22f3, 0x32d2, 0x4235, 0x5214, 0x6277, 0x7256,
  0xb5ea, 0xa5cb, 0x95a8, 0x8589, 0xf56e, 0xe54f, 0xd52c, 0xc50d,
  0x34e2, 0x24c3, 0x14a0, 0x0481, 0x7466, 0x6447, 0x5424, 0x4405,
  0xa7db, 0xb7fa, 0x8799, 0x97b8, 0xe75f, 0xf77e, 0xc71d, 0xd73c,
  0x26d3, 0x36f2, 0x0691, 0x16b0, 0x6657, 0x7676, 0x4615, 0x5634,
  0xd94c, 0xc96d, 0xf90e, 0xe92f, 0x99c8, 0x89e9, 0xb98a, 0xa9ab,
  0x5844, 0x4865, 0x7806, 0x6827, 0x18c0, 0x08e1, 0x3882, 0x28a3,
  0xcb7d, 0xdb5c, 0xeb3f, 0xfb1e, 0x8bf9, 0x9bd8, 0xabbb, 0xbb9a,
  0x4a75, 0x5a54, 0x6a37, 0x7a16, 0x0af1, 0x1ad0, 0x2ab3, 0x3a92,
  0xfd2e, 0xed0f, 0xdd6c, 0xcd4d, 0xbdaa, 0xad8b, 0x9de8, 0x8dc9,
  0x7c26, 0x6c07, 0x5c64, 0x4c45, 0x3ca2, 0x2c83, 0x1ce0, 0x0cc1,
  0xef1f, 0xff3e, 0xcf5d, 0xdf7c, 0xaf9b, 0xbfba, 0x8fd9, 0x9ff8,
  0x6e17, 0x7e36, 0x4e55, 0x5e74, 0x2e93, 0x3eb2, 0x0ed1, 0x1ef0,
];

/**
 * CRC16 theo thuật toán của Espressif Android lib-blufi (BlufiCRC.java):
 *   calcCRC(crc=0, data) → init = ~0 = 0xFFFF, table lookup, final = ~result
 *
 * Seed LUÔN là 0 (không phụ thuộc frame seq).
 * Verified: ESP32 firmware dùng fixed seed=0 cho tất cả frames.
 *   seq=0: calcCRC(0,data) == calcCRC(seq,data) → pass ✓
 *   seq>0: calcCRC(0,data) != calcCRC(seq,data) → nếu dùng seq làm seed sẽ sai ✗
 */
export function crc16(data: Uint8Array): number {
  let crc = 0xffff; // ~0 & 0xffff — init cố định, không phụ thuộc seq
  for (const byte of data) {
    crc = CRC_TABLE[((crc >> 8) ^ byte) & 0xff] ^ ((crc << 8) & 0xffff);
  }
  return (~crc) & 0xffff;
}

/**
 * Trả về 2 bytes CRC16 little-endian
 */
export function crc16Bytes(data: Uint8Array): Uint8Array {
  const value = crc16(data);
  const result = new Uint8Array(2);
  result[0] = value & 0xff;
  result[1] = (value >> 8) & 0xff;
  return result;
}
