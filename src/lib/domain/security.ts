// Pure isomorphic cryptographic helpers for House Untold Ticket QR HMAC-SHA256 signing
// and RFC 6238 TOTP MFA with constant-time comparison and replay protection.

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function utf8ToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i]);
  }
  const b64 = typeof btoa === "function" ? btoa(bin) : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
  if (typeof atob === "function") {
    const bin = atob(padded);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) {
      out[i] = bin.charCodeAt(i);
    }
    return out;
  }
  return new Uint8Array(Buffer.from(padded, "base64"));
}

export function constantTimeEqual(a: string, b: string): boolean {
  const ba = utf8ToBytes(a);
  const bb = utf8ToBytes(b);
  const maxLen = Math.max(ba.length, bb.length);
  let diff = ba.length ^ bb.length;
  for (let i = 0; i < maxLen; i += 1) {
    const va = i < ba.length ? ba[i] : 0;
    const vb = i < bb.length ? bb[i] : 0;
    diff |= va ^ vb;
  }
  return diff === 0;
}

// --- Pure SHA-1 (for RFC 6238 HMAC-SHA1 TOTP) ---

function sha1(data: Uint8Array): Uint8Array {
  const ml = data.length * 8;
  const paddedLen = (((data.length + 8) >> 6) + 1) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 4, ml >>> 0, false);
  view.setUint32(paddedLen - 8, Math.floor(ml / 0x100000000), false);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const w = new Uint32Array(80);
  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 80; i += 1) {
      const n = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16];
      w[i] = ((n << 1) | (n >>> 31)) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let i = 0; i < 80; i += 1) {
      let f = 0;
      let k = 0;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = ((((a << 5) | (a >>> 27)) >>> 0) + f + e + k + w[i]) >>> 0;
      e = d;
      d = c;
      c = ((b << 30) | (b >>> 2)) >>> 0;
      b = a;
      a = temp;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const out = new Uint8Array(20);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  return out;
}

// --- Pure SHA-256 (for HMAC-SHA256 Ticket QR Signing) ---

const SHA256_K = new Uint32Array([
  0x428a2f98,
  0x71374491,
  0xb5c0fbcf,
  0xe9b5dba5,
  0x3956c25b,
  0x59f111f1,
  0x923f82a4,
  0xab1c5ed5,
  0xd807aa98,
  0x12835b01,
  0x243185be,
  0x550c7dc3,
  0x72be5d74,
  0x80deb1fe,
  0x9bdc06a7,
  0xc19bf174,
  0xe49b69c1,
  0xefbe4786,
  0x0fc19dc6,
  0x240ca1cc,
  0x2de92c6f,
  0x4a7484aa,
  0x5cb0a9dc,
  0x76f988da,
  0x983e5152,
  0xa831c66d,
  0xb00327c8,
  0xbf597fc7,
  0xc6e00bf3,
  0xd5a79147,
  0x06ca6351,
  0x14292967,
  0x27b70a85,
  0x2e1b2138,
  0x4d2c6dfc,
  0x53380d13,
  0x650a7354,
  0x766a0abb,
  0x81c2c92e,
  0x92722c85,
  0xa2bfe8a1,
  0xa81a664b,
  0xc24b8b70,
  0xc76c51a3,
  0xd192e819,
  0xd6990624,
  0xf40e3585,
  0x106aa070,
  0x19a4c116,
  0x1e376c08,
  0x2748774c,
  0x34b0bcb5,
  0x391c0cb3,
  0x4ed8aa4a,
  0x5b9cca4f,
  0x682e6ff3,
  0x748f82ee,
  0x78a5636f,
  0x84c87814,
  0x8cc70208,
  0x90befffa,
  0xa4506ceb,
  0xbef9a3f7,
  0xc67178f2,
]);

function sha256(data: Uint8Array): Uint8Array {
  const ml = data.length * 8;
  const paddedLen = (((data.length + 8) >> 6) + 1) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 4, ml >>> 0, false);
  view.setUint32(paddedLen - 8, Math.floor(ml / 0x100000000), false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => ((x >>> n) | (x << (32 - n))) >>> 0;

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false);
  outView.setUint32(28, h7, false);
  return out;
}

function hmac(hashFn: (m: Uint8Array) => Uint8Array, key: Uint8Array, msg: Uint8Array): Uint8Array {
  const blockSize = 64;
  const k = new Uint8Array(blockSize);
  k.set(key.length > blockSize ? hashFn(key) : key);

  const oPad = new Uint8Array(blockSize + (hashFn === sha1 ? 20 : 32));
  const iPad = new Uint8Array(blockSize + msg.length);
  for (let i = 0; i < blockSize; i += 1) {
    oPad[i] = k[i] ^ 0x5c;
    iPad[i] = k[i] ^ 0x36;
  }
  iPad.set(msg, blockSize);
  const innerHash = hashFn(iPad);
  oPad.set(innerHash, blockSize);
  return hashFn(oPad);
}

// --- Base32 & RFC 6238 TOTP (with ±1 clock skew and replay protection) ---

export function decodeBase32(secret: string): Uint8Array {
  const cleaned = secret.toUpperCase().replace(/[\s=]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i += 1) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) {
      throw new Error("Invalid Base32 TOTP secret");
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

export function generateBase32Secret(byteLength = 20): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  let out = "";
  let bits = 0;
  let value = 0;
  for (let i = 0; i < bytes.length; i += 1) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }
  return out;
}

