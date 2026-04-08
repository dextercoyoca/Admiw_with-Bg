import { updateReceiptStatus } from "@/lib/adminReceiptsRepository";
import { requireAdmin } from "@/lib/serverAuth";

export async function PATCH(request: Request, { id }: { id: string }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as {
      userId?: string;
      status?: "Approved" | "Rejected";
    };

    if (!body.userId || !body.status) {
      return Response.json({ error: "userId and status are required" }, { status: 400 });
    }

    if (!["Approved", "Rejected"].includes(body.status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }

    const result = await updateReceiptStatus({
      userId: body.userId,
      receiptId: id,
      status: body.status,
    });

    if (!result) {
      return Response.json({ error: "Receipt or user not found" }, { status: 404 });
    }

    return Response.json({ receipt: result }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
