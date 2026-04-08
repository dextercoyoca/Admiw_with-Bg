import type { ClientStatus, ClientsResponse, PaymentStatus } from "./types";
import { getAuthToken } from "./authClient";

interface UpdateClientPayload {
  paymentStatus?: PaymentStatus;
  clientStatus?: ClientStatus;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(body?.error || "Request failed");
  }

  return (await response.json()) as T;
}

function buildAuthHeaders() {
  const token = getAuthToken();
  return {
    Authorization: token ? `Bearer ${token}` : "",
  };
}

export async function fetchClients() {
  const response = await fetch("/api/clients", {
    headers: {
      ...buildAuthHeaders(),
    },
  });
  return parseResponse<ClientsResponse>(response);
}

export async function updateClientById(id: string, payload: UpdateClientPayload) {
  const response = await fetch(`/api/clients/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<{
    client: {
      _id: string;
      paymentStatus: PaymentStatus;
      clientStatus: ClientStatus;
      updatedAt: string;
    } | null;
    source: "mongodb" | "memory";
  }>(response);
}
