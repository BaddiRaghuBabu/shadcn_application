// utils/device.ts
"use client";

import { v4 as uuidv4 } from "uuid";

const COOKIE_NAME = "device_id";

export function getOrSetDeviceId(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp('(^| )' + COOKIE_NAME + '=([^;]+)'));
  if (match) return match[2];
  const newId = uuidv4();
  document.cookie = `${COOKIE_NAME}=${newId}; path=/; max-age=${60 * 60 * 24 * 365}; Secure; SameSite=Lax`;
  return newId;
}
