import { router, usePathname } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { palette } from "@/lib/theme";

type AdminShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

const navItems = [
  { label: "Dashboard", route: "/dashboard" },
  { label: "Users", route: "/users" },
  { label: "Usage", route: "/usage" },
  { label: "Bills", route: "/bills" },
  { label: "Settings", route: "/settings" },
  { label: "Receipts", route: "/receipts" },
  { label: "Reports", route: "/reports" },
  { label: "Notifications", route: "/notifications" },
];

export function AdminShell({ title, subtitle, children }: AdminShellProps) {
  const pathname = usePathname();
  const { admin, signOut } = useAuth();

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <View
        style={{
          position: "absolute",
          top: -80,
          right: -120,
          width: 340,
          height: 340,
          borderRadius: 999,
          backgroundColor: "rgba(18, 198, 255, 0.12)",
        }}
      />
      <View style={{ flex: 1, flexDirection: "row" }}>
        <View
          style={{
            width: 230,
            borderRightWidth: 1,
            borderRightColor: "rgba(157, 178, 223, 0.22)",
            backgroundColor: "rgba(5, 17, 55, 0.93)",
            paddingVertical: 22,
            paddingHorizontal: 14,
          }}
        >
          <Text
            style={{
              color: palette.text,
              fontSize: 28,
              fontFamily: "ElectricFormula",
              marginBottom: 8,
            }}
          >
            ELECTRIPAY
          </Text>
          <Text style={{ color: palette.textMuted, marginBottom: 18 }}>Admin Panel</Text>

          {navItems.map((item) => {
            const active = pathname === item.route;
            return (
              <Pressable
                key={item.route}
                onPress={() => router.push(item.route as never)}
                style={{
                  borderRadius: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  backgroundColor: active ? "rgba(244, 191, 36, 0.16)" : "transparent",
                  borderWidth: 1,
                  borderColor: active ? palette.accent : "transparent",
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    color: active ? palette.accent : palette.textMuted,
                    fontWeight: "700",
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}

          <View style={{ marginTop: "auto" }}>
            <Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 8 }}>
              Logged in as {admin?.displayName || admin?.email || "Admin"}
            </Text>
            <Pressable
              onPress={() => {
                signOut();
                router.replace("/");
              }}
              style={{
                borderWidth: 1,
                borderColor: "rgba(239, 68, 68, 0.5)",
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fecaca", fontWeight: "700" }}>Logout</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 22, gap: 14, flexGrow: 1 }}>
          <View
            style={{
              borderWidth: 1,
              borderColor: palette.cardBorder,
              borderRadius: 16,
              backgroundColor: palette.card,
              padding: 16,
            }}
          >
            <Text style={{ color: palette.text, fontSize: 26, fontWeight: "900" }}>{title}</Text>
            {subtitle ? <Text style={{ color: palette.textMuted }}>{subtitle}</Text> : null}
          </View>
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

