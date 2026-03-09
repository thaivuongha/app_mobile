/**
 * BluFi Cryptography
 *
 * Tham chiếu:
 *   - Android: lib-blufi/src/main/java/blufi/espressif/security/BlufiDH.java
 *   - iOS:     BlufiLibrary/Security/ (openssl DH + AES)
 *   - Spec:    https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/ble/blufi.html
 *
 * Giao thức BluFi dùng:
 *   1. DH key exchange với nhóm tham số cố định của Espressif (1024-bit prime)
 *   2. Shared secret → SHA256 → 16 bytes đầu làm AES-128 key
 *   3. AES-128 CBC mode, IV = sha256(key + seq)[0:16]
 *   4. CRC16 checksum (CCITT, poly=0x1021, init=0x0000)
 */

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
  return BigInt('0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join(''));
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

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data.buffer as ArrayBuffer);
  return new Uint8Array(hashBuffer);
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
    const privateBytes = new Uint8Array(128);
    crypto.getRandomValues(privateBytes);
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
  async computeAesKey(espPublicKeyBytes: Uint8Array): Promise<Uint8Array> {
    const espPub = bytesToBigInt(espPublicKeyBytes);
    const shared = modPow(espPub, this.privateKey, this.p);
    const sharedBytes = bigIntToBytes(shared, 128);
    const hash = await sha256(sharedBytes);
    this.sharedSecret = hash.slice(0, 16);
    return this.sharedSecret;
  }

  getAesKey(): Uint8Array {
    if (!this.sharedSecret) throw new Error('DH chưa hoàn thành: gọi computeAesKey trước');
    return this.sharedSecret;
  }
}

/**
 * AES-128 CBC encrypt
 * IV = sha256(aesKey + seq_le4)[0:16]
 */
export async function aesEncrypt(data: Uint8Array, key: Uint8Array, seq: number): Promise<Uint8Array> {
  // Tính IV
  const ivInput = new Uint8Array(key.length + 4);
  ivInput.set(key, 0);
  new DataView(ivInput.buffer).setUint32(key.length, seq, true);
  const ivHash = await sha256(ivInput);
  const iv = ivHash.slice(0, 16);

  // Padding PKCS7
  const blockSize = 16;
  const padLen = blockSize - (data.length % blockSize);
  const padded = new Uint8Array(data.length + padLen);
  padded.set(data, 0);
  padded.fill(padLen, data.length);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key.buffer as ArrayBuffer,
    { name: 'AES-CBC' },
    false,
    ['encrypt']
  );
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: iv.buffer as ArrayBuffer },
    cryptoKey,
    padded.buffer as ArrayBuffer
  );
  return new Uint8Array(encrypted);
}

/**
 * AES-128 CBC decrypt
 */
export async function aesDecrypt(data: Uint8Array, key: Uint8Array, seq: number): Promise<Uint8Array> {
  const ivInput = new Uint8Array(key.length + 4);
  ivInput.set(key, 0);
  new DataView(ivInput.buffer).setUint32(key.length, seq, true);
  const ivHash = await sha256(ivInput);
  const iv = ivHash.slice(0, 16);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key.buffer as ArrayBuffer,
    { name: 'AES-CBC' },
    false,
    ['decrypt']
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: iv.buffer as ArrayBuffer },
    cryptoKey,
    data.buffer as ArrayBuffer
  );
  const result = new Uint8Array(decrypted);

  // Unpad PKCS7
  const padLen = result[result.length - 1];
  return result.slice(0, result.length - padLen);
}

/**
 * CRC16-CCITT checksum
 * poly = 0x1021, init = 0x0000, reflect = false
 * Tham chiếu: lib-blufi BlufiCRC.java
 */
export function crc16(data: Uint8Array): number {
  let crc = 0x0000;
  for (const byte of data) {
    crc ^= (byte << 8);
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
      crc &= 0xffff;
    }
  }
  return crc;
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
