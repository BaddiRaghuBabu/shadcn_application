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
