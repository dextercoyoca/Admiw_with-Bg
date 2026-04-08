import { router } from "expo-router";
import React, { useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { PortalBackground } from "@/components/PortalBackground";
import { palette } from "@/lib/theme";
import { useAuth } from "@/lib/auth";

export default function Index() {
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn() {
    setError("");

    if (!identifier.trim() || !password.trim()) {
      setError("Please enter your admin username/email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn(identifier, password);
      router.replace("/dashboard");
    } catch (authError) {
      const message =
        authError instanceof Error ? authError.message : "Unable to sign in right now";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PortalBackground>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
        <View
          style={{
            maxWidth: 1100,
            width: "100%",
            alignSelf: "center",
            flex: 1,
            justifyContent: "center",
          }}
        >
          <View
            style={{
              borderWidth: 1,
              borderColor: palette.cardBorder,
              backgroundColor: palette.card,
              borderRadius: 28,
              padding: 28,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.28,
              shadowRadius: 24,
              elevation: 10,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
                gap: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Image
                  source={require("../assets/images/Electripay-final-logo-transparent.png")}
                  style={{ width: 54, height: 54 }}
                  resizeMode="contain"
                />
                <View>
                  <Text
                    style={{
                      color: palette.text,
                      fontSize: 38,
                      fontFamily: "ElectricFormula",
                      letterSpacing: 0.6,
                    }}
                  >
                    ELECTRIPAY
                  </Text>
                  <Text style={{ color: palette.textMuted, fontSize: 14 }}>
                    Track usage, collections, and client account controls
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 20 }}>
              <View style={{ flex: 1, minWidth: 320 }}>
                <View
                  style={{
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.15)",
                    padding: 22,
                    backgroundColor: "rgba(2, 10, 43, 0.68)",
                  }}
                >
                  <Text style={{ color: palette.accent, fontSize: 26, fontWeight: "900" }}>
                    Control Billing Faster
                  </Text>
                  <Text
                    style={{
                      color: palette.text,
                      marginTop: 12,
                      lineHeight: 23,
                      fontSize: 15,
                    }}
                  >
                    Manage payment status, change client account status, and monitor total
                    receivables in one dashboard built for your admin team.
                  </Text>

                  <View style={{ marginTop: 20, gap: 10 }}>
                    {[
                      "Live payment status updates",
                      "Client state controls: Active, Suspended, Disconnected",
                      "MongoDB-backed records with fallback mode",
                    ].map((item) => (
                      <View
                        key={item}
                        style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                      >
                        <MaterialIcons name="verified" size={18} color={palette.cyan} />
                        <Text style={{ color: palette.textMuted }}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              <View style={{ flex: 1, minWidth: 320 }}>
                <View
                  style={{
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.15)",
                    padding: 22,
                    backgroundColor: "rgba(2, 10, 43, 0.6)",
                    gap: 12,
                  }}
                >
                  <Text style={{ color: palette.text, fontSize: 20, fontWeight: "800" }}>
                    Admin Sign In
                  </Text>
                  <TextInput
                    placeholder="admin email or username"
                    placeholderTextColor="#7186ba"
                    value={identifier}
                    onChangeText={setIdentifier}
                    autoCapitalize="none"
                    style={fieldStyle}
                  />
                  <TextInput
                    placeholder="Password"
                    placeholderTextColor="#7186ba"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    style={fieldStyle}
                  />
                  {error ? <Text style={{ color: palette.danger }}>{error}</Text> : null}
                  <Pressable
                    onPress={handleSignIn}
                    disabled={isSubmitting}
                    style={{
                      marginTop: 6,
                      borderRadius: 12,
                      paddingVertical: 13,
                      backgroundColor: isSubmitting ? "#42a9cd" : palette.cyan,
                      alignItems: "center",
                    }}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#03203a" />
                    ) : (
                      <Text style={{ color: "#03203a", fontWeight: "800" }}>Continue</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </PortalBackground>
  );
}

const fieldStyle = {
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  backgroundColor: "rgba(8, 24, 74, 0.95)",
  color: palette.text,
  borderWidth: 1,
  borderColor: "rgba(157, 178, 223, 0.35)",
};
