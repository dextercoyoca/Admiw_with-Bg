import { authenticateAdmin, hasAdminRole } from "@/lib/adminRepository";
import { createAdminToken } from "@/lib/serverAuth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      identifier?: string;
      password?: string;
    };

    const identifier = body.identifier?.trim() || "";
    const password = body.password || "";

    if (!identifier || !password) {
      return Response.json(
        { error: "Identifier and password are required" },
        { status: 400 }
      );
    }

    const session = await authenticateAdmin(identifier, password);

    if (!session) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!hasAdminRole(session.role)) {
      return Response.json(
        { error: "Access denied: role is not admin" },
        { status: 403 }
      );
    }

    const token = createAdminToken({
      id: session.id,
      email: session.email,
      role: session.role,
    });

    return Response.json({ session: { ...session, token } }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected auth error";
    return Response.json({ error: message }, { status: 500 });
  }
}
