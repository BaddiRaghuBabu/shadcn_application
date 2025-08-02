// src/lib/device.ts
// client helper to persist a device ID in LocalStorage
import { v4 as uuidv4 } from "uuid";

const STORAGE_KEY = "device_id";

export function getOrSetDeviceId(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const newId = uuidv4();
  window.localStorage.setItem(STORAGE_KEY, newId);
  return newId;
}

export function clearDeviceId() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
// register the current device with the backend and optionally trigger
// forced logout of any other active sessions for the user
export async function registerDevice(access_token: string, user_id: string) {
  try {
    const device_id = getOrSetDeviceId();
    let session_id: string | undefined;
    try {
      const payload = JSON.parse(atob(access_token.split(".")[1] || ""));
      session_id = payload.session_id as string | undefined;
    } catch {
      session_id = undefined;
    }
    await fetch("/api/devices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
        "x-user-id": user_id,
      },
      body: JSON.stringify({
        device_id,
        session_id,
        path: typeof window !== "undefined" ? window.location.pathname : null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      }),
    });
  } catch (e) {
    // swallow device registration failures
    // eslint-disable-next-line no-console
    console.warn("Device registration failed", e);
  }
}
