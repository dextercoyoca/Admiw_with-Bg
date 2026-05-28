import { useCallback, useEffect, useState } from "react";
import {
    deleteReceipt,
    fetchReceipts,
    patchReceiptStatus,
    type ReceiptRecord,
} from "./receiptsApi";

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
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to load receipts";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateStatus = useCallback(
    async (
      receiptId: string,
      userId: string,
      status: "Approved" | "Rejected" | "Pending Verification",
    ) => {
      await patchReceiptStatus(receiptId, { userId, status });
      setReceipts((current) =>
        current.map((item) =>
          item.id === receiptId ? { ...item, status } : item,
        ),
      );
    },
    [],
  );

  const deleteReceiptItem = useCallback(async (receiptId: string) => {
    await deleteReceipt(receiptId);
    setReceipts((current) => current.filter((item) => item.id !== receiptId));
  }, []);

  const deleteReceiptItems = useCallback(async (
    receiptIds: string[],
    onDeleted?: (deletedCount: number, totalCount: number) => void,
  ) => {
    const uniqueReceiptIds = Array.from(new Set(receiptIds));
    const deletedIds: string[] = [];
    const failedErrors: unknown[] = [];

    for (const receiptId of uniqueReceiptIds) {
      try {
        await deleteReceipt(receiptId);
        deletedIds.push(receiptId);
        setReceipts((current) => current.filter((item) => item.id !== receiptId));
        onDeleted?.(deletedIds.length, uniqueReceiptIds.length);
      } catch (error) {
        failedErrors.push(error);
      }
    }

    if (failedErrors.length > 0) {
      throw new Error(
        `Deleted ${deletedIds.length} receipt${deletedIds.length === 1 ? "" : "s"}, but ${failedErrors.length} failed.`,
      );
    }

    return deletedIds.length;
  }, []);

  return {
    receipts,
    loading,
    error,
    refresh,
    updateStatus,
    deleteReceipt: deleteReceiptItem,
    deleteReceipts: deleteReceiptItems,
  };
}
