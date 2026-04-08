import { getAuthToken } from "./authClient";

export type ReceiptRecord = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  submittedAt: string;
  status: "Pending Verification" | "Approved" | "Rejected";
  receiptUri: string;
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

export async function fetchReceipts() {
  const response = await fetch("/api/admin/receipts", {
    headers: {
      ...authHeaders(),
    },
  });

  return parseResponse<{ receipts: ReceiptRecord[] }>(response);
}

export async function patchReceiptStatus(
  receiptId: string,
  payload: { userId: string; status: "Approved" | "Rejected" }
) {
  const response = await fetch(`/api/admin/receipts/${receiptId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<{ receipt: { userId: string; receiptId: string; status: string } }>(
    response
  );
}
