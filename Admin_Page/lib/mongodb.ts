import { MongoClient } from "mongodb";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function loadEnvFile(filename: string) {
  const envPath = path.join(process.cwd(), filename);
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// Priority: config.env first, then .env fallback.
loadEnvFile("config.env");
loadEnvFile(".env");

const mongoOptions = {
  connectTimeoutMS: 10000,
  serverSelectionTimeoutMS: 5000,
  retryWrites: true,
};

let client: MongoClient | null = null;
let connectPromise: Promise<MongoClient | null> | null = null;

async function connectWithRetry(retries = 3, delayMs = 2000) {
  const uri = process.env.ATLAS_URI || process.env.MONGODB_URI;
  if (!uri) {
    return null;
  }

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      if (!client) {
        client = new MongoClient(uri, mongoOptions);
      }

      await client.connect();
      await client.db("admin").command({ ping: 1 });
      return client;
    } catch (error) {
      lastError = error;
      client = null;

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  console.warn(
    "[mongodb] Connection failed after retries. Falling back to in-memory store.",
    lastError instanceof Error ? lastError.message : lastError
  );
  return null;
}

export async function getMongoClient() {
  const uri = process.env.ATLAS_URI || process.env.MONGODB_URI;
  if (!uri) {
    return null;
  }

  if (!connectPromise) {
    connectPromise = connectWithRetry();
  }

  const connectedClient = await connectPromise;
  connectPromise = null;
  return connectedClient;
}

export function getDatabaseName() {
  return process.env.MONGODB_DB_NAME || "database_electripay";
}
