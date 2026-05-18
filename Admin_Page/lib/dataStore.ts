import { seedClients } from "./mockClients";
import type { ClientRecord } from "./types";

let memoryClients: ClientRecord[] = [...seedClients];
let memoryNotifications: MemoryNotificationRecord[] = [];

export type MemoryNotificationRecord = {
  id: string;
  title: string;
  message: string;
  audience: string;
  notificationType?: string;
  priority?: string;
  scheduledFor?: string;
  deliveryStats?: {
    sent: number;
    read: number;
    failed: number;
    audienceSize: number;
  };
  createdAt: string;
};

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

export function getMemoryNotifications() {
  return [...memoryNotifications].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function addMemoryNotification(input: {
  title: string;
  message: string;
  audience?: string;
  notificationType?: string;
  priority?: string;
  scheduledFor?: string;
  deliveryStats?: {
    sent: number;
    read: number;
    failed: number;
    audienceSize: number;
  };
}) {
  const created: MemoryNotificationRecord = {
    id: `memory-notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title,
    message: input.message,
    audience: input.audience || "all",
    notificationType: input.notificationType,
    priority: input.priority,
    scheduledFor: input.scheduledFor,
    deliveryStats: input.deliveryStats,
    createdAt: new Date().toISOString(),
  };

  memoryNotifications = [created, ...memoryNotifications];
  return created;
}
