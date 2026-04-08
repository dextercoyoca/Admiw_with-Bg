import { ObjectId } from "mongodb";
import { getDatabaseName, getMongoClient } from "./mongodb";

const USERS_COLLECTION = "users";

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

type UserDoc = {
  _id: ObjectId | string;
  name?: string;
  username?: string;
  email?: string;
  role?: string;
  contact?: string;
  address?: string;
  plan?: string;
  subscriptionPlan?: string;
  usage?: {
    weekly?: Array<{ usage?: number }>;
    monthly?: Array<{ usage?: number }>;
  };
  payments?: {
    currentBill?: {
      amount?: number;
      status?: string;
    };
    history?: Array<{ amount?: number; status?: string }>;
  };
  amountDue?: number;
  paymentStatus?: string;
  clientStatus?: string;
  status?: string;
  updatedAt?: string;
};

function mapStatus(value?: string) {
  const normalized = (value || "").toLowerCase();
  if (normalized === "suspended" || normalized === "disabled") {
    return "Suspended" as const;
  }

  if (normalized === "disconnected" || normalized === "inactive" || normalized === "blocked") {
    return "Disconnected" as const;
  }

  return "Active" as const;
}

function isReceiptLikeEntry(item: { status?: string; method?: string }) {
  const status = (item.status || "").toLowerCase();
  const method = (item.method || "").toLowerCase();
  return (
    method.includes("receipt") ||
    [
      "pending verification",
      "pending",
      "completed",
      "approved",
      "paid",
      "verified",
      "rejected",
      "declined",
      "failed",
    ].includes(status)
  );
}

function mapPaymentFromReceipts(doc: UserDoc) {
  const history = doc.payments?.history || [];
  const receiptEntries = history.filter(isReceiptLikeEntry);

  if (receiptEntries.length > 0) {
    const latest = receiptEntries[receiptEntries.length - 1];
    const latestStatus = (latest.status || "").toLowerCase();
    if (["completed", "approved", "paid", "verified"].includes(latestStatus)) {
      return "Paid" as const;
    }

    return "Unpaid" as const;
  }

  const currentBillStatus = (doc.payments?.currentBill?.status || "").toLowerCase();
  if (["paid", "completed", "approved", "verified"].includes(currentBillStatus)) {
    return "Paid" as const;
  }

  return "Unpaid" as const;
}

function mapUser(doc: UserDoc): AdminUserRecord {
  const monthlyUsage = doc.usage?.monthly || [];
  const usageKwh = monthlyUsage.reduce((sum, item) => sum + Number(item.usage || 0), 0);

  const history = doc.payments?.history || [];
  const revenueCollected = history
    .filter((item) => ["completed", "paid", "verified"].includes((item.status || "").toLowerCase()))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const billAmount = Number(doc.payments?.currentBill?.amount ?? doc.amountDue ?? 0);
  const paymentStatus = mapPaymentFromReceipts(doc);

  return {
    _id: doc._id.toString(),
    name: doc.name || doc.username || "Unknown User",
    username: doc.username || "",
    email: doc.email || "",
    role: (doc.role || "user").toString().toLowerCase(),
    contact: doc.contact || "",
    address: doc.address || "",
    plan: doc.plan || doc.subscriptionPlan || "Residential",
    usageKwh,
    revenueCollected,
    amountDue: billAmount,
    paymentStatus,
    clientStatus: mapStatus(doc.clientStatus || doc.status),
    updatedAt: doc.updatedAt || new Date().toISOString(),
  };
}

function idQuery(id: string) {
  if (ObjectId.isValid(id) && String(new ObjectId(id)) === id) {
    return { _id: new ObjectId(id) };
  }

  return { _id: id };
}

export async function listAdminUsers() {
  const mongo = await getMongoClient();
  if (!mongo) {
    return [];
  }

  const docs = await mongo
    .db(getDatabaseName())
    .collection<UserDoc>(USERS_COLLECTION)
    .find({})
    .sort({ updatedAt: -1 })
    .toArray();

  return docs.map(mapUser);
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
  const mongo = await getMongoClient();
  if (!mongo) {
    throw new Error("MongoDB is unavailable");
  }

  const db = mongo.db(getDatabaseName());
  const col = db.collection<UserDoc>(USERS_COLLECTION);

  const newUser = {
    _id: `USR${Date.now()}`,
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    username: payload.username.trim(),
    password: payload.password,
    role: "user",
    contact: payload.contact?.trim() || "",
    address: payload.address?.trim() || "",
    plan: payload.plan?.trim() || "Residential",
    usage: {
      weekly: [
        { day: "Mon", usage: 0 },
        { day: "Tue", usage: 0 },
        { day: "Wed", usage: 0 },
        { day: "Thu", usage: 0 },
        { day: "Fri", usage: 0 },
        { day: "Sat", usage: 0 },
        { day: "Sun", usage: 0 },
      ],
      monthly: [],
    },
    payments: {
      currentBill: {
        amount: 0,
        status: "Unpaid",
      },
      history: [],
    },
    status: "Active",
    updatedAt: new Date().toISOString(),
  };

  await col.insertOne(newUser);
  return mapUser(newUser as UserDoc);
}

export async function updateAdminUser(
  id: string,
  patch: Partial<{
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
  const mongo = await getMongoClient();
  if (!mongo) {
    throw new Error("MongoDB is unavailable");
  }

  const updateSet: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (patch.name !== undefined) updateSet.name = patch.name;
  if (patch.email !== undefined) updateSet.email = patch.email.toLowerCase();
  if (patch.username !== undefined) updateSet.username = patch.username;
  if (patch.contact !== undefined) updateSet.contact = patch.contact;
  if (patch.address !== undefined) updateSet.address = patch.address;
  if (patch.plan !== undefined) updateSet.plan = patch.plan;
  if (patch.role !== undefined) updateSet.role = patch.role;
  if (patch.clientStatus !== undefined) {
    updateSet.clientStatus = patch.clientStatus;
    updateSet.status = patch.clientStatus;
  }
  if (patch.paymentStatus !== undefined) {
    updateSet.paymentStatus = patch.paymentStatus;
    updateSet["payments.currentBill.status"] = patch.paymentStatus;
  }

  const doc = await mongo
    .db(getDatabaseName())
    .collection<UserDoc>(USERS_COLLECTION)
    .findOneAndUpdate(idQuery(id) as never, { $set: updateSet }, { returnDocument: "after" });

  return doc ? mapUser(doc) : null;
}

export async function deleteAdminUser(id: string) {
  const mongo = await getMongoClient();
  if (!mongo) {
    throw new Error("MongoDB is unavailable");
  }

  const result = await mongo
    .db(getDatabaseName())
    .collection<UserDoc>(USERS_COLLECTION)
    .deleteOne(idQuery(id) as never);

  return result.deletedCount > 0;
}
