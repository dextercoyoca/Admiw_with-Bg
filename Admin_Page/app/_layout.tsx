import { Stack, usePathname, useRouter } from "expo-router";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { palette } from "@/lib/theme";
import { AuthProvider, useAuth } from "@/lib/auth";

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isBootstrapping } = useAuth();

  const isPublicRoute = pathname === "/";

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }

    if (!isAuthenticated && !isPublicRoute) {
      router.replace("/");
    }

    if (isAuthenticated && isPublicRoute) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isBootstrapping, isPublicRoute, router]);

  if (isBootstrapping || (!isAuthenticated && !isPublicRoute)) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: palette.bg,
        }}
      >
        <ActivityIndicator color={palette.cyan} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [loaded] = useFonts({
    ElectricFormula: require("../assets/images/Electric-Formula.ttf"),
  });

  if (!loaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: palette.bg,
        }}
      >
        <ActivityIndicator color={palette.cyan} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <AuthGate>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </AuthGate>
    </AuthProvider>
  );
}
