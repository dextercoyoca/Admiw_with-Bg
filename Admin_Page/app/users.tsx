import { AdminShell } from "@/components/AdminShell";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { ConsumptionChart } from "@/components/ConsumptionChart";
import { useThemePalette } from "@/lib/theme";
import { useAdminUsers } from "@/lib/useAdminUsers";
import { FontAwesome6 } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from "react-native";

export default function UsersPage() {
  const palette = useThemePalette();
  const { users, addUser, deleteUser } = useAdminUsers();
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    visible: boolean;
    userId?: string;
    userName?: string;
  }>({
    visible: false,
  });
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [processingStartedAt, setProcessingStartedAt] = useState<number | null>(null);
  const [processingSeconds, setProcessingSeconds] = useState(0);
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
    if ((!isAdding && !isDeleting) || !processingStartedAt) {
      return;
    }

    const intervalId = setInterval(() => {
      setProcessingSeconds(Math.floor((Date.now() - processingStartedAt) / 1000));
    }, 250);

    return () => clearInterval(intervalId);
  }, [isAdding, isDeleting, processingStartedAt]);

  const filtered = useMemo(
    () =>
      users.filter((user) =>
        `${user.name} ${user.email} ${user.username}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [users, query],
  );

  // Get top 5 users for chart (sorted by usage)
  const topUsersForChart = useMemo(() => {
    return [...users]
      .sort((a, b) => b.usageKwh - a.usageKwh)
      .slice(0, 5)
      .map((user) => ({
        name: user.name.split(" ")[0], // First name only
        usage: user.usageKwh,
      }));
  }, [users]);

  const handleDeletePress = (userId: string, userName: string) => {
    setDeleteConfirm({
      visible: true,
      userId,
      userName,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.userId) return;
    const startedAt = Date.now();
    setIsDeleting(true);
    setProcessingStartedAt(startedAt);
    setProcessingSeconds(0);
    try {
      await deleteUser(deleteConfirm.userId);
      const message = `Deleted 1 user record successfully in ${formatDuration(Math.floor((Date.now() - startedAt) / 1000))}. List updated.`;
      setNotice(message);
      setCompletionPrompt({
        visible: true,
        title: "Delete Complete",
        message,
        tone: "success",
      });
      setDeleteConfirm({ visible: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete user data";
      setNotice(message);
      setCompletionPrompt({
        visible: true,
        title: "Delete Failed",
        message: `${message} Time elapsed: ${formatDuration(Math.floor((Date.now() - startedAt) / 1000))}.`,
        tone: "danger",
      });
      setDeleteConfirm({ visible: false });
    } finally {
      setIsDeleting(false);
      setProcessingStartedAt(null);
    }
  };

  const handleAddUser = async () => {
    if (!form.name || !form.email || !form.username || !form.password || isAdding) {
      return;
    }

    const startedAt = Date.now();
    setIsAdding(true);
    setProcessingStartedAt(startedAt);
    setProcessingSeconds(0);
    try {
      await addUser(form);
      setForm({ name: "", email: "", username: "", password: "" });
      const message = `Added 1 user record successfully in ${formatDuration(Math.floor((Date.now() - startedAt) / 1000))}. List updated.`;
      setNotice(message);
      setCompletionPrompt({
        visible: true,
        title: "Data Added",
        message,
        tone: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to add user data";
      setNotice(message);
      setCompletionPrompt({
        visible: true,
        title: "Add Failed",
        message: `${message} Time elapsed: ${formatDuration(Math.floor((Date.now() - startedAt) / 1000))}.`,
        tone: "danger",
      });
    } finally {
      setIsAdding(false);
      setProcessingStartedAt(null);
    }
  };

  return (
    <AdminShell
      title="User Management"
      subtitle="View, search, add, edit, delete, and promote users"
    >
      {/* Consumption Chart */}
      {topUsersForChart.length > 0 && (
        <View style={panel(palette)}>
          <Text style={label(palette)}>Top Users by Consumption</Text>
          <ConsumptionChart
            data={topUsersForChart}
            height={180}
            barColor={palette.accent}
          />
        </View>
      )}
      <View style={panel(palette)}>
        <Text style={label(palette)}>Add User</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Input
            placeholder="Name"
            value={form.name}
            onChangeText={(value) =>
              setForm((prev) => ({ ...prev, name: value }))
            }
          />
          <Input
            placeholder="Email"
            value={form.email}
            onChangeText={(value) =>
              setForm((prev) => ({ ...prev, email: value }))
            }
          />
          <Input
            placeholder="Username"
            value={form.username}
            onChangeText={(value) =>
              setForm((prev) => ({ ...prev, username: value }))
            }
          />
          <Input
            placeholder="Password"
            value={form.password}
            onChangeText={(value) =>
              setForm((prev) => ({ ...prev, password: value }))
            }
          />
          <Pressable
            onPress={handleAddUser}
            disabled={isAdding}
            style={[primaryBtn(palette), isAdding && { opacity: 0.7 }]}
          >
            {isAdding ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <ActivityIndicator color="#1b1e2f" />
                <Text style={primaryText}>{`Adding... ${formatDuration(processingSeconds)}`}</Text>
              </View>
            ) : (
              <Text style={primaryText}>Add</Text>
            )}
          </Pressable>
        </View>
        {notice ? <Text style={{ color: palette.cyan, marginTop: 10, fontWeight: "800" }}>{notice}</Text> : null}
      </View>

      <View style={panel(palette)}>
        <TextInput
          placeholder="Search users"
          placeholderTextColor="#7f95c5"
          value={query}
          onChangeText={setQuery}
          style={input(palette)}
        />

        {filtered.length > 0 ? (
          <>
            {/* Table Header */}
            <View
              style={[
                row(palette),
                {
                    backgroundColor: palette.accentSoft,
                  marginTop: 16,
                  marginBottom: 0,
                },
              ]}
            >
              <View style={{ flex: 1.5 }}>
                <Text
                  style={{
                    color: palette.accent,
                    fontWeight: "900",
                    fontSize: 12,
                  }}
                >
                  NAME
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: palette.accent,
                    fontWeight: "900",
                    fontSize: 12,
                  }}
                >
                  USAGE (kWh)
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: palette.accent,
                    fontWeight: "900",
                    fontSize: 12,
                  }}
                >
                  REVENUE
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: palette.accent,
                    fontWeight: "900",
                    fontSize: 12,
                  }}
                >
                  ROLE
                </Text>
              </View>
              <View style={{ minWidth: 90 }}>
                <Text
                  style={{
                    color: palette.accent,
                    fontWeight: "900",
                    fontSize: 12,
                  }}
                >
                  ACTIONS
                </Text>
              </View>
            </View>

            {/* Table Rows */}
            {filtered.map((user) => (
              <View
                key={user._id}
                style={[
                row(palette),
                  {
                    flexWrap: "wrap",
                    marginTop: 0,
                    borderTopWidth: 0,
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                  },
                ]}
              >
                <View style={{ flex: 1.5 }}>
                  <Text
                    style={{
                      color: palette.text,
                      fontWeight: "800",
                      fontSize: 13,
                    }}
                  >
                    {user.name}
                  </Text>
                  <Text style={{ color: palette.textMuted, fontSize: 11 }}>
                    {user.email}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.text, fontWeight: "700" }}>
                    {user.usageKwh.toFixed(2)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.text, fontWeight: "700" }}>
                    PHP {user.revenueCollected.toFixed(2)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                    {user.role}
                  </Text>
                </View>
                <View style={{ minWidth: 90, flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={() => handleDeletePress(user._id, user.name)}
                    style={dangerBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${user.name}`}
                  >
                    <FontAwesome6 name="trash" size={15} color="#DC2626" />
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 20 }}>
            <Text style={{ color: palette.textMuted }}>No users found</Text>
          </View>
        )}
      </View>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={deleteConfirm.visible}
        title="Delete User"
        message={`Are you sure you want to delete user "${deleteConfirm.userName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={isDeleting}
        loadingMessage={`Deleting... ${formatDuration(processingSeconds)}`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ visible: false })}
      />

      <ActionCompletionModal
        visible={completionPrompt.visible}
        title={completionPrompt.title}
        message={completionPrompt.message}
        tone={completionPrompt.tone}
        onClose={() => setCompletionPrompt((current) => ({ ...current, visible: false }))}
      />
    </AdminShell>
  );
}

function Input({
  placeholder,
  value,
  onChangeText,
}: {
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  const palette = useThemePalette();

  return (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor="#7f95c5"
      value={value}
      onChangeText={onChangeText}
      style={[input(palette), { minWidth: 180, flexGrow: 1 }]}
    />
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
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 10,
});

const primaryBtn = (palette: ReturnType<typeof useThemePalette>) => ({
  borderRadius: 10,
  backgroundColor: palette.accent,
  paddingHorizontal: 14,
  paddingVertical: 10,
});

const primaryText = { color: "#1b1e2f", fontWeight: "800" as const };

const dangerBtn = {
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "#DC2626",
  backgroundColor: "#FEF2F2",
  width: 34,
  height: 34,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

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
