import { useCallback, useEffect, useState } from "react";
import { fetchReceipts, patchReceiptStatus, type ReceiptRecord } from "./receiptsApi";

export function useReceipts() {
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetchReceipts();
      setReceipts(response.receipts);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to load receipts";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateStatus = useCallback(
    async (receiptId: string, userId: string, status: "Approved" | "Rejected") => {
      await patchReceiptStatus(receiptId, { userId, status });
      setReceipts((current) =>
        current.map((item) => (item.id === receiptId ? { ...item, status } : item))
      );
    },
    []
  );

  return {
    receipts,
    loading,
    error,
    refresh,
    updateStatus,
  };
}
