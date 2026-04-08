import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchClients, updateClientById } from "./clientApi";
import type { ClientRecord, ClientStatus, PaymentStatus } from "./types";

export function useClients() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [source, setSource] = useState<"mongodb" | "memory">("memory");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetchClients();
      setClients(response.clients);
      setSource(response.source);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to load clients";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateClientField = useCallback(
    async (
      id: string,
      patch: {
        paymentStatus?: PaymentStatus;
        clientStatus?: ClientStatus;
      }
    ) => {
      const previous = clients;

      setClients((current) =>
        current.map((client) =>
          client._id === id
            ? { ...client, ...patch, updatedAt: new Date().toISOString() }
            : client
        )
      );

      try {
        const response = await updateClientById(id, patch);
        if (!response.client) {
          throw new Error("Client not found");
        }

        setSource(response.source);
      } catch (requestError) {
        setClients(previous);
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Unable to update client";
        setError(message);
        throw requestError;
      }
    },
    [clients]
  );

  const stats = useMemo(() => {
    const paid = clients.filter((client) => client.paymentStatus === "Paid").length;
    const unpaid = clients.length - paid;
    const active = clients.filter((client) => client.clientStatus === "Active").length;
    const suspended = clients.filter((client) => client.clientStatus === "Suspended").length;
    const amountDue = clients.reduce((sum, client) => sum + client.amountDue, 0);

    return {
      total: clients.length,
      paid,
      unpaid,
      active,
      suspended,
      amountDue,
    };
  }, [clients]);

  return {
    clients,
    loading,
    error,
    source,
    stats,
    refresh,
    updateClientField,
  };
}
