import { ObjectId } from "mongodb";
import { getMongoClient, getDatabaseName } from "./mongodb";

const ADMIN_COLLECTION = "admin-side";

type AdminDoc = {
  _id: ObjectId | string;
  email?: string;
  admin_email?: string;
  username?: string;
  userName?: string;
  name?: string;
  admin_name?: string;
  password?: string;
  pass?: string;
  active?: boolean;
  status?: string;
  role?: string;
};

export type AdminSession = {
  id: string;
  email: string;
  displayName: string;
  role: string;
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getDocId(value: ObjectId | string) {
  return typeof value === "string" ? value : value.toString();
}

function buildAdminIdQuery(id: string) {
  if (ObjectId.isValid(id) && String(new ObjectId(id)) === id) {
    return { _id: new ObjectId(id) };
  }

  return { _id: id };
}

function getPasswordFromDoc(doc: AdminDoc) {
  return (doc.password || doc.pass || "").toString();
}

function getDisplayName(doc: AdminDoc) {
  return (
    doc.name ||
    doc.admin_name ||
    doc.username ||
    doc.userName ||
    doc.email ||
    doc.admin_email ||
    "Admin"
  ).toString();
}

function isInactive(doc: AdminDoc) {
  if (doc.active === false) {
    return true;
  }

  if (!doc.status) {
    return false;
  }

  return ["inactive", "disabled", "blocked", "suspended"].includes(
    doc.status.toLowerCase()
  );
}

export function hasAdminRole(role?: string) {
  return (role || "").toLowerCase() === "admin";
}

export async function authenticateAdmin(identifier: string, password: string) {
  const mongo = await getMongoClient();

  if (!mongo) {
    throw new Error("MongoDB is unavailable");
  }

  const db = mongo.db(getDatabaseName());
  const collection = db.collection<AdminDoc>(ADMIN_COLLECTION);
  const normalized = identifier.trim();
  const normalizedLower = normalized.toLowerCase();
  const identifierRegex = new RegExp(`^${escapeRegex(normalized)}$`, "i");

  const admin = await collection.findOne({
    $or: [
      { email: normalizedLower },
      { admin_email: normalizedLower },
      { email: { $regex: identifierRegex } },
      { admin_email: { $regex: identifierRegex } },
      { username: { $regex: identifierRegex } },
      { userName: { $regex: identifierRegex } },
      { name: { $regex: identifierRegex } },
      { admin_name: { $regex: identifierRegex } },
    ],
  });

  if (!admin) {
    return null;
  }

  if (isInactive(admin)) {
    throw new Error("Admin account is inactive");
  }

  const storedPassword = getPasswordFromDoc(admin);
  const suppliedPassword = password.trim();

  if (
    !storedPassword ||
    (storedPassword !== password && storedPassword.trim() !== suppliedPassword)
  ) {
    return null;
  }

  return {
    id: getDocId(admin._id),
    email: (admin.email || admin.admin_email || normalizedLower).toString(),
    displayName: getDisplayName(admin),
    role: (admin.role || "admin").toString().toLowerCase(),
  } as AdminSession;
}

export async function findAdminById(id: string) {
  const mongo = await getMongoClient();

  if (!mongo) {
    return null;
  }

  const db = mongo.db(getDatabaseName());
  const collection = db.collection<AdminDoc>(ADMIN_COLLECTION);
  const admin = await collection.findOne(buildAdminIdQuery(id));

  if (!admin) {
    return null;
  }

  return {
    id: getDocId(admin._id),
    email: (admin.email || admin.admin_email || "").toString(),
    displayName: getDisplayName(admin),
    role: (admin.role || "").toString().toLowerCase(),
    active: admin.active,
    status: admin.status,
  };
}
