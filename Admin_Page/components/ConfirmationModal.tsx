import { useThemePalette } from "@/lib/theme";
import { FontAwesome6 } from "@expo/vector-icons";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  loadingMessage?: string;
}

export function ConfirmationModal({
  visible,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDangerous = false,
  onConfirm,
  onCancel,
  isLoading = false,
  loadingMessage = "Processing...",
}: ConfirmationModalProps) {
  const palette = useThemePalette();
  const confirmButtonColor = isDangerous
    ? "rgba(239, 68, 68, 0.9)"
    : palette.accent;
  const confirmTextColor = isDangerous ? "#fecaca" : "#1b1e2f";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.55)",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        <View
          style={{
            backgroundColor: palette.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: palette.cardBorder,
            padding: 24,
            maxWidth: 400,
            width: "100%",
            gap: 16,
          }}
        >
          {/* Header */}
          <View style={{ gap: 8 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              {isDangerous && (
                <FontAwesome6
                  name="exclamation-triangle"
                  size={20}
                  color={palette.warning}
                />
              )}
              <Text
                style={{
                  color: palette.text,
                  fontSize: 18,
                  fontWeight: "900",
                  flex: 1,
                }}
              >
                {title}
              </Text>
            </View>
            <Text style={{ color: palette.textMuted, lineHeight: 20 }}>
              {message}
            </Text>
            {isLoading ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <ActivityIndicator color={palette.cyan} />
                <Text style={{ color: palette.cyan, fontWeight: "800" }}>
                  {loadingMessage}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Footer Actions */}
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginTop: 12,
            }}
          >
            <Pressable
              disabled={isLoading}
              onPress={onCancel}
              style={{
                flex: 1,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "rgba(157, 178, 223, 0.35)",
                backgroundColor: palette.panelSoft,
                paddingVertical: 12,
                alignItems: "center",
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              <Text
                style={{
                  color: palette.textMuted,
                  fontWeight: "700",
                }}
              >
                {cancelText}
              </Text>
            </Pressable>

            <Pressable
              disabled={isLoading}
              onPress={onConfirm}
              style={{
                flex: 1,
                borderRadius: 10,
                backgroundColor: confirmButtonColor,
                paddingVertical: 12,
                alignItems: "center",
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              <Text
                style={{
                  color: confirmTextColor,
                  fontWeight: "700",
                }}
              >
                {isLoading ? "Working..." : confirmText}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
