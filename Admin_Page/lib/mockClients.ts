import type { ClientRecord } from "./types";

const now = new Date().toISOString();

export const seedClients: ClientRecord[] = [
  {
    _id: "c-1001",
    fullName: "John Dela Cruz",
    email: "john.delacruz@electripay.ph",
    plan: "Residential Prime",
    amountDue: 2480,
    dueDate: "2026-04-18",
    paymentStatus: "Unpaid",
    clientStatus: "Active",
    updatedAt: now,
  },
  {
    _id: "c-1002",
    fullName: "Maria Santos",
    email: "maria.santos@electripay.ph",
    plan: "Business Lite",
    amountDue: 0,
    dueDate: "2026-04-05",
    paymentStatus: "Paid",
    clientStatus: "Active",
    updatedAt: now,
  },
  {
    _id: "c-1003",
    fullName: "Samuel Reyes",
    email: "samuel.reyes@electripay.ph",
    plan: "Business Plus",
    amountDue: 8120,
    dueDate: "2026-04-01",
    paymentStatus: "Unpaid",
    clientStatus: "Suspended",
    updatedAt: now,
  },
  {
    _id: "c-1004",
    fullName: "Angela Lim",
    email: "angela.lim@electripay.ph",
    plan: "Residential Basic",
    amountDue: 0,
    dueDate: "2026-04-03",
    paymentStatus: "Paid",
    clientStatus: "Disconnected",
    updatedAt: now,
  },
];
