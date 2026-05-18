import { AdminShell } from "@/components/AdminShell";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { ConsumptionChart } from "@/components/ConsumptionChart";
import { useThemePalette } from "@/lib/theme";
import { useAdminUsers } from "@/lib/useAdminUsers";
import { FontAwesome6 } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

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
  const [isDeleting, setIsDeleting] = useState(false);

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
    setIsDeleting(true);
    try {
      await deleteUser(deleteConfirm.userId);
      setDeleteConfirm({ visible: false });
    } finally {
      setIsDeleting(false);
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
            onPress={async () => {
              if (!form.name || !form.email || !form.username || !form.password)
                return;
              await addUser(form);
              setForm({ name: "", email: "", username: "", password: "" });
            }}
            style={primaryBtn(palette)}
          >
            <Text style={primaryText}>Add</Text>
          </Pressable>
        </View>
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
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ visible: false })}
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
