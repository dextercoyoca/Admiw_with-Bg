import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { AdminShell } from "@/components/AdminShell";
import { palette } from "@/lib/theme";
import { useAdminUsers } from "@/lib/useAdminUsers";

function toCsv(rows: Record<string, string | number>[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => JSON.stringify(row[header] ?? "")).join(","));
  }
  return lines.join("\n");
}

export default function ReportsPage() {
  const { users, stats } = useAdminUsers();

  const topUsers = useMemo(
    () => [...users].sort((a, b) => b.usageKwh - a.usageKwh).slice(0, 5),
    [users]
  );

  const monthlyRevenue = useMemo(() => stats.totalRevenue, [stats.totalRevenue]);

  return (
    <AdminShell title="Reports" subtitle="Revenue and usage analytics with export options">
      <View style={panel}>
        <Text style={title}>Monthly Revenue Report</Text>
        <Text style={value}>PHP {monthlyRevenue.toLocaleString()}</Text>
      </View>

      <View style={panel}>
        <Text style={title}>Top Users By Usage</Text>
        {topUsers.map((user, index) => (
          <View key={user._id} style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            <Text style={{ color: palette.textMuted }}>{index + 1}. {user.name}</Text>
            <Text style={{ color: palette.text }}>{user.usageKwh.toFixed(1)} kWh</Text>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => {
          const csv = toCsv(
            users.map((user) => ({
              name: user.name,
              email: user.email,
              usageKwh: user.usageKwh,
              revenueCollected: user.revenueCollected,
              paymentStatus: user.paymentStatus,
            }))
          );

          if (typeof document !== "undefined") {
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "admin-report.csv";
            link.click();
            URL.revokeObjectURL(url);
          }
        }}
        style={downloadBtn}
      >
        <Text style={{ color: "#1b1e2f", fontWeight: "800" }}>Export CSV</Text>
      </Pressable>
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

const title = {
  color: palette.text,
  fontSize: 18,
  fontWeight: "800" as const,
};

const value = {
  color: palette.accent,
  fontSize: 28,
  fontWeight: "900" as const,
  marginTop: 6,
};

const downloadBtn = {
  borderRadius: 10,
  backgroundColor: palette.accent,
  paddingHorizontal: 14,
  paddingVertical: 10,
  alignSelf: "flex-start" as const,
};
