import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { AdminShell } from "@/components/AdminShell";
import { UsageTrendChart } from "@/components/ConsumptionChart";
import { useThemePalette } from "@/lib/theme";
import { useAdminUsers } from "@/lib/useAdminUsers";

type UsagePeriod = "daily" | "weekly" | "monthly" | "yearly";

const periods: { label: string; value: UsagePeriod }[] = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
];

export default function Dashboard() {
  const palette = useThemePalette();
  const { users, stats } = useAdminUsers();
  const [period, setPeriod] = useState<UsagePeriod>("monthly");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const usageChart = useMemo(() => {
    const points = users
      .map((user) => {
        const value = getUsageForPeriod(user.usageHistory, user.usageKwh, period);
        const trend = getUsageTrend(user.usageHistory);

        return {
          id: user._id,
          label: user.name.split(" ")[0],
          name: user.name,
          value,
          trend,
          history: user.usageHistory,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const max = Math.max(...points.map((point) => point.value), 1);
    const average =
      points.length > 0
        ? points.reduce((sum, point) => sum + point.value, 0) / points.length
        : 0;
    const highThreshold = average * 1.2;
    const criticalThreshold = average * 1.5;

    return {
      max,
      average,
      points: points.map((point) => ({
        ...point,
        percent: Math.max((point.value / max) * 100, 2),
        status:
          point.value >= criticalThreshold
            ? "critical"
            : point.value >= highThreshold
              ? "high"
              : "normal",
      })),
    };
  }, [period, users]);

  const selectedUser =
    usageChart.points.find((point) => point.id === selectedUserId) ||
    usageChart.points[0];

  const averagePercent = Math.min((usageChart.average / usageChart.max) * 100, 100);
  const periodTitle = periods.find((item) => item.value === period)?.label || "Monthly";

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

      <View style={panel(palette)}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <View>
            <Text style={panelTitle(palette)}>Top Consumers This {periodTitle}</Text>
            <Text style={{ color: palette.textMuted }}>
              kWh totals, average baseline, and latest movement
            </Text>
          </View>
          <View style={segmented(palette)}>
            {periods.map((item) => {
              const active = item.value === period;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setPeriod(item.value)}
                  style={segmentButton(palette, active)}
                >
                  <Text style={segmentText(palette, active)}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={legendRow}>
          <LegendSwatch color={palette.cyan} label="Normal" />
          <LegendSwatch color={palette.warning} label="High" />
          <LegendSwatch color={palette.danger} label="Critical" />
          <Text style={{ color: palette.textMuted, fontSize: 12 }}>Avg marker</Text>
        </View>

        {usageChart.points.length === 0 ? (
          <Text style={{ color: palette.textMuted }}>No usage data yet.</Text>
        ) : (
          <View>
            <View style={{ marginBottom: 6, paddingLeft: 96, paddingRight: 142 }}>
              <ScaleLabels max={usageChart.max} />
            </View>

            <View>
              {usageChart.points.map((point) => (
                <Pressable
                  key={point.id}
                  onPress={() => setSelectedUserId(point.id)}
                  style={[
                    chartRow,
                    selectedUser?.id === point.id && {
                      backgroundColor: palette.accentSoft,
                      borderColor: palette.accent,
                    },
                  ]}
                >
                  <Text numberOfLines={1} style={chartName(palette)}>
                    {point.label}
                  </Text>
                  <View style={{ flex: 1, minWidth: 160 }}>
                    <View style={barTrack}>
                      <View
                        style={{
                          position: "absolute",
                          left: `${averagePercent}%`,
                          top: 0,
                          bottom: 0,
                          width: 2,
                          backgroundColor: palette.accent,
                          opacity: 0.85,
                          zIndex: 1,
                        }}
                      />
                      <View
                        style={{
                          width: `${point.percent}%`,
                          height: 12,
                          backgroundColor: getStatusColor(point.status, palette),
                          borderRadius: 8,
                        }}
                      />
                    </View>
                  </View>
                  <Text style={chartValue(palette)}>{formatKwh(point.value)}</Text>
                  <Text style={trendText(point.trend.percent, palette)}>
                    {formatTrend(point.trend.percent)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>

      {selectedUser ? (
        <View style={panel(palette)}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <View>
              <Text style={panelTitle(palette)}>{selectedUser.name}</Text>
              <Text style={{ color: palette.textMuted }}>kWh vs. Time</Text>
            </View>
            <Text style={{ color: palette.text, fontWeight: "900" }}>
              {formatKwh(selectedUser.value)}
            </Text>
          </View>
          <UsageTrendChart data={selectedUser.history} height={190} />
        </View>
      ) : null}
    </AdminShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const palette = useThemePalette();

  return (
    <View
      style={{
        minWidth: 220,
        flex: 1,
        borderWidth: 1,
        borderColor: palette.cardBorder,
        borderRadius: 14,
        backgroundColor: palette.panel,
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

const panel = (palette: ReturnType<typeof useThemePalette>) => ({
  borderWidth: 1,
  borderColor: palette.cardBorder,
  borderRadius: 14,
  backgroundColor: palette.panel,
  padding: 16,
});

const panelTitle = (palette: ReturnType<typeof useThemePalette>) => ({
  color: palette.text,
  fontSize: 18,
  fontWeight: "800" as const,
});

function getUsageForPeriod(
  history: { label: string; usage: number }[],
  totalUsage: number,
  period: UsagePeriod
) {
  if (history.length === 0) return totalUsage;

  if (period === "daily") {
    return history[history.length - 1]?.usage || 0;
  }

  if (period === "weekly") {
    return history.slice(-7).reduce((sum, item) => sum + item.usage, 0);
  }

  if (period === "yearly") {
    return history.reduce((sum, item) => sum + item.usage, 0);
  }

  return totalUsage || history.reduce((sum, item) => sum + item.usage, 0);
}

function getUsageTrend(history: { label: string; usage: number }[]) {
  if (history.length < 2) return { percent: 0 };

  const previous = history[history.length - 2].usage;
  const current = history[history.length - 1].usage;

  if (previous <= 0) {
    return { percent: current > 0 ? 100 : 0 };
  }

  return { percent: ((current - previous) / previous) * 100 };
}

function formatKwh(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh`;
}

function formatTrend(value: number) {
  if (Math.abs(value) < 0.5) return "0%";
  return `${value > 0 ? "+" : ""}${value.toFixed(0)}%`;
}

function getStatusColor(status: string, palette: ReturnType<typeof useThemePalette>) {
  if (status === "critical") return palette.danger;
  if (status === "high") return palette.warning;
  return palette.cyan;
}

function ScaleLabels({ max }: { max: number }) {
  const palette = useThemePalette();
  const values = [0, max / 2, max];

  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      {values.map((value) => (
        <Text key={value} style={{ color: palette.textMuted, fontSize: 11 }}>
          {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </Text>
      ))}
    </View>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  const palette = useThemePalette();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
      <Text style={{ color: palette.textMuted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const segmented = (palette: ReturnType<typeof useThemePalette>) => ({
  flexDirection: "row" as const,
  flexWrap: "wrap" as const,
  gap: 4,
  borderWidth: 1,
  borderColor: palette.inputBorder,
  borderRadius: 10,
  padding: 4,
  backgroundColor: palette.panelSoft,
});

const segmentButton = (
  palette: ReturnType<typeof useThemePalette>,
  active: boolean
) => ({
  borderRadius: 8,
  paddingHorizontal: 10,
  paddingVertical: 7,
  backgroundColor: active ? palette.accentSoft : "transparent",
});

const segmentText = (
  palette: ReturnType<typeof useThemePalette>,
  active: boolean
) => ({
  color: active ? palette.accent : palette.textMuted,
  fontSize: 12,
  fontWeight: "800" as const,
});

const legendRow = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  flexWrap: "wrap" as const,
  gap: 12,
  marginBottom: 12,
};

const chartRow = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 10,
  borderWidth: 1,
  borderColor: "transparent",
  borderRadius: 8,
  paddingVertical: 7,
  paddingHorizontal: 8,
};

const barTrack = {
  height: 12,
  borderRadius: 8,
  backgroundColor: "rgba(157,178,223,0.15)",
  overflow: "hidden" as const,
  position: "relative" as const,
};

const chartName = (palette: ReturnType<typeof useThemePalette>) => ({
  color: palette.textMuted,
  width: 78,
  fontWeight: "700" as const,
});

const chartValue = (palette: ReturnType<typeof useThemePalette>) => ({
  color: palette.text,
  width: 92,
  textAlign: "right" as const,
  fontWeight: "800" as const,
});

const trendText = (
  trend: number,
  palette: ReturnType<typeof useThemePalette>
) => ({
  color: trend > 0.5 ? palette.warning : trend < -0.5 ? palette.success : palette.textMuted,
  width: 40,
  textAlign: "right" as const,
  fontWeight: "800" as const,
});
