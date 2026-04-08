import { ObjectId } from "mongodb";
import { getMongoClient, getDatabaseName } from "./mongodb";
import { getMemoryClients, upsertMemoryClient } from "./dataStore";
import type { ClientRecord, ClientStatus, PaymentStatus } from "./types";

const USERS_COLLECTION_NAME = "users";

interface UserDoc {
  _id: ObjectId | string;
  name?: string;
  fullName?: string;
  username?: string;
  email?: string;
  plan?: string;
  subscriptionPlan?: string;
  amountDue?: number;
  dueDate?: string;
  paymentStatus?: string;
  clientStatus?: string;
  status?: string;
  updatedAt?: string;
  payments?: {
    currentBill?: {
      amount?: number;
      dueDate?: string;
      status?: string;
    };
  };
}

function mapPaymentStatus(value?: string): PaymentStatus {
  const normalized = (value || "").toLowerCase();
  if (
    normalized === "paid" ||
    normalized === "completed" ||
    normalized === "verified"
  ) {
    return "Paid";
  }

  return "Unpaid";
}

function mapClientStatus(value?: string): ClientStatus {
  const normalized = (value || "").toLowerCase();
  if (normalized === "suspended" || normalized === "disabled") {
    return "Suspended";
  }

  if (normalized === "disconnected" || normalized === "inactive" || normalized === "blocked") {
    return "Disconnected";
  }

  return "Active";
}

function mapUserDoc(doc: UserDoc): ClientRecord {
  const currentBill = doc.payments?.currentBill;
  const paymentStatus = mapPaymentStatus(doc.paymentStatus || currentBill?.status);
  const fallbackDueDate = new Date().toISOString().slice(0, 10);

  return {
    _id: doc._id.toString(),
    fullName: doc.name || doc.fullName || doc.username || "Unknown User",
    email: doc.email || "no-email@unknown.local",
    plan: doc.plan || doc.subscriptionPlan || "Residential",
    amountDue: Number(currentBill?.amount ?? doc.amountDue ?? 0),
    dueDate: currentBill?.dueDate || doc.dueDate || fallbackDueDate,
    paymentStatus,
    clientStatus: mapClientStatus(doc.clientStatus || doc.status),
    updatedAt: doc.updatedAt || new Date().toISOString(),
  };
}

function buildUserIdQuery(id: string) {
  if (ObjectId.isValid(id) && String(new ObjectId(id)) === id) {
    return { _id: new ObjectId(id) };
  }

  return { _id: id };
}

export async function listClients() {
  const mongo = await getMongoClient();

  if (!mongo) {
    return { clients: getMemoryClients(), source: "memory" as const };
  }

  const db = mongo.db(getDatabaseName());
  const docs = await db
    .collection<UserDoc>(USERS_COLLECTION_NAME)
    .find({})
    .sort({ updatedAt: -1 })
    .toArray();

  return { clients: docs.map(mapUserDoc), source: "mongodb" as const };
}

export async function updateClient(
  id: string,
  patch: Partial<Pick<ClientRecord, "paymentStatus" | "clientStatus">>
) {
  const mongo = await getMongoClient();

  if (!mongo) {
    const updated = upsertMemoryClient(id, patch);
    return {
      client: updated,
      source: "memory" as const,
    };
  }

  const db = mongo.db(getDatabaseName());
  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (patch.paymentStatus) {
    updates.paymentStatus = patch.paymentStatus;
    updates["payments.currentBill.status"] = patch.paymentStatus;
  }

  if (patch.clientStatus) {
    updates.clientStatus = patch.clientStatus;
    updates.status = patch.clientStatus;
  }

  const result = await db.collection<UserDoc>(USERS_COLLECTION_NAME).findOneAndUpdate(
    buildUserIdQuery(id),
    { $set: updates },
    { returnDocument: "after" }
  );

  return {
    client: result ? mapUserDoc(result) : null,
    source: "mongodb" as const,
  };
}
