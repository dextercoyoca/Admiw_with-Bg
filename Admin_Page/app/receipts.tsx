import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { AdminShell } from "@/components/AdminShell";
import { palette } from "@/lib/theme";
import { useReceipts } from "@/lib/useReceipts";

export default function ReceiptsPage() {
  const { receipts, loading, error, updateStatus } = useReceipts();
  const [query, setQuery] = useState("");

  const rows = useMemo(
    () =>
      receipts.filter((receipt) =>
        `${receipt.userName} ${receipt.userEmail} ${receipt.status}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [receipts, query]
  );

  const grouped = useMemo(() => {
    return {
      pending: rows.filter((item) => item.status === "Pending Verification"),
      approved: rows.filter((item) => item.status === "Approved"),
      rejected: rows.filter((item) => item.status === "Rejected"),
    };
  }, [rows]);

  return (
    <AdminShell
      title="Receipts"
      subtitle="Review receipt submissions and verify if clients already paid"
    >
      <View style={panel}>
        <TextInput
          placeholder="Search receipts"
          placeholderTextColor="#7f95c5"
          value={query}
          onChangeText={setQuery}
          style={input}
        />

        {loading ? (
          <View style={{ paddingVertical: 16 }}>
            <ActivityIndicator color={palette.cyan} />
          </View>
        ) : null}

        {error ? <Text style={{ color: palette.danger, marginTop: 10 }}>{error}</Text> : null}

        <SectionTitle title="Pending Verification" count={grouped.pending.length} />
        {grouped.pending.map((receipt) => (
          <ReceiptRow key={receipt.id} receipt={receipt} updateStatus={updateStatus} />
        ))}

        <SectionTitle title="Approved" count={grouped.approved.length} />
        {grouped.approved.map((receipt) => (
          <ReceiptRow key={receipt.id} receipt={receipt} updateStatus={updateStatus} />
        ))}

        <SectionTitle title="Rejected" count={grouped.rejected.length} />
        {grouped.rejected.map((receipt) => (
          <ReceiptRow key={receipt.id} receipt={receipt} updateStatus={updateStatus} />
        ))}

        {!loading && rows.length === 0 ? (
          <Text style={{ color: palette.textMuted, marginTop: 10 }}>No receipt submissions found.</Text>
        ) : null}
      </View>
    </AdminShell>
  );
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <Text style={{ color: palette.text, fontWeight: "800", marginTop: 12 }}>
      {title} ({count})
    </Text>
  );
}

function ReceiptRow({
  receipt,
  updateStatus,
}: {
  receipt: {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    amount: number;
    submittedAt: string;
    status: "Pending Verification" | "Approved" | "Rejected";
    receiptUri: string;
  };
  updateStatus: (receiptId: string, userId: string, status: "Approved" | "Rejected") => Promise<void>;
}) {
  return (
    <View style={row}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: palette.text, fontWeight: "800" }}>{receipt.userName}</Text>
        <Text style={{ color: palette.textMuted }}>{receipt.userEmail}</Text>
        <Text style={{ color: palette.textMuted }}>Submitted: {receipt.submittedAt}</Text>
        <Text style={{ color: palette.textMuted }}>Amount: PHP {receipt.amount.toLocaleString()}</Text>
        {receipt.receiptUri ? (
          <Text style={{ color: palette.cyan }}>Receipt: {receipt.receiptUri}</Text>
        ) : (
          <Text style={{ color: palette.warning }}>No receipt URL attached</Text>
        )}
      </View>
      <View style={{ alignItems: "flex-end", gap: 8 }}>
        <View
          style={{
            borderRadius: 20,
            borderWidth: 1,
            borderColor:
              receipt.status === "Approved"
                ? palette.success
                : receipt.status === "Rejected"
                ? palette.danger
                : palette.warning,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          <Text style={{ color: palette.text }}>{receipt.status}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={() => updateStatus(receipt.id, receipt.userId, "Approved")}
            style={approveBtn}
          >
            <Text style={{ color: "#dcfce7", fontWeight: "700" }}>Approve</Text>
          </Pressable>
          <Pressable
            onPress={() => updateStatus(receipt.id, receipt.userId, "Rejected")}
            style={rejectBtn}
          >
            <Text style={{ color: "#fecaca", fontWeight: "700" }}>Reject</Text>
          </Pressable>
        </View>
      </View>
    </View>
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
  alignItems: "flex-start" as const,
  gap: 12,
};

const approveBtn = {
  borderWidth: 1,
  borderColor: "rgba(34,197,94,0.6)",
  backgroundColor: "rgba(34,197,94,0.16)",
  borderRadius: 8,
  paddingHorizontal: 10,
  paddingVertical: 7,
};

const rejectBtn = {
  borderWidth: 1,
  borderColor: "rgba(239,68,68,0.5)",
  backgroundColor: "rgba(239,68,68,0.16)",
  borderRadius: 8,
  paddingHorizontal: 10,
  paddingVertical: 7,
};
