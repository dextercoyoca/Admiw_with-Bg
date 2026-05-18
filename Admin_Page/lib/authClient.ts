import { Platform } from "react-native";

export const AUTH_STORAGE_KEY = "electripay_admin_session";

export type StoredAdminSession = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  token: string;
};

let memorySession: StoredAdminSession | null = null;

export function getStoredSession() {
  if (memorySession) {
    return memorySession;
  }

  if (Platform.OS !== "web") {
    return null;
  }

  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as StoredAdminSession;
  } catch {
    return null;
  }
}

export function setStoredSession(value: StoredAdminSession | null) {
  memorySession = value;

  if (Platform.OS !== "web") {
    return;
  }

  try {
    if (value) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(value));
      return;
    }

    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // no-op
  }
}

export function setSessionPersistence(persist: boolean) {
  if (Platform.OS !== "web" || !memorySession) {
    return;
  }

  try {
    if (persist) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(memorySession));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // no-op
  }
}

export function getAuthToken() {
  return getStoredSession()?.token || "";
}
