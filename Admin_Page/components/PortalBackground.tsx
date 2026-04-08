import type { ReactNode } from "react";
import { View } from "react-native";
import { palette } from "@/lib/theme";

export function PortalBackground({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <View
        style={{
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: 999,
          backgroundColor: "rgba(18, 198, 255, 0.16)",
          top: -160,
          right: -120,
        }}
      />
      <View
        style={{
          position: "absolute",
          width: 380,
          height: 380,
          borderRadius: 999,
          backgroundColor: "rgba(244, 191, 36, 0.12)",
          bottom: -140,
          left: -140,
        }}
      />
      <View
        style={{
          position: "absolute",
          width: "100%",
          height: 220,
          backgroundColor: "rgba(7, 21, 68, 0.7)",
          top: 0,
        }}
      />
      {children}
    </View>
  );
}
