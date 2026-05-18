import { AdminShell } from "@/components/AdminShell";
import { ConsumptionChart, UsageTrendChart } from "@/components/ConsumptionChart";
import { useThemePalette } from "@/lib/theme";
import { useAdminUsers } from "@/lib/useAdminUsers";
import { useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";

export default function UsagePage() {
  const palette = useThemePalette();
  const { users } = useAdminUsers();
  const [query, setQuery] = useState("");
  const [threshold, setThreshold] = useState("200");

  const thresholdNumber = Number(threshold || 0);

  const rows = useMemo(() => {
    return users.filter((user) => {
      const match = `${user.name} ${user.email}`
        .toLowerCase()
        .includes(query.toLowerCase());
      return match;
    });
  }, [users, query]);

  // Get top 8 users for consumption chart
  const chartData = useMemo(() => {
    return [...users]
      .sort((a, b) => b.usageKwh - a.usageKwh)
      .slice(0, 8)
      .map((user) => ({
        name: user.name.split(" ")[0], // First name only
        usage: user.usageKwh,
      }));
  }, [users]);

  return (
    <AdminShell
      title="Usage Monitoring"
      subtitle="Track per-user electricity usage and detect high consumption"
    >
      {/* Consumption Chart */}
      {chartData.length > 0 && (
        <View style={panel(palette)}>
          <Text style={label(palette)}>Top Users by Electricity Consumption</Text>
          <ConsumptionChart
            data={chartData}
            height={220}
            barColor={palette.accent}
          />
        </View>
      )}
      <View style={panel(palette)}>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <TextInput
            placeholder="Search users"
            placeholderTextColor="#7f95c5"
            value={query}
            onChangeText={setQuery}
            style={[input(palette), { flex: 1, minWidth: 180 }]}
          />
          <TextInput
            placeholder="High usage threshold"
            placeholderTextColor="#7f95c5"
            value={threshold}
            onChangeText={setThreshold}
            style={[input(palette), { width: "100%", maxWidth: 170, minWidth: 160 }]}
          />
        </View>

        {rows.map((user) => {
          const high = user.usageKwh >= thresholdNumber;
          return (
            <View key={user._id} style={row(palette)}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <View style={{ flex: 1, minWidth: 190 }}>
                  <Text style={{ color: palette.text, fontWeight: "800" }}>
                    {user.name}
                  </Text>
                  <Text style={{ color: palette.textMuted }}>{user.email}</Text>
                </View>
                <Text style={{ color: palette.text, fontWeight: "800", minWidth: 90 }}>
                  {user.usageKwh.toFixed(1)} kWh
                </Text>
                <Text
                  style={{
                    color: high ? palette.warning : palette.textMuted,
                    minWidth: 110,
                    fontWeight: "700",
                  }}
                >
                  {high ? "High Usage" : "Normal"}
                </Text>
              </View>
              <View style={{ marginTop: 12 }}>
                <Text style={miniLabel(palette)}>kWh vs. Time</Text>
                <UsageTrendChart data={user.usageHistory} height={150} />
              </View>
            </View>
          );
        })}
      </View>
    </AdminShell>
  );
}

const panel = (palette: ReturnType<typeof useThemePalette>) => ({
  borderWidth: 1,
  borderColor: palette.cardBorder,
  borderRadius: 14,
  backgroundColor: palette.panel,
  padding: 14,
});

const label = (palette: ReturnType<typeof useThemePalette>) => ({
  color: palette.text,
  fontWeight: "800" as const,
  marginBottom: 8,
});

const miniLabel = (palette: ReturnType<typeof useThemePalette>) => ({
  color: palette.textMuted,
  fontSize: 11,
  fontWeight: "800" as const,
  marginBottom: 6,
  textTransform: "uppercase" as const,
});

const input = (palette: ReturnType<typeof useThemePalette>) => ({
  borderWidth: 1,
  borderColor: palette.inputBorder,
  borderRadius: 10,
  backgroundColor: palette.panelSoft,
  color: palette.text,
  paddingHorizontal: 12,
  paddingVertical: 10,
});

const row = (palette: ReturnType<typeof useThemePalette>) => ({
  marginTop: 10,
  borderWidth: 1,
  borderColor: palette.rowBorder,
  borderRadius: 10,
  padding: 10,
});
