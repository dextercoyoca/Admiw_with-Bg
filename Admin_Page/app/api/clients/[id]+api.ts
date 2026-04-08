import { requireAdmin } from "@/lib/serverAuth";
import { updateClient } from "@/lib/clientRepository";
import type { ClientStatus, PaymentStatus } from "@/lib/types";

const paymentStatuses: PaymentStatus[] = ["Paid", "Unpaid"];
const clientStatuses: ClientStatus[] = ["Active", "Suspended", "Disconnected"];

export async function PATCH(
  request: Request,
  { id }: { id: string }
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as {
      paymentStatus?: PaymentStatus;
      clientStatus?: ClientStatus;
    };

    const patch: {
      paymentStatus?: PaymentStatus;
      clientStatus?: ClientStatus;
    } = {};

    if (body.paymentStatus) {
      if (!paymentStatuses.includes(body.paymentStatus)) {
        return Response.json({ error: "Invalid payment status" }, { status: 400 });
      }

      patch.paymentStatus = body.paymentStatus;
    }

    if (body.clientStatus) {
      if (!clientStatuses.includes(body.clientStatus)) {
        return Response.json({ error: "Invalid client status" }, { status: 400 });
      }

      patch.clientStatus = body.clientStatus;
    }

    if (!patch.paymentStatus && !patch.clientStatus) {
      return Response.json({ error: "No valid fields provided" }, { status: 400 });
    }

    const result = await updateClient(id, patch);

    if (!result.client) {
      return Response.json({ error: "Client not found" }, { status: 404 });
    }

    return Response.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}

