import { getAuthToken } from "./authClient";

export type AdminUserRecord = {
  _id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  contact: string;
  address: string;
  plan: string;
  usageKwh: number;
  revenueCollected: number;
  amountDue: number;
  paymentStatus: "Paid" | "Unpaid";
  clientStatus: "Active" | "Suspended" | "Disconnected";
  updatedAt: string;
};

function authHeaders() {
  const token = getAuthToken();
  return {
    Authorization: token ? `Bearer ${token}` : "",
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as
    | ({ error?: string } & T)
    | null;

  if (!response.ok) {
    throw new Error(body?.error || "Request failed");
  }

  return body as T;
}

export async function fetchAdminUsers() {
  const response = await fetch("/api/admin/users", {
    headers: { ...authHeaders() },
  });

  return parseResponse<{ users: AdminUserRecord[] }>(response);
}

export async function createAdminUser(payload: {
  name: string;
  email: string;
  username: string;
  password: string;
  contact?: string;
  address?: string;
  plan?: string;
}) {
  const response = await fetch("/api/admin/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<{ user: AdminUserRecord }>(response);
}

export async function patchAdminUser(
  id: string,
  payload: Partial<{
    name: string;
    email: string;
    username: string;
    contact: string;
    address: string;
    role: string;
    plan: string;
    clientStatus: string;
    paymentStatus: string;
  }>
) {
  const response = await fetch(`/api/admin/users/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<{ user: AdminUserRecord }>(response);
}

export async function removeAdminUser(id: string) {
  const response = await fetch(`/api/admin/users/${id}`, {
    method: "DELETE",
    headers: {
      ...authHeaders(),
    },
  });

  return parseResponse<{ ok: boolean }>(response);
}

export async function fetchSettings() {
  const response = await fetch("/api/admin/settings", {
    headers: { ...authHeaders() },
  });

  return parseResponse<{
    settings: {
      electricityRate: number;
      billingCycle: "monthly" | "weekly";
      latePenaltyPercent: number;
    };
    source: "mongodb" | "memory";
  }>(response);
}

export async function saveSettings(payload: {
  electricityRate: number;
  billingCycle: "monthly" | "weekly";
  latePenaltyPercent: number;
}) {
  const response = await fetch("/api/admin/settings", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<{
    settings: {
      electricityRate: number;
      billingCycle: "monthly" | "weekly";
      latePenaltyPercent: number;
    };
    source: "mongodb" | "memory";
  }>(response);
}
