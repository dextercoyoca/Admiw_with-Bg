import { AdminShell } from "@/components/AdminShell";
import { useThemePalette } from "@/lib/theme";
import { useAdminUsers } from "@/lib/useAdminUsers";
import { FontAwesome6 } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

type ReportPeriod = "weekly" | "monthly" | "quarterly" | "yearly";
type ReportTab = "overview" | "revenue" | "usage" | "billing" | "export";

const periods: { label: string; value: ReportPeriod; multiplier: number }[] = [
  { label: "Weekly", value: "weekly", multiplier: 0.25 },
  { label: "Monthly", value: "monthly", multiplier: 1 },
  { label: "Quarterly", value: "quarterly", multiplier: 3 },
  { label: "Yearly", value: "yearly", multiplier: 12 },
];

const tabs: { label: string; value: ReportTab }[] = [
  { label: "Overview", value: "overview" },
  { label: "Revenue", value: "revenue" },
  { label: "Usage", value: "usage" },
  { label: "Billing", value: "billing" },
  { label: "Export", value: "export" },
];

export default function ReportsPage() {
  const palette = useThemePalette();
  const { users, stats } = useAdminUsers();
  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const [tab, setTab] = useState<ReportTab>("overview");
  const [notice, setNotice] = useState("");

  const report = useMemo(() => {
    const selectedPeriod = periods.find((item) => item.value === period) || periods[1];
    const multiplier = selectedPeriod.multiplier;
    const totalRevenue = stats.totalRevenue * multiplier;
    const totalConsumption = stats.totalConsumption * multiplier;
    const outstanding = users
      .filter((user) => user.paymentStatus === "Unpaid")
      .reduce((sum, user) => sum + user.amountDue, 0);
    const paidUsers = users.filter((user) => user.paymentStatus === "Paid").length;
    const collectionRate = users.length > 0 ? (paidUsers / users.length) * 100 : 0;
    const averageRevenue = users.length > 0 ? totalRevenue / users.length : 0;
    const averageUsage = users.length > 0 ? totalConsumption / users.length : 0;
    const topUsers = [...users]
      .sort((a, b) => b.usageKwh - a.usageKwh)
      .slice(0, 6);
    const maxUsage = Math.max(1, ...topUsers.map((user) => user.usageKwh));
    const paidVsUnpaid = [
      { label: "Paid", value: paidUsers, color: palette.success },
      { label: "Unpaid", value: users.length - paidUsers, color: palette.warning },
    ];
    const revenueTrend = buildTrend(totalRevenue, 0.08);
    const usageTrend = buildTrend(totalConsumption, -0.03);

    return {
      periodLabel: selectedPeriod.label,
      totalRevenue,
      totalConsumption,
      averageRevenue,
      averageUsage,
      outstanding,
      collectionRate,
      paidUsers,
      unpaidUsers: users.length - paidUsers,
      topUsers,
      maxUsage,
      paidVsUnpaid,
      revenueTrend,
      usageTrend,
      generatedAt: new Date(),
    };
  }, [palette.success, palette.warning, period, stats.totalConsumption, stats.totalRevenue, users]);

  const insights = useMemo(() => {
    const highest = report.topUsers[0];
    const topUsageShare =
      highest && report.totalConsumption > 0
        ? (highest.usageKwh / report.totalConsumption) * 100
        : 0;

    return [
      highest ? `${highest.name} is the highest consumer at ${highest.usageKwh.toFixed(1)} kWh.` : "No usage records yet.",
      `Collection rate is ${report.collectionRate.toFixed(0)}% with ${report.unpaidUsers} unpaid account${report.unpaidUsers === 1 ? "" : "s"}.`,
      `Average usage is ${report.averageUsage.toFixed(1)} kWh per user for this report period.`,
      highest ? `Top consumer contributes ${topUsageShare.toFixed(1)}% of period usage.` : "Usage concentration is unavailable.",
    ];
  }, [report]);

  const exportRows = users.map((user) => ({
    name: user.name,
    email: user.email,
    plan: user.plan,
    usageKwh: user.usageKwh,
    revenueCollected: user.revenueCollected,
    amountDue: user.amountDue,
    paymentStatus: user.paymentStatus,
    clientStatus: user.clientStatus,
  }));

  const handleExport = (format: "csv" | "json" | "copy" | "print") => {
    const summary = buildReportSummary(report, insights);

    if (format === "csv") {
      downloadFile("electripay-report.csv", toCsv(exportRows), "text/csv;charset=utf-8");
    } else if (format === "json") {
      downloadFile(
        "electripay-report.json",
        JSON.stringify({ summary, rows: exportRows }, null, 2),
        "application/json;charset=utf-8",
      );
    } else if (format === "copy") {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(summary);
      }
      setNotice("Report summary copied.");
      return;
    } else if (format === "print") {
      if (typeof window !== "undefined") window.print();
      setNotice("Print dialog opened.");
      return;
    }

    setNotice(`${format.toUpperCase()} export generated.`);
  };

  return (
    <AdminShell title="Reports" subtitle="Revenue and usage analytics with export options">
      <View style={toolbar(palette)}>
        <Segmented
          options={periods}
          value={period}
          onChange={(value) => setPeriod(value as ReportPeriod)}
        />
        <Segmented
          options={tabs}
          value={tab}
          onChange={(value) => setTab(value as ReportTab)}
        />
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <Metric label="Total Revenue" value={formatCurrency(report.totalRevenue)} delta="+8%" />
        <Metric label="Total Consumption" value={`${report.totalConsumption.toFixed(1)} kWh`} delta="-3%" />
        <Metric label="Avg Revenue / User" value={formatCurrency(report.averageRevenue)} />
        <Metric label="Collection Rate" value={`${report.collectionRate.toFixed(0)}%`} />
        <Metric label="Outstanding" value={formatCurrency(report.outstanding)} tone="warning" />
      </View>

      {(tab === "overview" || tab === "revenue") && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
          <View style={[panel(palette), { flex: 1, minWidth: 320 }]}>
            <Text style={title(palette)}>Revenue Trend</Text>
            <TrendBars data={report.revenueTrend} color={palette.accent} formatter={formatCurrency} />
          </View>
          <View style={[panel(palette), { flex: 1, minWidth: 320 }]}>
            <Text style={title(palette)}>Report Preview</Text>
            <PreviewLine label="Period" value={report.periodLabel} />
            <PreviewLine label="Generated" value={formatDateTime(report.generatedAt)} />
            <PreviewLine label="Top Users Included" value={String(report.topUsers.length)} />
            <PreviewLine label="Rows in Export" value={String(exportRows.length)} />
          </View>
        </View>
      )}

      {(tab === "overview" || tab === "usage") && (
        <View style={panel(palette)}>
          <Text style={title(palette)}>Top Users By Usage</Text>
          {report.topUsers.map((user, index) => {
            const percent = Math.max((user.usageKwh / report.maxUsage) * 100, 2);
            const contribution =
              report.totalConsumption > 0
                ? (user.usageKwh / report.totalConsumption) * 100
                : 0;

            return (
              <View key={user._id} style={rankRow(palette)}>
                <Text style={rankNumber(palette)}>{index + 1}</Text>
                <View style={{ flex: 1, minWidth: 180 }}>
                  <Text style={{ color: palette.text, fontWeight: "900" }}>{user.name}</Text>
                  <View style={barTrack}>
                    <View style={{ width: `${percent}%`, height: 10, borderRadius: 999, backgroundColor: palette.cyan }} />
                  </View>
                </View>
                <Text style={{ color: palette.text, fontWeight: "900", width: 110, textAlign: "right" }}>
                  {user.usageKwh.toFixed(1)} kWh
                </Text>
                <Text style={{ color: palette.textMuted, width: 70, textAlign: "right" }}>
                  {contribution.toFixed(1)}%
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {(tab === "overview" || tab === "billing") && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
          <View style={[panel(palette), { flex: 1, minWidth: 320 }]}>
            <Text style={title(palette)}>Paid vs Unpaid</Text>
            {report.paidVsUnpaid.map((item) => (
              <View key={item.label} style={{ marginTop: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: palette.textMuted }}>{item.label}</Text>
                  <Text style={{ color: palette.text, fontWeight: "900" }}>{item.value}</Text>
                </View>
                <View style={barTrack}>
                  <View
                    style={{
                      width: `${users.length > 0 ? (item.value / users.length) * 100 : 0}%`,
                      height: 10,
                      borderRadius: 999,
                      backgroundColor: item.color,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
          <View style={[panel(palette), { flex: 1, minWidth: 320 }]}>
            <Text style={title(palette)}>Insights</Text>
            {insights.map((insight) => (
              <View key={insight} style={insightRow(palette)}>
                <FontAwesome6 name="circle-info" size={13} color={palette.cyan} />
                <Text style={{ color: palette.text, flex: 1 }}>{insight}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {tab === "export" && (
        <View style={panel(palette)}>
          <Text style={title(palette)}>Export Report</Text>
          <Text style={{ color: palette.textMuted, marginTop: 6 }}>
            Includes report summary, generated timestamp, billing status, usage, revenue, and client status.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
            <ExportButton label="Export CSV" icon="file-csv" onPress={() => handleExport("csv")} />
            <ExportButton label="Export JSON" icon="file-code" onPress={() => handleExport("json")} />
            <ExportButton label="Copy Summary" icon="copy" onPress={() => handleExport("copy")} />
            <ExportButton label="Print" icon="print" onPress={() => handleExport("print")} />
          </View>
          {notice ? <Text style={{ color: palette.cyan, marginTop: 12, fontWeight: "800" }}>{notice}</Text> : null}
        </View>
      )}
    </AdminShell>
  );
}

function Metric({
  label,
  value,
  delta,
  tone = "default",
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: "default" | "warning";
}) {
  const palette = useThemePalette();

  return (
    <View style={metricCard(palette)}>
      <Text style={{ color: palette.textMuted }}>{label}</Text>
      <Text style={{ color: tone === "warning" ? palette.warning : palette.text, fontSize: 23, fontWeight: "900", marginTop: 6 }}>
        {value}
      </Text>
      {delta ? <Text style={{ color: delta.startsWith("+") ? palette.success : palette.warning, marginTop: 4 }}>{delta} vs last period</Text> : null}
    </View>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const palette = useThemePalette();

  return (
    <View style={segmented(palette)}>
      {options.map((item) => {
        const active = value === item.value;
        return (
          <Pressable key={item.value} onPress={() => onChange(item.value)} style={segmentButton(palette, active)}>
            <Text style={segmentText(palette, active)}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TrendBars({
  data,
  color,
  formatter,
}: {
  data: number[];
  color: string;
  formatter: (value: number) => string;
}) {
  const palette = useThemePalette();
  const max = Math.max(1, ...data);

  return (
    <View style={{ marginTop: 14 }}>
      <View style={{ height: 170, flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
        {data.map((value, index) => (
          <View key={`${value}-${index}`} style={{ flex: 1, alignItems: "center", gap: 7 }}>
            <View
              style={{
                width: "100%",
                maxWidth: 34,
                height: Math.max((value / max) * 145, 8),
                borderRadius: 7,
                backgroundColor: color,
              }}
            />
            <Text style={{ color: palette.textMuted, fontSize: 10 }}>P{index + 1}</Text>
          </View>
        ))}
      </View>
      <Text style={{ color: palette.text, fontWeight: "900", marginTop: 8 }}>
        Latest: {formatter(data[data.length - 1] || 0)}
      </Text>
    </View>
  );
}

function PreviewLine({ label, value }: { label: string; value: string }) {
  const palette = useThemePalette();
  return (
    <View style={previewLine(palette)}>
      <Text style={{ color: palette.textMuted }}>{label}</Text>
      <Text style={{ color: palette.text, fontWeight: "900" }}>{value}</Text>
    </View>
  );
}

function ExportButton({ label, icon, onPress }: { label: string; icon: React.ComponentProps<typeof FontAwesome6>["name"]; onPress: () => void }) {
  const palette = useThemePalette();
  return (
    <Pressable onPress={onPress} style={exportButton(palette)}>
      <FontAwesome6 name={icon} size={13} color="#1b1e2f" />
      <Text style={{ color: "#1b1e2f", fontWeight: "900" }}>{label}</Text>
    </Pressable>
  );
}

function buildTrend(current: number, delta: number) {
  const start = current / (1 + delta);
  return Array.from({ length: 6 }, (_, index) => {
    const progress = index / 5;
    return start + (current - start) * progress;
  });
}

function buildReportSummary(report: {
  periodLabel: string;
  totalRevenue: number;
  totalConsumption: number;
  collectionRate: number;
  outstanding: number;
  generatedAt: Date;
}, insights: string[]) {
  return [
    `ElectriPay ${report.periodLabel} Report`,
    `Generated: ${formatDateTime(report.generatedAt)}`,
    `Total revenue: ${formatCurrency(report.totalRevenue)}`,
    `Total consumption: ${report.totalConsumption.toFixed(1)} kWh`,
    `Collection rate: ${report.collectionRate.toFixed(0)}%`,
    `Outstanding: ${formatCurrency(report.outstanding)}`,
    "",
    "Insights:",
    ...insights.map((item) => `- ${item}`),
  ].join("\n");
}

function toCsv(rows: Record<string, string | number>[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => JSON.stringify(row[header] ?? "")).join(","));
  }
  return lines.join("\n");
}

function downloadFile(filename: string, content: string, type: string) {
  if (typeof document === "undefined") return;
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatCurrency(value: number) {
  return `PHP ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatDateTime(value: Date) {
  return value.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const toolbar = (palette: ReturnType<typeof useThemePalette>) => ({
  borderWidth: 1,
  borderColor: palette.cardBorder,
  borderRadius: 14,
  backgroundColor: palette.panel,
  padding: 14,
  flexDirection: "row" as const,
  justifyContent: "space-between" as const,
  flexWrap: "wrap" as const,
  gap: 10,
});

const panel = (palette: ReturnType<typeof useThemePalette>) => ({
  borderWidth: 1,
  borderColor: palette.cardBorder,
  borderRadius: 14,
  backgroundColor: palette.panel,
  padding: 14,
});

const metricCard = (palette: ReturnType<typeof useThemePalette>) => ({
  minWidth: 210,
  flex: 1,
  borderWidth: 1,
  borderColor: palette.cardBorder,
  borderRadius: 14,
  backgroundColor: palette.panel,
  padding: 14,
});

const title = (palette: ReturnType<typeof useThemePalette>) => ({
  color: palette.text,
  fontSize: 18,
  fontWeight: "900" as const,
});

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

const segmentButton = (palette: ReturnType<typeof useThemePalette>, active: boolean) => ({
  borderRadius: 8,
  paddingHorizontal: 10,
  paddingVertical: 7,
  backgroundColor: active ? palette.accentSoft : "transparent",
});

const segmentText = (palette: ReturnType<typeof useThemePalette>, active: boolean) => ({
  color: active ? palette.accent : palette.textMuted,
  fontSize: 12,
  fontWeight: "800" as const,
});

const rankRow = (palette: ReturnType<typeof useThemePalette>) => ({
  marginTop: 10,
  borderWidth: 1,
  borderColor: palette.rowBorder,
  borderRadius: 10,
  padding: 10,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  flexWrap: "wrap" as const,
  gap: 10,
});

const rankNumber = (palette: ReturnType<typeof useThemePalette>) => ({
  width: 28,
  height: 28,
  borderRadius: 14,
  backgroundColor: palette.accentSoft,
  color: palette.accent,
  fontWeight: "900" as const,
  textAlign: "center" as const,
  lineHeight: 28,
});

const barTrack = {
  height: 10,
  borderRadius: 999,
  backgroundColor: "rgba(157,178,223,0.16)",
  marginTop: 8,
  overflow: "hidden" as const,
};

const previewLine = (palette: ReturnType<typeof useThemePalette>) => ({
  marginTop: 10,
  borderWidth: 1,
  borderColor: palette.rowBorder,
  backgroundColor: palette.panelSoft,
  borderRadius: 10,
  padding: 10,
  flexDirection: "row" as const,
  justifyContent: "space-between" as const,
  gap: 10,
});

const insightRow = (palette: ReturnType<typeof useThemePalette>) => ({
  marginTop: 10,
  borderWidth: 1,
  borderColor: palette.rowBorder,
  backgroundColor: palette.panelSoft,
  borderRadius: 10,
  padding: 10,
  flexDirection: "row" as const,
  gap: 8,
});

const exportButton = (palette: ReturnType<typeof useThemePalette>) => ({
  borderRadius: 10,
  backgroundColor: palette.accent,
  paddingHorizontal: 14,
  paddingVertical: 10,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 8,
});
