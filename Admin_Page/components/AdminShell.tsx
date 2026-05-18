import { useAuth } from "@/lib/auth";
import { useThemePalette } from "@/lib/theme";
import { router, usePathname } from "expo-router";
import type { ReactNode } from "react";
import {
    Pressable,
    ScrollView,
    Text,
    View,
    useWindowDimensions,
} from "react-native";
import { PortalBackground } from "./PortalBackground";
import { ThemeToggle } from "./ThemeToggle";

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
  const palette = useThemePalette();
  const pathname = usePathname();
  const { admin, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const shellPadding = isMobile ? 14 : 22;
  const contentMaxWidth = width >= 1280 ? 1120 : undefined;

  return (
    <PortalBackground>
      <View style={{ flex: 1, flexDirection: isMobile ? "column" : "row" }}>
        <View
          style={{
            width: isMobile ? "100%" : 230,
            borderRightWidth: isMobile ? 0 : 1,
            borderBottomWidth: isMobile ? 1 : 0,
            borderRightColor: "rgba(157, 178, 223, 0.22)",
            borderBottomColor: "rgba(157, 178, 223, 0.22)",
            backgroundColor: palette.sidebar,
            paddingVertical: isMobile ? 16 : 22,
            paddingHorizontal: isMobile ? 14 : 14,
          }}
        >
          <Text
            style={{
              color: palette.text,
              fontSize: isMobile ? 24 : 28,
              fontFamily: "ElectricFormula",
              marginBottom: 8,
            }}
          >
            ELECTRIPAY
          </Text>
          <Text
            style={{
              color: palette.textMuted,
              marginBottom: isMobile ? 12 : 18,
            }}
          >
            Admin Panel
          </Text>

          {isMobile ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingRight: 8 }}
            >
              {navItems.map((item) => {
                const active = pathname === item.route;
                return (
                  <Pressable
                    key={item.route}
                    onPress={() => router.push(item.route as never)}
                    style={{
                      borderRadius: 999,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      backgroundColor: active
                        ? palette.accentSoft
                        : "rgba(255,255,255,0.03)",
                      borderWidth: 1,
                      borderColor: active
                        ? palette.accent
                        : "rgba(157, 178, 223, 0.18)",
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
            </ScrollView>
          ) : (
            navItems.map((item) => {
              const active = pathname === item.route;
              return (
                <Pressable
                  key={item.route}
                  onPress={() => router.push(item.route as never)}
                  style={{
                    borderRadius: 10,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                      backgroundColor: active
                      ? palette.accentSoft
                      : "transparent",
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
            })
          )}

          <View style={{ marginTop: isMobile ? 14 : "auto" }}>
            <Text
              style={{
                color: palette.textMuted,
                fontSize: 12,
                marginBottom: 8,
              }}
            >
              Logged in as {admin?.displayName || admin?.email || "Admin"}
            </Text>
            <Pressable
              onPress={() => {
                signOut();
                router.replace("/");
              }}
              style={{
                borderWidth: 1,
                borderColor: "#B91C1C",
                backgroundColor: "#DC2626",
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
                Logout
              </Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: shellPadding,
            gap: 14,
            flexGrow: 1,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: contentMaxWidth,
              alignSelf: "center",
              gap: 14,
            }}
          >
            <View
              style={{
                borderWidth: 1,
                borderColor: palette.cardBorder,
                borderRadius: 16,
                backgroundColor: palette.card,
                padding: isMobile ? 14 : 16,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: palette.text,
                      fontSize: isMobile ? 22 : 26,
                      fontWeight: "900",
                    }}
                  >
                    {title}
                  </Text>
                  {subtitle ? (
                    <Text style={{ color: palette.textMuted }}>{subtitle}</Text>
                  ) : null}
                </View>
                <ThemeToggle />
              </View>
            </View>
            {children}
          </View>
        </ScrollView>
      </View>
    </PortalBackground>
  );
}
