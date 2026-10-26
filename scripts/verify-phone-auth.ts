import assert from "node:assert/strict";
import { ApiError } from "../src/lib/api/client";
import {
  classifySendFailure,
  formatCountdown,
  formatDuration,
  normalizeSyrianPhone,
  phoneKey,
} from "../src/lib/auth/phoneAuth";

// Number normalization must agree with MsgPlusSmsGateway::normalize on the server.
assert.equal(normalizeSyrianPhone("0944123456"), "+963944123456");
assert.equal(normalizeSyrianPhone("094 412-3456"), "+963944123456");
assert.equal(normalizeSyrianPhone("+963 944 123 456"), "+963944123456");
assert.equal(normalizeSyrianPhone("00963944123456"), "+963944123456");
assert.equal(normalizeSyrianPhone("963944123456"), "+963944123456");
assert.equal(normalizeSyrianPhone("٠٩٤٤١٢٣٤٥٦"), "+963944123456");
assert.equal(normalizeSyrianPhone("۰۹۴۴۱۲۳۴۵۶"), "+963944123456");
assert.equal(normalizeSyrianPhone("0844123456"), null);
assert.equal(normalizeSyrianPhone("09441234"), null);
assert.equal(normalizeSyrianPhone("+971501234567"), null);
assert.equal(normalizeSyrianPhone(""), null);

// Equivalent spellings share one identity; different numbers never do.
assert.equal(phoneKey("0944123456"), phoneKey("+963 944 123 456"));
assert.notEqual(phoneKey("0944123456"), phoneKey("0955123456"));
assert.equal(phoneKey("09441"), "09441");

// Waits are shown as readable durations, never as raw seconds.
assert.equal(formatDuration(45, "en"), "45 seconds");
assert.equal(formatDuration(65, "en"), "1 minute and 5 seconds");
assert.equal(formatDuration(300, "en"), "5 minutes");
assert.equal(formatDuration(7200, "en"), "2 hours");
assert.equal(formatDuration(7260, "en"), "2 hours and 1 minute");
assert.equal(formatDuration(7200, "ar"), "ساعتين");
assert.match(formatDuration(300, "ar"), /^5 دقائق$/);
assert.equal(formatCountdown(65, "en"), "1:05");
assert.equal(formatCountdown(59, "en"), "0:59");
assert.equal(formatCountdown(7200, "en"), "2 hours");
assert.equal(formatCountdown(-3, "en"), "0:00");

// Each server answer maps to its own situation.
const api = (status: number, body: unknown = null, retryAfter: number | null = null) => new ApiError("x", status, body, retryAfter);
assert.deepEqual(classifySendFailure(api(422, { message: "PHONE_TAKEN", code: "PHONE_TAKEN" })), { kind: "taken" });
assert.deepEqual(classifySendFailure(api(422, { message: "PHONE_TAKEN" })), { kind: "taken" });
assert.deepEqual(classifySendFailure(api(423, { code: "VERIFICATION_SUPPORT_REQUIRED", support_required: true })), { kind: "blocked" });
assert.deepEqual(classifySendFailure(api(429, { code: "VERIFICATION_COOLDOWN", retry_after: 300 })), { kind: "cooldown", retryAfter: 300 });
assert.deepEqual(classifySendFailure(api(429, null, 42)), { kind: "cooldown", retryAfter: 42 });
assert.deepEqual(classifySendFailure(api(429)), { kind: "cooldown", retryAfter: 60 });
assert.deepEqual(classifySendFailure(api(422, { errors: { phone: ["invalid"] } })), { kind: "invalid" });
assert.deepEqual(classifySendFailure(api(503)), { kind: "unavailable" });
assert.deepEqual(classifySendFailure(api(0)), { kind: "network" });
assert.deepEqual(classifySendFailure(new Error("boom")), { kind: "unknown" });

console.log("phone auth logic: all checks passed");
