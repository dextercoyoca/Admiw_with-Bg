import { deleteAdminUser, updateAdminUser } from "@/lib/adminUsersRepository";
import { requireAdmin } from "@/lib/serverAuth";

export async function PATCH(request: Request, { id }: { id: string }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as Partial<{
      name: string;
      email: string;
      username: string;
      contact: string;
      address: string;
      role: string;
      plan: string;
      clientStatus: string;
      paymentStatus: string;
    }>;

    const user = await updateAdminUser(id, body);

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({ user }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { id }: { id: string }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const ok = await deleteAdminUser(id);

    if (!ok) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}

