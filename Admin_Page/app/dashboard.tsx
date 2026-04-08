import { useMemo } from "react";
import { Text, View } from "react-native";
import { AdminShell } from "@/components/AdminShell";
import { palette } from "@/lib/theme";
import { useAdminUsers } from "@/lib/useAdminUsers";

export default function Dashboard() {
  const { users, stats } = useAdminUsers();

  const monthlyChart = useMemo(() => {
    const points = users.map((user) => ({
      label: user.name.split(" ")[0],
      value: user.usageKwh,
    }));

    const max = Math.max(...points.map((point) => point.value), 1);

    return points.slice(0, 8).map((point) => ({
      ...point,
      width: Math.max((point.value / max) * 320, 26),
    }));
  }, [users]);

  return (
    <AdminShell
      title="Dashboard"
      subtitle="Main admin overview with usage, revenue, and billing health"
    >
      <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
        <Metric label="Total Users" value={String(stats.totalUsers)} />
        <Metric label="Total Electricity Consumption" value={`${stats.totalConsumption.toFixed(1)} kWh`} />
        <Metric label="Total Revenue Collected" value={`PHP ${stats.totalRevenue.toLocaleString()}`} />
        <Metric label="Unpaid Bills" value={String(stats.unpaidBills)} />
      </View>

      <View style={panel}>
        <Text style={panelTitle}>Usage Chart (Current Snapshot)</Text>
        {monthlyChart.length === 0 ? (
          <Text style={{ color: palette.textMuted }}>No usage data yet.</Text>
        ) : (
          monthlyChart.map((point) => (
            <View key={point.label} style={{ marginBottom: 10 }}>
              <Text style={{ color: palette.textMuted, marginBottom: 4 }}>{point.label}</Text>
              <View style={{ borderRadius: 8, backgroundColor: "rgba(157,178,223,0.15)", height: 10 }}>
                <View
                  style={{
                    width: point.width,
                    height: 10,
                    backgroundColor: palette.cyan,
                    borderRadius: 8,
                  }}
                />
              </View>
            </View>
          ))
        )}
      </View>
    </AdminShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        minWidth: 240,
        flex: 1,
        borderWidth: 1,
        borderColor: palette.cardBorder,
        borderRadius: 14,
        backgroundColor: "rgba(7, 21, 68, 0.9)",
        padding: 14,
      }}
    >
      <Text style={{ color: palette.textMuted }}>{label}</Text>
      <Text style={{ color: palette.text, fontSize: 24, fontWeight: "900", marginTop: 6 }}>
        {value}
      </Text>
    </View>
  );
}

const panel = {
  borderWidth: 1,
  borderColor: palette.cardBorder,
  borderRadius: 14,
  backgroundColor: "rgba(7, 21, 68, 0.9)",
  padding: 16,
};

const panelTitle = {
  color: palette.text,
  fontSize: 18,
  fontWeight: "800" as const,
  marginBottom: 12,
};
