import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AdminShell } from "@/components/AdminShell";
import { fetchSettings, saveSettings } from "@/lib/adminApi";
import { palette } from "@/lib/theme";

export default function SettingsPage() {
  const [electricityRate, setElectricityRate] = useState("12.5");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "weekly">("monthly");
  const [latePenaltyPercent, setLatePenaltyPercent] = useState("5");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchSettings()
      .then((response) => {
        setElectricityRate(String(response.settings.electricityRate));
        setBillingCycle(response.settings.billingCycle);
        setLatePenaltyPercent(String(response.settings.latePenaltyPercent));
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load settings"));
  }, []);

  return (
    <AdminShell title="System Settings" subtitle="Control rates, billing cycles, and late penalties">
      <View style={panel}>
        <Text style={label}>Electricity Rate (PHP per kWh)</Text>
        <TextInput value={electricityRate} onChangeText={setElectricityRate} style={input} />

        <Text style={[label, { marginTop: 12 }]}>Billing Cycle</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["monthly", "weekly"] as const).map((item) => (
            <Pressable
              key={item}
              onPress={() => setBillingCycle(item)}
              style={{
                borderRadius: 10,
                borderWidth: 1,
                borderColor: billingCycle === item ? palette.accent : "rgba(157,178,223,0.35)",
                backgroundColor: billingCycle === item ? "rgba(244,191,36,0.14)" : "transparent",
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Text style={{ color: billingCycle === item ? palette.accent : palette.textMuted }}>
                {item}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[label, { marginTop: 12 }]}>Late Penalty (%)</Text>
        <TextInput value={latePenaltyPercent} onChangeText={setLatePenaltyPercent} style={input} />

        <Pressable
          onPress={async () => {
            const response = await saveSettings({
              electricityRate: Number(electricityRate || 0),
              billingCycle,
              latePenaltyPercent: Number(latePenaltyPercent || 0),
            });
            setMessage(`Settings saved (${response.source})`);
          }}
          style={primaryBtn}
        >
          <Text style={{ color: "#1b1e2f", fontWeight: "800" }}>Save Settings</Text>
        </Pressable>

        {message ? <Text style={{ color: palette.textMuted, marginTop: 10 }}>{message}</Text> : null}
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
  maxWidth: 560,
};

const label = { color: palette.textMuted, marginBottom: 6 };

const input = {
  borderWidth: 1,
  borderColor: "rgba(157,178,223,0.35)",
  borderRadius: 10,
  backgroundColor: "rgba(5, 17, 55, 0.95)",
  color: palette.text,
  paddingHorizontal: 12,
  paddingVertical: 10,
};

const primaryBtn = {
  borderRadius: 10,
  backgroundColor: palette.accent,
  paddingHorizontal: 14,
  paddingVertical: 10,
  marginTop: 16,
  alignSelf: "flex-start" as const,
};
