import assert from "node:assert/strict";
import test from "node:test";
import { ApiHttpError } from "../../../lib/api/errors";
import { MockApi } from "../../../lib/api/mockApi";
import { RealApi } from "../../../lib/api/realApi";

import { generateTotpCode } from "../../../lib/domain/security";

test("MockApi starts unauthenticated, decides roles in backend without client selector, and enforces strict RBAC", async () => {
  const api = new MockApi();
  assert.equal(await api.getCurrentUser(), null);

  // Unauthenticated calls to protected terminals fail with 401
  await assert.rejects(
    () => api.getAdminStats(),
    (err: unknown) => err instanceof ApiHttpError && err.status === 401,
  );

  // Google OAuth always creates/authenticates Patron USER
  const patron = await api.loginWithGoogle({
    name: "Kabir Nair",
    email: "kabir.nair@gmail.com",
  });
  assert.equal(patron.user.role, "USER");
  assert.equal(patron.user.authProvider, "GOOGLE");

  // Patron USER rejected from Admin, Scanner, and Bartender operations with 403
  await assert.rejects(
    () => api.getAdminStats(),
    (err: unknown) => err instanceof ApiHttpError && err.status === 403,
  );
  await assert.rejects(
    () => api.lookupTicketByCodeOrJwt("VNU-89421-MNT"),
    (err: unknown) => err instanceof ApiHttpError && err.status === 403,
  );
  await assert.rejects(
    () => api.listFnbTransactions(),
    (err: unknown) => err instanceof ApiHttpError && err.status === 403,
  );

  // Patron attempting Staff/Admin email/password endpoint rejected with 403
  await assert.rejects(
    () => api.loginStaffOrAdmin({ email: "arjun.mehta@gmail.com", password: "password123" }),
    (err: unknown) => err instanceof ApiHttpError && err.status === 403,
  );

  // Gatekeeper (SCANNER) logs in with ID/password -> backend assigns SCANNER directly without MFA
  const gateLogin = await api.loginStaffOrAdmin({
    email: "gate01@venu.live",
    password: "staff-password",
  });
  assert.equal(gateLogin.requires_mfa, false);
  if (!gateLogin.requires_mfa) {
    assert.equal(gateLogin.user.role, "SCANNER");
  }

  const scanLookup = await api.lookupTicketByCodeOrJwt("VNU-89421-MNT");
  assert.equal(scanLookup.valid, true);
  await assert.rejects(
    () => api.getAdminStats(),
    (err: unknown) => err instanceof ApiHttpError && err.status === 403,
  );

  // Bartender logs in with ID/password -> backend assigns BARTENDER directly
  const barLogin = await api.loginStaffOrAdmin({
    email: "bar04@venu.live",
    password: "staff-password",
  });
  assert.equal(barLogin.requires_mfa, false);
  if (!barLogin.requires_mfa) {
    assert.equal(barLogin.user.role, "BARTENDER");
  }

  // Admin logs in with ID/password -> requires_mfa: true -> TOTP step 2 issues ADMIN session
  const adminStep1 = await api.loginStaffOrAdmin({
    email: "meera@venu.live",
    password: "venu-argon2-password",
  });
  assert.equal(adminStep1.requires_mfa, true);
  if (adminStep1.requires_mfa) {
    await assert.rejects(
      () =>
        api.verifyAdminMfa({
          mfa_challenge_token: adminStep1.mfa_challenge_token,
          totp_code: "000000",
        }),
      (err: unknown) => err instanceof ApiHttpError && err.status === 401,
    );

    const adminSession = await api.verifyAdminMfa({
      mfa_challenge_token: adminStep1.mfa_challenge_token,
      totp_code: "420911",
    });
    assert.equal(adminSession.user.role, "ADMIN");

    // Replay protection: re-using '420911' within the same 30s step fails with 401 totp_reused
    const adminStep1Replay = await api.loginStaffOrAdmin({
      email: "meera@venu.live",
      password: "venu-argon2-password",
    });
    assert.equal(adminStep1Replay.requires_mfa, true);
    if (adminStep1Replay.requires_mfa) {
      await assert.rejects(
        () =>
          api.verifyAdminMfa({
            mfa_challenge_token: adminStep1Replay.mfa_challenge_token,
            totp_code: "420911",
          }),
        (err: unknown) => err instanceof ApiHttpError && err.status === 401 && err.code === "totp_reused",
      );
    }

    // Re-authenticate with fresh enrollment (160-bit Base32 secret + otpauth://) & verify real RFC 6238 code
    const enrollment = await api.enrollAdminMfa();
    assert.ok(enrollment.otpauthUri.startsWith("otpauth://totp/"));
    assert.equal(enrollment.secret.length, 32);

    const enrolledStep1 = await api.loginStaffOrAdmin({
      email: "meera@venu.live",
      password: "venu-argon2-password",
    });
    assert.equal(enrolledStep1.requires_mfa, true);
    if (enrolledStep1.requires_mfa) {
      const liveCode = generateTotpCode(enrollment.secret);
      const enrolledSession = await api.verifyAdminMfa({
        mfa_challenge_token: enrolledStep1.mfa_challenge_token,
        totp_code: liveCode,
      });
      assert.equal(enrolledSession.user.role, "ADMIN");

      // Replaying the newly enrolled live code in the same 30s window is also blocked
      const replayStep1 = await api.loginStaffOrAdmin({
        email: "meera@venu.live",
        password: "venu-argon2-password",
      });
      if (replayStep1.requires_mfa) {
        await assert.rejects(
          () =>
            api.verifyAdminMfa({
              mfa_challenge_token: replayStep1.mfa_challenge_token,
              totp_code: liveCode,
            }),
          (err: unknown) => err instanceof ApiHttpError && err.status === 401 && err.code === "totp_reused",
        );
      }
    }
  }

  const stats = await api.getAdminStats();
  assert.ok(stats.activeEvents > 0);

  // Admin provisions a new Bartender ID & password
  const createdStaff = await api.createStaffUser({
    name: "Sia Bartender",
    email: "sia.bar@venu.live",
    password: "BarSecret#2026",
    role: "BARTENDER",
  });
  assert.equal(createdStaff.role, "BARTENDER");

  await api.logout();
  assert.equal(await api.getCurrentUser(), null);

  // Wrong password on newly provisioned staff fails with 401
  await assert.rejects(
    () =>
      api.loginStaffOrAdmin({
        email: "sia.bar@venu.live",
        password: "wrong-secret",
      }),
    (err: unknown) => err instanceof ApiHttpError && err.status === 401,
  );

  // Exact password logs in cleanly with BARTENDER role
  const newStaffLogin = await api.loginStaffOrAdmin({
    email: "sia.bar@venu.live",
    password: "BarSecret#2026",
  });
  assert.equal(newStaffLogin.requires_mfa, false);
  if (!newStaffLogin.requires_mfa) {
    assert.equal(newStaffLogin.user.role, "BARTENDER");
  }

  await api.logout();
  assert.equal(await api.getCurrentUser(), null);
});

