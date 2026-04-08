import { getDatabaseName, getMongoClient } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/serverAuth";

const SETTINGS_COLLECTION = "admin-settings";
const SETTINGS_ID = "main";

const defaultSettings: Pick<
  SettingsDoc,
  "electricityRate" | "billingCycle" | "latePenaltyPercent"
> = {
  electricityRate: 12.5,
  billingCycle: "monthly",
  latePenaltyPercent: 5,
};

type SettingsDoc = {
  _id: string;
  electricityRate: number;
  billingCycle: "monthly" | "weekly";
  latePenaltyPercent: number;
  updatedAt?: string;
};

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const mongo = await getMongoClient();
    if (!mongo) {
      return Response.json({ settings: defaultSettings, source: "memory" }, { status: 200 });
    }

    const db = mongo.db(getDatabaseName());
    const doc = await db
      .collection<SettingsDoc>(SETTINGS_COLLECTION)
      .findOne({ _id: SETTINGS_ID });

    return Response.json({ settings: doc || { _id: SETTINGS_ID, ...defaultSettings }, source: "mongodb" }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as Partial<{
      electricityRate: number;
      billingCycle: "monthly" | "weekly";
      latePenaltyPercent: number;
    }>;

    const mongo = await getMongoClient();
    if (!mongo) {
      return Response.json({ settings: { ...defaultSettings, ...body }, source: "memory" }, { status: 200 });
    }

    const db = mongo.db(getDatabaseName());
    const updated = await db.collection<SettingsDoc>(SETTINGS_COLLECTION).findOneAndUpdate(
      { _id: SETTINGS_ID },
      {
        $set: {
          electricityRate: body.electricityRate ?? defaultSettings.electricityRate,
          billingCycle: body.billingCycle ?? defaultSettings.billingCycle,
          latePenaltyPercent: body.latePenaltyPercent ?? defaultSettings.latePenaltyPercent,
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    return Response.json({ settings: updated, source: "mongodb" }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}

