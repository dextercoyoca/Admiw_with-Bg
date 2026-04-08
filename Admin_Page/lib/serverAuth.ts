import crypto from "node:crypto";
import { findAdminById, hasAdminRole } from "./adminRepository";

type TokenPayload = {
  sub: string;
  email: string;
  role: string;
  exp: number;
};

function getSecret() {
  return process.env.ADMIN_AUTH_SECRET || "electripay-dev-secret";
}

function toBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(data: string) {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function createAdminToken(input: { id: string; email: string; role: string }) {
  const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload: TokenPayload = {
    sub: input.id,
    email: input.email,
    role: input.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
  };
  const payloadEncoded = toBase64Url(JSON.stringify(payload));
  const data = `${header}.${payloadEncoded}`;
  const signature = sign(data);

  return `${data}.${signature}`;
}

export function verifyAdminToken(token: string) {
  try {
    const [header, payloadEncoded, signature] = token.split(".");
    if (!header || !payloadEncoded || !signature) {
      return null;
    }

    const expected = sign(`${header}.${payloadEncoded}`);
    if (expected !== signature) {
      return null;
    }

    const payload = JSON.parse(fromBase64Url(payloadEncoded)) as TokenPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function extractBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authHeader.slice(7).trim();
}

export async function requireAdmin(request: Request) {
  const token = extractBearerToken(request);
  if (!token) {
    return { ok: false as const, error: "Missing authorization token", status: 401 };
  }

  const payload = verifyAdminToken(token);
  if (!payload) {
    return { ok: false as const, error: "Invalid or expired token", status: 401 };
  }

  const admin = await findAdminById(payload.sub);
  if (!admin) {
    return { ok: false as const, error: "Admin account not found", status: 401 };
  }

  if (!hasAdminRole(admin.role)) {
    return {
      ok: false as const,
      error: "Forbidden: database role is not admin",
      status: 403,
    };
  }

  if (admin.active === false) {
    return { ok: false as const, error: "Admin account is inactive", status: 403 };
  }

  if (
    admin.status &&
    ["inactive", "disabled", "blocked", "suspended"].includes(admin.status.toLowerCase())
  ) {
    return { ok: false as const, error: "Admin account is suspended", status: 403 };
  }

  return { ok: true as const, payload, admin };
}