test("RealApi performs single-flight 401 auto-refresh and parses flat {\"error\":\"msg\"} envelopes", async () => {
  const originalFetch = globalThis.fetch;
  let refreshed = false;
  let refreshCalls = 0;
  let sawApiPrefix = false;

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/")) {
      sawApiPrefix = true;
    }
    if (url.endsWith("/auth/refresh")) {
      refreshCalls += 1;
      refreshed = true;
      return new Response(
        JSON.stringify({
          user: {
            id: "usr_1",
            name: "Arjun Mehta",
            email: "arjun@gmail.com",
            phone: "+91 98204 11220",
            phoneVerified: true,
            role: "USER",
            age: 26,
          },
          accessExpiresAt: new Date(Date.now() + 900_000).toISOString(),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (!refreshed) {
      return new Response(
        JSON.stringify({ error: "access token expired" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({
        id: "usr_1",
        name: "Arjun Mehta",
        email: "arjun@gmail.com",
        phone: "+91 98204 11220",
        phoneVerified: true,
        role: "USER",
        age: 26,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    const realApi = new RealApi();
    const [u1, u2] = await Promise.all([realApi.getCurrentUser(), realApi.getCurrentUser()]);
    assert.equal(sawApiPrefix, true);
    assert.equal(u1?.name, "Arjun Mehta");
    assert.equal(u2?.name, "Arjun Mehta");
    assert.equal(refreshCalls, 1, "concurrent 401s must deduplicate to a single /auth/refresh call");
    assert.ok(realApi.getAccessExpiresAt());
  } finally {
    globalThis.fetch = originalFetch;
  }
});
