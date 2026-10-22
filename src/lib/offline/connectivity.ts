"use client";

export function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

// navigator.onLine only reflects the device's own network interface, not whether OUR
// server is actually reachable - it stays true when the backend is down but the wifi/
// cellular radio is up. So the real trigger for falling back to cached/local data is a
// failed real API call, not just a false onLine flag. A genuine HTTP error from the
// backend itself (401 session expired, 422 validation, ...) must still surface normally
// though - only a true connectivity failure (no response at all, or a proxy's own 5xx
// "I couldn't reach Laravel" response) should fall back.
export function isConnectivityError(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status;
  if (status === undefined) return true;
  return status >= 500;
}
