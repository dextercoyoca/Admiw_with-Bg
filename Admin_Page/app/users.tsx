import { useMemo, useState } from "react";
import { FontAwesome6 } from "@expo/vector-icons";
import { Pressable, Text, TextInput, View } from "react-native";
import { AdminShell } from "@/components/AdminShell";
import { palette } from "@/lib/theme";
import { useAdminUsers } from "@/lib/useAdminUsers";

export default function UsersPage() {
  const { users, addUser, deleteUser } = useAdminUsers();
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ name: "", email: "", username: "", password: "" });

  const filtered = useMemo(
    () =>
      users.filter((user) =>
        `${user.name} ${user.email} ${user.username}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [users, query]
  );

  return (
    <AdminShell title="User Management" subtitle="View, search, add, edit, delete, and promote users">
      <View style={panel}>
        <Text style={label}>Add User</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Input placeholder="Name" value={form.name} onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))} />
          <Input placeholder="Email" value={form.email} onChangeText={(value) => setForm((prev) => ({ ...prev, email: value }))} />
          <Input placeholder="Username" value={form.username} onChangeText={(value) => setForm((prev) => ({ ...prev, username: value }))} />
          <Input placeholder="Password" value={form.password} onChangeText={(value) => setForm((prev) => ({ ...prev, password: value }))} />
          <Pressable
            onPress={async () => {
              if (!form.name || !form.email || !form.username || !form.password) return;
              await addUser(form);
              setForm({ name: "", email: "", username: "", password: "" });
            }}
            style={primaryBtn}
          >
            <Text style={primaryText}>Add</Text>
          </Pressable>
        </View>
      </View>

      <View style={panel}>
        <TextInput
          placeholder="Search users"
          placeholderTextColor="#7f95c5"
          value={query}
          onChangeText={setQuery}
          style={input}
        />

        {filtered.map((user) => (
          <View key={user._id} style={row}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.text, fontWeight: "800" }}>{user.name}</Text>
              <Text style={{ color: palette.textMuted }}>{user.email}</Text>
            </View>
            <Text style={{ color: palette.textMuted, minWidth: 90 }}>{user.role}</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable onPress={() => deleteUser(user._id)} style={dangerBtn}>
                <FontAwesome6 name="trash" size={14} color="#fecaca" />
              </Pressable>
            </View>
          </View>
        ))}
      </View>
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
  return (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor="#7f95c5"
      value={value}
      onChangeText={onChangeText}
      style={[input, { minWidth: 180 }]}
    />
  );
}

const panel = {
  borderWidth: 1,
  borderColor: palette.cardBorder,
  borderRadius: 14,
  backgroundColor: "rgba(7, 21, 68, 0.9)",
  padding: 14,
};

const label = { color: palette.text, fontWeight: "800" as const, marginBottom: 8 };

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
  alignItems: "center" as const,
  gap: 10,
};

const primaryBtn = {
  borderRadius: 10,
  backgroundColor: palette.accent,
  paddingHorizontal: 14,
  paddingVertical: 10,
};

const primaryText = { color: "#1b1e2f", fontWeight: "800" as const };

const dangerBtn = {
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "rgba(239,68,68,0.5)",
  backgroundColor: "rgba(239,68,68,0.15)",
  width: 34,
  height: 34,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};
