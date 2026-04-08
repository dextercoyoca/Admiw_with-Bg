import { listAdminReceipts } from "@/lib/adminReceiptsRepository";
import { requireAdmin } from "@/lib/serverAuth";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const receipts = await listAdminReceipts();
    return Response.json({ receipts }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
