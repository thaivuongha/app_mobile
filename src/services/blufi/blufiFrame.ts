/**
 * BluFi Frame Builder & Parser
 *
 * Format frame BluFi (theo Espressif spec):
 *   [type:1][frame_ctrl:1][seq:1][data_len:1][data:N][checksum:0or2]
 *
 *   type byte:
 *     bit[1:0] = frame_type (0=Ctrl, 1=Data, 2=reserved, 3=reserved)
 *     bit[7:2] = subtype (frame_ctrl hoặc data subtype)
 *
 *   frame_ctrl byte:
 *     bit[0] = encrypted (1 = data được mã hóa)
 *     bit[1] = checksum   (1 = có 2 bytes CRC cuối)
 *     bit[2] = direction  (0 = phone→ESP, 1 = ESP→phone)
 *     bit[3] = require_ack
 *     bit[4] = frag       (1 = frame này là 1 mảnh trong fragmented packet)
 *
 * Tham chiếu:
 *   Android: lib-blufi/src/main/java/blufi/espressif/BlufiClient.java
 *   iOS:     BlufiLibrary/BlufiLib.m
 *   Spec:    https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/ble/blufi.html
 */

import { BluFiFrameClass, BluFiFrameType, BluFiSecurityMode } from './types';
import { aesEncrypt, aesDecrypt, crc16Bytes } from './blufiCrypto';

// Frame control bits
const FRAME_CTRL_ENCRYPTED = 0x01;
const FRAME_CTRL_CHECKSUM = 0x02;
const FRAME_CTRL_DIRECTION_RECV = 0x04; // ESP → Phone
const FRAME_CTRL_FRAG = 0x10;

// Max data length trong 1 BLE packet
export const BLUFI_MAX_FRAME_DATA_LEN = 18;

export interface ParsedBluFiFrame {
  frameClass: BluFiFrameClass;
  subtype: number;
  seq: number;
  encrypted: boolean;
  hasChecksum: boolean;
  isFragment: boolean;
  data: Uint8Array;
}

/**
 * Tạo type byte từ frameClass + subtype
 * type byte = (subtype << 2) | frameClass
 */
function buildTypeByte(frameClass: BluFiFrameClass, subtype: number): number {
  return ((subtype & 0x3f) << 2) | (frameClass & 0x03);
}

/**
 * Tạo 1 BluFi frame raw bytes (chưa mã hóa)
 * Dùng nội bộ, gọi qua buildCtrlFrame hoặc buildDataFrame
 */
async function buildFrame(options: {
  frameClass: BluFiFrameClass;
  subtype: number;
  seq: number;
  data?: Uint8Array;
  encrypt?: boolean;
  aesKey?: Uint8Array;
  useChecksum?: boolean;
}): Promise<Uint8Array> {
  const { frameClass, subtype, seq, encrypt = false, aesKey, useChecksum = true } = options;
  let data = options.data ?? new Uint8Array(0);

  if (encrypt && aesKey) {
    data = await aesEncrypt(data, aesKey, seq);
  }

  let frameCtrl = 0x00;
  if (encrypt && aesKey) frameCtrl |= FRAME_CTRL_ENCRYPTED;
  if (useChecksum) frameCtrl |= FRAME_CTRL_CHECKSUM;

  const typeByte = buildTypeByte(frameClass, subtype);
  const header = new Uint8Array([typeByte, frameCtrl, seq & 0xff, data.length & 0xff]);

  let frame: Uint8Array;
  if (useChecksum) {
    // CRC bao gồm seq + data_len + data
    const crcInput = new Uint8Array(1 + 1 + data.length);
    crcInput[0] = seq & 0xff;
    crcInput[1] = data.length & 0xff;
    crcInput.set(data, 2);
    const crc = crc16Bytes(crcInput);
    frame = new Uint8Array(header.length + data.length + 2);
    frame.set(header, 0);
    frame.set(data, header.length);
    frame.set(crc, header.length + data.length);
  } else {
    frame = new Uint8Array(header.length + data.length);
    frame.set(header, 0);
    frame.set(data, header.length);
  }

  return frame;
}

/**
 * Build: CTRL frame
 */
export async function buildCtrlFrame(
  subtype: BluFiFrameType,
  seq: number,
  data?: Uint8Array
): Promise<Uint8Array> {
  return buildFrame({ frameClass: BluFiFrameClass.CTRL, subtype, seq, data, useChecksum: true });
}

/**
 * Build: DATA frame (có thể mã hóa)
 */
export async function buildDataFrame(
  subtype: BluFiFrameType,
  seq: number,
  data: Uint8Array,
  aesKey?: Uint8Array
): Promise<Uint8Array> {
  return buildFrame({
    frameClass: BluFiFrameClass.DATA,
    subtype,
    seq,
    data,
    encrypt: !!aesKey,
    aesKey,
    useChecksum: true,
  });
}

/**
 * Build frame negotiate: gửi DH public key cho ESP32
 * subtype = DATA_NEGO (0x00), data = [type=0x00] + publicKey
 */
export async function buildNegoFrame(seq: number, publicKey: Uint8Array): Promise<Uint8Array> {
  // nego data: [nego_type: 0x00 (DH share key)] + public_key_bytes
  const data = new Uint8Array(1 + publicKey.length);
  data[0] = 0x00; // nego type = DH share key
  data.set(publicKey, 1);
  return buildDataFrame(BluFiFrameType.DATA_NEGO, seq, data);
}

/**
 * Build frame set security mode
 */
