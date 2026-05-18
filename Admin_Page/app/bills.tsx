import { AdminShell } from "@/components/AdminShell";
import { createAdminNotification, type AdminUserRecord } from "@/lib/adminApi";
import { useThemePalette } from "@/lib/theme";
import { useAdminUsers } from "@/lib/useAdminUsers";
import { useReceipts } from "@/lib/useReceipts";
import { FontAwesome6 } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

type BillingFilter = "All" | "Paid" | "Unpaid" | "Overdue" | "Due Soon" | "Pending Verification";
type SortKey = "priority" | "amount" | "dueDate" | "name";
type BillStatus = "Paid" | "Unpaid" | "Overdue" | "Due Soon" | "Pending Verification";

type BillingRow = AdminUserRecord & {
  dueDate: Date;
  daysFromDue: number;
  billStatus: BillStatus;
  latestReceipt?: {
    id: string;
    status: "Pending Verification" | "Approved" | "Rejected";
    submittedAt: string;
  };
};

const filters: BillingFilter[] = [
  "All",
  "Paid",
  "Unpaid",
  "Overdue",
  "Due Soon",
  "Pending Verification",
];

const sortOptions: { label: string; value: SortKey }[] = [
  { label: "Priority", value: "priority" },
  { label: "Highest Due", value: "amount" },
  { label: "Soonest Due", value: "dueDate" },
  { label: "Name", value: "name" },
];

