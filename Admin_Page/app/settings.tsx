import { AdminShell } from "@/components/AdminShell";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { fetchSettings, saveSettings } from "@/lib/adminApi";
import { useAuth } from "@/lib/auth";
import { useThemePalette } from "@/lib/theme";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

type BillingCycle = "monthly" | "weekly";
type EffectiveDate = "immediate" | "nextCycle";

type SettingsState = {
  electricityRate: string;
  billingCycle: BillingCycle;
  latePenaltyPercent: string;
  effectiveDate: EffectiveDate;
};

type AuditEntry = {
  id: string;
  actor: string;
  createdAt: string;
  changes: string[];
};

const initialSettings: SettingsState = {
  electricityRate: "12.5",
  billingCycle: "monthly",
  latePenaltyPercent: "5",
  effectiveDate: "nextCycle",
};

const auditStorageKey = "electripay-settings-audit";

export default function SettingsPage() {
  const palette = useThemePalette();
  const { admin } = useAuth();
  const [savedSettings, setSavedSettings] = useState<SettingsState>(initialSettings);
  const [form, setForm] = useState<SettingsState>(initialSettings);
  const [previewKwh, setPreviewKwh] = useState("250");
  const [message, setMessage] = useState("");
  const [saveConfirm, setSaveConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    fetchSettings()
      .then((response) => {
        const nextSettings = {
          electricityRate: String(response.settings.electricityRate),
          billingCycle: response.settings.billingCycle,
          latePenaltyPercent: String(response.settings.latePenaltyPercent),
          effectiveDate: response.settings.effectiveDate || "nextCycle",
        };

        setSavedSettings(nextSettings);
        setForm(nextSettings);
        setSavedAt(response.settings.updatedAt || "");
      })
      .catch((error) =>
        setMessage(
          error instanceof Error ? error.message : "Unable to load settings",
        ),
      );

    setAuditEntries(readAuditEntries());
  }, []);

  const validation = useMemo(() => validateSettings(form), [form]);
  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedSettings),
    [form, savedSettings],
  );
  const preview = useMemo(() => {
    const kwh = Number(previewKwh || 0);
    const rate = Number(form.electricityRate || 0);
    const penaltyPercent = Number(form.latePenaltyPercent || 0);
    const base = kwh * rate;
    const penalty = base * (penaltyPercent / 100);

    return {
      base,
      penalty,
      total: base + penalty,
    };
  }, [form.electricityRate, form.latePenaltyPercent, previewKwh]);

  const updateForm = (patch: Partial<SettingsState>) => {
    setMessage("");
    setForm((current) => ({ ...current, ...patch }));
  };

  const discardChanges = () => {
    setForm(savedSettings);
    setMessage("Unsaved changes discarded.");
  };

  const handleSave = async () => {
    if (!validation.valid) {
      setMessage("Please fix the highlighted settings before saving.");
      setSaveConfirm(false);
      return;
    }

    setIsSaving(true);
    try {
      const previous = savedSettings;
      const response = await saveSettings({
        electricityRate: Number(form.electricityRate),
        billingCycle: form.billingCycle,
        latePenaltyPercent: Number(form.latePenaltyPercent),
        effectiveDate: form.effectiveDate,
      });

      const nextSettings = {
        electricityRate: String(response.settings.electricityRate),
        billingCycle: response.settings.billingCycle,
        latePenaltyPercent: String(response.settings.latePenaltyPercent),
        effectiveDate: response.settings.effectiveDate || form.effectiveDate,
      };

      setSavedSettings(nextSettings);
      setForm(nextSettings);
      setSavedAt(response.settings.updatedAt || new Date().toISOString());
      setSaveConfirm(false);
      setMessage(`Saved (${response.source}).`);

      const changes = describeChanges(previous, nextSettings);
      if (changes.length > 0) {
        const entry = {
          id: `${Date.now()}`,
          actor: admin?.displayName || admin?.email || "Admin",
          createdAt: new Date().toISOString(),
          changes,
        };
        const nextAudit = [entry, ...auditEntries].slice(0, 6);
        setAuditEntries(nextAudit);
        writeAuditEntries(nextAudit);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminShell
      title="System Settings"
      subtitle="Control rates, billing cycles, and late penalties"
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <Metric label="Rate per kWh" value={`PHP ${savedSettings.electricityRate}`} />
        <Metric label="Billing Cycle" value={capitalize(savedSettings.billingCycle)} />
        <Metric label="Late Penalty" value={`${savedSettings.latePenaltyPercent}%`} />
        <Metric label="Last Updated" value={savedAt ? formatDateTime(savedAt) : "Not saved"} />
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
        <View style={[panel(palette), { flex: 1.2, minWidth: 320 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
            <Text style={sectionTitle(palette)}>Billing Controls</Text>
            {hasUnsavedChanges ? (
              <View style={unsavedBadge(palette)}>
                <Text style={{ color: palette.accent, fontWeight: "900", fontSize: 12 }}>
                  Unsaved changes
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={label(palette)}>Electricity Rate (PHP per kWh)</Text>
          <TextInput
            value={form.electricityRate}
            onChangeText={(value) => updateForm({ electricityRate: value })}
            keyboardType="decimal-pad"
            style={[input(palette), validation.errors.electricityRate && invalidInput(palette)]}
          />
          <QuickButtons
            values={["10", "12.5", "15"]}
            suffix="PHP"
            onSelect={(value) => updateForm({ electricityRate: value })}
          />
          <ErrorText message={validation.errors.electricityRate} />

          <Text style={[label(palette), { marginTop: 14 }]}>Billing Cycle</Text>
          <Segmented
            options={[
              { label: "Monthly", value: "monthly" },
              { label: "Weekly", value: "weekly" },
            ]}
            value={form.billingCycle}
            onChange={(value) => updateForm({ billingCycle: value as BillingCycle })}
          />

          <Text style={[label(palette), { marginTop: 14 }]}>Late Penalty (%)</Text>
          <TextInput
            value={form.latePenaltyPercent}
            onChangeText={(value) => updateForm({ latePenaltyPercent: value })}
            keyboardType="decimal-pad"
            style={[input(palette), validation.errors.latePenaltyPercent && invalidInput(palette)]}
          />
          <QuickButtons
            values={["0", "5", "10", "15"]}
            suffix="%"
            onSelect={(value) => updateForm({ latePenaltyPercent: value })}
          />
          <ErrorText message={validation.errors.latePenaltyPercent} />

          <Text style={[label(palette), { marginTop: 14 }]}>Effective Date</Text>
          <Segmented
            options={[
              { label: "Apply Now", value: "immediate" },
              { label: "Next Cycle", value: "nextCycle" },
            ]}
            value={form.effectiveDate}
            onChange={(value) => updateForm({ effectiveDate: value as EffectiveDate })}
          />

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
            <Pressable
              onPress={() => setSaveConfirm(true)}
              disabled={!validation.valid || !hasUnsavedChanges}
              style={[
                primaryBtn(palette),
                (!validation.valid || !hasUnsavedChanges) && { opacity: 0.45 },
              ]}
            >
              <Text style={{ color: "#1b1e2f", fontWeight: "900" }}>
                {isSaving ? "Saving..." : "Save Settings"}
              </Text>
            </Pressable>
            <Pressable
              onPress={discardChanges}
              disabled={!hasUnsavedChanges}
              style={[secondaryBtn(palette), !hasUnsavedChanges && { opacity: 0.45 }]}
            >
              <Text style={{ color: palette.text, fontWeight: "800" }}>Discard</Text>
            </Pressable>
          </View>

          {message ? (
            <Text style={{ color: message.includes("fix") || message.includes("Failed") ? palette.danger : palette.cyan, marginTop: 10, fontWeight: "800" }}>
              {message}
            </Text>
          ) : null}
        </View>

        <View style={[panel(palette), { flex: 1, minWidth: 300 }]}>
          <Text style={sectionTitle(palette)}>Bill Preview</Text>
          <Text style={label(palette)}>Sample Consumption (kWh)</Text>
          <TextInput
            value={previewKwh}
            onChangeText={setPreviewKwh}
            keyboardType="decimal-pad"
            style={input(palette)}
          />

          <View style={{ marginTop: 14, gap: 8 }}>
            <PreviewLine label="Estimated Bill" value={formatCurrency(preview.base)} />
            <PreviewLine label="Penalty Amount" value={formatCurrency(preview.penalty)} />
            <PreviewLine label="Total After Penalty" value={formatCurrency(preview.total)} strong />
          </View>
        </View>
      </View>

      <View style={panel(palette)}>
        <Text style={sectionTitle(palette)}>Audit History</Text>
        {auditEntries.length > 0 ? (
          auditEntries.map((entry) => (
            <View key={entry.id} style={auditRow(palette)}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.text, fontWeight: "900" }}>{entry.actor}</Text>
                <Text style={{ color: palette.textMuted }}>{formatDateTime(entry.createdAt)}</Text>
              </View>
              <Text style={{ color: palette.text, flex: 2 }}>
                {entry.changes.join("; ")}
              </Text>
            </View>
          ))
        ) : (
          <Text style={{ color: palette.textMuted, marginTop: 8 }}>
            No settings changes recorded in this browser yet.
          </Text>
        )}
      </View>

      <ConfirmationModal
        visible={saveConfirm}
        title="Save Settings"
        message={`This will affect ${form.effectiveDate === "immediate" ? "active billing calculations immediately" : "the next billing cycle"}. Continue?`}
        confirmText="Save"
        cancelText="Cancel"
        isDangerous={form.effectiveDate === "immediate"}
        isLoading={isSaving}
        onConfirm={handleSave}
        onCancel={() => setSaveConfirm(false)}
      />
    </AdminShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const palette = useThemePalette();

  return (
    <View style={metricCard(palette)}>
      <Text style={{ color: palette.textMuted }}>{label}</Text>
      <Text style={{ color: palette.text, fontSize: 22, fontWeight: "900", marginTop: 6 }}>
        {value}
      </Text>
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

function QuickButtons({
  values,
  suffix,
  onSelect,
}: {
  values: string[];
  suffix: string;
  onSelect: (value: string) => void;
}) {
  const palette = useThemePalette();

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
      {values.map((value) => (
        <Pressable key={value} onPress={() => onSelect(value)} style={quickButton(palette)}>
          <Text style={{ color: palette.textMuted, fontWeight: "800", fontSize: 12 }}>
            {suffix === "PHP" ? `PHP ${value}` : `${value}${suffix}`}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function ErrorText({ message }: { message?: string }) {
  const palette = useThemePalette();
  if (!message) return null;
  return <Text style={{ color: palette.danger, marginTop: 6 }}>{message}</Text>;
}

function PreviewLine({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  const palette = useThemePalette();

  return (
    <View style={previewLine(palette, strong)}>
      <Text style={{ color: palette.textMuted }}>{label}</Text>
      <Text style={{ color: strong ? palette.accent : palette.text, fontWeight: "900" }}>
        {value}
      </Text>
    </View>
  );
}

function validateSettings(settings: SettingsState) {
  const errors: Partial<Record<keyof SettingsState, string>> = {};
  const rate = Number(settings.electricityRate);
  const penalty = Number(settings.latePenaltyPercent);

  if (!Number.isFinite(rate) || rate <= 0) {
    errors.electricityRate = "Rate must be greater than 0.";
  }

  if (!Number.isFinite(penalty) || penalty < 0 || penalty > 100) {
    errors.latePenaltyPercent = "Penalty must be between 0 and 100%.";
  }

  return {
    errors,
    valid: Object.keys(errors).length === 0,
  };
}

function describeChanges(previous: SettingsState, next: SettingsState) {
  const changes: string[] = [];
  if (previous.electricityRate !== next.electricityRate) {
    changes.push(`rate ${previous.electricityRate} -> ${next.electricityRate}`);
  }
  if (previous.billingCycle !== next.billingCycle) {
    changes.push(`cycle ${previous.billingCycle} -> ${next.billingCycle}`);
  }
  if (previous.latePenaltyPercent !== next.latePenaltyPercent) {
    changes.push(`penalty ${previous.latePenaltyPercent}% -> ${next.latePenaltyPercent}%`);
  }
  if (previous.effectiveDate !== next.effectiveDate) {
    changes.push(`effective date ${previous.effectiveDate} -> ${next.effectiveDate}`);
  }
  return changes;
}

function readAuditEntries() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(auditStorageKey) || "[]") as AuditEntry[];
  } catch {
    return [];
  }
}

function writeAuditEntries(entries: AuditEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(auditStorageKey, JSON.stringify(entries));
}

function formatCurrency(value: number) {
  return `PHP ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
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
  marginBottom: 12,
});

const label = (palette: ReturnType<typeof useThemePalette>) => ({
  color: palette.textMuted,
  marginBottom: 6,
  marginTop: 8,
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

const segmented = (palette: ReturnType<typeof useThemePalette>) => ({
  flexDirection: "row" as const,
  flexWrap: "wrap" as const,
  gap: 6,
});

const segmentButton = (
  palette: ReturnType<typeof useThemePalette>,
  active: boolean,
) => ({
  borderRadius: 10,
  borderWidth: 1,
  borderColor: active ? palette.accent : palette.inputBorder,
  backgroundColor: active ? palette.accentSoft : "transparent",
  paddingHorizontal: 12,
  paddingVertical: 8,
});

const segmentText = (
  palette: ReturnType<typeof useThemePalette>,
  active: boolean,
) => ({
  color: active ? palette.accent : palette.textMuted,
  fontWeight: "800" as const,
});

const quickButton = (palette: ReturnType<typeof useThemePalette>) => ({
  borderWidth: 1,
  borderColor: palette.rowBorder,
  backgroundColor: palette.panelSoft,
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 6,
});

const unsavedBadge = (palette: ReturnType<typeof useThemePalette>) => ({
  borderWidth: 1,
  borderColor: palette.accent,
  backgroundColor: palette.accentSoft,
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 6,
  alignSelf: "flex-start" as const,
});

const previewLine = (
  palette: ReturnType<typeof useThemePalette>,
  strong?: boolean,
) => ({
  borderWidth: 1,
  borderColor: strong ? palette.accent : palette.rowBorder,
  backgroundColor: strong ? palette.accentSoft : palette.panelSoft,
  borderRadius: 10,
  padding: 10,
  flexDirection: "row" as const,
  justifyContent: "space-between" as const,
  gap: 10,
});

const auditRow = (palette: ReturnType<typeof useThemePalette>) => ({
  marginTop: 8,
  borderWidth: 1,
  borderColor: palette.rowBorder,
  backgroundColor: palette.panelSoft,
  borderRadius: 10,
  padding: 10,
  flexDirection: "row" as const,
  flexWrap: "wrap" as const,
  gap: 10,
});
