import { AdminShell } from "@/components/AdminShell";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { useThemePalette } from "@/lib/theme";
import { useAdminUsers } from "@/lib/useAdminUsers";
import { useReceipts } from "@/lib/useReceipts";
import type { ReceiptRecord } from "@/lib/receiptsApi";
import { FontAwesome6 } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

type ReceiptFilter = "All" | "Pending Verification" | "Approved" | "Rejected";
type SortKey = "pending" | "newest" | "oldest" | "amount";
type ReceiptAction = "Approved" | "Rejected" | "Revoke" | "Delete";

const filters: ReceiptFilter[] = ["All", "Pending Verification", "Approved", "Rejected"];
const sortOptions: { label: string; value: SortKey }[] = [
  { label: "Pending First", value: "pending" },
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Highest Amount", value: "amount" },
];
const rejectNotes = ["Amount mismatch", "Unreadable receipt", "Duplicate upload"];

export default function ReceiptsPage() {
  const palette = useThemePalette();
  const { receipts, loading, error, updateStatus, deleteReceipt, deleteReceipts } = useReceipts();
  const { users } = useAdminUsers();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ReceiptFilter>("All");
  const [sortKey, setSortKey] = useState<SortKey>("pending");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [previewReceipt, setPreviewReceipt] = useState<ReceiptRecord | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [confirm, setConfirm] = useState<{
    visible: boolean;
    action?: ReceiptAction;
    receipt?: ReceiptRecord;
    bulk?: boolean;
  }>({ visible: false });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStartedAt, setProcessingStartedAt] = useState<number | null>(null);
  const [processingSeconds, setProcessingSeconds] = useState(0);
  const [deleteProgress, setDeleteProgress] = useState({ deleted: 0, total: 0 });
  const [notice, setNotice] = useState("");
  const [completionPrompt, setCompletionPrompt] = useState<{
    visible: boolean;
    title: string;
    message: string;
    tone: "success" | "danger";
  }>({
    visible: false,
    title: "",
    message: "",
    tone: "success",
  });

  useEffect(() => {
    if (!isProcessing || !processingStartedAt) {
      return;
    }

    const intervalId = setInterval(() => {
      setProcessingSeconds(Math.floor((Date.now() - processingStartedAt) / 1000));
    }, 250);

    return () => clearInterval(intervalId);
  }, [isProcessing, processingStartedAt]);

  const userById = useMemo(() => {
    const map = new Map(users.map((user) => [user._id, user]));
    return map;
  }, [users]);

  const rows = useMemo(() => {
    return receipts
      .filter((receipt) => {
        const matchesQuery = `${receipt.userName} ${receipt.userEmail} ${receipt.status}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesFilter = filter === "All" || receipt.status === filter;
        return matchesQuery && matchesFilter;
      })
      .sort((a, b) => sortReceipts(a, b, sortKey));
  }, [filter, query, receipts, sortKey]);

  const stats = useMemo(
    () => ({
      pending: receipts.filter((receipt) => receipt.status === "Pending Verification").length,
      approved: receipts.filter((receipt) => receipt.status === "Approved").length,
      rejected: receipts.filter((receipt) => receipt.status === "Rejected").length,
      totalAmount: receipts.reduce((sum, receipt) => sum + receipt.amount, 0),
    }),
    [receipts],
  );

  const selectedReceipt =
    receipts.find((receipt) => receipt.id === selectedReceiptId) || rows[0];
  const selectedUser = selectedReceipt ? userById.get(selectedReceipt.userId) : undefined;
  const selectedRows = receipts.filter((receipt) => selectedIds.includes(receipt.id));
  const visibleReceiptIds = Array.from(new Set(rows.map((receipt) => receipt.id)));
  const selectedVisibleCount = visibleReceiptIds.filter((id) => selectedIds.includes(id)).length;
  const allVisibleSelected = visibleReceiptIds.length > 0 && selectedVisibleCount === visibleReceiptIds.length;

  const toggleSelected = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleReceiptIds.includes(id));
      }

      return Array.from(new Set([...current, ...visibleReceiptIds]));
    });
  };

  const requestAction = (
    action: ReceiptAction,
    receipt?: ReceiptRecord,
    bulk = false,
  ) => {
    setConfirm({ visible: true, action, receipt, bulk });
  };

  const handleConfirmAction = async () => {
    if (!confirm.action) return;

    const targets = confirm.bulk ? selectedRows : confirm.receipt ? [confirm.receipt] : [];
    if (targets.length === 0) return;

    const startedAt = Date.now();
    setIsProcessing(true);
    setProcessingStartedAt(startedAt);
    setProcessingSeconds(0);
    setDeleteProgress({
      deleted: 0,
      total: confirm.action === "Delete" ? targets.length : 0,
    });
    let deletedCount = 0;
    try {
      let completedCount = targets.length;
      if (confirm.action === "Delete" && confirm.bulk) {
        completedCount = await deleteReceipts(
          targets.map((receipt) => receipt.id),
          (deleted, total) => {
            deletedCount = deleted;
            setDeleteProgress({ deleted, total });
          },
        );
      } else {
        for (const receipt of targets) {
          if (confirm.action === "Delete") {
            await deleteReceipt(receipt.id);
            deletedCount = 1;
            setDeleteProgress({ deleted: 1, total: 1 });
          } else if (confirm.action === "Revoke") {
            await updateStatus(receipt.id, receipt.userId, "Pending Verification");
          } else {
            await updateStatus(receipt.id, receipt.userId, confirm.action);
          }
        }
      }

      const elapsed = formatDuration(Math.floor((Date.now() - startedAt) / 1000));
      const noun = confirm.action === "Delete" ? "receipt file" : "receipt record";
      const message =
        confirm.action === "Delete"
          ? `${completedCount} ${noun}${completedCount === 1 ? "" : "s"} deleted successfully. List updated.`
          : `${actionPastTense(confirm.action)} ${completedCount} ${noun}${completedCount === 1 ? "" : "s"} successfully in ${elapsed}. List updated.`;
      setNotice(message);
      setCompletionPrompt({
        visible: true,
        title: "Action Complete",
        message,
        tone: "success",
      });
      setSelectedIds([]);
      setConfirm({ visible: false });
    } catch (actionError) {
      const message =
        actionError instanceof Error
          ? actionError.message
          : "Unable to update selected receipts";
      setNotice(message);
      setCompletionPrompt({
        visible: true,
        title: "Action Failed",
        message:
          confirm.action === "Delete"
            ? `${message} ${deletedCount}/${targets.length} receipts were deleted.`
            : `${message} Time elapsed: ${formatDuration(Math.floor((Date.now() - startedAt) / 1000))}.`,
        tone: "danger",
      });
      setConfirm({ visible: false });
    } finally {
      setIsProcessing(false);
      setProcessingStartedAt(null);
      setDeleteProgress({ deleted: 0, total: 0 });
    }
  };

  const openPreview = (receipt: ReceiptRecord) => {
    setPreviewFailed(false);
    setPreviewReceipt(receipt);
  };

  return (
    <AdminShell
      title="Receipts"
      subtitle="Review receipt submissions and verify if clients already paid"
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <Metric label="Pending" value={String(stats.pending)} tone="warning" />
        <Metric label="Approved" value={String(stats.approved)} tone="success" />
        <Metric label="Rejected" value={String(stats.rejected)} tone="danger" />
        <Metric label="Submitted Amount" value={formatCurrency(stats.totalAmount)} />
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
        <View style={[panel(palette), { flex: 1.25, minWidth: 360 }]}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <TextInput
              placeholder="Search receipts"
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
                  {item === "Pending Verification" ? "Pending" : item} {filterCount(item, receipts)}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={bulkBar(palette)}>
            <Text style={{ color: palette.textMuted }}>
              {selectedIds.length} selected
              {visibleReceiptIds.length ? ` (${selectedVisibleCount}/${visibleReceiptIds.length} visible)` : ""}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <BulkButton
                label={allVisibleSelected ? "Clear" : "Select All"}
                icon={allVisibleSelected ? "minus" : "check-double"}
                disabled={!rows.length}
                onPress={toggleSelectAllVisible}
              />
              <BulkButton label="Approve" icon="check" disabled={!selectedIds.length} onPress={() => requestAction("Approved", undefined, true)} />
              <BulkButton label="Reject" icon="xmark" disabled={!selectedIds.length} onPress={() => requestAction("Rejected", undefined, true)} />
              <BulkButton label="Delete" icon="trash" disabled={!selectedIds.length} onPress={() => requestAction("Delete", undefined, true)} />
            </View>
          </View>

          {notice ? <Text style={{ color: palette.cyan, marginTop: 10, fontWeight: "800" }}>{notice}</Text> : null}
          {loading ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator color={palette.cyan} />
            </View>
          ) : null}
          {error ? <Text style={{ color: palette.danger, marginTop: 10 }}>{error}</Text> : null}

          {rows.map((receipt) => {
            const user = userById.get(receipt.userId);
            const billingContext = getReceiptBillingContext(receipt, user);
            const selected = selectedReceipt?.id === receipt.id;
            const preview = getReceiptPreview(receipt.receiptUri);

            return (
              <Pressable
                key={receipt.id}
                onPress={() => setSelectedReceiptId(receipt.id)}
                style={[receiptRow(palette), selected && { borderColor: palette.accent, backgroundColor: palette.accentSoft }]}
              >
                <Pressable
                  onPress={() => toggleSelected(receipt.id)}
                  style={checkbox(palette, selectedIds.includes(receipt.id))}
                >
                  {selectedIds.includes(receipt.id) ? (
                    <Text style={{ color: "#1b1e2f", fontWeight: "900", fontSize: 13 }}>
                      ✓
                    </Text>
                  ) : null}
                </Pressable>

                <Pressable onPress={() => openPreview(receipt)} style={thumbnail(palette)}>
                  {preview.imageUri ? (
                    <Image source={{ uri: preview.imageUri }} resizeMode="cover" style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <FontAwesome6 name="receipt" size={20} color={palette.textMuted} />
                  )}
                </Pressable>

                <View style={{ flex: 1, minWidth: 220 }}>
                  <Text style={{ color: palette.text, fontWeight: "900" }}>{receipt.userName}</Text>
                  <Text style={{ color: palette.textMuted }}>{receipt.userEmail}</Text>
                  <Text style={{ color: palette.textMuted }}>
                    {formatReceiptAge(receipt.submittedAt)} • {formatDate(receipt.submittedAt)}
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                    <ContextPill label={`Submitted ${formatCurrency(receipt.amount)}`} />
                    <ContextPill label={`${billingContext.expectedLabel} ${formatCurrency(billingContext.expectedAmount)}`} />
                    <ContextPill
                      label={`Diff ${formatCurrency(billingContext.difference)}`}
                      tone={Math.abs(billingContext.difference) > 1 ? "warning" : "success"}
                    />
                  </View>
                </View>

                <View style={{ alignItems: "flex-end", gap: 8 }}>
                  <StatusBadge status={receipt.status} />
                  <View style={{ flexDirection: "row", gap: 7 }}>
                    {receipt.status === "Pending Verification" ? (
                      <>
                        <IconButton icon="check" label="Approve receipt" onPress={() => requestAction("Approved", receipt)} />
                        <IconButton icon="xmark" label="Reject receipt" onPress={() => requestAction("Rejected", receipt)} danger />
                      </>
                    ) : receipt.status === "Approved" ? (
                      <IconButton icon="rotate-left" label="Revoke receipt approval" onPress={() => requestAction("Revoke", receipt)} warning />
                    ) : null}
                    <IconButton icon="trash" label="Delete receipt" onPress={() => requestAction("Delete", receipt)} danger />
                  </View>
                </View>
              </Pressable>
            );
          })}

          {!loading && rows.length === 0 ? (
            <Text style={{ color: palette.textMuted, marginTop: 12 }}>No receipt submissions found.</Text>
          ) : null}
        </View>

        {selectedReceipt ? (
          <View style={[panel(palette), { flex: 0.85, minWidth: 320 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <View style={{ flex: 1 }}>
                <Text style={sectionTitle(palette)}>{selectedReceipt.userName}</Text>
                <Text style={{ color: palette.textMuted }}>{selectedReceipt.userEmail}</Text>
              </View>
              <StatusBadge status={selectedReceipt.status} />
            </View>

            <Pressable onPress={() => openPreview(selectedReceipt)} style={[detailPreviewFrame(palette), { marginTop: 12 }]}>
              {getReceiptPreview(selectedReceipt.receiptUri).imageUri ? (
                <Image source={{ uri: getReceiptPreview(selectedReceipt.receiptUri).imageUri }} resizeMode="cover" style={{ width: "100%", height: "100%" }} />
              ) : (
                <View style={{ alignItems: "center", gap: 8 }}>
                  <FontAwesome6 name="image" size={28} color={palette.textMuted} />
                  <Text style={{ color: palette.textMuted }}>Preview unavailable</Text>
                </View>
              )}
            </Pressable>

            <Text style={[sectionTitle(palette), { marginTop: 14 }]}>Billing Context</Text>
            <Detail label="Submitted Amount" value={formatCurrency(selectedReceipt.amount)} />
            <Detail
              label={getReceiptBillingContext(selectedReceipt, selectedUser).expectedLabel}
              value={formatCurrency(getReceiptBillingContext(selectedReceipt, selectedUser).expectedAmount)}
            />
            <Detail
              label="Difference"
              value={formatCurrency(getReceiptBillingContext(selectedReceipt, selectedUser).difference)}
            />
            <Detail
              label="Payment After Approval"
              value={selectedReceipt.status === "Rejected" ? "Unpaid" : "Paid"}
            />

            <Text style={[sectionTitle(palette), { marginTop: 14 }]}>Verification Checklist</Text>
            <ChecklistItem
              label="Amount matches bill"
              done={Math.abs(getReceiptBillingContext(selectedReceipt, selectedUser).difference) <= 1}
            />
            <ChecklistItem label="Image attached" done={Boolean(selectedReceipt.receiptUri)} />
            <ChecklistItem label="Known client" done={Boolean(selectedUser)} />
            <ChecklistItem label="Not already approved" done={selectedReceipt.status !== "Approved"} />

            <Text style={[sectionTitle(palette), { marginTop: 14 }]}>Reviewer Note</Text>
            <TextInput
              value={reviewNote}
              onChangeText={setReviewNote}
              placeholder="Add note before rejecting"
              placeholderTextColor="#7f95c5"
              multiline
              style={[input(palette), { minHeight: 78, textAlignVertical: "top" }]}
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {rejectNotes.map((note) => (
                <Pressable key={note} onPress={() => setReviewNote(note)} style={noteChip(palette)}>
                  <Text style={{ color: palette.textMuted, fontWeight: "800", fontSize: 12 }}>{note}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[sectionTitle(palette), { marginTop: 14 }]}>Timeline</Text>
            <TimelineItem label="Submitted" value={formatDate(selectedReceipt.submittedAt)} done />
            <TimelineItem label="Reviewed" value={selectedReceipt.status === "Pending Verification" ? "Waiting" : "Completed"} done={selectedReceipt.status !== "Pending Verification"} />
            <TimelineItem label="Decision" value={selectedReceipt.status} done={selectedReceipt.status !== "Pending Verification"} />
          </View>
        ) : null}
      </View>

      <ConfirmationModal
        visible={confirm.visible}
        title={`${confirm.action || "Update"} Receipt`}
        message={getActionMessage(confirm.action, confirm.receipt, confirm.bulk, selectedRows.length, reviewNote)}
        confirmText={confirm.action}
        cancelText="Cancel"
        isDangerous={confirm.action === "Rejected" || confirm.action === "Delete"}
        isLoading={isProcessing}
        loadingMessage={getActionLoadingMessage(confirm.action, processingSeconds, deleteProgress)}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirm({ visible: false })}
      />

      <ActionCompletionModal
        visible={completionPrompt.visible}
        title={completionPrompt.title}
        message={completionPrompt.message}
        tone={completionPrompt.tone}
        onClose={() => setCompletionPrompt((current) => ({ ...current, visible: false }))}
      />

      <ReceiptPreviewModal
        receipt={previewReceipt}
        previewFailed={previewFailed}
        setPreviewFailed={setPreviewFailed}
        onClose={() => setPreviewReceipt(null)}
      />
    </AdminShell>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "success" | "warning" | "danger" }) {
  const palette = useThemePalette();
  const color = tone === "success" ? palette.success : tone === "warning" ? palette.warning : tone === "danger" ? palette.danger : palette.text;

  return (
    <View style={metricCard(palette)}>
      <Text style={{ color: palette.textMuted }}>{label}</Text>
      <Text style={{ color, fontSize: 24, fontWeight: "900", marginTop: 6 }}>{value}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: ReceiptRecord["status"] }) {
  const palette = useThemePalette();
  const color = status === "Approved" ? palette.success : status === "Rejected" ? palette.danger : palette.warning;

  return (
    <View style={{ borderWidth: 1, borderColor: color, backgroundColor: `${color}24`, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
      <Text style={{ color: palette.text, fontWeight: "900", fontSize: 12 }}>{status}</Text>
    </View>
  );
}

function ContextPill({ label, tone = "default" }: { label: string; tone?: "default" | "success" | "warning" }) {
  const palette = useThemePalette();
  const color = tone === "success" ? palette.success : tone === "warning" ? palette.warning : palette.textMuted;
  return (
    <View style={{ borderWidth: 1, borderColor: `${color}80`, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}>
      <Text style={{ color, fontSize: 12, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}

function BulkButton({ label, icon, disabled, onPress }: { label: string; icon: React.ComponentProps<typeof FontAwesome6>["name"]; disabled: boolean; onPress: () => void }) {
  const palette = useThemePalette();
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[smallButton(palette), disabled && { opacity: 0.45 }]}>
      <FontAwesome6 name={icon} size={12} color={palette.cyan} />
      <Text style={{ color: palette.cyan, fontWeight: "800", fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

function IconButton({ icon, label, onPress, danger, warning }: { icon: React.ComponentProps<typeof FontAwesome6>["name"]; label: string; onPress: () => void; danger?: boolean; warning?: boolean }) {
  const palette = useThemePalette();
  const color = danger ? palette.danger : warning ? palette.warning : palette.success;
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={[iconButton(palette), { borderColor: `${color}99`, backgroundColor: `${color}22` }]}>
      <FontAwesome6 name={icon} size={13} color={color} />
    </Pressable>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  const palette = useThemePalette();
  return (
    <View style={detailBox(palette)}>
      <Text style={{ color: palette.textMuted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: palette.text, fontWeight: "900", marginTop: 3 }}>{value}</Text>
    </View>
  );
}

function ChecklistItem({ label, done }: { label: string; done: boolean }) {
  const palette = useThemePalette();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
      <FontAwesome6 name={done ? "circle-check" : "circle-xmark"} size={15} color={done ? palette.success : palette.warning} />
      <Text style={{ color: palette.text }}>{label}</Text>
    </View>
  );
}

function TimelineItem({ label, value, done }: { label: string; value: string; done?: boolean }) {
  const palette = useThemePalette();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 }}>
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: done ? palette.success : "rgba(157,178,223,0.35)" }} />
      <Text style={{ color: palette.text, flex: 1 }}>{label}</Text>
      <Text style={{ color: palette.textMuted }}>{value}</Text>
    </View>
  );
}

function ActionCompletionModal({
  visible,
  title,
  message,
  tone,
  onClose,
}: {
  visible: boolean;
  title: string;
  message: string;
  tone: "success" | "danger";
  onClose: () => void;
}) {
  const palette = useThemePalette();
  const color = tone === "success" ? palette.success : palette.danger;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={completionBackdrop}>
        <View style={completionPanel(palette)}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <FontAwesome6
              name={tone === "success" ? "circle-check" : "circle-exclamation"}
              size={22}
              color={color}
            />
            <Text style={{ color: palette.text, fontSize: 18, fontWeight: "900", flex: 1 }}>
              {title}
            </Text>
          </View>
          <Text style={{ color: palette.textMuted, lineHeight: 20 }}>{message}</Text>
          <Pressable onPress={onClose} style={[completionButton(palette), { backgroundColor: color }]}>
            <Text style={{ color: "#1b1e2f", fontWeight: "900" }}>OK</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ReceiptPreviewModal({ receipt, previewFailed, setPreviewFailed, onClose }: { receipt: ReceiptRecord | null; previewFailed: boolean; setPreviewFailed: (value: boolean) => void; onClose: () => void }) {
  const palette = useThemePalette();
  const preview = getReceiptPreview(receipt?.receiptUri || "");

  const openReceiptExternal = async () => {
    if (preview.openUri) await Linking.openURL(preview.openUri);
  };

  return (
    <Modal visible={Boolean(receipt)} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={previewBackdrop}>
        <View style={previewPanel(palette)}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.text, fontSize: 18, fontWeight: "900" }}>{receipt ? `${receipt.userName}'s Receipt` : "Receipt"}</Text>
              <Text numberOfLines={1} style={{ color: palette.textMuted, marginTop: 3 }}>{receipt?.receiptUri}</Text>
            </View>
            <Pressable onPress={onClose} style={closePreviewBtn(palette)} accessibilityLabel="Close receipt preview">
              <FontAwesome6 name="xmark" size={18} color={palette.text} />
            </Pressable>
          </View>

          <View style={receiptPreviewFrame(palette)}>
            {receipt?.receiptUri && preview.imageUri && !previewFailed ? (
              <Image source={{ uri: preview.imageUri }} resizeMode="contain" style={{ width: "100%", height: "100%" }} onError={() => setPreviewFailed(true)} />
            ) : (
              <View style={{ padding: 20, alignItems: "center", gap: 10 }}>
                <FontAwesome6 name="image" size={30} color={palette.textMuted} />
                <Text style={{ color: palette.text, fontWeight: "800", textAlign: "center" }}>Receipt preview is not available</Text>
                <Text style={{ color: palette.textMuted, textAlign: "center", lineHeight: 20 }}>{preview.message}</Text>
              </View>
            )}
          </View>

          <Pressable onPress={openReceiptExternal} disabled={!preview.openUri} style={[openFullBtn(palette), !preview.openUri ? { opacity: 0.5 } : null]}>
            <FontAwesome6 name="up-right-from-square" size={13} color="#1b1e2f" />
            <Text style={{ color: "#1b1e2f", fontWeight: "900" }}>Open Full Receipt</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function sortReceipts(a: ReceiptRecord, b: ReceiptRecord, sortKey: SortKey) {
  if (sortKey === "amount") return b.amount - a.amount;
  if (sortKey === "oldest") return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
  if (sortKey === "newest") return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
  return statusRank(a.status) - statusRank(b.status) || new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
}

function getReceiptBillingContext(
  receipt: ReceiptRecord,
  user?: { amountDue: number; paymentStatus: string },
) {
  const hasOpenBalance = Boolean(user && user.amountDue > 0 && user.paymentStatus !== "Paid");
  const expectedAmount =
    receipt.status === "Approved" || !hasOpenBalance ? receipt.amount : user?.amountDue || receipt.amount;
  const expectedLabel = receipt.status === "Approved" || !hasOpenBalance ? "Covered" : "Due";

  return {
    expectedAmount,
    expectedLabel,
    difference: receipt.amount - expectedAmount,
  };
}

function statusRank(status: ReceiptRecord["status"]) {
  return status === "Pending Verification" ? 0 : status === "Rejected" ? 1 : 2;
}

function filterCount(filter: ReceiptFilter, receipts: ReceiptRecord[]) {
  if (filter === "All") return receipts.length;
  return receipts.filter((receipt) => receipt.status === filter).length;
}

function getActionMessage(action?: ReceiptAction, receipt?: ReceiptRecord, bulk?: boolean, count = 0, note = "") {
  const target = bulk ? `${count} selected receipt${count > 1 ? "s" : ""}` : `"${receipt?.userName || "this client"}'s" receipt`;
  const noteText = note && action === "Rejected" ? ` Note: ${note}` : "";
  if (action === "Revoke") return `Return ${target} to pending verification?`;
  if (action === "Delete") return `Delete ${target}? This action cannot be undone.`;
  if (action === "Approved") return `Approve ${target}? Payment status will be updated.`;
  if (action === "Rejected") return `Reject ${target}?${noteText}`;
  return "";
}

function actionPastTense(action: ReceiptAction) {
  if (action === "Approved") return "Approved";
  if (action === "Rejected") return "Rejected";
  if (action === "Delete") return "Deleted";
  return "Revoked";
}

function actionPresentTense(action?: ReceiptAction) {
  if (action === "Approved") return "Approving";
  if (action === "Rejected") return "Rejecting";
  if (action === "Delete") return "Deleting";
  if (action === "Revoke") return "Revoking";
  return "Processing";
}

function getActionLoadingMessage(
  action: ReceiptAction | undefined,
  processingSeconds: number,
  deleteProgress: { deleted: number; total: number },
) {
  if (action === "Delete") {
    return `Deleting receipts... ${deleteProgress.deleted}/${deleteProgress.total} deleted`;
  }

  return `${actionPresentTense(action)}... ${formatDuration(processingSeconds)}`;
}

function formatDuration(totalSeconds: number) {
  if (totalSeconds < 1) {
    return "less than 1 second";
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds} second${seconds === 1 ? "" : "s"}`;
  }

  return `${minutes} minute${minutes === 1 ? "" : "s"} ${seconds} second${seconds === 1 ? "" : "s"}`;
}

function formatCurrency(value: number) {
  return `PHP ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatReceiptAge(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Submitted date unknown";
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "Submitted today";
  if (days === 1) return "Submitted 1 day ago";
  return `Submitted ${days} days ago`;
}

function getReceiptPreview(rawUri: string) {
  const trimmed = (rawUri || "").trim();

  if (!trimmed) {
    return { imageUri: "", openUri: "", message: "No receipt attachment was saved for this payment." };
  }

  if (/^(file|content|blob):/i.test(trimmed)) {
    return {
      imageUri: "",
      openUri: "",
      message: "This receipt was saved as a device-local path. Upload it to server storage or save it as a public URL/base64 image so the admin panel can load it.",
    };
  }

  if (/^data:image\//i.test(trimmed)) return { imageUri: trimmed, openUri: trimmed, message: "" };
  if (/^data:application\/pdf/i.test(trimmed)) return { imageUri: "", openUri: trimmed, message: "This receipt is a PDF. Use Full View to open it." };

  if (looksLikeBase64Image(trimmed)) {
    const imageUri = `data:image/jpeg;base64,${trimmed}`;
    return { imageUri, openUri: imageUri, message: "" };
  }

  const normalized = normalizeReceiptUrl(trimmed);
  return {
    imageUri: normalized,
    openUri: normalized,
    message: "The attachment is not a direct image URL, or the host blocks embedded previews. Try Full View, or store receiptUri as a direct image link.",
  };
}

function normalizeReceiptUrl(value: string) {
  if (value.startsWith("//")) return `https:${value}`;
  const googleDriveMatch = value.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (googleDriveMatch?.[1]) return `https://drive.google.com/uc?export=view&id=${googleDriveMatch[1]}`;
  if (/dropbox\.com/i.test(value)) return value.replace(/[?&]dl=0/i, "?raw=1").replace(/[?&]dl=1/i, "?raw=1");
  if (/^https?:\/\//i.test(value) || value.startsWith("/")) return encodeURI(value);
  return encodeURI(`/${value}`);
}

function looksLikeBase64Image(value: string) {
  return value.length > 120 && /^[A-Za-z0-9+/=\r\n]+$/.test(value);
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

const filterPill = (palette: ReturnType<typeof useThemePalette>, active: boolean) => ({
  borderWidth: 1,
  borderColor: active ? palette.accent : palette.inputBorder,
  backgroundColor: active ? palette.accentSoft : palette.panelSoft,
  borderRadius: 999,
  paddingHorizontal: 12,
  paddingVertical: 8,
});

const filterText = (palette: ReturnType<typeof useThemePalette>, active: boolean) => ({
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

const receiptRow = (palette: ReturnType<typeof useThemePalette>) => ({
  marginTop: 10,
  borderWidth: 1,
  borderColor: palette.rowBorder,
  borderRadius: 10,
  padding: 10,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  flexWrap: "wrap" as const,
  gap: 12,
});

const checkbox = (palette: ReturnType<typeof useThemePalette>, checked: boolean) => ({
  width: 22,
  height: 22,
  borderRadius: 6,
  borderWidth: 1,
  borderColor: checked ? palette.accent : palette.inputBorder,
  backgroundColor: checked ? palette.accent : "transparent",
  alignItems: "center" as const,
  justifyContent: "center" as const,
});

const thumbnail = (palette: ReturnType<typeof useThemePalette>) => ({
  width: 62,
  height: 62,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: palette.rowBorder,
  backgroundColor: palette.panelSoft,
  overflow: "hidden" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
});

const sectionTitle = (palette: ReturnType<typeof useThemePalette>) => ({
  color: palette.text,
  fontWeight: "900" as const,
  fontSize: 16,
  marginBottom: 8,
});

const detailPreviewFrame = (palette: ReturnType<typeof useThemePalette>) => ({
  height: 180,
  borderWidth: 1,
  borderColor: palette.rowBorder,
  borderRadius: 10,
  backgroundColor: palette.panelSoft,
  overflow: "hidden" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
});

const detailBox = (palette: ReturnType<typeof useThemePalette>) => ({
  borderWidth: 1,
  borderColor: palette.rowBorder,
  borderRadius: 10,
  padding: 10,
  backgroundColor: palette.panelSoft,
  marginTop: 8,
});

const noteChip = (palette: ReturnType<typeof useThemePalette>) => ({
  borderWidth: 1,
  borderColor: palette.rowBorder,
  backgroundColor: palette.panelSoft,
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 6,
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
  width: 34,
  height: 34,
  borderRadius: 8,
  borderWidth: 1,
  backgroundColor: palette.panelSoft,
  alignItems: "center" as const,
  justifyContent: "center" as const,
});

const completionBackdrop = {
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.55)",
  justifyContent: "center" as const,
  alignItems: "center" as const,
  padding: 16,
};

const completionPanel = (palette: ReturnType<typeof useThemePalette>) => ({
  width: "100%" as const,
  maxWidth: 420,
  borderWidth: 1,
  borderColor: palette.cardBorder,
  borderRadius: 14,
  backgroundColor: palette.card,
  padding: 18,
  gap: 14,
});

const completionButton = (palette: ReturnType<typeof useThemePalette>) => ({
  borderWidth: 1,
  borderColor: palette.cardBorder,
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 11,
  alignSelf: "flex-end" as const,
  minWidth: 92,
  alignItems: "center" as const,
});

const previewBackdrop = {
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.78)",
  justifyContent: "center" as const,
  alignItems: "center" as const,
  padding: 16,
};

const previewPanel = (palette: ReturnType<typeof useThemePalette>) => ({
  width: "100%" as const,
  maxWidth: 920,
  maxHeight: "92%" as const,
  borderWidth: 1,
  borderColor: palette.cardBorder,
  borderRadius: 14,
  backgroundColor: palette.card,
  padding: 14,
  gap: 12,
});

const receiptPreviewFrame = (palette: ReturnType<typeof useThemePalette>) => ({
  height: 560,
  maxHeight: "78%" as const,
  borderWidth: 1,
  borderColor: palette.rowBorder,
  borderRadius: 10,
  backgroundColor: palette.panelSoft,
  overflow: "hidden" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
});

const closePreviewBtn = (palette: ReturnType<typeof useThemePalette>) => ({
  width: 38,
  height: 38,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: palette.inputBorder,
  backgroundColor: palette.panelSoft,
  alignItems: "center" as const,
  justifyContent: "center" as const,
});

const openFullBtn = (palette: ReturnType<typeof useThemePalette>) => ({
  borderRadius: 10,
  backgroundColor: palette.accent,
  paddingHorizontal: 14,
  paddingVertical: 10,
  alignSelf: "flex-start" as const,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 8,
});
