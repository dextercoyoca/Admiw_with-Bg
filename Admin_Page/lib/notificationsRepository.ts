import { ObjectId } from "mongodb";
import { addMemoryNotification, getMemoryNotifications } from "./dataStore";
import { getDatabaseName, getMongoClient } from "./mongodb";

const NOTIFICATIONS_COLLECTION = "notifications";

type NotificationDoc = {
  _id: ObjectId | string;
  title?: string;
  message?: string;
  audience?: string;
  notificationType?: string;
  priority?: string;
  scheduledFor?: string;
  deliveryStats?: {
    sent?: number;
    read?: number;
    failed?: number;
    audienceSize?: number;
  };
  createdAt?: string;
  updatedAt?: string;
};

export type NotificationRecord = {
  id: string;
  title: string;
  message: string;
  audience: string;
  notificationType: string;
  priority: string;
  scheduledFor: string;
  deliveryStats: {
    sent: number;
    read: number;
    failed: number;
    audienceSize: number;
  };
  createdAt: string;
};

function mapNotification(doc: NotificationDoc): NotificationRecord {
  return {
    id: doc._id.toString(),
    title: (doc.title || "ElectriPay Notice").toString(),
    message: (doc.message || "").toString(),
    audience: (doc.audience || "all").toString(),
    notificationType: (doc.notificationType || "Info").toString(),
    priority: (doc.priority || "Normal").toString(),
    scheduledFor: (doc.scheduledFor || "").toString(),
    deliveryStats: {
      sent: Number(doc.deliveryStats?.sent || 0),
      read: Number(doc.deliveryStats?.read || 0),
      failed: Number(doc.deliveryStats?.failed || 0),
      audienceSize: Number(doc.deliveryStats?.audienceSize || 0),
    },
    createdAt: doc.createdAt || new Date().toISOString(),
  };
}

export async function listNotifications(limit = 20) {
  const mongo = await getMongoClient();

  if (!mongo) {
    return {
      notifications: getMemoryNotifications().slice(0, limit),
      source: "memory" as const,
    };
  }

  const db = mongo.db(getDatabaseName());
  const docs = await db
    .collection<NotificationDoc>(NOTIFICATIONS_COLLECTION)
    .find({})
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .toArray();

  return {
    notifications: docs.map(mapNotification),
    source: "mongodb" as const,
  };
}

export async function createNotification(input: {
  title?: string;
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
  const title = (input.title || "ElectriPay Notice").trim();
  const message = input.message.trim();
  const audience = input.audience || "all";

  const mongo = await getMongoClient();

  if (!mongo) {
    return {
      notification: addMemoryNotification({
        title,
        message,
        audience,
        notificationType: input.notificationType,
        priority: input.priority,
        scheduledFor: input.scheduledFor,
        deliveryStats: input.deliveryStats,
      }),
      source: "memory" as const,
    };
  }

  const db = mongo.db(getDatabaseName());
  const now = new Date().toISOString();
  const doc: Omit<NotificationDoc, "_id"> = {
    title,
    message,
    audience,
    notificationType: input.notificationType || "Info",
    priority: input.priority || "Normal",
    scheduledFor: input.scheduledFor || "",
    deliveryStats: input.deliveryStats,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<NotificationDoc>(NOTIFICATIONS_COLLECTION).insertOne(doc);

  return {
    notification: mapNotification({
      _id: result.insertedId,
      ...doc,
    }),
    source: "mongodb" as const,
  };
}