export async function buildSecModeFrame(
  seq: number,
  mode: BluFiSecurityMode
): Promise<Uint8Array> {
  const data = new Uint8Array([mode]);
  return buildCtrlFrame(BluFiFrameType.CTRL_SET_SEC_MODE, seq, data);
}

/**
 * Build frame set WiFi op mode (STA=1)
 */
export async function buildWifiOpModeFrame(seq: number, opMode: number): Promise<Uint8Array> {
  const data = new Uint8Array([opMode]);
  return buildCtrlFrame(BluFiFrameType.CTRL_SET_WIFI_OP_MODE, seq, data);
}

/**
 * Build frame gửi SSID
 */
export async function buildSsidFrame(
  seq: number,
  ssid: string,
  aesKey?: Uint8Array
): Promise<Uint8Array> {
  const data = new TextEncoder().encode(ssid);
  return buildDataFrame(BluFiFrameType.DATA_STA_SSID, seq, data, aesKey);
}

/**
 * Build frame gửi Password
 */
export async function buildPasswordFrame(
  seq: number,
  password: string,
  aesKey?: Uint8Array
): Promise<Uint8Array> {
  const data = new TextEncoder().encode(password);
  return buildDataFrame(BluFiFrameType.DATA_STA_PASSWD, seq, data, aesKey);
}

/**
 * Build frame lệnh connect WiFi
 */
export async function buildConnectWifiFrame(seq: number): Promise<Uint8Array> {
  return buildCtrlFrame(BluFiFrameType.CTRL_CONNECT_WIFI, seq);
}

/**
 * Parse frame nhận từ ESP32 (notification)
 */
export async function parseFrame(
  raw: Uint8Array,
  aesKey?: Uint8Array,
  seq?: number
): Promise<ParsedBluFiFrame | null> {
  if (raw.length < 4) return null;

  const typeByte = raw[0];
  const frameCtrl = raw[1];
  const frameSeq = raw[2];
  const dataLen = raw[3];

  const frameClass: BluFiFrameClass = (typeByte & 0x03) as BluFiFrameClass;
  const subtype = (typeByte >> 2) & 0x3f;

  const encrypted = !!(frameCtrl & FRAME_CTRL_ENCRYPTED);
  const hasChecksum = !!(frameCtrl & FRAME_CTRL_CHECKSUM);
  const isFragment = !!(frameCtrl & FRAME_CTRL_FRAG);

  let dataEnd = 4 + dataLen;
  if (hasChecksum) dataEnd += 2;

  if (raw.length < dataEnd) return null;

  let data: Uint8Array = new Uint8Array(raw.buffer, raw.byteOffset + 4, dataLen);

  if (encrypted && aesKey && seq !== undefined) {
    try {
      data = await aesDecrypt(new Uint8Array(data), aesKey, seq);
    } catch {
      // Nếu decrypt thất bại, trả về raw data
    }
  }

  return { frameClass, subtype, seq: frameSeq, encrypted, hasChecksum, isFragment, data };
}

/**
 * Fragment data lớn thành nhiều frames (MTU ~20 bytes)
 * BluFi fragmented frame: data = [total_len:2 big-endian] + chunk (với frag bit = 1)
 */
export async function buildFragmentedDataFrames(
  subtype: BluFiFrameType,
  startSeq: number,
  data: Uint8Array,
  aesKey?: Uint8Array,
  maxDataLen: number = BLUFI_MAX_FRAME_DATA_LEN
): Promise<{ frames: Uint8Array[]; nextSeq: number }> {
  // Nếu data nhỏ, không cần fragment
  if (data.length <= maxDataLen) {
    const frame = await buildDataFrame(subtype, startSeq, data, aesKey);
    return { frames: [frame], nextSeq: startSeq + 1 };
  }

  const frames: Uint8Array[] = [];
  let seq = startSeq;
  let offset = 0;
  const total = data.length;

  while (offset < total) {
    const isFirst = offset === 0;
    const chunkMaxLen = isFirst ? maxDataLen - 2 : maxDataLen;
    const chunk = data.slice(offset, offset + chunkMaxLen);
    offset += chunk.length;
    const isLast = offset >= total;

    let frameData: Uint8Array;
    if (isFirst) {
      // First fragment: prepend total length (2 bytes big-endian)
      frameData = new Uint8Array(2 + chunk.length);
      frameData[0] = (total >> 8) & 0xff;
      frameData[1] = total & 0xff;
      frameData.set(chunk, 2);
    } else {
      frameData = chunk;
    }

    const encrypt = !!aesKey && !isFirst; // first fragment không mã hóa length header
    const typeByte = buildTypeByte(BluFiFrameClass.DATA, subtype);
    let frameCtrl = FRAME_CTRL_CHECKSUM;
    if (encrypt) frameCtrl |= FRAME_CTRL_ENCRYPTED;
    if (!isLast) frameCtrl |= FRAME_CTRL_FRAG;

    let payload = frameData;
    if (encrypt && aesKey) {
      payload = await aesEncrypt(payload, aesKey, seq);
    }

    const header = new Uint8Array([typeByte, frameCtrl, seq & 0xff, payload.length & 0xff]);
    const crcInput = new Uint8Array(1 + 1 + payload.length);
    crcInput[0] = seq & 0xff;
    crcInput[1] = payload.length & 0xff;
    crcInput.set(payload, 2);
    const crc = crc16Bytes(crcInput);

    const frame = new Uint8Array(header.length + payload.length + 2);
    frame.set(header, 0);
    frame.set(payload, header.length);
    frame.set(crc, header.length + payload.length);
    frames.push(frame);
    seq++;
  }

  return { frames, nextSeq: seq };
}