export default function BillsPage() {
  const palette = useThemePalette();
  const { users, updateUser } = useAdminUsers();
  const { receipts } = useReceipts();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<BillingFilter>("All");
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const receiptByUser = useMemo(() => {
    const map = new Map<string, BillingRow["latestReceipt"]>();
    receipts.forEach((receipt) => {
      const current = map.get(receipt.userId);
      if (
        !current ||
        new Date(receipt.submittedAt).getTime() >
          new Date(current.submittedAt).getTime()
      ) {
        map.set(receipt.userId, {
          id: receipt.id,
          status: receipt.status,
          submittedAt: receipt.submittedAt,
        });
      }
    });
    return map;
  }, [receipts]);

  const billingRows = useMemo(() => {
    return users.map((user) => {
      const dueDate = deriveDueDate(user.dueDate, user.updatedAt);
      const daysFromDue = getDaysFromDue(dueDate);
      const latestReceipt = receiptByUser.get(user._id);
      const billStatus = getBillStatus(user, daysFromDue, latestReceipt?.status);

      return {
        ...user,
        dueDate,
        daysFromDue,
        billStatus,
        latestReceipt,
      };
    });
  }, [receiptByUser, users]);

  const stats = useMemo(() => {
    const totalBilled = billingRows.reduce((sum, row) => sum + row.amountDue, 0);
    const totalCollected = billingRows.reduce(
      (sum, row) => sum + row.revenueCollected,
      0,
    );
    const outstanding = billingRows
      .filter((row) => row.billStatus !== "Paid")
      .reduce((sum, row) => sum + row.amountDue, 0);

    return {
      totalBilled,
      totalCollected,
      outstanding,
      paid: billingRows.filter((row) => row.billStatus === "Paid").length,
      unpaid: billingRows.filter((row) => row.billStatus === "Unpaid").length,
      overdue: billingRows.filter((row) => row.billStatus === "Overdue").length,
      pending: billingRows.filter((row) => row.billStatus === "Pending Verification").length,
    };
  }, [billingRows]);

  const rows = useMemo(() => {
    return billingRows
      .filter((row) => {
        const matchesQuery = `${row.name} ${row.email} ${row.plan} ${row.billStatus}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesFilter = filter === "All" || row.billStatus === filter;
        return matchesQuery && matchesFilter;
      })
      .sort((a, b) => sortBillingRows(a, b, sortKey));
  }, [billingRows, filter, query, sortKey]);

  const selectedUser =
    billingRows.find((row) => row._id === selectedUserId) || rows[0];

  const selectedRows = billingRows.filter((row) => selectedIds.includes(row._id));

  const toggleSelected = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const sendReminder = async (targets: BillingRow[]) => {
    if (targets.length === 0) return;

    await createAdminNotification({
      title: "Billing Reminder",
      message: `${targets.length} billing reminder${targets.length > 1 ? "s" : ""} prepared for unpaid accounts.`,
      audience: "all",
    });
    setNotice(`Reminder queued for ${targets.length} account${targets.length > 1 ? "s" : ""}.`);
  };

  const exportBillingList = () => {
    const exportRows = selectedRows.length > 0 ? selectedRows : rows;
    const csv = [
      "Client,Email,Plan,Usage kWh,Amount Due,Due Date,Status",
      ...exportRows.map((row) =>
        [
          row.name,
          row.email,
          row.plan,
          row.usageKwh.toFixed(1),
          row.amountDue.toFixed(2),
          formatDate(row.dueDate),
          row.billStatus,
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");

    if (typeof window !== "undefined" && "Blob" in window) {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "electripay-billing.csv";
      link.click();
      URL.revokeObjectURL(url);
    }

    setNotice(`Exported ${exportRows.length} billing row${exportRows.length > 1 ? "s" : ""}.`);
  };

  const generateStatement = (row: BillingRow) => {
    setSelectedUserId(row._id);
    setNotice(`Statement ready for ${row.name}: ${formatCurrency(row.amountDue)} due ${formatDate(row.dueDate)}.`);
  };

  const markPaid = async (row: BillingRow) => {
    await updateUser(row._id, { paymentStatus: "Paid" });
    setNotice(`${row.name} was marked as paid.`);
  };

  return (
    <AdminShell
      title="Billing Management"
      subtitle="Paid/Unpaid is automatically based on receipt approval status"
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <Metric label="Total Billed" value={formatCurrency(stats.totalBilled)} />
        <Metric label="Collected" value={formatCurrency(stats.totalCollected)} />
        <Metric label="Outstanding" value={formatCurrency(stats.outstanding)} tone="warning" />
        <Metric label="Overdue" value={String(stats.overdue)} tone="danger" />
      </View>

      <View style={panel(palette)}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <TextInput
            placeholder="Search users"
            placeholderTextColor="#7f95c5"
            value={query}
            onChangeText={setQuery}
            style={[input(palette), { flex: 1, minWidth: 220 }]}
          />
          <View style={segmented(palette)}>
            {sortOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setSortKey(option.value)}
                style={segmentButton(palette, sortKey === option.value)}
              >
                <Text style={segmentText(palette, sortKey === option.value)}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {filters.map((item) => (
            <Pressable
              key={item}
              onPress={() => setFilter(item)}
              style={filterPill(palette, filter === item)}
            >
              <Text style={filterText(palette, filter === item)}>
                {item} {getFilterCount(item, billingRows)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={bulkBar(palette)}>
          <Text style={{ color: palette.textMuted }}>
            {selectedIds.length} selected
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <ActionButton
              label="Send Reminder"
              icon="bell"
              onPress={() => sendReminder(selectedRows)}
              disabled={selectedRows.length === 0}
            />
            <ActionButton label="Export" icon="file-export" onPress={exportBillingList} />
            <ActionButton
              label="Generate"
              icon="file-invoice"
              onPress={() => selectedRows[0] && generateStatement(selectedRows[0])}
              disabled={selectedRows.length === 0}
            />
          </View>
        </View>

        {notice ? (
          <Text style={{ color: palette.cyan, marginTop: 10, fontWeight: "800" }}>
            {notice}
          </Text>
        ) : null}

        <View style={tableHeader(palette)}>
          <Text style={[headerCell(palette), { flex: 1.6 }]}>Client</Text>
          <Text style={[headerCell(palette), { flex: 0.9 }]}>Plan</Text>
          <Text style={[headerCell(palette), { flex: 0.8 }]}>Usage</Text>
          <Text style={[headerCell(palette), { flex: 0.9 }]}>Amount</Text>
          <Text style={[headerCell(palette), { flex: 0.9 }]}>Due</Text>
          <Text style={[headerCell(palette), { flex: 1 }]}>Status</Text>
          <Text style={[headerCell(palette), { width: 210 }]}>Actions</Text>
        </View>

        {rows.map((row) => (
          <Pressable
            key={row._id}
            onPress={() => setSelectedUserId(row._id)}
            style={[
              tableRow(palette),
              selectedUser?._id === row._id && {
                borderColor: palette.accent,
                backgroundColor: palette.accentSoft,
              },
            ]}
          >
            <View style={{ width: 26 }}>
              <Pressable
                onPress={() => toggleSelected(row._id)}
                style={checkbox(palette, selectedIds.includes(row._id))}
              >
                {selectedIds.includes(row._id) ? (
                  <FontAwesome6 name="check" size={11} color={palette.text} />
                ) : null}
              </Pressable>
            </View>
            <View style={{ flex: 1.6, minWidth: 190 }}>
              <Text style={{ color: palette.text, fontWeight: "900" }}>{row.name}</Text>
              <Text style={{ color: palette.textMuted }}>{row.email}</Text>
            </View>
            <Text style={[cell(palette), { flex: 0.9 }]}>{row.plan}</Text>
            <Text style={[cell(palette), { flex: 0.8 }]}>{row.usageKwh.toFixed(1)} kWh</Text>
            <Text style={[cell(palette), { flex: 0.9, fontWeight: "900" }]}>
              {formatCurrency(row.amountDue)}
            </Text>
            <View style={{ flex: 0.9, minWidth: 110 }}>
              <Text style={{ color: palette.text }}>{formatDate(row.dueDate)}</Text>
              <Text style={{ color: dueTone(row, palette), fontSize: 12, fontWeight: "800" }}>
                {formatDueDistance(row)}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 150 }}>
              <StatusBadge status={row.billStatus} />
              <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 4 }}>
                {receiptLabel(row)}
              </Text>
            </View>
            <View style={{ width: 210, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              <IconAction icon="eye" label="View bill" onPress={() => setSelectedUserId(row._id)} />
              <IconAction icon="receipt" label="Receipt" onPress={() => router.push("/receipts")} />
              <IconAction icon="bell" label="Remind" onPress={() => sendReminder([row])} />
              <IconAction icon="file-invoice" label="Invoice" onPress={() => generateStatement(row)} />
              {row.billStatus !== "Paid" ? (
                <IconAction icon="check" label="Paid" onPress={() => markPaid(row)} />
              ) : null}
            </View>
          </Pressable>
        ))}

        {rows.length === 0 ? (
          <Text style={{ color: palette.textMuted, marginTop: 12 }}>
            No billing records match the current filters.
          </Text>
        ) : null}
      </View>

      {selectedUser ? (
        <View style={panel(palette)}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <View>
              <Text style={sectionTitle(palette)}>{selectedUser.name}</Text>
              <Text style={{ color: palette.textMuted }}>{selectedUser.email}</Text>
            </View>
            <StatusBadge status={selectedUser.billStatus} />
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
            <Detail label="Amount Due" value={formatCurrency(selectedUser.amountDue)} />
            <Detail label="Usage" value={`${selectedUser.usageKwh.toFixed(1)} kWh`} />
            <Detail label="Plan" value={selectedUser.plan} />
            <Detail label="Due Date" value={formatDate(selectedUser.dueDate)} />
          </View>

          <Text style={[sectionTitle(palette), { marginTop: 16 }]}>Payment Timeline</Text>
          <TimelineItem label="Bill generated" value={formatDate(addDays(selectedUser.dueDate, -30))} done />
          <TimelineItem
            label={selectedUser.latestReceipt ? "Receipt uploaded" : "No receipt submitted"}
            value={selectedUser.latestReceipt ? formatDate(new Date(selectedUser.latestReceipt.submittedAt)) : "Waiting"}
            done={Boolean(selectedUser.latestReceipt)}
          />
          <TimelineItem
            label="Receipt review"
            value={selectedUser.latestReceipt?.status || "Not started"}
            done={selectedUser.latestReceipt?.status === "Approved"}
          />
          <TimelineItem
            label="Paid"
            value={selectedUser.paymentStatus}
            done={selectedUser.paymentStatus === "Paid"}
          />
        </View>
      ) : null}
    </AdminShell>
  );
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning" | "danger";
}) {
  const palette = useThemePalette();
  const color =
    tone === "danger" ? palette.danger : tone === "warning" ? palette.warning : palette.text;

  return (
    <View style={metricCard(palette)}>
      <Text style={{ color: palette.textMuted }}>{label}</Text>
      <Text style={{ color, fontSize: 24, fontWeight: "900", marginTop: 6 }}>
        {value}
      </Text>
    </View>
  );
}

function StatusBadge({ status }: { status: BillStatus }) {
  const palette = useThemePalette();
  const color = statusColor(status, palette);

  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderWidth: 1,
        borderColor: color,
        backgroundColor: `${color}25`,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
      <Text style={{ color: palette.text, fontWeight: "900", fontSize: 12 }}>
        {status}
      </Text>
    </View>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: React.ComponentProps<typeof FontAwesome6>["name"];
  onPress: () => void;
  disabled?: boolean;
}) {
  const palette = useThemePalette();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[smallButton(palette), disabled && { opacity: 0.45 }]}
    >
      <FontAwesome6 name={icon} size={12} color={palette.cyan} />
      <Text style={{ color: palette.cyan, fontWeight: "800", fontSize: 12 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function IconAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof FontAwesome6>["name"];
  label: string;
  onPress: () => void;
}) {
  const palette = useThemePalette();

  return (
    <Pressable onPress={onPress} style={iconButton(palette)} accessibilityLabel={label}>
      <FontAwesome6 name={icon} size={12} color={palette.cyan} />
    </Pressable>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  const palette = useThemePalette();

  return (
    <View style={detailBox(palette)}>
      <Text style={{ color: palette.textMuted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: palette.text, fontWeight: "900", marginTop: 4 }}>
        {value}
      </Text>
    </View>
  );
}

function TimelineItem({
  label,
  value,
  done,
}: {
  label: string;
  value: string;
  done?: boolean;
}) {
  const palette = useThemePalette();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 }}>
      <View
        style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: done ? palette.success : "rgba(157,178,223,0.35)",
        }}
      />
      <Text style={{ color: palette.text, flex: 1 }}>{label}</Text>
      <Text style={{ color: palette.textMuted }}>{value}</Text>
    </View>
  );
}

function getBillStatus(
  user: AdminUserRecord,
  daysFromDue: number,
  receiptStatus?: "Pending Verification" | "Approved" | "Rejected",
): BillStatus {
  if (receiptStatus === "Pending Verification") return "Pending Verification";
  if (user.paymentStatus === "Paid" || receiptStatus === "Approved") return "Paid";
  if (daysFromDue < 0) return "Overdue";
  if (daysFromDue <= 5) return "Due Soon";
  return "Unpaid";
}

function deriveDueDate(dueDate: string | undefined, updatedAt: string) {
  const explicitDate = new Date(dueDate || "");
  if (!Number.isNaN(explicitDate.getTime())) {
    return explicitDate;
  }

  const base = new Date(updatedAt);
  if (Number.isNaN(base.getTime())) {
    return addDays(new Date(), 15);
  }

  return addDays(base, 30);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getDaysFromDue(dueDate: Date) {
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startDue = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  return Math.ceil((startDue.getTime() - startToday.getTime()) / 86_400_000);
}

function sortBillingRows(a: BillingRow, b: BillingRow, sortKey: SortKey) {
  if (sortKey === "amount") return b.amountDue - a.amountDue;
  if (sortKey === "dueDate") return a.dueDate.getTime() - b.dueDate.getTime();
  if (sortKey === "name") return a.name.localeCompare(b.name);

  return statusRank(a.billStatus) - statusRank(b.billStatus) || b.amountDue - a.amountDue;
}

function statusRank(status: BillStatus) {
  return {
    Overdue: 0,
    "Pending Verification": 1,
    "Due Soon": 2,
    Unpaid: 3,
    Paid: 4,
  }[status];
}

function getFilterCount(filter: BillingFilter, rows: BillingRow[]) {
  if (filter === "All") return rows.length;
  return rows.filter((row) => row.billStatus === filter).length;
}

function formatCurrency(value: number) {
  return `PHP ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDueDistance(row: BillingRow) {
  if (row.billStatus === "Paid") return "Settled";
  if (row.daysFromDue < 0) return `${Math.abs(row.daysFromDue)} days overdue`;
  if (row.daysFromDue === 0) return "Due today";
  return `${row.daysFromDue} days left`;
}

function receiptLabel(row: BillingRow) {
  if (!row.latestReceipt) return "No receipt";
  if (row.latestReceipt.status === "Pending Verification") return "Receipt pending";
  return `Receipt ${row.latestReceipt.status.toLowerCase()}`;
}

function statusColor(status: BillStatus, palette: ReturnType<typeof useThemePalette>) {
  if (status === "Paid") return palette.success;
  if (status === "Overdue") return palette.danger;
  if (status === "Pending Verification") return palette.cyan;
  if (status === "Due Soon") return palette.warning;
  return palette.textMuted;
}

function dueTone(row: BillingRow, palette: ReturnType<typeof useThemePalette>) {
  if (row.billStatus === "Overdue") return palette.danger;
  if (row.billStatus === "Due Soon") return palette.warning;
  return palette.textMuted;
}

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

const input = (palette: ReturnType<typeof useThemePalette>) => ({
  borderWidth: 1,
  borderColor: palette.inputBorder,
  borderRadius: 10,
  backgroundColor: palette.panelSoft,
  color: palette.text,
  paddingHorizontal: 12,
  paddingVertical: 10,
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

const segmentButton = (
  palette: ReturnType<typeof useThemePalette>,
  active: boolean,
) => ({
  borderRadius: 8,
  paddingHorizontal: 10,
  paddingVertical: 7,
  backgroundColor: active ? palette.accentSoft : "transparent",
});

const segmentText = (
  palette: ReturnType<typeof useThemePalette>,
  active: boolean,
) => ({
  color: active ? palette.accent : palette.textMuted,
  fontSize: 12,
  fontWeight: "800" as const,
});

const filterPill = (
  palette: ReturnType<typeof useThemePalette>,
  active: boolean,
) => ({
  borderWidth: 1,
  borderColor: active ? palette.accent : palette.inputBorder,
  backgroundColor: active ? palette.accentSoft : palette.panelSoft,
  borderRadius: 999,
  paddingHorizontal: 12,
  paddingVertical: 8,
});

const filterText = (
  palette: ReturnType<typeof useThemePalette>,
  active: boolean,
) => ({
  color: active ? palette.accent : palette.textMuted,
  fontWeight: "800" as const,
  fontSize: 12,
});

const bulkBar = (palette: ReturnType<typeof useThemePalette>) => ({
  marginTop: 12,
  borderWidth: 1,
  borderColor: palette.rowBorder,
  borderRadius: 10,
  padding: 10,
  flexDirection: "row" as const,
  justifyContent: "space-between" as const,
  alignItems: "center" as const,
  flexWrap: "wrap" as const,
  gap: 8,
});

const tableHeader = (palette: ReturnType<typeof useThemePalette>) => ({
  marginTop: 14,
  borderWidth: 1,
  borderColor: palette.rowBorder,
  backgroundColor: palette.accentSoft,
  borderRadius: 10,
  padding: 10,
  paddingLeft: 46,
  flexDirection: "row" as const,
  gap: 10,
});

const tableRow = (palette: ReturnType<typeof useThemePalette>) => ({
  marginTop: 8,
  borderWidth: 1,
  borderColor: palette.rowBorder,
  borderRadius: 10,
  padding: 10,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  flexWrap: "wrap" as const,
  gap: 10,
});

const headerCell = (palette: ReturnType<typeof useThemePalette>) => ({
  color: palette.accent,
  fontSize: 12,
  fontWeight: "900" as const,
  textTransform: "uppercase" as const,
});

const cell = (palette: ReturnType<typeof useThemePalette>) => ({
  color: palette.text,
  minWidth: 90,
});

const checkbox = (
  palette: ReturnType<typeof useThemePalette>,
  checked: boolean,
) => ({
  width: 18,
  height: 18,
  borderRadius: 4,
  borderWidth: 1,
  borderColor: checked ? palette.accent : palette.inputBorder,
  backgroundColor: checked ? palette.accentSoft : "transparent",
  alignItems: "center" as const,
  justifyContent: "center" as const,
});

const smallButton = (palette: ReturnType<typeof useThemePalette>) => ({
  borderWidth: 1,
  borderColor: palette.inputBorder,
  backgroundColor: palette.panelSoft,
  borderRadius: 8,
  paddingHorizontal: 10,
  paddingVertical: 8,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 6,
});

const iconButton = (palette: ReturnType<typeof useThemePalette>) => ({
  width: 30,
  height: 30,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: palette.inputBorder,
  backgroundColor: palette.panelSoft,
  alignItems: "center" as const,
  justifyContent: "center" as const,
});

const detailBox = (palette: ReturnType<typeof useThemePalette>) => ({
  minWidth: 160,
  flex: 1,
  borderWidth: 1,
  borderColor: palette.rowBorder,
  borderRadius: 10,
  padding: 10,
  backgroundColor: palette.panelSoft,
});

const sectionTitle = (palette: ReturnType<typeof useThemePalette>) => ({
  color: palette.text,
  fontWeight: "900" as const,
  fontSize: 16,
});
