import { useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { AdminShell } from "@/components/AdminShell";
import { palette } from "@/lib/theme";
import { useAdminUsers } from "@/lib/useAdminUsers";

export default function BillsPage() {
  const { users } = useAdminUsers();
  const [query, setQuery] = useState("");

  const rows = useMemo(
    () =>
      users.filter((user) =>
        `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase())
      ),
    [users, query]
  );

  return (
    <AdminShell
      title="Billing Management"
      subtitle="Paid/Unpaid is automatically based on receipt approval status"
    >
      <View style={panel}>
        <TextInput
          placeholder="Search users"
          placeholderTextColor="#7f95c5"
          value={query}
          onChangeText={setQuery}
          style={input}
        />

        {rows.map((user) => (
          <View key={user._id} style={row}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.text, fontWeight: "800" }}>{user.name}</Text>
              <Text style={{ color: palette.textMuted }}>{user.email}</Text>
              <Text style={{ color: palette.textMuted }}>Amount Due: PHP {user.amountDue.toLocaleString()}</Text>
            </View>
            <View
              style={{
                borderWidth: 1,
                borderColor: user.paymentStatus === "Paid" ? palette.success : palette.warning,
                backgroundColor:
                  user.paymentStatus === "Paid"
                    ? "rgba(34,197,94,0.2)"
                    : "rgba(245,158,11,0.2)",
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Text style={{ color: palette.text, fontWeight: "700" }}>{user.paymentStatus}</Text>
            </View>
          </View>
        ))}
      </View>
    </AdminShell>
  );
}

const panel = {
  borderWidth: 1,
  borderColor: palette.cardBorder,
  borderRadius: 14,
  backgroundColor: "rgba(7, 21, 68, 0.9)",
  padding: 14,
};

const input = {
  borderWidth: 1,
  borderColor: "rgba(157,178,223,0.35)",
  borderRadius: 10,
  backgroundColor: "rgba(5, 17, 55, 0.95)",
  color: palette.text,
  paddingHorizontal: 12,
  paddingVertical: 10,
};

const row = {
  marginTop: 10,
  borderWidth: 1,
  borderColor: "rgba(157,178,223,0.22)",
  borderRadius: 10,
  padding: 10,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 10,
};
