import {
  createAdminUser,
  listAdminUsers,
} from "@/lib/adminUsersRepository";
import { requireAdmin } from "@/lib/serverAuth";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const users = await listAdminUsers();
    return Response.json({ users }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      username?: string;
      password?: string;
      contact?: string;
      address?: string;
      plan?: string;
    };

    if (!body.name || !body.email || !body.username || !body.password) {
      return Response.json(
        { error: "name, email, username, and password are required" },
        { status: 400 }
      );
    }

    const user = await createAdminUser({
      name: body.name,
      email: body.email,
      username: body.username,
      password: body.password,
      contact: body.contact,
      address: body.address,
      plan: body.plan,
    });

    return Response.json({ user }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}

