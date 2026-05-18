import { AdminShell } from "@/components/AdminShell";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import {
  createAdminNotification,
  fetchAdminNotifications,
  type AdminNotificationRecord,
} from "@/lib/adminApi";
import { useThemePalette } from "@/lib/theme";
import { useAdminUsers } from "@/lib/useAdminUsers";
import { FontAwesome6 } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";

type Audience = "all" | "unpaid" | "paid" | "overdue" | "specific";
type NotificationType = "Info" | "Billing" | "Warning" | "Urgent";
type Priority = "Normal" | "High" | "Critical";
type SendMode = "now" | "later";
type HistoryFilter = "All" | NotificationType | "Scheduled";

type NotificationTemplate = {
  label: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: Priority;
  audience: Audience;
};

const templates: NotificationTemplate[] = [
  {
    label: "Billing reminder",
    title: "Billing Reminder",
    message: "Your electricity bill is still unpaid. Please settle your balance to avoid late penalties.",
    type: "Billing",
    priority: "High",
    audience: "unpaid",
  },
  {
    label: "Payment approved",
    title: "Payment Approved",
    message: "Your payment receipt has been approved. Thank you for keeping your account updated.",
    type: "Info",
    priority: "Normal",
    audience: "paid",
  },
  {
    label: "Receipt rejected",
    title: "Receipt Requires Attention",
    message: "Your uploaded receipt could not be verified. Please upload a clear and valid proof of payment.",
    type: "Warning",
    priority: "High",
    audience: "specific",
  },
  {
    label: "Maintenance",
    title: "Service Maintenance",
    message: "Scheduled maintenance may temporarily affect account access. Thank you for your patience.",
    type: "Info",
    priority: "Normal",
    audience: "all",
  },
  {
    label: "Disconnection warning",
    title: "Disconnection Warning",
    message: "Your account may be disconnected if the overdue balance remains unsettled.",
    type: "Urgent",
    priority: "Critical",
    audience: "overdue",
  },
];

const audiences: { label: string; value: Audience }[] = [
  { label: "All Users", value: "all" },
  { label: "Unpaid Users", value: "unpaid" },
  { label: "Paid Users", value: "paid" },
  { label: "Overdue Users", value: "overdue" },
  { label: "Specific User", value: "specific" },
];

const types: NotificationType[] = ["Info", "Billing", "Warning", "Urgent"];
const priorities: Priority[] = ["Normal", "High", "Critical"];
const historyFilters: HistoryFilter[] = ["All", "Info", "Billing", "Warning", "Urgent", "Scheduled"];

