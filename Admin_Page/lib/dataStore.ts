import { seedClients } from "./mockClients";
import type { ClientRecord } from "./types";

let memoryClients: ClientRecord[] = [...seedClients];

export function getMemoryClients() {
  return [...memoryClients].sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function upsertMemoryClient(
  id: string,
  patch: Partial<Pick<ClientRecord, "paymentStatus" | "clientStatus">>
) {
  const targetIndex = memoryClients.findIndex((client) => client._id === id);

  if (targetIndex === -1) {
    return null;
  }

  const updated: ClientRecord = {
    ...memoryClients[targetIndex],
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  memoryClients[targetIndex] = updated;
  return updated;
}

export function resetMemoryClients() {
  memoryClients = [...seedClients];
  return getMemoryClients();
}
