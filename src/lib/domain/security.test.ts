import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOtpAuthUri,
  computeTicketDigest,
  createTicketQrToken,
  generateBase32Secret,
  generateTotpCode,
  verifyTicketQrToken,
  verifyTotpWithReplayProtection,
} from "./security";

const TEST_QR_SECRET = "venu-test-hmac-qr-signing-secret-2026";

test("HMAC-SHA256 ticket QR signs payload.signature, detects tampering, and enforces exp", () => {
  const nowMs = 1_780_000_000_000;
  const token = createTicketQrToken(
    {
      ticketId: "tkt_89421",
      orderId: "ord_89421",
      eventId: "evt_anoushka_strings",
      code: "VNU-89421-MNT",
      expiresAtSec: Math.floor(nowMs / 1000) + 3600,
    },
    TEST_QR_SECRET,
    nowMs,
  );

  assert.equal(token.split(".").length, 2);

  const verified = verifyTicketQrToken(token, TEST_QR_SECRET, nowMs);
  assert.equal(verified.ok, true);
  if (verified.ok) {
    assert.equal(verified.payload.ticket_id, "tkt_89421");
    assert.equal(verified.payload.order_id, "ord_89421");
  }

  // Tampering fails signature verification
  const tampered = verifyTicketQrToken(`${token}X`, TEST_QR_SECRET, nowMs);
  assert.deepEqual(tampered, { ok: false, reason: "INVALID_SIGNATURE" });

  // Wrong secret fails signature verification
  const wrongKey = verifyTicketQrToken(token, "attacker-key", nowMs);
  assert.deepEqual(wrongKey, { ok: false, reason: "INVALID_SIGNATURE" });

  // Past expiration fails with EXPIRED
  const expired = verifyTicketQrToken(token, TEST_QR_SECRET, nowMs + 3601 * 1000);
  assert.deepEqual(expired, { ok: false, reason: "EXPIRED" });

  // Digest is deterministic and never exposes raw QR token
  const d1 = computeTicketDigest("tkt_89421", TEST_QR_SECRET);
  const d2 = computeTicketDigest("tkt_89421", TEST_QR_SECRET);
  assert.equal(d1, d2);
  assert.ok(d1.startsWith("v1:"));
});

test("RFC 6238 TOTP verifies ±1 window and enforces atomic step-level replay protection", () => {
  const secret = generateBase32Secret();
  assert.equal(secret.length, 32); // 160-bit Base32

  const uri = buildOtpAuthUri("House Untold", "meera@venu.live", secret);
  assert.ok(uri.startsWith("otpauth://totp/House Untold%3Ameera%40venu.live?"));
  assert.ok(uri.includes(`secret=${secret}`));

  const baseMs = 1_780_000_020_000;
  // Previous step (t - 1) code accepted via ±1 clock skew
  const prevCode = generateTotpCode(secret, baseMs - 30_000);
  const firstCheck = verifyTotpWithReplayProtection(secret, prevCode, null, baseMs);
  assert.equal(firstCheck.ok, true);
  if (!firstCheck.ok) return;

  // Replay of same t-1 code rejected
  const replayPrev = verifyTotpWithReplayProtection(
    secret,
    prevCode,
    firstCheck.matchedStep,
    baseMs,
  );
  assert.deepEqual(replayPrev, { ok: false, reason: "REPLAYED_CODE" });

  // Advancing to current step t succeeds once, then rejects replay
  const curCode = generateTotpCode(secret, baseMs);
  const curCheck = verifyTotpWithReplayProtection(
    secret,
    curCode,
    firstCheck.matchedStep,
    baseMs,
  );
  assert.equal(curCheck.ok, true);
  if (!curCheck.ok) return;

  const replayCur = verifyTotpWithReplayProtection(
    secret,
    curCode,
    curCheck.matchedStep,
    baseMs,
  );
  assert.deepEqual(replayCur, { ok: false, reason: "REPLAYED_CODE" });
});
