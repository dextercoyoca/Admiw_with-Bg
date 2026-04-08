import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAdminUser,
  fetchAdminUsers,
  patchAdminUser,
  removeAdminUser,
  type AdminUserRecord,
} from "./adminApi";

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetchAdminUsers();
      setUsers(response.users);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Unable to fetch users";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addUser = useCallback(
    async (payload: {
      name: string;
      email: string;
      username: string;
      password: string;
      contact?: string;
      address?: string;
      plan?: string;
    }) => {
      const created = await createAdminUser(payload);
      setUsers((prev) => [created.user, ...prev]);
    },
    []
  );

  const updateUser = useCallback(
    async (
      id: string,
      payload: Partial<{
        name: string;
        email: string;
        username: string;
        contact: string;
        address: string;
        role: string;
        plan: string;
        clientStatus: string;
        paymentStatus: string;
      }>
    ) => {
      const updated = await patchAdminUser(id, payload);
      setUsers((prev) => prev.map((item) => (item._id === id ? updated.user : item)));
    },
    []
  );

  const deleteUser = useCallback(async (id: string) => {
    await removeAdminUser(id);
    setUsers((prev) => prev.filter((item) => item._id !== id));
  }, []);

  const stats = useMemo(() => {
    const totalUsers = users.length;
    const totalConsumption = users.reduce((sum, user) => sum + user.usageKwh, 0);
    const totalRevenue = users.reduce((sum, user) => sum + user.revenueCollected, 0);
    const unpaidBills = users.filter((user) => user.paymentStatus === "Unpaid").length;

    return {
      totalUsers,
      totalConsumption,
      totalRevenue,
      unpaidBills,
    };
  }, [users]);

  return {
    users,
    loading,
    error,
    stats,
    refresh,
    addUser,
    updateUser,
    deleteUser,
  };
}
