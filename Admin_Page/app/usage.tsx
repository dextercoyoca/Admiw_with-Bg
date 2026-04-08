import { useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { AdminShell } from "@/components/AdminShell";
import { palette } from "@/lib/theme";
import { useAdminUsers } from "@/lib/useAdminUsers";

export default function UsagePage() {
  const { users } = useAdminUsers();
  const [query, setQuery] = useState("");
  const [threshold, setThreshold] = useState("200");

  const thresholdNumber = Number(threshold || 0);

  const rows = useMemo(() => {
    return users.filter((user) => {
      const match = `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase());
      return match;
    });
  }, [users, query]);

  return (
    <AdminShell title="Usage Monitoring" subtitle="Track per-user electricity usage and detect high consumption">
      <View style={panel}>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          <TextInput
            placeholder="Search users"
            placeholderTextColor="#7f95c5"
            value={query}
            onChangeText={setQuery}
            style={[input, { flex: 1 }]}
          />
          <TextInput
            placeholder="High usage threshold"
            placeholderTextColor="#7f95c5"
            value={threshold}
            onChangeText={setThreshold}
            style={[input, { width: 170 }]}
          />
        </View>

        {rows.map((user) => {
          const high = user.usageKwh >= thresholdNumber;
          return (
            <View key={user._id} style={row}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.text, fontWeight: "800" }}>{user.name}</Text>
                <Text style={{ color: palette.textMuted }}>{user.email}</Text>
              </View>
              <Text style={{ color: palette.text }}>{user.usageKwh.toFixed(1)} kWh</Text>
              <Text style={{ color: high ? palette.warning : palette.textMuted, minWidth: 110 }}>
                {high ? "High Usage" : "Normal"}
              </Text>
            </View>
          );
        })}
      </View>
    </AdminShell>
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
  alignItems: "center" as const,
  gap: 10,
};
