export type PaymentStatus = "Paid" | "Unpaid";

export type ClientStatus = "Active" | "Suspended" | "Disconnected";

export interface ClientRecord {
  _id: string;
  fullName: string;
  email: string;
  plan: string;
  amountDue: number;
  dueDate: string;
  paymentStatus: PaymentStatus;
  clientStatus: ClientStatus;
  updatedAt: string;
}

export interface ClientsResponse {
  clients: ClientRecord[];
  source: "mongodb" | "memory";
}