export function buildOtpAuthUri(issuer: string, accountEmail: string, secret: string): string {
  const label = encodeURIComponent(`${issuer}:${accountEmail}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

function computeHotp(key: Uint8Array, counter: number): string {
  const buf = new Uint8Array(8);
  const view = new DataView(buf.buffer);
  view.setUint32(0, Math.floor(counter / 0x100000000), false);
  view.setUint32(4, counter >>> 0, false);

  const sum = hmac(sha1, key, buf);
  const offset = sum[sum.length - 1] & 0x0f;
  const binaryCode = ((sum[offset] & 0x7f) << 24)
    | ((sum[offset + 1] & 0xff) << 16)
    | ((sum[offset + 2] & 0xff) << 8)
    | (sum[offset + 3] & 0xff);
  return String(binaryCode % 1_000_000).padStart(6, "0");
}

export function generateTotpCode(base32Secret: string, nowMs = Date.now()): string {
  const key = decodeBase32(base32Secret);
  const step = Math.floor(nowMs / 1000 / 30);
  return computeHotp(key, step);
}

export type TotpVerifyResult =
  | { ok: true; matchedStep: number }
  | { ok: false; reason: "INVALID_CODE" | "REPLAYED_CODE" };

/**
 * Validates an RFC 6238 6-digit TOTP across [-1, 0, +1] 30s steps without early exit,
 * using constant-time comparison, and enforces monotonic high-water-mark replay protection.
 */
export function verifyTotpWithReplayProtection(
  base32Secret: string,
  code: string,
  lastAcceptedStep: number | null,
  nowMs = Date.now(),
): TotpVerifyResult {
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, reason: "INVALID_CODE" };
  }
  let key: Uint8Array;
  try {
    key = decodeBase32(base32Secret);
  } catch {
    return { ok: false, reason: "INVALID_CODE" };
  }

  const serverStep = Math.floor(nowMs / 1000 / 30);
  const candidates = [serverStep - 1, serverStep, serverStep + 1];
  let matched = false;
  let greatestMatchedStep = -1;

  for (const step of candidates) {
    if (step < 0) continue;
    const expected = computeHotp(key, step);
    if (constantTimeEqual(expected, code)) {
      if (!matched || step > greatestMatchedStep) {
        greatestMatchedStep = step;
        matched = true;
      }
    }
  }

  if (!matched) {
    return { ok: false, reason: "INVALID_CODE" };
  }
  if (lastAcceptedStep !== null && greatestMatchedStep <= lastAcceptedStep) {
    return { ok: false, reason: "REPLAYED_CODE" };
  }
  return { ok: true, matchedStep: greatestMatchedStep };
}

// --- Tamper-Proof Ticket QR Codes (HMAC-SHA256 payload.signature) ---

export interface TicketQrPayload {
  ticket_id: string;
  order_id: string;
  event_id: string;
  code: string;
  iat: number;
  exp: number;
  rot?: string;
}

export function computeTicketDigest(ticketId: string, secret: string): string {
  const mac = hmac(sha256, utf8ToBytes(secret), utf8ToBytes(`v1:${ticketId}`));
  return `v1:${bytesToHex(mac)}`;
}

export function createTicketQrToken(
  params: {
    ticketId: string;
    orderId: string;
    eventId: string;
    code: string;
    expiresAtSec: number;
    rotatingOtpSecret?: string;
  },
  secret: string,
  nowMs = Date.now(),
): string {
  const payload: TicketQrPayload = {
    ticket_id: params.ticketId,
    order_id: params.orderId,
    event_id: params.eventId,
    code: params.code,
    iat: Math.floor(nowMs / 1000),
    exp: params.expiresAtSec,
  };
  if (params.rotatingOtpSecret) {
    payload.rot = generateTotpCode(params.rotatingOtpSecret, nowMs);
  }

  const payloadB64 = bytesToBase64Url(utf8ToBytes(JSON.stringify(payload)));
  const sig = bytesToBase64Url(hmac(sha256, utf8ToBytes(secret), utf8ToBytes(payloadB64)));
  return `${payloadB64}.${sig}`;
}

export type TicketQrVerifyResult =
  | { ok: true; payload: TicketQrPayload }
  | { ok: false; reason: "INVALID_SIGNATURE" | "EXPIRED" };

export function verifyTicketQrToken(
  token: string,
  secret: string,
  nowMs = Date.now(),
): TicketQrVerifyResult {
  const parts = token.trim().split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, reason: "INVALID_SIGNATURE" };
  }

  const expectedSig = bytesToBase64Url(hmac(sha256, utf8ToBytes(secret), utf8ToBytes(parts[0])));
  if (!constantTimeEqual(parts[1], expectedSig)) {
    return { ok: false, reason: "INVALID_SIGNATURE" };
  }

  try {
    const rawJson = bytesToUtf8(base64UrlToBytes(parts[0]));
    const payload = JSON.parse(rawJson) as TicketQrPayload;
    if (!payload.ticket_id || !payload.order_id || typeof payload.exp !== "number") {
      return { ok: false, reason: "INVALID_SIGNATURE" };
    }
    if (payload.exp <= Math.floor(nowMs / 1000)) {
      return { ok: false, reason: "EXPIRED" };
    }
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: "INVALID_SIGNATURE" };
  }
}