export default function NotificationsPage() {
  const palette = useThemePalette();
  const { users } = useAdminUsers();
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("ElectriPay Notice");
  const [audience, setAudience] = useState<Audience>("all");
  const [specificUserId, setSpecificUserId] = useState("");
  const [specificUserOpen, setSpecificUserOpen] = useState(false);
  const [specificUserQuery, setSpecificUserQuery] = useState("");
  const [notificationType, setNotificationType] = useState<NotificationType>("Info");
  const [priority, setPriority] = useState<Priority>("Normal");
  const [sendMode, setSendMode] = useState<SendMode>("now");
  const [scheduledFor, setScheduledFor] = useState("");
  const [feed, setFeed] = useState<AdminNotificationRecord[]>([]);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("All");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");
  const [confirmVisible, setConfirmVisible] = useState(false);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const response = await fetchAdminNotifications();
        setFeed(response.notifications);
        setStatus(
          response.notifications.length > 0
            ? `Loaded from ${response.source}`
            : `No notifications yet (${response.source})`,
        );
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to load notifications");
      } finally {
        setLoading(false);
      }
    }

    loadNotifications();
  }, []);

  const audienceUsers = useMemo(
    () => getAudienceUsers(users, audience, specificUserId),
    [audience, specificUserId, users],
  );

  const selectedSpecificUser = useMemo(
    () => users.find((user) => user._id === specificUserId),
    [specificUserId, users],
  );

  const specificUserOptions = useMemo(
    () =>
      users.filter((user) =>
        `${user.name} ${user.email}`
          .toLowerCase()
          .includes(specificUserQuery.toLowerCase()),
      ),
    [specificUserQuery, users],
  );

  const deliveryStats = useMemo(() => {
    const audienceSize = audienceUsers.length;
    const failed = priority === "Critical" ? 0 : Math.floor(audienceSize * 0.02);
    const sent = Math.max(audienceSize - failed, 0);
    const read = Math.floor(sent * (priority === "Critical" ? 0.86 : 0.68));
    return { sent, read, failed, audienceSize };
  }, [audienceUsers.length, priority]);

  const validation = validateNotification({
    title,
    message,
    audience,
    specificUserId,
    sendMode,
    scheduledFor,
  });

  const history = useMemo(() => {
    return feed.filter((item) => {
      if (historyFilter === "All") return true;
      if (historyFilter === "Scheduled") return Boolean(item.scheduledFor);
      return item.notificationType === historyFilter;
    });
  }, [feed, historyFilter]);

  const applyTemplate = (template: NotificationTemplate) => {
    setTitle(template.title);
    setMessage(template.message);
    setNotificationType(template.type);
    setPriority(template.priority);
    setAudience(template.audience);
    setStatus("");
  };

  const resetComposer = () => {
    setMessage("");
    setTitle("ElectriPay Notice");
    setAudience("all");
    setSpecificUserId("");
    setNotificationType("Info");
    setPriority("Normal");
    setSendMode("now");
    setScheduledFor("");
  };

  const handleSend = async () => {
    if (!validation.valid) {
      setStatus(validation.errors[0]);
      setConfirmVisible(false);
      return;
    }

    setSending(true);
    setStatus("");

    try {
      const response = await createAdminNotification({
        title: title.trim(),
        message: message.trim(),
        audience,
        notificationType,
        priority,
        scheduledFor: sendMode === "later" ? scheduledFor : "",
        deliveryStats,
      });

      setFeed((prev) => [response.notification, ...prev]);
      setStatus(sendMode === "later" ? `Notification scheduled in ${response.source}` : `Notification sent via ${response.source}`);
      setConfirmVisible(false);
      resetComposer();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to send notification");
    } finally {
      setSending(false);
    }
  };

  const copyNotification = (item: AdminNotificationRecord) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(`${item.title}\n${item.message}`);
    }
    setStatus("Notification copied.");
  };

  const resendNotification = (item: AdminNotificationRecord) => {
    setTitle(item.title);
    setMessage(item.message);
    setAudience((item.audience as Audience) || "all");
    setNotificationType((item.notificationType as NotificationType) || "Info");
    setPriority((item.priority as Priority) || "Normal");
    setScheduledFor("");
    setSendMode("now");
    setStatus("Loaded notification into composer.");
  };

  return (
    <AdminShell title="Notifications" subtitle="Send announcements and unpaid bill reminders">
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <Metric label="Audience Size" value={String(deliveryStats.audienceSize)} />
        <Metric label="Estimated Sent" value={String(deliveryStats.sent)} tone="success" />
        <Metric label="Estimated Read" value={String(deliveryStats.read)} />
        <Metric label="Estimated Failed" value={String(deliveryStats.failed)} tone="danger" />
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
        <View style={[panel(palette), { flex: 1.1, minWidth: 340 }]}>
          <Text style={sectionTitle(palette)}>Composer</Text>

          <Text style={label(palette)}>Templates</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {templates.map((template) => (
              <Pressable key={template.label} onPress={() => applyTemplate(template)} style={templateButton(palette)}>
                <Text style={{ color: palette.textMuted, fontWeight: "800", fontSize: 12 }}>
                  {template.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={label(palette)}>Notification title</Text>
          <TextInput
            placeholder="Notification title"
            placeholderTextColor="#7f95c5"
            value={title}
            onChangeText={setTitle}
            style={[input(palette), validation.titleError && invalidInput(palette)]}
          />

          <Text style={label(palette)}>Message</Text>
          <TextInput
            placeholder="Type message"
            placeholderTextColor="#7f95c5"
            value={message}
            onChangeText={setMessage}
            multiline
            style={[input(palette), { minHeight: 120, textAlignVertical: "top" as const }, validation.messageError && invalidInput(palette)]}
          />
          <Text style={{ color: message.length > 240 ? palette.warning : palette.textMuted, marginTop: 6, fontSize: 12 }}>
            {message.length}/280 characters
          </Text>

          <Text style={label(palette)}>Audience</Text>
          <Segmented
            options={audiences}
            value={audience}
            onChange={(value) => setAudience(value as Audience)}
          />

          {audience === "specific" ? (
            <View style={{ marginTop: 10 }}>
              <Text style={label(palette)}>Specific user</Text>
              <Pressable
                onPress={() => setSpecificUserOpen((current) => !current)}
                style={dropdownButton(palette)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.text, fontWeight: "900" }}>
                    {selectedSpecificUser?.name || "Choose a user"}
                  </Text>
                  <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                    {selectedSpecificUser?.email || `${users.length} users available`}
                  </Text>
                </View>
                <FontAwesome6
                  name={specificUserOpen ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={palette.textMuted}
                />
              </Pressable>

              {specificUserOpen ? (
                <View style={dropdownPanel(palette)}>
                  <TextInput
                    placeholder="Search users"
                    placeholderTextColor="#7f95c5"
                    value={specificUserQuery}
                    onChangeText={setSpecificUserQuery}
                    style={input(palette)}
                  />
                  <ScrollView style={{ maxHeight: 260, marginTop: 8 }}>
                    {specificUserOptions.map((user) => {
                      const active = user._id === specificUserId;
                      return (
                        <Pressable
                          key={user._id}
                          onPress={() => {
                            setSpecificUserId(user._id);
                            setSpecificUserOpen(false);
                          }}
                          style={dropdownOption(palette, active)}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: palette.text, fontWeight: "800" }}>
                              {user.name}
                            </Text>
                            <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                              {user.email}
                            </Text>
                          </View>
                          {active ? (
                            <FontAwesome6 name="check" size={13} color={palette.accent} />
                          ) : null}
                        </Pressable>
                      );
                    })}
                    {specificUserOptions.length === 0 ? (
                      <Text style={{ color: palette.textMuted, padding: 10 }}>
                        No users found.
                      </Text>
                    ) : null}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          ) : null}

          <Text style={label(palette)}>Type</Text>
          <Segmented
            options={types.map((item) => ({ label: item, value: item }))}
            value={notificationType}
            onChange={(value) => setNotificationType(value as NotificationType)}
          />

          <Text style={label(palette)}>Priority</Text>
          <Segmented
            options={priorities.map((item) => ({ label: item, value: item }))}
            value={priority}
            onChange={(value) => setPriority(value as Priority)}
          />

          <Text style={label(palette)}>Schedule</Text>
          <Segmented
            options={[
              { label: "Send Now", value: "now" },
              { label: "Schedule Later", value: "later" },
            ]}
            value={sendMode}
            onChange={(value) => setSendMode(value as SendMode)}
          />
          {sendMode === "later" ? (
            <TextInput
              placeholder="Schedule time, e.g. May 20, 2026 9:00 AM"
              placeholderTextColor="#7f95c5"
              value={scheduledFor}
              onChangeText={setScheduledFor}
              style={[input(palette), { marginTop: 10 }, validation.scheduleError && invalidInput(palette)]}
            />
          ) : null}

          {validation.errors.length > 0 ? (
            <Text style={{ color: palette.danger, marginTop: 10 }}>{validation.errors[0]}</Text>
          ) : null}

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            <Pressable
              onPress={() => setConfirmVisible(true)}
              disabled={sending || !validation.valid}
              style={[primaryBtn(palette), (sending || !validation.valid) && { opacity: 0.5 }]}
            >
              <Text style={{ color: "#1b1e2f", fontWeight: "900" }}>
                {sending ? "Sending..." : sendMode === "later" ? "Schedule Notification" : "Send Notification"}
              </Text>
            </Pressable>
            <Pressable onPress={resetComposer} style={secondaryBtn(palette)}>
              <Text style={{ color: palette.text, fontWeight: "800" }}>Reset</Text>
            </Pressable>
          </View>

          {status ? <Text style={{ color: palette.textMuted, marginTop: 10 }}>{status}</Text> : null}
        </View>

        <View style={[panel(palette), { flex: 0.9, minWidth: 320 }]}>
          <Text style={sectionTitle(palette)}>Live Preview</Text>
          <View style={previewCard(palette, priority)}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.text, fontWeight: "900", fontSize: 16 }}>
                  {title.trim() || "Notification title"}
                </Text>
                <Text style={{ color: palette.textMuted, marginTop: 4 }}>
                  {notificationType} • {priority}
                </Text>
              </View>
              <FontAwesome6 name={typeIcon(notificationType)} size={18} color={priorityColor(priority, palette)} />
            </View>
            <Text style={{ color: palette.text, marginTop: 12, lineHeight: 20 }}>
              {message.trim() || "Your message preview will appear here."}
            </Text>
          </View>

          <Text style={[sectionTitle(palette), { marginTop: 16 }]}>Delivery Stats</Text>
          <StatLine label="Audience" value={audienceLabel(audience, audienceUsers.length)} />
          <StatLine label="Sent" value={String(deliveryStats.sent)} />
          <StatLine label="Read" value={String(deliveryStats.read)} />
          <StatLine label="Failed" value={String(deliveryStats.failed)} />
          <StatLine label="Schedule" value={sendMode === "later" ? scheduledFor || "Not set" : "Immediate"} />
        </View>
      </View>

      <View style={panel(palette)}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <Text style={sectionTitle(palette)}>Recent Sent</Text>
          <Segmented
            options={historyFilters.map((item) => ({ label: item, value: item }))}
            value={historyFilter}
            onChange={(value) => setHistoryFilter(value as HistoryFilter)}
          />
        </View>

        {loading ? (
          <View style={{ paddingVertical: 12 }}>
            <ActivityIndicator color={palette.cyan} />
          </View>
        ) : history.length === 0 ? (
          <Text style={{ color: palette.textMuted }}>No notifications match this filter.</Text>
        ) : (
          history.map((item) => (
            <View key={item.id} style={historyRow(palette)}>
              <View style={{ flex: 1, minWidth: 240 }}>
                <Text style={{ color: palette.text, fontWeight: "900" }}>{item.title}</Text>
                <Text style={{ color: palette.textMuted, marginTop: 4 }}>{item.message}</Text>
                <Text style={{ color: palette.textMuted, marginTop: 6, fontSize: 12 }}>
                  {new Date(item.createdAt).toLocaleString()} • {item.audience} • {item.notificationType}
                </Text>
              </View>
              <View style={{ gap: 8, alignItems: "flex-end" }}>
                <Text style={{ color: priorityColor(item.priority as Priority, palette), fontWeight: "900" }}>
                  {item.priority || "Normal"}
                </Text>
                <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                  Sent {item.deliveryStats?.sent || 0} • Read {item.deliveryStats?.read || 0}
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <IconButton icon="rotate-right" label="Resend" onPress={() => resendNotification(item)} />
                  <IconButton icon="copy" label="Copy" onPress={() => copyNotification(item)} />
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <ConfirmationModal
        visible={confirmVisible}
        title={sendMode === "later" ? "Schedule Notification" : "Send Notification"}
        message={`${sendMode === "later" ? "Schedule" : "Send"} this ${priority.toLowerCase()} ${notificationType.toLowerCase()} notification to ${audienceUsers.length} user${audienceUsers.length === 1 ? "" : "s"}?`}
        confirmText={sendMode === "later" ? "Schedule" : "Send"}
        cancelText="Cancel"
        isDangerous={priority === "Critical"}
        isLoading={sending}
        onConfirm={handleSend}
        onCancel={() => setConfirmVisible(false)}
      />
    </AdminShell>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "success" | "danger" }) {
  const palette = useThemePalette();
  const color = tone === "success" ? palette.success : tone === "danger" ? palette.danger : palette.text;
  return (
    <View style={metricCard(palette)}>
      <Text style={{ color: palette.textMuted }}>{label}</Text>
      <Text style={{ color, fontSize: 24, fontWeight: "900", marginTop: 6 }}>{value}</Text>
    </View>
  );
}

function Segmented({ options, value, onChange }: { options: { label: string; value: string }[]; value: string; onChange: (value: string) => void }) {
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

function StatLine({ label, value }: { label: string; value: string }) {
  const palette = useThemePalette();
  return (
    <View style={statLine(palette)}>
      <Text style={{ color: palette.textMuted }}>{label}</Text>
      <Text style={{ color: palette.text, fontWeight: "900" }}>{value}</Text>
    </View>
  );
}

function IconButton({ icon, label, onPress }: { icon: React.ComponentProps<typeof FontAwesome6>["name"]; label: string; onPress: () => void }) {
  const palette = useThemePalette();
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={iconButton(palette)}>
      <FontAwesome6 name={icon} size={13} color={palette.cyan} />
    </Pressable>
  );
}

function validateNotification(input: {
  title: string;
  message: string;
  audience: Audience;
  specificUserId: string;
  sendMode: SendMode;
  scheduledFor: string;
}) {
  const errors: string[] = [];
  if (!input.title.trim()) errors.push("Notification title is required.");
  if (!input.message.trim()) errors.push("Notification message is required.");
  if (input.message.length > 280) errors.push("Message should be 280 characters or fewer.");
  if (input.audience === "specific" && !input.specificUserId) errors.push("Choose a specific user.");
  if (input.sendMode === "later" && !input.scheduledFor.trim()) errors.push("Schedule time is required.");

  return {
    valid: errors.length === 0,
    errors,
    titleError: !input.title.trim(),
    messageError: !input.message.trim() || input.message.length > 280,
    scheduleError: input.sendMode === "later" && !input.scheduledFor.trim(),
  };
}

function getAudienceUsers(
  users: { _id: string; paymentStatus: string; amountDue: number }[],
  audience: Audience,
  specificUserId: string,
) {
  if (audience === "unpaid") return users.filter((user) => user.paymentStatus === "Unpaid");
  if (audience === "paid") return users.filter((user) => user.paymentStatus === "Paid");
  if (audience === "overdue") return users.filter((user) => user.paymentStatus === "Unpaid" && user.amountDue > 0);
  if (audience === "specific") return users.filter((user) => user._id === specificUserId);
  return users;
}

function audienceLabel(audience: Audience, count: number) {
  const label = audiences.find((item) => item.value === audience)?.label || "All Users";
  return `${label} (${count})`;
}

function typeIcon(type: NotificationType): React.ComponentProps<typeof FontAwesome6>["name"] {
  if (type === "Billing") return "file-invoice-dollar";
  if (type === "Warning") return "triangle-exclamation";
  if (type === "Urgent") return "bolt";
  return "circle-info";
}

function priorityColor(priority: Priority | string, palette: ReturnType<typeof useThemePalette>) {
  if (priority === "Critical") return palette.danger;
  if (priority === "High") return palette.warning;
  return palette.cyan;
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

const sectionTitle = (palette: ReturnType<typeof useThemePalette>) => ({
  color: palette.text,
  fontSize: 18,
  fontWeight: "900" as const,
  marginBottom: 10,
});

const label = (palette: ReturnType<typeof useThemePalette>) => ({
  color: palette.textMuted,
  marginTop: 12,
  marginBottom: 7,
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

const invalidInput = (palette: ReturnType<typeof useThemePalette>) => ({
  borderColor: palette.danger,
});

const templateButton = (palette: ReturnType<typeof useThemePalette>) => ({
  borderWidth: 1,
  borderColor: palette.rowBorder,
  backgroundColor: palette.panelSoft,
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 7,
});

const dropdownButton = (palette: ReturnType<typeof useThemePalette>) => ({
  borderWidth: 1,
  borderColor: palette.inputBorder,
  borderRadius: 10,
  backgroundColor: palette.panelSoft,
  paddingHorizontal: 12,
  paddingVertical: 10,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 10,
});

const dropdownPanel = (palette: ReturnType<typeof useThemePalette>) => ({
  marginTop: 8,
  borderWidth: 1,
  borderColor: palette.inputBorder,
  borderRadius: 10,
  backgroundColor: palette.panelSoft,
  padding: 8,
});

const dropdownOption = (
  palette: ReturnType<typeof useThemePalette>,
  active: boolean,
) => ({
  borderRadius: 8,
  padding: 10,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 10,
  backgroundColor: active ? palette.accentSoft : "transparent",
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

const primaryBtn = (palette: ReturnType<typeof useThemePalette>) => ({
  borderRadius: 10,
  backgroundColor: palette.accent,
  paddingHorizontal: 14,
  paddingVertical: 10,
});

const secondaryBtn = (palette: ReturnType<typeof useThemePalette>) => ({
  borderRadius: 10,
  borderWidth: 1,
  borderColor: palette.inputBorder,
  backgroundColor: palette.panelSoft,
  paddingHorizontal: 14,
  paddingVertical: 10,
});

const previewCard = (palette: ReturnType<typeof useThemePalette>, priority: Priority) => ({
  borderWidth: 1,
  borderColor: priorityColor(priority, palette),
  borderRadius: 14,
  backgroundColor: palette.panelSoft,
  padding: 14,
});

const statLine = (palette: ReturnType<typeof useThemePalette>) => ({
  marginTop: 8,
  borderWidth: 1,
  borderColor: palette.rowBorder,
  borderRadius: 10,
  backgroundColor: palette.panelSoft,
  padding: 10,
  flexDirection: "row" as const,
  justifyContent: "space-between" as const,
  gap: 10,
});

const historyRow = (palette: ReturnType<typeof useThemePalette>) => ({
  marginTop: 10,
  borderWidth: 1,
  borderColor: palette.rowBorder,
  borderRadius: 10,
  backgroundColor: palette.panelSoft,
  padding: 10,
  flexDirection: "row" as const,
  justifyContent: "space-between" as const,
  flexWrap: "wrap" as const,
  gap: 10,
});

const iconButton = (palette: ReturnType<typeof useThemePalette>) => ({
  width: 32,
  height: 32,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: palette.inputBorder,
  backgroundColor: palette.panel,
  alignItems: "center" as const,
  justifyContent: "center" as const,
});
